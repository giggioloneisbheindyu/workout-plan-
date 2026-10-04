# Powerlifting Program

A web app (PWA) for reading and using the coach's training program: you load the `.docx` file, the app converts percentages into kg, guides you workout by workout, records sets and weights, starts rest timers, and sends you a morning reminder.

All logic runs in the browser (`script.js`). The server (Vercel) only serves the static files and the three APIs for push notifications.

---

## Table of Contents

1. [Features overview](#features-overview)
2. [The three screens](#the-three-screens)
3. [Importing the program (.docx)](#importing-the-program-docx)
4. [How the program text is read](#how-the-program-text-is-read)
5. [Workout: sets, weights and rules](#workout-sets-weights-and-rules)
6. [Rest timer](#rest-timer)
7. [Accessories (extra, outside the program)](#accessories-extra-outside-the-program)
8. [Plan: weeks and Mon-Sun calendar](#plan-weeks-and-mon-sun-calendar)
9. [History, CSV export and import](#history-csv-export-and-import)
10. [Push notifications and daily popup](#push-notifications-and-daily-popup)
11. [Saved data and limits](#saved-data-and-limits)
12. [Project structure](#project-structure)
13. [Vercel deployment](#vercel-deployment)
14. [Local development](#local-development)
15. [Troubleshooting](#troubleshooting)

---

## Features overview

| Area | What it does |
|------|---------|
| **Import program** | Reads the coach's `.docx` directly on the phone (nothing is uploaded to the server) |
| **Automatic kg** | Converts % into kg using your squat, bench press and deadlift maxes, rounding to 2.5 kg |
| **Text parsing** | Recognizes `5x3s`, `70%`, `@8` (RPE), and sequences such as `10-8-6-4` and displays them in a readable format; `3x8` is used to count sets and reps |
| **Today** | Choose rest or training, then the program day; checklist with sets and weights |
| **Set log** | One card for each set with kg and reps; tap it to mark it as done |
| **Main lift rules** | Kg and reps are locked by the program; with RPE you can edit only the kg |
| **Program accessories** | Free-entry fields, prefilled with the values from the previous week |
| **Unilateral exercises** | Separate sets for the left and right side |
| **Rest timer** | Per-exercise timer with customizable duration, sound, vibration and notification |
| **Exercise history** | Under each exercise you can see the latest sessions (kg x reps and date) |
| **Extra accessories** | Log a session outside the program, including CSV import from Hevy / Strong |
| **Plan** | Maxes, notifications, weeks with 7 editable Mon-Sun dots |
| **Workout history** | All workouts grouped by program, with delete and CSV export/import |
| **Program switching** | You can load a new program without losing the history of older ones |
| **Calendar** | Link for adding the workout to Google Calendar with exercises and kg |
| **Push notifications** | Morning reminder, enabled/disabled from the Plan, with a test notification |
| **Daily popup** | “What day is it today?” on the first access of the day or when tapping the notification |
| **Theme** | Light or dark depending on system preferences |
| **PWA** | Installable on the Home Screen of iPhone and Android |

---

## The three screens

The bottom bar has three tabs: **Today**, **Plan**, **History**. If you have not loaded a program yet, Today and Plan show the “Load the program” card.

### Today

- At the top: today's date, the current week name, and progress (“X of Y completed”) with a progress bar.

- If you have not answered yet for today, **“What day is it today?”** appears with **Rest** and **Workout**.

- After **Workout**, choose **Day N** (with the focus: Squat, Bench, Deadlift, or “Accessories”) or **Accessories**. Already completed days have a checkmark. Each day has a different color (red, blue, orange, green).

- If you have already logged the day, you see the status (“Workout completed” or “Rest day”) and can use **Change answer**.

- The home screens display the coach's motivational image (`coach.jpg`).

### Plan

- **Maxes** (kg) for squat, bench press and deadlift. Initial values: 210 / 110 / 265. The field accepts only numbers greater than zero; otherwise, it restores the previous value and shows a warning.

- **Notifications**: enable, disable, send a test notification.

- **Weeks**: list of all weeks in the program with the 7 Mon-Sun dots (see below).

- **New program**: button for changing the `.docx` file.

### History

- CSV export and import tools.

- All recorded workouts, grouped by program (see below).

---

## Importing the program (.docx)

The file is read on the device using JSZip (loaded from cdnjs) and analyzed in `parseDocx`. Therefore, an internet connection is required the first time the library is downloaded.

The parser looks for the following in Word tables:

- a header row with at least two cells such as **SETT 0.1**, **SETT 1.2**, ... (each cell is a week);

- rows **GIORNO 1**, **GIORNO 2**, ... that open a new day;

- under each day, one row per exercise: the first column is the name, and the following columns contain the text for each week;

- if a row has only one text cell, that text is applied to all weeks.

Weeks are sorted according to the number after the dot.

### Automatic exercise classification

| Type | How it is recognized |
|------|-------------------------|
| Warm-up | The name contains “riscaldamento” or “pre”. No sets or timer |
| Squat | The name contains “squat” (including variations, which use the squat max) |
| Bench | The name starts with “panca” (incline bench does not use the max and has no calculated kg) |
| Deadlift | The name contains stacco, regular or sumo |
| Accessory | Everything else (not warm-up and not a main lift) |

If the file is invalid, an error appears (“No table with weeks found”). **PDF files are not supported**.

### Program catalog and switching programs

- When you load a new program, the current one is archived and the workout history is **not** deleted.

- If you reload a file with the same name (or the same title), the app finds the known program again and reuses its identifier, so the history remains linked.

- The catalog stores up to 30 programs.

- After switching, the Plan is rebuilt from the history.

---

## How the program text is read

The text of each exercise is reformatted in `fmt`:

| In the file | In the app |
|----------|----------|
| `5x3s` (reps x sets, with the final “s”) | “3 sets × 5 reps” with the two numbers highlighted |
| `70%` on a main lift | `70%` with the calculated **kg** next to it, based on the max and rounded to 2.5 kg |
| `70%` with “del ...” (e.g. “% del 1RM di panca”), with “MAV” or on an accessory | “not based on max” label, without kg calculation |
| `@8` | **RPE 8** badge |
| `10-8-6-4` (3 or more numbers) | Badge with “4 sets: 10 · 8 · 6 · 4 reps” |

### Number of sets (`parseSets`), in order:

1. a sequence such as `10-8-6-4` or `5-5-5`: one set per number, with the target reps;

2. `NxMs` (e.g. `5x3s`): M sets of N reps;

3. `NxM` (e.g. `3x8`): N sets of M reps;

4. “3 sets” or “4 sets”;

5. otherwise, 3 sets.

The prescribed weight for a main lift is the percentage in the text applied to the max, rounded to 2.5 kg.

---

## Workout: sets, weights and rules

During the workout (Today tab, after choosing the day) you see:

- header with week, day, focus, completed exercises and progress bar;

- for each exercise: number (or checkmark), name, formatted text, set cards, timer row and recent history;

- **workout time** selector (default 17:00) and **Add to calendar** link;

- **Workout finished**, **Mark finished anyway**, **Change day**, **Back to home** buttons.

### Set cards

Each set is a card with kg and reps. The rules change depending on the exercise type:

| Type | Kg | Reps |
|------|----|-----|
| **Main lift without RPE** | Fixed by the program (from %) | Fixed by the program |
| **Main lift with RPE** | Editable | Fixed by the program |
| **Accessory** | Free | Free (with target if provided by the program) |
| **Unilateral** | Free, one per side | Free, one per side |

Interactions and automation:

- **Tap the set card**: marks it as done and starts the rest timer. Tap again to undo. A completed set becomes read-only until unlocked.

- **Kg propagation**: when you enter the kg for a set and leave the field, the value is suggested for subsequent sets that are still empty (and for unilateral exercises, also for the other side).

- **Previous-set suggestion**: the placeholder shows the kg of the last completed/filled set.

- **Accessory prefill**: if the fields are empty, they are filled with kg and reps from the same day of the previous week (from the program or, if unavailable, from the load history). Under the set, “Previous (week): kg x reps” appears.

- **Never lose what you type**: entered kg and reps are saved before every screen update.

### Unilateral exercises

An exercise is unilateral if its name or text contains “monolaterale”, “mono laterale”, or “unilateral”. For each set there are two blocks, **Left** and **Right**: tap a side to mark it as done and start the recovery. A large button marks the entire set (L + R). The set is complete when both sides are done.

### Completing an exercise

Tap the exercise number or name:

- if not all sets are done, the app asks for confirmation and then marks **all** of them as done;

- tapping the completed exercise again returns it to not done and unlocks the sets.

### Ending the workout

- **Workout finished** is enabled when all exercises are checked; otherwise the button shows “N exercises remaining” and you can use **Mark finished anyway**.

- At the end, the app saves the load history for every exercise, records the workout in History, updates the Plan and, if all days of the week have been completed, moves to the next week.

### Exercise history

Under each exercise (except warm-ups) you see the latest 4 sessions in the format `kg×reps` with the date. For each exercise, the app keeps up to 40 sessions.

### Google Calendar

**Add to calendar** opens Google Calendar with an event at your preferred time, duration 1 hour 30 minutes, title “focus – week Gn”, and all exercises with the calculated kg in the details.

---

## Rest timer

- Every non-warm-up exercise has a **Start m:ss** button and a **Time** button to change the duration.

- Default: **2:00**. Allowed range: 15 seconds to 10 minutes. The time is saved **per exercise**.

- The **Rest time** selector has −15s / +15s, −1 min / +1 min and shortcuts 1:00, 1:30, 2:00, 3:00, 4:00, 5:00.

- The timer also starts by **tapping a set** (or a side in unilateral exercises).

- A bar at the top shows “Rest · exercise name” with the countdown and **Stop**.

- At the end: three-tone sound (Web Audio), vibration on supported devices, notification “Rest finished” (the app asks for permission if you have not granted it yet), and the bar changes to “Done!” with a **Close** button.

- The countdown is based on the end time, so it remains accurate even if the screen is slowed down. Keep the screen active to hear the sound.

---

## Accessories (extra, outside the program)

These are used to record an accessory session not included in the program. They can be opened from **Today > Workout > Accessories** or from **Plan** by tapping a day.

The popup contains an **Exercise / Set / Rep / Kg** table:

- the Exercise field suggests the names of accessories present in the program;

- **Add exercise** adds a row, while **X** removes it;

- consecutive rows with the same name are grouped into the same exercise;

- the number of sets ranges from 1 to 20.

### Loading a CSV

Using the “Load CSV from Hevy” button:

- supported formats: Hevy (Export Workouts), Strong, and this app's export;

- accepts files using commas or semicolons;

- skips warm-up sets and timer rows;

- if weights are in pounds, converts them to kg (rounded to 0.5);

- identical consecutive sets become a single row (e.g. 3 sets x 10 reps x 20 kg);

- if the CSV contains multiple workouts, a menu appears to choose which one to use.

Final buttons: **Save**, **Leave empty** (marks only the day) and **Cancel**. Saving updates History, load history and Plan.

---

## Plan: weeks and Mon-Sun calendar

Each program week is a card with 7 dots:

| Dot | Meaning |
|---------|-------------|
| Red with number | Day N workout |
| Red with “C” | Accessories |
| Red with checkmark | Workout without a program day |
| Blue with dash | Rest |
| Gray | Not recorded |

Tapping a card selects that week as the current one. Tapping a day opens the editing panel:

1. **Workout**: choose Day N (or Accessories). For program days, choose how to save it:

   - **With weights and reps**: opens a popup with all exercises where you can enter kg and reps (optional); exercises without values are still considered completed;

   - **Empty workout**: marks only the day, without set details.

2. **Rest**: records rest for that day.

3. **Delete**: deletes the record, with **double confirmation**.

4. **Cancel**.

The delete icon next to the week name **resets** all workouts for that week, with double confirmation.

**The Plan is not a copy: it is always rebuilt from History.** If you delete or import workouts, the dots update accordingly.

---

## History, CSV export and import

### List

- Workouts are **grouped by program**: the title is the `.docx` file name, the current program is marked and appears first.

- Each workout shows date, week, day, focus, how many exercises were completed out of the total, and for each set `kg x reps` with a checkmark if completed. Unilateral exercises show L and R.

- Workouts marked from the Plan without details show “Marked from Plan (without set details)”.

- Rest days appear as dedicated cards.

- The delete icon removes the entry, with **double confirmation**, and updates the Plan.

### Export CSV

The export button downloads `workout-history-YYYY-MM-DD.csv` with one row per set and the columns:

`workout_id, date, at, prog_id, prog_name, week, day, title, exercise, warm, main, exercise_done, set_n, kg, reps, set_done`

### Import CSV

- The CSV must contain at least the columns `week` (or `settimana`), `day` (or `giorno`) and `exercise`.

- Each workout must correspond to a program **present in the app** (current or previous); otherwise the import is rejected with the list of known weeks. If you have no program, load a `.docx` first.

- If History is not empty, choose between **REPLACE** (OK) or **ADD** (Cancel). To replace, the CSV must contain all programs already present in History.

- When adding, entries with an existing identifier are ignored.

- At the end of the import, the Plan is rebuilt.

---

## Push notifications and daily popup

### Activation (from Plan)

- **Enable notifications**: asks for permission, gets the public VAPID key from `/api/vapid`, creates the Web Push subscription and saves it to Redis through `/api/subscribe`.

- **Disable notifications**: removes the subscription from the server and device.

- **Send test notification**: immediately shows a local notification.

- On iPhone, the app must be added to the Home Screen and opened from its icon.

### What happens when it arrives

- The service worker (`sw.js`) shows the notification with the `coach.jpg` icon and image; it remains visible until you interact with it.

- Tapping the notification opens (or brings to the foreground) the app at `/?prompt=1`.

- The app recognizes `?prompt=1` (or `?from=notif`) and immediately opens the **“What day is it today?”** popup with Rest / Workout options.

### Daily popup

It appears automatically on the **first access of the day**, if the day has not yet been recorded. The **Later** button closes it. If you switch tabs while it is open, it closes to prevent stuck screens.

### Schedule

The cron jobs in `vercel.json` are two, at 05:00 and 06:00 UTC (about 07:00 in Italy, depending on daylight saving time). For a fixed 07:00 Europe/Rome schedule you can use an external service such as cron-job.org:

```
https://YOUR-PROJECT.vercel.app/api/cron?key=YOUR_CRON_SECRET
```

---

## Saved data and limits

Everything stays in the browser/PWA `localStorage`, under the key `powerapp_v1`:

- loaded program, current week, maxes;

- exercise checkmarks, set log (kg, reps, completed, left/right sides);

- Mon-Sun register for each week;

- workout history, program catalog, load history per exercise;

- rest seconds per exercise, workout time, notification state;

- screen state (popup, selected day, etc.).

Storage limits: 30 programs in the catalog, approximately 100-200 workouts in history, 40 sessions per exercise.

Clearing site data resets everything on that device: export the CSV first. On the server (Redis), only push subscriptions remain.

---

## Project structure

```
├── index.html          # HTML shell + PWA meta
├── script.js           # App logic (program, UI, logging, timer, CSV, client push)
├── style.css           # Styles (light/dark theme)
├── coach.jpg           # Home image, app icon and notification image
├── sw.js               # Service Worker (push and notification click)
├── manifest.json       # “Add to Home Screen” installation
├── package.json        # Node dependencies (web-push, @upstash/redis)
├── vercel.json         # Cron and service worker headers
├── README.md
└── api/
    ├── subscribe.js    # Save/remove the push subscription
    ├── cron.js         # Send scheduled notifications
    └── vapid.js        # Expose the public VAPID key to the client
```

Note: the service worker only handles notifications; it does not cache the files, so the app **does not work offline**.

---

## Vercel deployment

### 1. Repository

1. Create a GitHub repo and upload **the entire folder**.

2. Go to [vercel.com](https://vercel.com) > **Add New Project** > import the repo.

3. Deploy with the default settings.

### 2. Upstash Redis (for notifications)

1. In the Vercel project > **Storage** > **Marketplace** > **Upstash** (Redis or KV).

2. Connect it to the project.

3. Verify that variables such as `KV_REST_API_URL` / `UPSTASH_REDIS_REST_URL` and `KV_REST_API_TOKEN` / `UPSTASH_REDIS_REST_TOKEN` appear. The code accepts both prefixes.

### 3. VAPID keys

```bash
npx web-push generate-vapid-keys
```

Copy the **Public Key** and **Private Key**.

### 4. Environment variables

Vercel > project > **Settings** > **Environment Variables** (Production):

| Name | Value |
|------|--------|
| `VAPID_PUBLIC_KEY` | Generated Public Key |
| `VAPID_PRIVATE_KEY` | Generated Private Key |
| `VAPID_SUBJECT` | `mailto:your-email@example.com` |
| `CRON_SECRET` | Long random string (e.g. `openssl rand -hex 32`) |

Then **Redeploy**.

### 5. Install the app on the phone

**iPhone (Safari)**

1. Open the site URL in Safari.

2. Share > **Add to Home Screen**.

3. Open it **from the icon** (not from a Safari tab).

4. **Plan** > **Enable notifications** > allow.

**Android (Chrome)**

1. Open the URL > menu > **Install app** / Add to Home Screen.

2. **Plan** > **Enable notifications**.

### 6. Cron schedules

| Cron | UTC | Italy (daylight saving time) |
|------|-----|---------------------------|
| `0 5 * * *` | 05:00 | about 07:00 |
| `0 6 * * *` | 06:00 | about 08:00 |

On Vercel's Hobby plan, cron starts “within that hour”.

---

## Local development

```bash
npm install

npx vercel dev
```

The environment variables are required (also in `.env`) and Redis is required if you test push notifications. To test only the interface and program, you can serve the static files with a local server, but the `/api/*` APIs require Vercel (or an equivalent Node setup).

---

## Troubleshooting

| Problem | What to check |
|----------|------------------|
| File cannot be selected | Only `.docx`, not PDF |
| “No table with weeks found” | SETT / GIORNO structure in Word |
| Import does not start | JSZip is loaded from cdnjs: an internet connection is required |
| Kg are not calculated for an exercise | The name is not recognized as a main lift, or the % is “del ...” / MAV |
| CSV import rejected | CSV must contain `week`, `day`, `exercise`, and the weeks must exist in a known program |
| CSV replacement rejected | CSV does not contain all programs already in History: export the complete history first or choose ADD |
| iPhone notifications | App added to Home Screen and opened from the icon |
| Cron does not run | `CRON_SECRET`, Redis, Vercel Functions logs |
| Timer cannot be heard | Vibration is only supported on some devices; keep the screen active and volume turned up |
| Plan dots are “wrong” | Plan follows History: check the entries or re-import the CSV |

---

## Notes

Personal project for use with the coach's program. There is no direct integration with paid workout-log services: history is internal to the app, with CSV export/import compatible with Hevy and Strong for reading.
