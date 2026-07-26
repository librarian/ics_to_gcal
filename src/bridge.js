const MESSAGE_SOURCE = "ics-to-gcal-page-hook";
const MAX_ICS_CHARACTERS = 5 * 1024 * 1024;

window.addEventListener("message", (event) => {
  const message = event.data;
  if (
    event.source !== window ||
    message?.source !== MESSAGE_SOURCE ||
    message?.type !== "calendar-blob" ||
    typeof message.text !== "string" ||
    message.text.length > MAX_ICS_CHARACTERS ||
    !/BEGIN:VCALENDAR/i.test(message.text)
  ) {
    return;
  }

  void browser.runtime.sendMessage({
    type: "calendar-blob",
    blobUrl: String(message.blobUrl || ""),
    text: message.text
  });
});
