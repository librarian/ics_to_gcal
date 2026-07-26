import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { eventViewModel, googleCalendarUrl, parseCalendar } from "../src/ics.js";

const fixture = (name) =>
  readFile(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

test("parses a recurring zoned event and builds a Google Calendar URL", async () => {
  const [event] = parseCalendar(await fixture("single.ics"));
  assert.equal(event.title, "Project review");
  assert.equal(event.description, "Review line one\nReview line two");
  assert.equal(event.timeZone, "Europe/Berlin");
  assert.deepEqual(event.attendees, ["alice@example.test"]);
  assert.equal(event.recurrence, "RRULE:FREQ=WEEKLY;COUNT=3");

  const url = new URL(googleCalendarUrl(event));
  assert.equal(url.origin, "https://calendar.google.com");
  assert.equal(url.searchParams.get("action"), "TEMPLATE");
  assert.equal(url.searchParams.get("text"), "Project review");
  assert.equal(url.searchParams.get("dates"), "20260810T183000/20260810T200000");
  assert.equal(url.searchParams.get("ctz"), "Europe/Berlin");
  assert.equal(url.searchParams.get("recur"), "RRULE:FREQ=WEEKLY;COUNT=3");
  assert.deepEqual(url.searchParams.getAll("add"), ["alice@example.test"]);
});

test("parses multiple events and keeps all-day DTEND exclusive", async () => {
  const events = parseCalendar(await fixture("multiple.ics"));
  assert.equal(events.length, 2);

  const allDayUrl = new URL(googleCalendarUrl(events[0]));
  assert.equal(allDayUrl.searchParams.get("dates"), "20261224/20261225");

  const utcUrl = new URL(googleCalendarUrl(events[1]));
  assert.equal(utcUrl.searchParams.get("dates"), "20261231T220000Z/20270101T010000Z");
});

test("rejects non-calendar input", () => {
  assert.throws(() => parseCalendar("hello"), /does not look like/i);
});

test("warns when recurrence exceptions cannot be represented", () => {
  const [event] = parseCalendar(`BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:exception@example.test
DTSTART:20260810T100000Z
DTEND:20260810T110000Z
SUMMARY:Exception
RRULE:FREQ=DAILY;COUNT=3
EXDATE:20260811T100000Z
END:VEVENT
END:VCALENDAR`);

  assert.match(eventViewModel(event).warning, /exceptions/i);
});
