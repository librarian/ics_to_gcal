import { googleCalendarUrl, parseCalendar } from "./ics.js";
import {
  downloadLooksLikeIcs,
  isIcsUrl,
  responseLooksLikeIcs,
  safeDownloadName
} from "./handlers.js";

const MAX_ICS_BYTES = 5 * 1024 * 1024;
const MENU_LINK = "ics-to-gcal-link";
const MENU_PAGE = "ics-to-gcal-page";
const activeConversions = new Set();
const bypassDownloadUrls = new Map();

async function installMenus() {
  await browser.menus.removeAll();
  browser.menus.create({
    id: MENU_LINK,
    title: "Open ICS in Google Calendar",
    contexts: ["link"]
  });
  browser.menus.create({
    id: MENU_PAGE,
    title: "Open this ICS page in Google Calendar",
    contexts: ["page"]
  });
}

function notify(title, message) {
  return browser.notifications.create({
    type: "basic",
    iconUrl: browser.runtime.getURL("icons/calendar.svg"),
    title,
    message
  });
}

async function readIcsUrl(url) {
  const response = await fetch(url, {
    credentials: "include",
    redirect: "follow",
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`The server returned HTTP ${response.status}.`);
  }

  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > MAX_ICS_BYTES) {
    throw new Error("The ICS file exceeds the 5 MB safety limit.");
  }

  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > MAX_ICS_BYTES) {
    throw new Error("The ICS file exceeds the 5 MB safety limit.");
  }
  return text;
}

async function openEvents(events, replaceTabId) {
  const urls = events.map(googleCalendarUrl);
  let firstUrl = urls.shift();

  if (Number.isInteger(replaceTabId) && replaceTabId >= 0) {
    try {
      await browser.tabs.update(replaceTabId, { url: firstUrl, active: true });
      firstUrl = null;
    } catch {
      // The source tab can disappear when Firefox cancels a download response.
    }
  }

  if (firstUrl) {
    await browser.tabs.create({ url: firstUrl, active: true });
  }
  for (const url of urls) {
    await browser.tabs.create({ url, active: false });
  }

  if (events.length > 1) {
    await notify(
      "ICS converted",
      `Opened ${events.length} Google Calendar event drafts.`
    );
  }
}

async function restartDownload(url, filename) {
  bypassDownloadUrls.set(url, (bypassDownloadUrls.get(url) ?? 0) + 1);
  const options = { url, saveAs: true };
  if (filename) {
    options.filename = filename;
  }
  await browser.downloads.download(options);
}

function consumeDownloadBypass(url) {
  const count = bypassDownloadUrls.get(url) ?? 0;
  if (count === 0) {
    return false;
  }
  if (count === 1) {
    bypassDownloadUrls.delete(url);
  } else {
    bypassDownloadUrls.set(url, count - 1);
  }
  return true;
}

async function convertUrl(url, { replaceTabId, fallback } = {}) {
  if (!url || activeConversions.has(url)) {
    return;
  }

  activeConversions.add(url);
  try {
    const events = parseCalendar(await readIcsUrl(url));
    await openEvents(events, replaceTabId);
  } catch (error) {
    if (fallback) {
      try {
        await fallback();
        await notify(
          "ICS conversion failed",
          `${error.message} Firefox restored the original download.`
        );
      } catch (fallbackError) {
        await notify(
          "ICS conversion failed",
          `${error.message} The fallback download also failed: ${fallbackError.message}`
        );
      }
    } else {
      await notify("ICS conversion failed", error.message);
    }
  } finally {
    activeConversions.delete(url);
  }
}

browser.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (
      details.method !== "GET" ||
      !responseLooksLikeIcs(details.responseHeaders)
    ) {
      return {};
    }

    void convertUrl(details.url, {
      replaceTabId: details.tabId,
      fallback: () => restartDownload(details.url)
    });
    return { cancel: true };
  },
  { urls: ["<all_urls>"], types: ["main_frame"] },
  ["blocking", "responseHeaders"]
);

browser.downloads.onCreated.addListener((item) => {
  const url = item.finalUrl || item.url;
  if (consumeDownloadBypass(url) || !downloadLooksLikeIcs(item)) {
    return;
  }

  void (async () => {
    try {
      await browser.downloads.cancel(item.id);
    } catch {
      // A very small file may complete before Firefox processes the event.
    }

    await convertUrl(url, {
      fallback: async () => {
        const [current] = await browser.downloads.search({ id: item.id });
        if (current?.state !== "complete") {
          await restartDownload(url, safeDownloadName(item.filename));
        }
      }
    });
  })();
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && isIcsUrl(tab.url)) {
    void convertUrl(tab.url, { replaceTabId: tabId });
  }
});

browser.menus.onClicked.addListener((info) => {
  if (info.menuItemId === MENU_LINK) {
    void convertUrl(info.linkUrl);
  } else if (info.menuItemId === MENU_PAGE) {
    void convertUrl(info.pageUrl);
  }
});

browser.action.onClicked.addListener((tab) => {
  void convertUrl(tab.url, { replaceTabId: tab.id });
});

void installMenus();
