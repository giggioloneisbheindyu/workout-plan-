# Powerlifting Program

An installable web app (PWA) for viewing your coach’s training program, logging sets and weights, managing rest periods, and keeping your workout history.

Import a `.docx` program, enter your maxes, and use the four tabs: **Oggi (Today)**, **Piano (Plan)**, **Programma (Program)**, and **Storico (History)**. Document parsing and workout management run in the browser. The project’s APIs handle push notifications.

Documentation updated on **November 17, 2026**.

The app’s interface is in Italian. This README uses English names and includes the original Italian labels where needed. Keep parser keywords and the iPhone shortcut name exactly as shown.

## Contents

- [Quick start](#quick-start)
- [The four tabs](#the-four-tabs)
- [Importing a program](#importing-a-program)
- [Prescriptions and blocks](#prescriptions-and-blocks)
- [Logging a workout](#logging-a-workout)
- [Notes, photos, and links](#notes-photos-and-links)
- [Planning the next session’s weight](#planning-the-next-sessions-weight)
- [Rest periods and the iPhone timer](#rest-periods-and-the-iphone-timer)
- [History and data exchange](#history-and-data-exchange)
- [Editing the program](#editing-the-program)
- [Storage and backups](#storage-and-backups)
- [Project structure and local development](#project-structure-and-local-development)
- [Notifications and deployment](#notifications-and-deployment)
- [Updating the files](#updating-the-files)
- [Troubleshooting](#troubleshooting)
- [Checking changes](#checking-changes)

## Quick start

1. Open the app and load your coach’s `.docx` program.
2. In **Plan**, enter your squat, bench press, and deadlift maxes in kg.
3. In **Today**, choose training or rest. For training, select a program day.
4. Enter the required values and tap each set when you complete it.
5. Finish the workout to save it to **History** and update the **Plan**.
6. Regularly download a `.json` backup from **Plan**, especially before switching devices or clearing browser data.

On iPhone, open the app in Safari and choose **Share → Add to Home Screen**. On Android, use the browser’s installation option. For iPhone notifications, launch the installed app from its Home Screen icon.

## The four tabs

| Tab | Contents |
| --- | --- |
| **Oggi — Today** | Training/rest selection, exercises, sets, weights, notes, and rest periods. |
| **Piano — Plan** | Maxes, preferences, notifications, iPhone timer, weekly calendar, program switching, and backups. |
| **Programma — Program** | Program viewing and editing: days, week matrix, statistics, and tools. |
| **Storico — History** | Workouts and rest days grouped by program, set details, notes, and CSV export/import. |

### Plan and calendar

Each week has seven cells, Monday through Sunday:

| Indicator | Meaning |
| --- | --- |
| Red with a number | Workout for the corresponding program day. |
| Red with `C` | Extra accessories. |
| Red with a checkmark | Workout without an associated program day. |
| Blue with a dash | Rest day. |
| Gray | Day not recorded. |

Tap a week to select it and a day to edit its entry. You can record a workout **with weights and reps**, an **empty workout**, or a rest day. Entering a past workout does not start rest timers.

The calendar is rebuilt from History: deleting or importing a record also updates its indicators. A week’s X button resets its records after the required confirmations.

## Importing a program

The app reads Word `.docx` files using JSZip. **PDF import is not supported.** JSZip is loaded from cdnjs, so a connection is required to download this dependency.

### Document structure

Use Word tables with:

- a header row containing at least two week columns, such as `SETT 1.1` and `SETT 1.2`;
- `GIORNO 1`, `GIORNO 2`, etc. rows to separate days;
- one row per exercise, with its name in the first column and each week’s prescription in the following columns;
- a single prescription cell when the same text should apply to every week.

Example, retaining the Italian parser keywords:

| Exercise | SETT 1.1 | SETT 1.2 |
| --- | --- | --- |
| GIORNO 1 | | |
| Squat | 5x3s 70% | 5x3s 72.5% |
| Curl manubri | 3x10 | 3x10 |

Weeks are sorted using the numbering in their labels. After importing, check the days, exercise names, and exercise classifications.

### Program recognition and switching

The app compares the filename and exercises against known programs. When recognition is partial, it asks whether the file updates the same program or represents a new one.

An update preserves the existing program association and can reapply local edits. A new program gets its own identity. Previous programs’ workout history is retained.

Exercises are recognized using normalized names and aliases. Different variations or equipment may have separate logs: bench press and close-grip bench press, for example, are not automatically equivalent.

## Prescriptions and blocks

Main-lift percentages use the corresponding max, with weights rounded to **2.5 kg**. Percentages based on a MAV or another reference follow their specific prescription.

| Notation | Interpretation |
| --- | --- |
| `5x3s` | 3 sets of 5 reps: with a trailing `s`, the order is reps × sets. |
| `3x8` | 3 sets of 8 reps. |
| `70%` | Percentage of the max, where applicable. |
| `5@7` | 5 reps with a target RPE of 7. |
| `10-8-6-4` | Four sets with different rep targets. |
| `MAV` | A block working up to the MAV weight. |
| `istintiva` | A free block, according to the recognized notation. |

Compound prescriptions are split into blocks. For example:

```text
2x2s 70% + 5@7 + 70% no var istintiva 2x3s + istintiva
```

| Block | Expected behavior |
| --- | --- |
| `2x2s 70%` | Prescribed sets, reps, and weight. |
| `5@7` | Prescribed reps, editable kg, and adjustable set count where allowed. |
| `70% no var istintiva 2x3s` | Prescribed reps and weight. |
| `istintiva` | Free kg and reps. |

A weight that depends on a MAV or top set requires the reference block’s value first. The program’s target RPE is not automatically saved as the actual RPE you experienced.

The parser uses recognition rules. For unusual text, check the preview in **Program**. If it cannot recognize the set count, it may use the default of three sets.

## Logging a workout

### Sets and completion

Each set has a card with the values to record. Tapping it marks the set as done and starts the rest timer. Tapping it again undoes completion and unlocks the set.

Exercise completion updates both when you mark sets individually and when you tap the exercise number or heading. If some sets are unfinished, the latter action asks for confirmation before marking all of them as done.

When every set is complete, **the whole exercise is dimmed**, including its notes. The completed session’s note field cannot be edited until you unlock the exercise. Undoing a set’s completion also makes the exercise incomplete again.

### Editable fields

| Type | Kg | Reps |
| --- | --- | --- |
| Main lift with a fixed prescription | Prescribed. | Prescribed. |
| Main lift with MAV/RPE | Editable according to the block. | Fixed when specified. |
| Block based on a MAV/top set | Calculated from the reference. | According to the prescription. |
| Accessory | Generally editable. | Generally editable, with an optional target. |
| Unilateral exercise | Separate for each side. | Separate for each side. |

For accessories, the app can suggest values from the last performance of that exercise, including a different program. Automatic prefill does not overwrite values already entered. Field suggestions can be accepted when you complete the set.

### Unilateral exercises

Each set contains **Sinistro (Left)** and **Destro (Right)**. Complete one side at a time or use the dedicated button to complete the entire set. A set is done when both sides are done; History also keeps their values separate.

### Finishing a workout

Finishing saves sets, weights, and notes, updates each exercise’s log, and rebuilds the Plan. Completing every program day allows progression to the next week; the final week is marked as complete.

The option to finish anyway allows you to close an incomplete session. A workout started before midnight can remain open for up to 12 hours and be associated with its starting day.

## Notes, photos, and links

Each exercise can contain text, photos, and HTTP/HTTPS links, including video links.

- **Text:** saved with the exercise’s session.
- **Photos:** use **＋ Foto nelle note (Add photos to notes)** and select one or more images. Photos are compressed on the device to a maximum dimension of 1600 pixels; the original file limit is 25 MB.
- **Links:** use **＋ Link video (Add video link)** or enter the address in the note text. Addresses are also shown as clickable links.
- **Viewing photos:** tap a thumbnail to see the entire image inside the app. Use **Chiudi (Close)**, tap the background, or press Esc to return to the workout.

### Notes from previous weeks

Below the exercise, **Note degli allenamenti precedenti (Notes from previous workouts)** collects text, links, and photos from saved sessions of the same exercise. The most recent record is expanded; older records can be expanded individually.

The current session and later weeks of the same program are excluded from this collection. Previous notes remain associated with their original records: viewing them during a new session does not copy them into the new text field.

Photos and links are also available in **History**. Its **Modifica note (Edit notes)** button updates a past record’s note text.

## Planning the next session’s weight

For accessories, enable **Modificare il carico la prossima volta? (Change the weight next time?)** and enter:

- the next weight in kg;
- separate left/right weights, where supported;
- an optional note.

The setting is saved automatically in the current session and attached to the exercise history when the session is recorded. In the next session, the app checks the plan saved in the latest available performance.

The **Avevi programmato… (You had planned…)** banner shows the weight and any note. **Applica a tutte (Apply to all)** appears below the text and applies the value to editable sets that have not been completed.

## Rest periods and the iPhone timer

Each exercise has a customizable rest period: **2 minutes** by default, with a range of **15 seconds–10 minutes**. The duration is remembered per exercise.

Start a rest period using its button or by completing a set or unilateral side. The bar shows the exercise and remaining time; **Annulla (Cancel)** stops the app’s internal rest timer.

Preferences control the bar, cancel button, sound, notification, forgotten-rest reminder, and opening summary. The reminder works while the app is open and when you return; it does not provide the same background behavior as a system timer.

### iPhone system timer

When enabled in **Plan**, starting a rest period launches an iPhone shortcut named exactly **Recupero PL**, passing the duration in seconds.

Basic setup in Shortcuts:

1. Create a shortcut named **Recupero PL**.
2. Use the shortcut input as the duration for the Start Timer action.
3. Set the unit to **seconds** and authorize execution when prompted.

**Canceling the rest period in the app does not cancel the iPhone timer or launch the stop shortcut.** Stop the system timer using the iPhone’s own controls. If an older shortcut contains a branch for empty input, the app’s Cancel button does not invoke that branch.

The internal timer uses an expiration timestamp to realign the countdown when the app reopens. If it expired more than two minutes ago, it is discarded without a late alert. Browser sounds and notifications depend on permissions and the device’s background restrictions.

## History and data exchange

### Display

Workouts are grouped by program, with the current program first. Details remain **fully expanded**: exercises, sets, kg, reps, sides, notes, and photos.

The date is small, horizontal, and placed above the **X** button. Rest days have dedicated cards. Empty workouts recorded from Plan are labeled as having no set details.

Deleting a record requires confirmation and also updates the Plan and per-exercise log.

### Per-exercise log

The exercise log is shared across recognized programs and retains up to **50 sessions per exercise**. The **Volta scorsa (Last time)** line shows the previous performance, excluding the current session.

Program sessions are identified by program, week, and day. In-progress set data also includes the exercise identity. Different programs with identical week names must not accidentally share session data.

### Export and import

| Format | Purpose |
| --- | --- |
| Native History CSV | Exporting sets and importing them into a known program. |
| Hevy CSV, Strong format | Transferring completed sets with recorded values; import support depends on the destination app. |
| Hevy/Strong CSV for extra accessories | Reading an external session to record as accessories. |
| JSON backup | Full state copy, including photos. |
| DOCX | Exporting the training program. |

History import requires at least `week`/`settimana`, `day`/`giorno`, and `exercise`, and must match a program present in the app. You can add records or replace History; replacement requires the CSV to include all programs already present.

The native CSV handles separate unilateral values. CSV **does not replace a JSON backup**: it does not preserve the complete state and photos.

### Extra accessories

From **Today → Workout → Accessories**, or from Plan, you can record a session outside the program. The table collects exercise, sets, reps, kg, and notes, with options to add or remove rows.

CSV import can read Hevy, Strong, or this app’s exports. If a file contains several sessions, choose the one to use. Consecutive rows for the same exercise are grouped.

## Editing the program

Edits in **Program** stay in a **draft** until you press **Applica (Apply)**. Today continues to use the applied program.

| Area | Actions |
| --- | --- |
| Giorno — Day | Edit exercises, prescriptions, classifications, notes, and order. |
| Matrice — Matrix | Compare and edit prescriptions across weeks. |
| Statistiche — Statistics | View estimated volume and duration. |
| Strumenti — Tools | Copy days/weeks, generate progressions, apply deloads, manage versions, and export. |

The editor lets you choose the scope of changes, add or remove exercises, and build prescriptions from blocks. Tools also let you duplicate or rename a program, create an empty one, or restore the coach’s program.

The app retains the coach’s original baseline and versions of applied changes. When you reimport an update to the same program, it tries to reapply local edits and asks how to handle conflicts.

Completed records remain historical snapshots. Session data incompatible with changed prescriptions is preserved in the archive shown in preferences. Statistics are estimates based on recognized notation.

## Storage and backups

Data is stored in the browser or installed PWA on the device:

| Storage | Contents |
| --- | --- |
| `localStorage`, key `powerapp_v1` | Programs, maxes, sets, history, text notes, photo references, planned weights, and preferences. |
| IndexedDB, database `powerapp_media_v1` | Note images compressed on the device. |
| Notification server, if configured | Push subscriptions. |

The overall workout history is not automatically truncated to 100–200 workouts. The compact per-exercise log has a 50-session limit; available browser storage also remains a constraint.

Workouts do not automatically sync between devices. Changing the domain, browser profile, or device requires transferring data through a backup.

### Creating and restoring a backup

**Plan → Scarica backup dati (.json) (Download data backup)** creates `powerlifting-backup-YYYY-MM-DD.json`, containing the state and embedded images. The current backup format uses `backupVersion: 3`.

**Plan → Ripristina backup (.json) (Restore backup)** asks for confirmation and replaces the current state with the file’s contents. Images receive new identifiers during restoration to avoid overwriting existing images during transfer. Popups are not reopened from the backup.

If a required photo is missing from local storage, export reports an error. If downloading from the installed PWA fails, try opening the site in the browser that holds the data and repeat the backup.

Clearing site data also deletes local storage databases. Download a full backup first. The app displays a save warning when storage is full.

### Migrating older data

The schema v2 migration converts the old exercise log, session keys, and rest times. A backup may be offered before migration. The app-state schema and backup-file format use separate version numbers.

## Project structure and local development

The project consists of a static frontend and three server functions for push notifications. The frontend requires no build step.

| Repository path | Role |
| --- | --- |
| `index.html` | Entry page, loading JSZip, script, and stylesheet, and registering the service worker. |
| `script.js` | DOCX import, interface, workouts, parser, notes, photos, timers, editor, CSV, and push client. |
| `style.css` | Layout, themes, and device adaptation. |
| `coach.jpg` | Home image, app icon, and notification image. |
| `manifest.json` | PWA installation: name, colors, `/` start URL, and standalone display. |
| `sw.js` | Receiving push messages, displaying notifications, and opening the app. |
| `api/vapid.js` | Returns the public VAPID key to the client. |
| `api/subscribe.js` | Saves or removes subscriptions in Redis. |
| `api/cron.js` | Sends reminders to registered subscriptions. |
| `package.json` | ESM Node modules and dependencies: `web-push` (`^3.6.7`) and `@upstash/redis` (`^1.34.0`). |
| `vercel.json` | Two cron schedules and service worker headers. |
| `README.md` | Usage, configuration, and maintenance instructions. |

**The three files `subscribe.js`, `cron.js`, and `vapid.js` must be inside `api/`**, even if individual attachments were downloaded without their folder path. Rename downloaded files such as `index(4).html`, `script(6).js`, `style(5).css`, and `README(2).md` to `index.html`, `script.js`, `style.css`, and `README.md`, respectively.

### Running the interface locally

From the app directory:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`. This server runs the interface but does not execute `/api/*` functions. DOCX import requires JSZip to be available from the CDN.

### Running with Vercel functions

Install dependencies and link the directory to the Vercel project:

```bash
npm install
npx vercel link
npx vercel env pull .env.local
npx vercel dev
```

APIs require credentials for the relevant environment. If `vercel dev` requests a Development Command for the Other preset, configure a static server listening on the port specified by Vercel. The project does not define npm `dev`, `build`, or `test` scripts.

The `.env.local` file contains secrets: exclude it from the repository. Local development does not automatically run cron schedules; call the endpoint to test them.

### Service worker and offline use

The supplied `sw.js` handles `install`, `activate`, `push`, and `notificationclick` events. It does not cache pages, scripts, or documents: **this version does not guarantee offline use**, even though it is installable as a PWA.

The headers in `vercel.json` configure `/sw.js` with:

- `Cache-Control: no-cache, no-store, must-revalidate`;
- `Service-Worker-Allowed: /`.

## Notifications and deployment

### 1. Prepare and import the repository

1. Organize every file using the names and paths in the table above.
2. Upload the complete project to GitHub, including `api/`, the image, manifest, and Vercel configuration.
3. On [Vercel](https://vercel.com), create a project and import the repository.
4. Set **Root Directory** to the directory containing `index.html`, `package.json`, `vercel.json`, and `api/`.
5. Select **Framework Preset: Other**. This project has no build step: leave Build Command empty, enabling its override if needed. Static files are in the root; do not select a nonexistent `dist` directory. For this structure, Output Directory is `.`.
6. Keep dependency installation from `package.json` enabled and configure the environment variables before the final deployment.

Reference: [Vercel build configuration](https://vercel.com/docs/builds/configure-a-build).

### 2. Configure Redis / Upstash

Create an Upstash Redis database and connect its credentials to the Vercel project through the available integration or environment variables.

The code accepts either pair:

| REST URL | REST token |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` | `UPSTASH_REDIS_REST_TOKEN` |
| `KV_REST_API_URL` | `KV_REST_API_TOKEN` |

One complete pair for the same database is sufficient. When both prefixes are present, the code prefers `UPSTASH_*` variables.

Redis stores push subscriptions: the `push:subs` set contains references to `push:…` records. Workouts and photos stay on the device, rather than in this database.

### 3. Generate VAPID keys

Generate a Web Push key pair:

```bash
npx web-push generate-vapid-keys
```

Copy the Public Key and Private Key to the corresponding project variables. `/api/vapid` supplies the public key to the app; the private key remains on the server. Keep the same pair across updates. If you change it, you may need to disable and re-enable notifications on the devices.

### 4. Set environment variables

In the Vercel project’s **Environment Variables** settings, configure **Production**. Configure the relevant environments as well if you need the backend in preview deployments or local development.

| Name | Value |
| --- | --- |
| `VAPID_PUBLIC_KEY` | Public Key generated in the previous step. |
| `VAPID_PRIVATE_KEY` | Private Key from the same pair. |
| `VAPID_SUBJECT` | Sender contact, such as `mailto:your-email@example.com`. |
| `CRON_SECRET` | A private random string used to authorize cron calls. |
| `UPSTASH_REDIS_REST_URL` | Database REST URL, or `KV_REST_API_URL`. |
| `UPSTASH_REDIS_REST_TOKEN` | Database REST token, or `KV_REST_API_TOKEN`. |

To generate a random secret, if OpenSSL is available:

```bash
openssl rand -hex 32
```

Example `.env.local`, to fill with your own values and exclude from version control:

```dotenv
VAPID_PUBLIC_KEY=YOUR_PUBLIC_KEY
VAPID_PRIVATE_KEY=YOUR_PRIVATE_KEY
VAPID_SUBJECT=mailto:your-email@example.com
CRON_SECRET=YOUR_RANDOM_SECRET
UPSTASH_REDIS_REST_URL=YOUR_REDIS_URL
UPSTASH_REDIS_REST_TOKEN=YOUR_REDIS_TOKEN
```

Redeploy after adding or changing variables. Do not put the private key, Redis token, or cron secret in HTML, client-side JavaScript, or the repository.

### 5. Install the app and enable notifications

**iPhone:** open the HTTPS URL in Safari, choose **Share → Add to Home Screen**, launch the app from its icon, and go to **Plan → Attiva notifiche (Enable notifications)**. Allow notifications when prompted.

**Android:** open the HTTPS URL in a compatible browser, install the app through its menu, and enable notifications from Plan.

Activation retrieves the public key, creates or reuses the device subscription, and sends it to `/api/subscribe`. Disabling notifications asks the server to remove the subscription and unsubscribes locally.

### 6. Configured cron schedules

The supplied `vercel.json` contains the following entries:

```json
{
  "crons": [
    { "path": "/api/cron", "schedule": "0 5 * * *" },
    { "path": "/api/cron", "schedule": "0 6 * * *" }
  ]
}
```

| Schedule | UTC | Italy, standard time | Italy, daylight saving time |
| --- | --- | --- | --- |
| `0 5 * * *` | 05:00 | 06:00 | 07:00 |
| `0 6 * * *` | 06:00 | 07:00 | 08:00 |

**These trigger two sends per day**, rather than alternatives automatically selected according to daylight saving time. `cron.js` does not filter by time zone or check whether the user has already logged training or rest. Each authorized invocation attempts delivery to every subscription.

Notifications use the same tag, `allenamento-mattina`. The device may group or replace them, but the tag does not prevent the second server-side send.

For a single send at 07:00 Italian time, keep one expression and adjust it when the clocks change, or use an external scheduler set to **Europe/Rome** and disable duplicate Vercel schedules. The scheduler must authenticate requests as described below.

On Vercel Hobby, each cron job must run no more frequently than once per day and may start at any point during the scheduled hour. Check the [current cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing) before changing the frequency.

### 7. Cron authentication and testing

With `CRON_SECRET` configured, Vercel automatically includes its value in the `Authorization: Bearer …` header. This project’s backend also accepts `x-cron-secret` or the `key` query parameter.

For an external scheduler, prefer the authorization header. If the service only supports a URL, the accepted format is `https://YOUR-PROJECT.vercel.app/api/cron?key=YOUR_SECRET`; treat the entire URL as private.

Example manual request using your own environment variables:

```bash
curl --fail-with-body \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "https://YOUR-PROJECT.vercel.app/api/cron"
```

**This request actually sends a notification to every subscribed device.** Do not repeatedly invoke it as a simple availability check.

Useful responses:

| Result | Meaning |
| --- | --- |
| `401 Unauthorized` | Secret missing or not matching. |
| `200`, `sent: 0`, `No subscribers` | No subscriptions registered. |
| `200`, with `sent`, `failed`, and `cleaned` | Successful sends, failed sends, and removed subscriptions. |
| `500` | Check credentials, dependencies, and function logs. |

The cron removes expired subscriptions reported with 404/410 errors. It sends a payload with `coach.jpg`, high priority, and a 12-hour TTL.

The **Invia notifica di prova (Send test notification)** button in Plan instead calls `showNotification` on the device. It confirms local display, but **does not test Redis or server-side Web Push delivery**. To check the complete flow, enable notifications, make one authorized cron test call, and inspect the result and logs.

Reference: [Managing and securing Vercel cron jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

### 8. Opening a notification

`sw.js` displays the received message with its icon and, where supported, image. Clicking it focuses an existing app window or opens one, navigating to `/?prompt=1`.

The client recognizes `?prompt=1` and `?from=notif` and opens the training/rest selection. This selection may also appear on the first visit of the day if no answer has been recorded.

The service worker requests that the notification remain visible until interaction, but image rendering and persistence depend on the system. Push subscriptions do not sync workouts between devices.

## Updating the files

1. Download a complete data backup from the app.
2. Update changed repository files using their actual names. For frontend fixes, these are `index.html`, `script.js`, and `style.css`.
3. Keep `coach.jpg`, `manifest.json`, `sw.js`, `package.json`, `vercel.json`, and `api/` in the complete project.
4. Push to the branch connected to Vercel or deploy with the CLI. After environment-variable changes, create a new deployment.
5. Check deployment status and, for notifications, function logs and cron schedules. Then reload the app.

Versioned references such as `script.js?v=…` and `style.css?v=…` help request updated assets. Use the same domain and browser/PWA environment to retain access to local data. A normal file update does not require clearing site data.

## Troubleshooting

| Problem | Check or solution |
| --- | --- |
| The document will not import | Use `.docx` and check tables, SETT headers, and GIORNO rows. |
| JSZip is unavailable | Check connectivity and CDN access. |
| Weight is not calculated | Check classification, max, and the percentage reference. |
| A dependent block cannot be completed | Record its reference MAV or top set first. |
| Today still shows the old prescription | Apply the draft in Program. |
| Previous notes do not appear | Check that the workout was saved and the exercise recognized. The current session and future weeks of the same program are excluded. |
| A photo is unavailable | You need the device’s image database or a full backup containing photos. CSV does not contain them. |
| The iPhone timer continues after Cancel | This is expected: stop it using the iPhone’s system controls. |
| The browser rest timer is silent in the background | Check permissions and volume; on iPhone, configure the system timer. |
| Data is missing on another device | Transfer it using the JSON backup. |
| Plan indicators look wrong | Check History records, which are used to rebuild the Plan. |
| The interface still shows an older version | Reload the app and verify that updated HTML, script, and CSS were deployed together. |
| A storage-full warning appears | Download a backup before clearing data or making further changes. |
| Notifications do not work | Check permissions, Home Screen launch on iPhone, the VAPID endpoint, and subscription saving. Then check Redis and cron logs. |
| `/api/vapid` returns 500 | Configure `VAPID_PUBLIC_KEY` and redeploy. |
| `/api/subscribe` returns 500 | Check the Redis REST URL/token and their availability in the deployed environment. |
| `/api/cron` returns 401 | Check `CRON_SECRET`, the authorization header, and that a deployment followed the variable change. |
| Two reminders arrive each day | The supplied configuration contains two cron jobs: choose the schedule you want. |
| The local notification test works, but reminders do not | The test button does not call the server. Check the subscription, Redis, and cron invocation. |
| A function returns 404 | All three backend files must be in `api/` under the Vercel project’s Root Directory. |

## Checking changes

For a functional check, cover DOCX import, individual and full exercise completion, unilateral sets, unlocking, notes in later weeks, photo viewing, rest cancellation, backup/restore, and CSV import/export.

An earlier README listed a test suite under `tests/`. If that directory is present in the complete repository, see `tests/README-TEST.md` for dependencies and commands. This document does not certify that the suite has been run or report numerical test results.
