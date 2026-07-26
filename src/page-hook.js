(() => {
  const MESSAGE_SOURCE = "ics-to-gcal-page-hook";
  const CALENDAR_MIME = /^text\/calendar(?:;|$)/i;
  const BLOB_TTL_MS = 60_000;
  const calendarBlobUrls = new Set();
  const originalCreateObjectURL = URL.createObjectURL;

  URL.createObjectURL = function (object) {
    const blobUrl = Reflect.apply(originalCreateObjectURL, this, arguments);
    if (!(object instanceof Blob) || !CALENDAR_MIME.test(object.type || "")) {
      return blobUrl;
    }

    calendarBlobUrls.add(blobUrl);
    window.setTimeout(() => calendarBlobUrls.delete(blobUrl), BLOB_TTL_MS);

    object
      .text()
      .then((text) => {
        window.setTimeout(() => {
          window.postMessage(
            {
              source: MESSAGE_SOURCE,
              type: "calendar-blob",
              blobUrl,
              text
            },
            "*"
          );
        }, 0);
      })
      .catch(() => {
        // If the Blob cannot be read, leave error handling to the normal download path.
      });

    return blobUrl;
  };

  window.addEventListener(
    "click",
    (event) => {
      const anchor = event.target?.closest?.("a[href]");
      if (!anchor || !calendarBlobUrls.has(anchor.href)) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true
  );
})();
