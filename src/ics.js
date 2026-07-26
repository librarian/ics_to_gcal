import ICAL from "./vendor/ical.js";

const GOOGLE_CALENDAR_URL = "https://calendar.google.com/calendar/render";
const PRACTICAL_URL_LIMIT = 8000;

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatDateValue(time) {
  const date = `${time.year}${pad(time.month)}${pad(time.day)}`;
  if (time.isDate) {
    return date;
  }

  const clock = `${pad(time.hour)}${pad(time.minute)}${pad(time.second)}`;
  const utcSuffix = time.zone?.tzid === "UTC" || time.zone?.tzid === "Z" ? "Z" : "";
  return `${date}T${clock}${utcSuffix}`;
}

function timeZoneId(time) {
  const tzid = time?.zone?.tzid;
  if (!tzid || tzid === "floating" || tzid === "UTC" || tzid === "Z") {
    return "";
  }
  return tzid;
}

function propertyTimeZone(component, propertyName, time) {
  const tzid = component.getFirstProperty(propertyName)?.getParameter("tzid");
  return tzid || timeZoneId(time);
}

function attendeeEmails(component) {
  return component
    .getAllProperties("attendee")
    .map((property) => String(property.getFirstValue() ?? ""))
    .map((value) => value.replace(/^mailto:/i, "").trim())
    .filter(Boolean);
}

function recurrenceRule(component) {
  const rule = component.getFirstPropertyValue("rrule");
  return rule ? `RRULE:${rule.toString()}` : "";
}

function displayDate(time, timeZone = "") {
  if (!time) {
    return "Date unavailable";
  }
  if (time.isDate) {
    return `${time.year}-${pad(time.month)}-${pad(time.day)} (all day)`;
  }

  const clock = `${pad(time.hour)}:${pad(time.minute)}`;
  return `${time.year}-${pad(time.month)}-${pad(time.day)} ${clock}${timeZone ? ` ${timeZone}` : ""}`;
}

export function parseCalendar(icsText) {
  if (typeof icsText !== "string" || !/BEGIN:VCALENDAR/i.test(icsText)) {
    throw new Error("This does not look like an iCalendar file.");
  }

  let calendar;
  try {
    calendar = new ICAL.Component(ICAL.parse(icsText));
  } catch (error) {
    throw new Error(`Could not parse the ICS data: ${error.message}`);
  }

  const components = calendar.getAllSubcomponents("vevent");
  if (components.length === 0) {
    throw new Error("The calendar does not contain any events.");
  }

  return components.map((component, index) => {
    const event = new ICAL.Event(component);
    const start = event.startDate;
    const end = event.endDate;
    if (!start || !end) {
      throw new Error(`Event ${index + 1} does not have a usable start and end time.`);
    }

    return {
      title: event.summary || "(Untitled event)",
      description: event.description || "",
      location: event.location || "",
      start,
      end,
      timeZone: propertyTimeZone(component, "dtstart", start),
      recurrence: recurrenceRule(component),
      attendees: attendeeEmails(component),
      hasExceptions:
        component.hasProperty("recurrence-id") ||
        component.hasProperty("exdate") ||
        component.hasProperty("rdate")
    };
  });
}

export function googleCalendarUrl(event) {
  const url = new URL(GOOGLE_CALENDAR_URL);
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", event.title);
  url.searchParams.set(
    "dates",
    `${formatDateValue(event.start)}/${formatDateValue(event.end)}`
  );

  if (event.description) {
    url.searchParams.set("details", event.description);
  }
  if (event.location) {
    url.searchParams.set("location", event.location);
  }
  if (event.timeZone) {
    url.searchParams.set("ctz", event.timeZone);
  }
  if (event.recurrence) {
    url.searchParams.set("recur", event.recurrence);
  }
  for (const email of event.attendees) {
    url.searchParams.append("add", email);
  }

  return url.toString();
}

export function eventViewModel(event) {
  const url = googleCalendarUrl(event);
  return {
    title: event.title,
    when: displayDate(event.start, event.timeZone),
    url,
    warning: event.hasExceptions
      ? "This recurrence has exceptions that a Google Calendar link may not preserve."
      : url.length > PRACTICAL_URL_LIMIT
        ? "This event creates a very long URL; Google Calendar's native ICS import may work better."
        : ""
  };
}
