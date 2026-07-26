import assert from "node:assert/strict";
import test from "node:test";

const ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:20260810T100000Z
DTEND:20260810T110000Z
SUMMARY:Generated Blob
END:VEVENT
END:VCALENDAR`;

async function waitFor(predicate, timeoutMs = 1000) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) {
      throw new Error("Timed out waiting for the page hook.");
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

test("page hook forwards calendar Blob text and ignores other Blobs", async () => {
  const messages = [];
  const originalCreateObjectURL = URL.createObjectURL;
  globalThis.window = {
    addEventListener: () => {},
    postMessage: (message) => messages.push(message),
    setTimeout: (callback, delay) => {
      const timer = setTimeout(callback, delay);
      timer.unref();
      return timer;
    }
  };

  try {
    await import(`../src/page-hook.js?test=${Date.now()}`);
    const calendarUrl = URL.createObjectURL(
      new Blob([ICS], { type: "text/calendar;charset=utf-8" })
    );
    URL.createObjectURL(new Blob(["not a calendar"], { type: "text/plain" }));

    await waitFor(() => messages.length === 1);
    assert.equal(messages[0].type, "calendar-blob");
    assert.equal(messages[0].blobUrl, calendarUrl);
    assert.equal(messages[0].text, ICS);
  } finally {
    URL.createObjectURL = originalCreateObjectURL;
    delete globalThis.window;
  }
});
