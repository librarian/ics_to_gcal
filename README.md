# ICS to Google Calendar

A small Firefox extension that reads an `.ics` file locally and opens Google
Calendar's new-event screen with the event details filled in.

The extension does not upload calendar files, use the Google Calendar API, or
request access to your Google account. Nothing is added until you review the
event and press **Save** in Google Calendar.

## Features

- Reads an ICS document displayed in the current Firefox tab.
- Accepts local files using a picker or drag and drop.
- Handles files containing multiple `VEVENT` entries.
- Preserves titles, descriptions, locations, attendees, all-day dates, named
  time zones, and common recurrence rules.
- Parses files locally with [ical.js](https://github.com/mozilla-comm/ical.js).

## Install a development build

1. Build the extension in WSL:

   ```bash
   bash scripts/wsl-build.sh
   ```

2. In Firefox, open `about:debugging#/runtime/this-firefox`.
3. Select **Load Temporary Add-on**.
4. Choose `dist/manifest.json`.

Temporary add-ons disappear when Firefox restarts. The packaged extension is
written to `artifacts/ics-to-gcal-0.1.0.xpi`; permanent installation requires a
Mozilla-signed build in standard Firefox releases.

## Use it

Open an ICS URL or a text-rendered `.ics` file and click the extension button.
The extension tries to read the current tab automatically. Alternatively, drop
an `.ics` file onto the popup or select it from disk.

Review the parsed events and select **Open in Google Calendar**. Each event
opens as a draft; Google Calendar does not receive anything until that point.

## Development

Requirements:

- WSL or another Linux environment
- Node.js 18 or newer
- Python 3 (only for producing the deterministic ZIP/XPI archive)

Commands:

```bash
bash scripts/wsl-build.sh
```

The script runs the Node test suite, creates the unpacked extension under
`dist/`, and creates an `.xpi` file under `artifacts/`. It has no network step
and does not require npm because the pinned `ical.js` browser module is vendored.

If npm is available, the equivalent commands are `npm test`, `npm run build`,
and `npm run package`.

## Known limitations

- A Google Calendar edit link represents one event. Multi-event files therefore
  produce one button per event.
- Recurrence exception instances (`RECURRENCE-ID` / `EXDATE`) cannot be fully
  represented by Google's edit-link format.
- Attachments, alarms, organizer state, RSVP status, and arbitrary custom ICS
  properties are not transferred.
- Very large descriptions or attendee lists can exceed practical URL-length
  limits. For those files, use Google Calendar's native **Import & export**
  screen.
- Firefox does not allow extensions to run on protected pages such as
  `about:` pages. Use the file picker in those cases.
