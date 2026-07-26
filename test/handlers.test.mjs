import assert from "node:assert/strict";
import test from "node:test";
import {
  downloadLooksLikeIcs,
  isIcsUrl,
  responseLooksLikeIcs,
  safeDownloadName
} from "../src/handlers.js";

test("recognizes ICS and ICAL URL paths with query strings", () => {
  assert.equal(isIcsUrl("https://example.test/events/meeting.ics?token=abc"), true);
  assert.equal(isIcsUrl("https://example.test/events/team.ical"), true);
  assert.equal(isIcsUrl("https://example.test/events/page.html?file=x.ics"), false);
});

test("recognizes calendar response headers", () => {
  assert.equal(
    responseLooksLikeIcs([{ name: "Content-Type", value: "text/calendar; charset=utf-8" }]),
    true
  );
  assert.equal(
    responseLooksLikeIcs([
      { name: "Content-Disposition", value: 'attachment; filename="meeting.ics"' }
    ]),
    true
  );
  assert.equal(
    responseLooksLikeIcs([{ name: "Content-Type", value: "text/plain" }]),
    false
  );
});

test("recognizes calendar downloads by URL, filename, or MIME type", () => {
  assert.equal(downloadLooksLikeIcs({ url: "https://x.test/a.ics" }), true);
  assert.equal(
    downloadLooksLikeIcs({
      url: "https://x.test/download/42",
      filename: "C:\\Users\\Test\\Downloads\\invite.ics"
    }),
    true
  );
  assert.equal(
    downloadLooksLikeIcs({ url: "https://x.test/download/42", mime: "text/calendar" }),
    true
  );
});

test("keeps only a safe leaf filename for fallback downloads", () => {
  assert.equal(safeDownloadName("C:\\Users\\Test\\Downloads\\invite.ics"), "invite.ics");
  assert.equal(safeDownloadName("/tmp/team.ical"), "team.ical");
  assert.equal(safeDownloadName("/tmp/not-calendar.txt"), undefined);
});
