# 🏋️ GymLog

🇬🇧 **English** · [🇵🇹 Português](README.pt.md)
 
![Status](https://img.shields.io/badge/status-done-brightgreen?style=for-the-badge)
![React Native](https://img.shields.io/badge/react_native-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Expo](https://img.shields.io/badge/expo-1C1E24?style=for-the-badge&logo=expo&logoColor=%23D04A37)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/sqlite-%2307405e.svg?style=for-the-badge&logo=sqlite&logoColor=white)
![Android](https://img.shields.io/badge/Android-3DDC84?style=for-the-badge&logo=android&logoColor=white)
 
> ✅ **The app is done and I use it every day.** I only make small adjustments now.
 
**GymLog** is a personal Android app to log gym workouts, body weight and diet, with a small day-to-day agenda. It runs **fully offline**: there is no server and no login, and all data is stored locally on the phone with SQLite.
 
I'm building it for my own training: I wanted a simple, fast app that works even with no signal at the gym, keeps my full history and shows my progress, without ads or subscriptions.
 
## 📸 Screenshots
 
<p align="center">
  <img src="docs/images/03-rotina.jpg" width="200" alt="Routine with planned sets">
  <img src="docs/images/05-treino.jpg" width="200" alt="Workout in progress">
  <img src="docs/images/08-grafico.jpg" width="200" alt="Progress chart of an exercise">
</p>
<p align="center">
  <img src="docs/images/10-peso.jpg" width="200" alt="Body weight with goal and chart">
  <img src="docs/images/11-dieta.jpg" width="200" alt="Diet tab with kcal and macros">
  <img src="docs/images/14-modo-escuro.jpg" width="200" alt="Dark mode">
</p>
<p align="center">
  <img src="docs/images/22-refeicao.jpg" width="200" alt="A meal with its foods and the nutrition donut">
  <img src="docs/images/23-agua.jpg" width="200" alt="Water card with the bottle and the daily goal">
  <img src="docs/images/25-dia-a-dia.jpg" width="200" alt="Agenda: the day's tasks, with a repeating one">
</p>

More screenshots in the [user guide](docs/user-guide.md).
 
## 🎯 Goals
 
- Log a full workout quickly, with or without internet
- See what was lifted last time for each exercise while training
- Track strength progress per exercise (in each routine) with a history and a chart
- Log body weight daily and see the real trend in a chart, and follow each bulk or cut as a phase
- Log what I eat and see the day's kcal, protein, carbs and fat (and each meal) against my plan, and the water I drink
- Keep the day's tasks and important appointments in one place, with a reminder before each appointment
- Never lose data: easy export and import of backups
- Don't start from zero: optional example exercises and foods

## 📋 Features
 
| Feature | Description |
|---------|-------------|
| Exercise library | My exercises grouped by muscle group, with search and filter; opened from the button at the top right of the Treino tab |
| Manage exercises | Create, edit and archive my own exercises (the list starts empty) |
| Favorite exercises | Star exercises so they appear first in lists |
| Routines | One per weekly workout (e.g. Push, Pull, Legs): exercises in order and planned sets (W/F/T/B, weight, reps). The routine done most recently is listed first, with the day it was last done |
| Note for next week | Per exercise: green "increase the weight", yellow "probably increase" or red "decrease the weight" (no note keeps the weight) |
| Workout logging | Start from a routine, already filled with the last weights; edit weight and reps (half reps allowed), add or remove sets, add exercises (they are added to the routine too). Finishing copies what was done into the routine |
| Back-off to failure | A flame on each back-off set (in the routine and in the workout) marks it done to failure instead of a number of reps ("85 kg × falha") |
| Assisted reps | A hand icon at the end of each top set logs the reps done with help ("100 kg × 6 +2"). Like the weights, they pass to the routine and the next workout starts with them; they never count as progress |
| Workout timer | The header of the workout shows how long you have been training (⏱ 42:13) |
| Workout summary | After finishing: duration, exercises, sets, volume, progressions and the top/back-off sets done ("12 kg × 5 +1 com ajuda") |
| Exercise history | Icon on each exercise: popup with its progressions (green ▲) and regressions (red ▼), top set before → after, per routine |
| Exercise progress | Chart of the top set weight over time, per exercise and routine: only the workouts where the top set went up or down |
| Body weight log | One entry per day (today or past days); saving the same day again updates it |
| Body weight chart | Daily values and a line at the weight goal; the summary shows the 7-day average and how much is left to the goal |
| Body weight phases | Named periods like a bulk or a cut, with start and (optional) end dates; each one has its own chart, total change, weekly rate (kg and % of body weight), lowest/highest weight and how far along it is |
| Diet log | Day by day (‹ › to change day): a ring with the kcal left and a ring per macro (red when over); 6 meals (Pequeno-almoço … Ceia), each with its icon, eaten / planned kcal (e.g. 420/400) and a bar. Tapping a meal opens it: its foods (tap one to change the amount), a donut with the share of kcal from carbs, protein and fat, and **Adicionar alimento** (the amount of last time is suggested, e.g. 2 tostas) |
| Diet goals | Daily kcal (required), protein / carbs / fat (optional) and roughly how many kcal I plan for each meal (optional) |
| Water | A bottle that fills up as I drink: +250 / +500 ml, any other amount in ml or L, − to take a glass away, tapping the total to correct it and a daily goal; saved per day |
| Export to Excel | Settings → Exportar peso e dieta: shows from when to when there is data, lets you pick everything, last week, the last 30 days or any dates, summarises them (days, weigh-ins, daily averages) and exports an .xlsx file with body weight and kcal, protein, carbs and fat per day (e.g. for a nutritionist). Nothing extra is stored |
| Food library | My own foods with kcal and macros per X grams, per X ml or per unit, with search; editing a food never changes days already logged |
| Agenda: day to day | The day's tasks with a checkbox (‹ › to change day): add, tick, rename, move to the next day or delete |
| Repeating tasks | Tasks that come back on chosen days of every week (e.g. Tuesdays and Thursdays, every Saturday, every day): they show up by themselves on those days; skip one day, change the days or stop repeating (the days done stay) |
| Agenda: events | Appointments and other important things with a day, time, notes and an optional reminder 15 min, 1 hour or 1 day before. Reminders are local notifications: they work with the app closed and without internet |
| Automatic clean-up | When the app opens: done tasks older than 30 days, tasks never done older than 90 days, past events older than 12 months and repetitions stopped over 90 days ago are deleted. Workouts, body weight and diet are never deleted |
| Backup | Export to a JSON file and import it back, choosing the parts: workouts, body weight, diet and/or agenda |
| Example exercises and foods | Optional, in Settings: adds a list of exercises and foods (only those missing, by name) after showing what you already have; nothing of yours is changed or deleted |
| Dark mode | Settings → Aparência: automatic (follows the phone), light or dark |
| Look and feel | Rounded header with the tab's icon, purple accent, buttons that react to the touch and small animations (bottle, rings, summary); with the phone's "remove animations" setting on, they are toned down |
 
## 🛠️ Tech stack
 
| Purpose | Technology |
|---------|------------|
| Framework | React Native + Expo |
| Language | TypeScript (strict) |
| Navigation | Expo Router |
| Local database | expo-sqlite |
| IDs | expo-crypto (UUIDs) |
| Charts and drawings | react-native-gifted-charts, react-native-svg |
| Animations | react-native-reanimated |
| Reminders | expo-notifications (local notifications) |
| Date and time pickers | @expo/ui |
| Backup files | expo-file-system, expo-sharing, expo-document-picker |
| Build | EAS Build (Android APK) |
| Testing | Jest |
 
## 🏗️ Project structure
 
```
GymLog/
├── src/
│   ├── app/                → screens (Expo Router)
│   │   ├── (tabs)/         → Workout, Diet, Body weight, Agenda, Settings
│   │   ├── exercises.tsx   → exercise list (opened from the Workout tab)
│   │   ├── exercise/       → exercise details, create/edit, progress chart
│   │   ├── agenda/         → create/edit an agenda event, repeating tasks
│   │   ├── phases.tsx      → list of body weight phases
│   │   ├── phase/          → one phase (chart and numbers), create/edit
│   │   ├── diet/           → a meal, add food to a meal, my foods, goals
│   │   ├── routine/        → routine, rename, add exercises, planned sets
│   │   └── workout/        → workout summary
│   ├── components/         → reusable UI components
│   ├── data/               → example exercises and foods (added only on request)
│   ├── hooks/              → screen logic (loading data, actions)
│   ├── db/
│   │   ├── schema.ts       → list of tables (order used by backups)
│   │   ├── migrations.ts   → table definitions and migrations (v1 to v20)
│   │   ├── repositories/   → data access functions (one file per entity, + tests)
│   │   └── __tests__/      → migration tests
│   ├── lib/                → pure logic: search, labels, sets, progress, dates, body weight, diet, agenda, backup (+ tests)
│   ├── notifications/      → agenda reminders (local notifications)
│   ├── theme/              → light and dark colours, sizes (spacing, text, corners, motion), theme provider
│   ├── test-utils/         → in-memory SQLite for repository tests
│   └── types/              → shared TypeScript types
├── assets/
├── app.json
├── eas.json
└── README.md
```
 
## 🗃️ Data model
 
| Table | Main fields |
|-------|-------------|
| exercises | id, name, muscle_group, equipment, is_custom (unused), is_archived, is_favorite |
| routines | id, name, created_at |
| routine_exercises | id, routine_id, exercise_id, position, progression (increase, maybe, decrease or empty), target_sets (unused), target_reps (unused) |
| routine_sets | id, routine_exercise_id, position, set_type (warmup, feeder, top, backoff), reps (optional), weight_kg (optional), to_failure (back-off done to failure, then no reps), assisted_reps (top sets: reps done with help last time) |
| workouts | id, started_at, finished_at, notes, routine_id (optional) |
| workout_exercises | id, workout_id, exercise_id, position |
| workout_sets | id, workout_exercise_id, position, set_type (warmup, feeder, top, backoff), reps (only top/backoff), weight_kg (empty until filled in), planned_reps and planned_weight_kg (values the set started with), to_failure (back-off done to failure), assisted_reps (reps done with help, top sets only) |
| body_weight_entries | id, date (unique), weight_kg |
| body_weight_phases | id, name, start_date, end_date (empty while it goes on), created_at |
| app_settings | key, value (body weight goal, theme, diet goals with the kcal planned per meal, water goal) |
| foods | id, name, basis (grams or unit), measure (g or ml), basis_amount, kcal, protein_g, carbs_g, fat_g, is_archived |
| food_entries | id, date, meal, food_id, amount, kcal, protein_g, carbs_g, fat_g (stored when logged), created_at |
| diet_days | date, training_kcal (unused, kept so old migrations stay untouched) |
| water_days | date (one row per day), ml |
| recurring_tasks | id, title, weekdays (bits, Sunday to Saturday), start_date, end_date (empty while it repeats), created_at |
| day_tasks | id, date, title, done, created_at, recurring_id (the repetition it comes from, or empty), skipped (a repeating task skipped that day) |
| agenda_events | id, date, time, title, notes (optional), remind_minutes (15, 60, 1440 or empty), created_at |

### Workouts and exercises

```mermaid
erDiagram
    routines ||--o{ routine_exercises : "has"
    routine_exercises ||--o{ routine_sets : "has"
    routines |o--o{ workouts : "template for"
    exercises ||--o{ routine_exercises : "used in"
    exercises ||--o{ workout_exercises : "used in"
    workouts ||--o{ workout_exercises : "has"
    workout_exercises ||--o{ workout_sets : "has"

    routines {
        TEXT id PK
        TEXT name
        TEXT created_at
    }
    routine_exercises {
        TEXT id PK
        TEXT routine_id FK
        TEXT exercise_id FK
        INTEGER position
        TEXT progression "increase | maybe | decrease"
        INTEGER target_sets
        INTEGER target_reps
    }
    routine_sets {
        TEXT id PK
        TEXT routine_exercise_id FK
        INTEGER position
        TEXT set_type
        INTEGER reps "optional"
        REAL weight_kg "optional"
        INTEGER to_failure "0 | 1"
        REAL assisted_reps "optional"
    }
    exercises {
        TEXT id PK
        TEXT name
        TEXT muscle_group
        TEXT equipment
        INTEGER is_custom "unused"
        INTEGER is_archived
        INTEGER is_favorite
    }
    workouts {
        TEXT id PK
        TEXT started_at
        TEXT finished_at
        TEXT notes
        TEXT routine_id FK
    }
    workout_exercises {
        TEXT id PK
        TEXT workout_id FK
        TEXT exercise_id FK
        INTEGER position
    }
    workout_sets {
        TEXT id PK
        TEXT workout_exercise_id FK
        INTEGER position
        TEXT set_type
        REAL reps "optional"
        REAL weight_kg "optional"
        REAL planned_reps "starting value"
        REAL planned_weight_kg "starting value"
        INTEGER to_failure "0 | 1"
        REAL assisted_reps "optional"
    }
```

- `workouts.routine_id` is optional: a workout can be started without a routine.
- `workout_sets.set_type` and `routine_sets.set_type` are one of `warmup`, `feeder`, `top` or `backoff`.
- A routine stores, for each exercise, its planned sets: type plus optional reps and weight (e.g. W 15×40, F 3×70, T 6×100, B 8×85). Back-offs can be planned to failure and top sets keep the reps done with help. Workouts started from it are pre-filled with these values; when a workout is finished, the values done are copied back into the routine (its structure does not change). Cancelling a workout changes nothing.
- Deleting a workout deletes its exercises and sets. An exercise already used in a workout cannot be deleted, only archived.

### Body weight

Independent from the workout tables: one entry per day. Phases only store their dates: their entries are the ones between those dates.

```mermaid
erDiagram
    body_weight_entries {
        TEXT id PK
        TEXT date UK "YYYY-MM-DD"
        REAL weight_kg
    }
    body_weight_phases {
        TEXT id PK
        TEXT name
        TEXT start_date "YYYY-MM-DD"
        TEXT end_date "optional"
        TEXT created_at
    }
```

### Diet

Foods are my own; each logged entry keeps a copy of the values worked out for the amount eaten. Water is one total per day.

```mermaid
erDiagram
    foods ||--o{ food_entries : "logged as"

    foods {
        TEXT id PK
        TEXT name
        TEXT basis "grams | unit"
        TEXT measure "g | ml"
        REAL basis_amount
        REAL kcal
        REAL protein_g
        REAL carbs_g
        REAL fat_g
        INTEGER is_archived
    }
    food_entries {
        TEXT id PK
        TEXT date "YYYY-MM-DD"
        TEXT meal
        TEXT food_id FK
        REAL amount
        REAL kcal
        REAL protein_g
        REAL carbs_g
        REAL fat_g
        TEXT created_at
    }
    water_days {
        TEXT date PK "YYYY-MM-DD"
        INTEGER ml
    }
```

### Agenda

Independent from everything else. A repeating task gets its row in `day_tasks` for each of its days when that day is opened. Reminders are not stored: they are scheduled on the phone from each event (and rebuilt when the app opens or a backup is imported).

```mermaid
erDiagram
    recurring_tasks |o--o{ day_tasks : "shows up as"

    recurring_tasks {
        TEXT id PK
        TEXT title
        INTEGER weekdays "bits: Sun..Sat"
        TEXT start_date "YYYY-MM-DD"
        TEXT end_date "optional"
        TEXT created_at
    }
    day_tasks {
        TEXT id PK
        TEXT date "YYYY-MM-DD"
        TEXT title
        INTEGER done "0 | 1"
        TEXT created_at
        TEXT recurring_id "optional"
        INTEGER skipped "0 | 1"
    }
    agenda_events {
        TEXT id PK
        TEXT date "YYYY-MM-DD"
        TEXT time "HH:MM"
        TEXT title
        TEXT notes "optional"
        INTEGER remind_minutes "15 | 60 | 1440 | empty"
        TEXT created_at
    }
```
 
## 🗺️ Roadmap
 
- [X] Phase 0: Project setup (Expo + TypeScript + Expo Router)
- [X] Phase 1: Database schema, migrations and seed of built-in exercises
- [X] Phase 2: Exercise library and custom exercises
- [X] Phase 3: Routines, workout logging, progress history and charts → **MVP**
- [X] Phase 4: Body weight log and chart → **MVP**
- [X] Phase 5: Backup export / import → **MVP**
- [X] Phase 6: First APK build installed on my phone
- [X] Extras: weight goal, dark mode, new icon, per-routine progress and diet tracking
- [X] Extras: backups by parts, yellow note, back-offs to failure, reps with help and workout timer
- [X] Extras: body weight phases (bulk/cut), example exercises and foods, last amount of each food, edit a logged amount, kcal planned per meal
- [X] Extras: new look, meal screen, water, Agenda tab (tasks, repeating tasks and events with reminders) and automatic clean-up of old tasks and events
- [X] Extras: body weight and diet export to Excel, "decrease" note, cleaner progress chart and faster history
- [ ] Ongoing: small adjustments from daily use

## 📖 How to run (development)
 
```bash
npm install
npx expo start
```

Run the tests:

```bash
npm test
```
 
Open with a development build or Expo Go on the phone.
 
## 📦 Build and install on Android
 
```bash
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```
 
The `preview` profile in `eas.json` is configured to generate an **APK**. Download it from the link at the end of the build and install it on the phone. Installing a new APK over the old one keeps the data.

Agenda reminders need an APK built after `expo-notifications` was added: check them on the APK, not in Expo Go. The first time an event has a reminder, Android asks for permission to show notifications.
 
## 💾 Backups
 
All data lives only on the phone. Use **Settings → Export backup** regularly and save the file to Google Drive or email. **Import backup** restores everything on a new phone or after reinstalling. Both let you choose the parts (workouts, body weight, diet, agenda); importing a part replaces only that part. A backup made by an older version leaves what it could not have yet (e.g. phases, water or the agenda) as it is on the phone.
 
## 🎁 Example exercises and foods

The app starts empty. Starting from zero? **Definições → Exemplos para começar → Adicionar exemplos** adds a list of example exercises and foods (built into the app, without any personal data). Before adding, it shows what you already have with the same name: that stays exactly as it is, and nothing is deleted. You can also skip it and create your own.

## 📘 User guide
 
New to the app? The **[user guide](docs/user-guide.md)** explains how everything works, step by step: exercises, routines, logging a workout, progress, body weight and phases, diet and water, the agenda and backups.
 
## 📄 License
 
This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
