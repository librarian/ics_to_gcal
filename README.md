# ICS to Google Calendar

A Firefox extension that intercepts `.ics` links and downloads, then opens
Google Calendar's new-event screen with the event details filled in.

The extension does not use the Google Calendar API or request access to your
Google account. It fetches the selected ICS URL inside Firefox, parses it
locally, and sends only the resulting event fields to Google Calendar when it
opens the draft. Nothing is added until you press **Save**.

## Features

- Intercepts GET responses served as `text/calendar` or ICS attachments.
- Detects Firefox downloads by URL, filename, and calendar MIME type.
- Adds **Open ICS in Google Calendar** to the link context menu.
- Converts the current URL when the toolbar button is clicked.
- Handles files containing multiple `VEVENT` entries by opening one draft per
  event.
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
written to `artifacts/ics-to-gcal-0.2.0.xpi`; permanent installation requires a
Mozilla-signed build in standard Firefox releases.

## Use it

Use any of these paths:

- Normally click an ICS link. When the server identifies it as calendar data,
  the download/navigation is intercepted and Google Calendar opens.
- Right-click a link and choose **Open ICS in Google Calendar**. This also
  handles download endpoints whose URL does not end in `.ics`.
- On a displayed ICS URL, click the extension toolbar button or right-click the
  page and choose **Open this ICS page in Google Calendar**.

If an intercepted URL cannot be fetched or parsed, the extension restores the
original Firefox download and shows a notification.

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
  open one draft tab per event.
- Recurrence exception instances (`RECURRENCE-ID` / `EXDATE`) cannot be fully
  represented by Google's edit-link format.
- Attachments, alarms, organizer state, RSVP status, and arbitrary custom ICS
  properties are not transferred.
- Very large descriptions or attendee lists can exceed practical URL-length
  limits. For those files, use Google Calendar's native **Import & export**
  screen.
- Automatic interception can replay only GET downloads. A POST-generated
  calendar response is left to Firefox; its resulting download may still be
  detected by the download listener.
- Some servers require navigation-specific headers that an extension fetch
  cannot reproduce. In that case the original download is restored.
