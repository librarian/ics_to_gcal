import assert from "node:assert/strict";
import test from "node:test";

const ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:background-test@example.test
DTSTART:20260810T100000Z
DTEND:20260810T110000Z
SUMMARY:Intercepted event
END:VEVENT
END:VCALENDAR`;

async function waitFor(predicate, timeoutMs = 1000) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) {
      throw new Error("Timed out waiting for the background action.");
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

test("calendar response interception replaces the source tab with Google Calendar", async () => {
  const listeners = {};
  const updatedTabs = [];
  const createdMenus = [];

  globalThis.browser = {
    action: {
      onClicked: { addListener: (listener) => (listeners.action = listener) }
    },
    downloads: {
      cancel: async () => {},
      download: async () => 1,
      search: async () => [],
      onCreated: { addListener: (listener) => (listeners.download = listener) }
    },
    menus: {
      create: (options) => createdMenus.push(options),
      removeAll: async () => {},
      onClicked: { addListener: (listener) => (listeners.menu = listener) }
    },
    notifications: {
      create: async () => "notification"
    },
    runtime: {
      getURL: (path) => `moz-extension://test/${path}`
    },
    tabs: {
      create: async () => {},
      update: async (tabId, options) => updatedTabs.push({ tabId, ...options }),
      onUpdated: { addListener: (listener) => (listeners.tab = listener) }
    },
    webRequest: {
      onHeadersReceived: {
        addListener: (listener) => (listeners.headers = listener)
      }
    }
  };
  globalThis.fetch = async () =>
    new Response(ICS, {
      status: 200,
      headers: { "content-type": "text/calendar" }
    });

  try {
    await import(`../src/background.js?test=${Date.now()}`);
    await waitFor(() => createdMenus.length === 2);

    const decision = listeners.headers({
      method: "GET",
      url: "https://example.test/invite.ics",
      tabId: 42,
      responseHeaders: [{ name: "Content-Type", value: "text/calendar" }]
    });

    assert.deepEqual(decision, { cancel: true });
    await waitFor(() => updatedTabs.length === 1);
    assert.equal(updatedTabs[0].tabId, 42);

    const destination = new URL(updatedTabs[0].url);
    assert.equal(destination.origin, "https://calendar.google.com");
    assert.equal(destination.searchParams.get("text"), "Intercepted event");
  } finally {
    delete globalThis.browser;
    delete globalThis.fetch;
  }
});
