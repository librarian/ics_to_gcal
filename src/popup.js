import { eventViewModel, parseCalendar } from "./ics.js";

const api = globalThis.browser ?? globalThis.chrome;
const fileInput = document.querySelector("#file-input");
const dropZone = document.querySelector("#drop-zone");
const status = document.querySelector("#status");
const eventsContainer = document.querySelector("#events");

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function renderEvents(events, source) {
  eventsContainer.replaceChildren();
  const models = events.map(eventViewModel);

  for (const model of models) {
    const card = document.createElement("article");
    card.className = "event-card";

    const title = document.createElement("h2");
    title.textContent = model.title;

    const when = document.createElement("p");
    when.className = "event-meta";
    when.textContent = model.when;

    const link = document.createElement("a");
    link.className = "event-link";
    link.href = model.url;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Open in Google Calendar";

    card.append(title, when, link);

    if (model.warning) {
      const warning = document.createElement("p");
      warning.className = "warning";
      warning.textContent = model.warning;
      card.append(warning);
    }

    eventsContainer.append(card);
  }

  const noun = models.length === 1 ? "event" : "events";
  setStatus(`Found ${models.length} ${noun} in ${source}.`);
}

function processText(text, source) {
  try {
    renderEvents(parseCalendar(text), source);
  } catch (error) {
    eventsContainer.replaceChildren();
    setStatus(error.message, true);
  }
}

async function processFile(file) {
  if (!file) {
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    setStatus("The selected file is larger than the 5 MB safety limit.", true);
    return;
  }

  try {
    processText(await file.text(), file.name);
  } catch (error) {
    setStatus(`Could not read the file: ${error.message}`, true);
  }
}

async function inspectCurrentTab() {
  try {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || /^(about|moz-extension):/.test(tab.url ?? "")) {
      setStatus("Choose or drop an .ics file.");
      return;
    }

    const [injection] = await api.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.body?.textContent ?? document.documentElement?.textContent ?? ""
    });
    const text = injection?.result ?? "";
    if (/BEGIN:VCALENDAR/i.test(text)) {
      processText(text, "the current tab");
    } else {
      setStatus("The current tab is not an ICS document. Choose or drop a file.");
    }
  } catch {
    setStatus("Firefox could not read this tab. Choose or drop an .ics file.");
  }
}

fileInput.addEventListener("change", () => processFile(fileInput.files?.[0]));

for (const eventName of ["dragenter", "dragover"]) {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("dragging");
  });
}

for (const eventName of ["dragleave", "drop"]) {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragging");
  });
}

dropZone.addEventListener("drop", (event) => {
  processFile(event.dataTransfer?.files?.[0]);
});

inspectCurrentTab();
