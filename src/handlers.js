const ICS_EXTENSION = /\.(?:ics|ical)$/i;
const ICS_MIME_TYPES = ["text/calendar", "application/ics", "application/ical"];

export function isIcsUrl(value) {
  if (!value) {
    return false;
  }

  try {
    return ICS_EXTENSION.test(decodeURIComponent(new URL(value).pathname));
  } catch {
    return ICS_EXTENSION.test(String(value).split(/[?#]/, 1)[0]);
  }
}

export function responseLooksLikeIcs(headers = []) {
  for (const header of headers) {
    const name = String(header.name ?? "").toLowerCase();
    const value = String(header.value ?? "").toLowerCase();

    if (
      name === "content-type" &&
      ICS_MIME_TYPES.some((mime) => value.includes(mime))
    ) {
      return true;
    }

    if (
      name === "content-disposition" &&
      /filename\*?=(?:utf-8''|["'])?[^;"']+\.(?:ics|ical)(?:["']|;|$)/i.test(value)
    ) {
      return true;
    }
  }

  return false;
}

export function downloadLooksLikeIcs(item) {
  const mime = String(item?.mime ?? "").toLowerCase();
  return (
    isIcsUrl(item?.url) ||
    isIcsUrl(item?.finalUrl) ||
    ICS_EXTENSION.test(String(item?.filename ?? "")) ||
    ICS_MIME_TYPES.some((known) => mime.includes(known))
  );
}

export function safeDownloadName(filename) {
  const leaf = String(filename ?? "").split(/[\\/]/).pop();
  return leaf && ICS_EXTENSION.test(leaf) ? leaf : undefined;
}
