# Powerlifting Program

A web app (PWA) for reading and using the coach's training program: you load the `.docx` file, the app converts percentages into kg, guides you workout by workout, records sets and weights, starts rest timers, and sends you a morning reminder.

All logic runs in the browser (`script.js`). The server (Vercel) only serves the static files and the three APIs for push notifications.

---

## Table of Contents

1. [Features overview](#features-overview)
2. [The four screens](#the-four-screens)
3. [Importing the program (.docx)](#importing-the-program-docx)
4. [How the program text is read](#how-the-program-text-is-read)
5. [Workout: sets, weights and rules](#workout-sets-weights-and-rules)
6. [Per-exercise log (shared across programs)](#per-exercise-log-shared-across-programs)
7. [Rest timer](#rest-timer)
8. [Accessories (extra, outside the program)](#accessories-extra-outside-the-program)
9. [Plan: weeks and Mon-Sun calendar](#plan-weeks-and-mon-sun-calendar)
10. [Program editor](#program-editor)
11. [History, CSV export and import](#history-csv-export-and-import)
12. [Push notifications and daily popup](#push-notifications-and-daily-popup)
13. [Saved data and limits](#saved-data-and-limits)
14. [Project structure](#project-structure)
15. [Vercel deployment](#vercel-deployment)
16. [Local development and tests](#local-development-and-tests)
17. [Troubleshooting](#troubleshooting)

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
| **Program accessories** | Free-entry fields, prefilled with what you did the last time you performed that exercise (even in a different program) |
| **Unilateral exercises** | Separate sets for the left and right side, also kept separate in the history and prefill |
| **Rest timer** | Per-exercise timer with customizable duration, sound, vibration and notification |
| **Per-exercise log** | Each exercise has its own history, independent of the loaded program: a “Last time” line shows the previous session, and exercises with slightly different names are recognized as the same |
| **Extra accessories** | Log a session outside the program, including CSV import from Hevy / Strong |
| **Plan** | Maxes, notifications, weeks with 7 editable Mon-Sun dots |
| **Workout history** | All workouts grouped by program, with delete and CSV export/import |
| **Program switching** | You can load a new program without losing the history of older ones; the app recognizes whether a file is an update of a known program or a new one |
| **Program editor** | A dedicated tab to edit the program: exercise names, sets/reps/percentages, order, per week or for all weeks, with draft, versions, undo and re-application of your edits when the coach sends a new file |
| **Backup** | One-tap JSON backup of all app data from the Plan, and restore from a backup file |
| **Calendar** | Link for adding the workout to Google Calendar with exercises and kg |
| **Push notifications** | Morning reminder, enabled/disabled from the Plan, with a test notification |
| **Daily popup** | “What day is it today?” on the first access of the day or when tapping the notification |
| **Theme** | Light or dark depending on system preferences |
| **PWA** | Installable on the Home Screen of iPhone and Android |

---

## The four screens

The bottom bar has four tabs: **Today**, **Plan**, **Program**, **History**. If you have not loaded a program yet, Today and Plan show the “Load the program” card.

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

- **Download data backup (.json)**: saves a copy of all the app data (history, logs, settings).

- **Restore backup (.json)**: replaces all current data with the content of a backup file (see [Backup](#backup)).

### Program

The editor for the program itself (names, sets, reps, order, notes). See [Program editor](#program-editor).

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

Weeks are sorted according to the number after the dot (`SETT 1.2` → 2). If the same number appears more than once (for example two tables with `SETT 1.1–1.4` and `SETT 2.1–2.4`), the number before the dot is used first, so the blocks stay in order.

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

- **Same program or new one?** The app compares the new file with the known programs using two signals:
  - the **file name**, ignoring the extension, “(1)”, “copy”, “v2”, dates, accents and punctuation (`Scheda Gigi (1).docx` ≈ `scheda_gigi_v2.docx`);
  - the **exercises** in the file: how many of them also appear in the known program.

  If the name is similar (80% or more) **and** at least 70% of the exercises match, it is the same program: the identifier is reused, in-progress logs and history stay linked, and no question is asked. If only one of the two signals matches, the app asks “Update of the same program, or a new program?”. If neither matches, it is a new program.

- When the update keeps the same program, the current week is kept (clamped to the number of weeks in the new file), and the edits you made in **Program** are re-applied on top of the new file (see [Program editor](#program-editor)).

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

- **Accessory prefill**: if the fields are empty, they are filled with kg and reps from the **last time you performed that exercise**, in any program (see [Per-exercise log](#per-exercise-log-shared-across-programs)). Existing values are never overwritten. Under the set, “Previous (dd/mm): kg x reps” appears, with “other program” if it comes from a different program. For unilateral exercises, left and right are prefilled separately.

- **Never lose what you type**: entered kg and reps are saved before every screen update.

### Unilateral exercises

An exercise is unilateral if its name or text contains “monolaterale”, “mono laterale”, “unilateral” or the word “mono” (e.g. “Curl con manubri (mono)”). For each set there are two blocks, **Left** and **Right**: tap a side to mark it as done and start the recovery. A large button marks the entire set (L + R). The set is complete when both sides are done.

### Completing an exercise

Tap the exercise number or name:

- if not all sets are done, the app asks for confirmation and then marks **all** of them as done;

- tapping the completed exercise again returns it to not done and unlocks the sets.

### Ending the workout

- **Workout finished** is enabled when all exercises are checked; otherwise the button shows “N exercises remaining” and you can use **Mark finished anyway**.

- A workout started before midnight stays open for up to 12 hours, and it is logged with the date and weekday of when it **started**.
- At the end, the app saves the session into the per-exercise log of every exercise, records the workout in History, updates the Plan and, if all days of the week have been completed, moves to the next week.

### Exercise history

Under each exercise (except warm-ups) you see a **“Last time”** line with the previous session (date, sets, planned next load if any, and “other program” if it was done in a different program), followed by up to 3 older sessions. Sets are grouped (`3×10 @ 20 kg`); unilateral sets show both sides (`3× sx 18 kg × 10 / dx 20 kg × 10`). The app keeps up to 50 sessions per exercise.

### Google Calendar

**Add to calendar** opens Google Calendar with an event at your preferred time, duration 1 hour 30 minutes, title “focus – week Gn”, and all exercises with the calculated kg in the details.

---

## Per-exercise log (shared across programs)

Every exercise has its own log, **separate from the loaded program**. When you switch program and the same exercise shows up again, the app tells you what you did the last time and prefills it.

### How an exercise is recognized

Each name is normalized into an exercise identifier: lowercase, no accents or punctuation, notes in parentheses and filler words (“con”, “di”, “il”...) removed, common synonyms unified (DB → manubri, BB → bilanciere, ...), and “mono / monolaterale / unilateral” removed (the unilateral flag is handled separately). Then names are compared:

| Similarity | What happens |
|------------|--------------|
| 80% or more | Same exercise, automatically (`Curl manubri monolaterale` = `Curl con manubri (mono)`, `Leg curl` = `Leg Curl`) |
| 50–80% | When you load a program, the app asks once “Is it the same exercise as …?”. The answer is remembered |
| Below 50% | New exercise |

Names that differ by a **modifier or the equipment** are never merged automatically: `Panca` ≠ `Panca presa stretta`, dumbbell ≠ barbell, and the same goes for incline, pause, front, sumo, high/low, etc., because the loads are not comparable.

To merge two exercises manually, open the browser console, list the identifiers with `Object.keys(S.exReg)` and run `mergeExercises(fromId, toId)`; history, notes, rest times and in-progress logs are moved to the target.

### What is stored

For each exercise the app keeps up to **50 sessions**. A session contains: date, program, week, day, sets, note and the “next time” load.

- Sets are stored as `kg` + `reps` (and RPE if present). For unilateral exercises each set has a left and a right side.
- There is **one entry per program + week + day**: saving the same workout again updates it instead of adding a duplicate.
- The log is written when you finish a workout, when you save a workout from the Plan, when you save an accessories session, and when you import a history CSV.
- Deleting a workout from History (or resetting a week) also removes its entries from the exercise log.

### “Last time” and prefill

- The “Last time” line and the prefill use the most recent session of that exercise **in any program**, excluding the session you are currently editing. Week names are not used for matching, so two programs that both have “SETT 1.1” do not interfere.
- Prefill only fills **empty** fields and only for accessories. Main lifts are never prefilled: their kg come from the percentages.
- Sets are matched by position; if the new exercise has more sets than the last time, the last available set is reused.
- Unilateral / bilateral conversion: if the last time was bilateral and the exercise is now unilateral, left and right both start from the same kg; if the last time was unilateral and the exercise is now bilateral, the **lower** of the two sides is used.
- The planned “increase the load next time” value is taken only from the **latest** session of the exercise.

### In-progress session data

Sets that you are typing (not yet saved to the log) are stored with a key made of **program + week + day + exercise**. This means that (a) two programs with the same week names no longer overwrite each other, and (b) if an exercise is moved to a different row, its data follows the exercise instead of staying in the old position.

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

Final buttons: **Save**, **Leave empty** (marks only the day) and **Cancel**. Saving updates History, the per-exercise log and Plan.

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

## Program editor

The **Program** tab lets you change the loaded program without going back to the `.docx`. Everything you change goes into a **draft**; the rest of the app keeps using the current program until you press **Apply**.

### Screens (chips at the top)

| Tab | What it shows |
|-----|---------------|
| **Giorno** | Week chips, day chips and the exercises of that day as cards: name, prescription (with kg), type badge (**Fondamentale** / **Complementare** / **Riscaldamento**), “same in N weeks” or “different in …”, a dot if it differs from the coach's file, up/down buttons. Estimated session time and warnings at the bottom |
| **Matrice** | Weeks as columns, exercises as rows (main lifts only, or all). Tap a cell to edit that exact week |
| **Statistiche** | Sets, tonnage and average intensity per week with a bar chart, plus a preview with different maxes (not saved) |
| **Strumenti** | Copy, progression generator, deload week, add/remove days and weeks, checks, versions, export, new/duplicate program |

### Editing an exercise

Tap **Modifica** (or a cell of the matrix) to open the edit sheet:

- **Name**, with suggestions from the exercises the app already knows. Flags: Riscaldamento, or the lift it is (Squat / Panca / Stacco / none).
- **Variant** and **scheme** pickers for main lifts: change the variant (Squat con pause, Panca presa stretta…) or fill the prescription from a scheme (5x5, 3x3, top set RPE + back-off, istintiva…).
- **Prescription blocks**: each block is *Serie × rip*, *Percentuale*, *RPE*, *Istintiva* or free text; blocks are joined with `+`. A live preview shows how the app reads it (sets, kg from your maxes) and warns when the notation is not understood. You can also edit the raw text. Notation is the same one described in [How the program text is read](#how-the-program-text-is-read): `NxM` is *N sets of M reps*.
- **Notes**: your note and a coach note, both shown under the exercise during the workout.
- **Apply to**: only this week, all weeks, from this week on, only the weeks where it is still equal, or the weeks you choose. Only the parts you changed are overwritten, so changing the name does not touch the other weeks' prescriptions. Complementary exercises default to *all weeks*, main lifts to *this week only*.
- **Other actions** (they follow the chosen scope): move to another day, **temporary substitution** (with the option to share the original exercise's history, and a button to go back), duplicate, delete, and **restore as in the coach's file**.

Every row has a stable id (`sid`), the same in all weeks, so renaming or reordering an exercise keeps its weeks linked.

### Names and history

If you rename an exercise that already has history, the app asks whether it is **the same exercise** (history and “Last time” are kept) or a different one (separate history). Choosing a name the app already knows as a different exercise does not ask anything.

### Draft, apply, versions

- The bar at the top shows **Draft: N changes** with **Apply** and **Discard**. The draft is saved, so it survives closing the app.
- **Apply** saves the previous version (the last 5 are kept) and refreshes the program. **Annulla ultima applicazione** (or *Versioni* in Strumenti) restores a previous version, and the current one is kept so you can go back.
- Weeks you have already trained are marked ✓. Editing them asks for confirmation: the program changes, the workout history does not.
- If a day's exercises change order or number, the in-progress checkmarks of that day are cleared. Logged sets are keyed by exercise, so they are not lost.

### When the coach sends a new file

The program keeps the **original coach's version** (`base`) next to your edits. If you load a new `.docx` that the app recognizes as the same program:

1. your local edits (changed fields, added/deleted exercises, your order, weeks you added) are re-applied on top of the new file;
2. if the coach changed the same row you changed, the app asks once: keep your version for the conflicts, or use the coach's (your other edits stay);
3. the previous version is saved ("Prima del reimport del file") and a summary tells you how many edits were re-applied and how many could not be (for example because the coach renamed or removed the row);
4. a pending draft must be applied or discarded first (the app asks).

### Tools

- **Copy**: a day or a whole week onto another week, or into a new week at the end.
- **Progression generator**: pick a main lift, a range of weeks, starting %, + % per week, sets and reps.
- **Deload week**: lowers percentages and sets of a week; rows with notation that is not simple are left untouched and counted.
- **Days and weeks**: add a day, delete a day or a week.
- **Checks**: duplicate exercise in a day, empty prescription, unrecognized notation, days with a different number of exercises across weeks.
- **Export .docx**: writes the current program in the same table format the app reads (rows identical in all weeks become a single cell), useful to send it to the coach. A single-week program cannot be re-read by the importer, which needs at least two week columns.
- **New empty program** (name, weeks, days), **duplicate program**, **rename**, and **restore everything as in the coach's file** (as a draft).

### Limits

- Reordering uses the up/down buttons (there is no drag and drop). By default the order changes in all weeks; untick *Riordina in tutte le settimane* to change only the current one.
- The estimated duration uses each exercise's rest time plus about 45 seconds per set.
- Statistics count only percentage-based main lifts for tonnage, and need a recognizable number of sets.

---

## History, CSV export and import

### List

- Workouts are **grouped by program**: the title is the `.docx` file name, the current program is marked and appears first.

- Each workout shows date, week, day, focus, how many exercises were completed out of the total, and for each set `kg x reps` with a checkmark if completed. Unilateral exercises show L and R.

- Workouts marked from the Plan without details show “Marked from Plan (without set details)”.

- Rest days appear as dedicated cards.

- The delete icon removes the entry, with **double confirmation**, and updates the Plan.

### Export CSV

The export button downloads `storico-allenamenti-YYYY-MM-DD.csv` with one row per set and the columns:

`workout_id, date, at, prog_id, prog_name, week, day, title, exercise, warm, main, exercise_done, set_n, kg, reps, set_done, kg_l, reps_l, kg_r, reps_r`

For **unilateral** sets, `kg` and `reps` are empty and the left/right values are in `kg_l`, `reps_l`, `kg_r`, `reps_r`; the import restores both sides. CSV files exported by older versions (without these four columns) can still be imported.

### Import CSV

- The CSV must contain at least the columns `week` (or `settimana`), `day` (or `giorno`) and `exercise`.

- Each workout must correspond to a program **present in the app** (current or previous); otherwise the import is rejected with the list of known weeks. If you have no program, load a `.docx` first.

- If History is not empty, choose between **REPLACE** (OK) or **ADD** (Cancel). To replace, the CSV must contain all programs already present in History.

- When adding, entries with an existing identifier are ignored.

- At the end of the import, the Plan is rebuilt and the imported workouts are also added to the per-exercise log.

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

- workout history, program catalog, per-exercise log (`exLog`), exercise names and aliases (`exReg`, `exAlias`);
- the program with its coach's original (`prog.base`), the last 5 versions (`prog.versions`) and the unapplied draft (`progDraft`); every exercise carries a stable row id (`sid`);

- rest seconds per exercise, workout time, notification state;

- screen state (popup, selected day, etc.).

Storage limits: 30 programs in the catalog, approximately 100-200 workouts in history, 50 sessions per exercise.

`localStorage` is limited to a few MB. If saving fails (full storage), the app shows a warning once: download a backup from the Plan right away.

### Backup

**Plan > Download data backup (.json)** saves the whole app state in one file (`powerlifting-backup-YYYY-MM-DD.json`). On iPhone, downloads from the installed app may not work; if so, use the CSV export from History.

**Plan > Restore backup (.json)** loads a backup file: it asks for confirmation, then asks whether to download a backup of the current data first, replaces **all** current data and reloads the app. A file that is not a backup of this app is rejected without changing anything. Backups made before the per-exercise log existed are migrated automatically on reload (see below). Open-popup state (day prompt, rest picker, accessories draft, plan popup) is not restored.

On startup the app also discards the purely visual popups (day prompt, day editor, rest picker); the accessories draft and the plan popup are kept because they hold data you typed.

### Data migration (schema v2)

On the first launch after updating to the per-exercise log, the app migrates the old data automatically:

1. it offers to download a backup first;
2. it converts the workout history and the old per-exercise load history into the new per-exercise log (unilateral sides included);
3. it moves the in-progress logs, notes and “next time” plans of the current program to the new keys;
4. it moves the rest times to the new exercise identifiers.

If anything fails, the previous data is restored. The migration can be repeated safely. The old load history (`liftHistory`) is left in place but no longer read.

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
├── tests/              # Automated tests, sample programs, old-format state (see below)
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

## Local development and tests

```bash
npm install

npx vercel dev
```

The environment variables are required (also in `.env`) and Redis is required if you test push notifications. To test only the interface and program, you can serve the static files with a local server, but the `/api/*` APIs require Vercel (or an equivalent Node setup).

### Tests

The `tests/` folder (Node 18+, uses jsdom, no browser needed) contains:

| File | Purpose |
|------|---------|
| `test-unit-migrazione.js` | Migration of old data, exercise recognition, unilateral/bilateral conversion, double save, program switching with identical week names, program recognition |
| `test-bugfix.js` | Regression tests for bugs found in review: names with apostrophes/quotes in the rest-timer buttons, new program with the same file name not inheriting completed days, unilateral sets in the CSV round-trip, expired rest timer on app open, `window.focus` not overwritten |
| `test-extra.js` | Shared rest-timer tick, week ordering with repeated numbers, workout crossing midnight (kept open and logged with the start date), popups not restored on startup, backup restore (valid, cancelled, invalid and broken files) |
| `test-programma.js` | Program editor: ids, scopes, blocks, draft/apply/versions, reorder, add/delete/move, substitution, history on rename, locked weeks, statistics and checks, tools, notes, re-import merge with conflicts, `.docx` export round-trip, new/duplicate program |
| `test-e2e-ui.js` | Imports a real `.docx`, logs a workout, switches program, checks the rendered “Last time” line and prefill, and smoke-tests the Plan popup and History |
| `schede-esempio/*.docx` | Sample programs: base, same file re-downloaded `(1)`, similar program with a different file name (triggers the question), completely different program |
| `stato-vecchio.json` | App state in the old format, to try the migration (`localStorage.setItem('powerapp_v1', '<file contents>')` before updating) |
| `genera-schede.js`, `genera-stato-vecchio.js` | Regenerate the sample files |

```bash
cd tests
npm install
npm test            # APP_DIR=/path/to/app npm test if the tests are not inside the app folder
```

Expected output: `passati 45 falliti 0`, then `passati 11 falliti 0` and `smoke passati 13 falliti 0`, then `bugfix passati 20 falliti 0`, `extra passati 22 falliti 0` and `programma passati 108 falliti 0`. See `tests/README-TEST.md` for the manual test steps on the phone.

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
| The rest timer does not beep after reopening the app | By design: if the timer expired more than 2 minutes ago, it is silently discarded instead of ringing late |
| I edited the program but Today still shows the old one | Changes stay in a **draft** until you press **Apply** in the Program tab |
| After loading the coach's new file my edits are gone | They are re-applied only if the file is recognized as the same program; otherwise it is a new program. Use **Versioni** (Program > Strumenti) to go back to the version saved before the import |
| The export `.docx` cannot be read back | The importer needs at least two week columns (`SETT x.y`) |
| Plan dots are “wrong” | Plan follows History: check the entries or re-import the CSV |
| The app asks “Is it the same exercise as …?” | Normal for names that are only moderately similar; the answer is remembered. To fix a wrong answer, use `mergeExercises(fromId, toId)` from the console |
| The app asks “Update of the same program or a new one?” | The file name and the exercises only partly match a known program. OK = same program (logs kept), Cancel = new program |
| “Last time” is not shown for an exercise | The name is not recognized as the same exercise (modifier or equipment differs, e.g. “presa stretta”, dumbbell vs barbell) or no session was saved yet |
| “Unable to save data” warning | Browser storage is full: download the backup from the Plan and export the History CSV |

---

## Notes

Personal project for use with the coach's program. There is no direct integration with paid workout-log services: history is internal to the app, with CSV export/import compatible with Hevy and Strong for reading.
