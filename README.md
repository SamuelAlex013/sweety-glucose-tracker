# Sweety

A blood glucose journal built with React, Express, PostgreSQL, Redis, and BullMQ. Patients record four daily slots and review their reports. Doctors can review reports for patients assigned to their account.

| Patient journal                                                         | Doctor reports                                                   |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------- |
| ![Samuel Alexander's daily journal](docs/screenshots/daily-desktop.png) | ![Assigned patient reports](docs/screenshots/doctor-reports.png) |

[Browse all 24 screenshots](docs/screenshots/README.md) for signup, reading entry, validation, editing, deletion, reports, pagination, check-ins, and mobile views. The screenshots use synthetic data.

## Run with Docker

Install Docker Desktop, then run:

```sh
git clone https://github.com/SamuelAlex013/sweety-glucose-tracker.git
cd sweety-glucose-tracker
cp .env.example .env
docker compose up --build -d --wait
docker compose exec app npm run db:seed
docker compose exec app npm run reminders:run
```

Open [localhost:3001](http://localhost:3001).

PowerShell also supports `Copy-Item .env.example .env`. Docker Compose runs the web app, PostgreSQL, Redis, a migration service, and the reminder worker. The app serves the React build and API together. PostgreSQL and Redis use named volumes.

| Account                    | Email                 | Password            |
| -------------------------- | --------------------- | ------------------- |
| Samuel Alexander — patient | `demo@sweety.local`   | `SweetyDemo2026!`   |
| Dr. Meera Shah — doctor    | `doctor@sweety.local` | `SweetyDoctor2026!` |

The seed creates both accounts, assigns Samuel to the doctor, and adds readings for the previous and current months. Two slots remain open today. Re-running the seed preserves existing readings and passwords and refreshes the demo names.

The host ports are configured through `DB_PORT`, `REDIS_PORT`, and `APP_PORT`. Set `DOCKER_APP_ORIGIN` to the browser URL when changing the app port. For example, `APP_PORT=3003` uses `DOCKER_APP_ORIGIN=http://localhost:3003`. `COMPOSE_PROJECT_NAME` can distinguish parallel local stacks.

Useful commands:

```sh
docker compose ps
docker compose logs worker --tail 20
docker compose exec app npm run reminders:run
docker compose down
```

Compose binds service ports to localhost. Its HTTP session-cookie setting suits this local setup. For HTTPS, set `DOCKER_APP_ORIGIN` to the public URL and `COOKIE_SECURE=true`. A host deployment uses `APP_ORIGIN`, `DATABASE_URL`, and `REDIS_URL` from its deployment environment.

## Features

| Feature              | Implementation                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| Signup and login     | Name, email, password; bcrypt cost 12; server-side sessions                                            |
| Private reading CRUD | Patient-scoped queries, inline editing, deletion confirmation                                          |
| Validation           | Required integer value, 40–600 mg/dl, one reading per slot/day, four readings/day, dates through today |
| Reports              | Daily, month-to-date, and the entire previous month; count, highest, lowest, average to one decimal    |
| Pagination           | `GET /api/readings?page=1&limit=20`; totals and page controls in History                               |
| Monthly line chart   | Each point represents a recorded value, ordered by date and meal slot                                  |
| Docker               | App, PostgreSQL, Redis, migration service, and worker                                                  |
| Frontend tests       | React Testing Library form interaction tests                                                           |
| Redis caching        | Five-minute report cache, cleared after a reading changes                                              |
| BullMQ reminders     | Daily check-in logs for patients with fewer than four readings                                         |
| Doctor role          | Assigned-patient selector and report access                                                            |

The slots are Morning (fasting), After breakfast, After lunch, and After dinner. PostgreSQL enforces valid values and unique slots. Reading changes use a per-patient transaction lock.

For a selected date of 15 October 2026:

| Report         | Range          |
| -------------- | -------------- |
| Daily          | 15 October     |
| Month to date  | 1–15 October   |
| Previous month | 1–30 September |

The daily view lists all four slots. Empty periods offer a clear way to start recording. Charts leave gaps for missing days.

## Check-ins and caching

The worker runs at **20:00 in APP_TIMEZONE** by default. `REMINDER_CRON` controls the schedule. Each run records the date and reading count for patients with open slots, with one log per patient per day. Patients can read those entries in Reminders. `npm run reminders:run` queues an immediate run through BullMQ.

Reports are cached in Redis for five minutes. Saving or deleting a reading clears that patient's cached reports. Versioned keys keep concurrent requests consistent. The API serves database-backed reports while Redis reconnects. Doctor assignment checks run before cache access.

## Doctor accounts

The demo doctor is assigned to Samuel Alexander. Additional doctor accounts can be created through the trusted provisioning command. Set `DOCTOR_PASSWORD` in the command environment, then run:

```sh
node server/scripts/doctor.js --name "Dr. Example" --email doctor@example.com --patient demo@sweety.local
```

Run the same command with an existing doctor's email and another `--patient` email to add an assignment. The CLI uses `DATABASE_URL` from the root environment. For Docker, run the command inside the app container and pass `DOCTOR_PASSWORD` through `docker compose exec -e`.

Public signup creates patient accounts. Patients manage their readings; doctors receive report access through assignments.

## Local development

Requires Node.js 22.12 or later. Use the PostgreSQL and Redis services with local Node processes:

```sh
npm ci
docker compose stop app worker
docker compose up -d --wait db redis
npm run db:migrate
npm run db:seed
npm run dev
```

Set `DATABASE_URL` and `REDIS_URL` to the host ports in your root `.env`. The client uses [localhost:5173](http://localhost:5173), matching `APP_ORIGIN`. Vite forwards API requests to `PORT`.

Run `npm run worker` in another terminal for local reminder jobs. The server and client can also be started separately with `npm run dev -w server` and `npm run dev -w client`.

## Tests

With the Docker app running and the demo accounts seeded:

```sh
npm ci
npm test
docker compose exec db createdb -U sweety sweety_test
npm run test:integration
npx playwright install chromium
E2E_BASE_URL=http://localhost:3001 npm run test:e2e
```

Set `TEST_DATABASE_URL` and `TEST_REDIS_URL` in `.env`. Integration tests create and drop an isolated PostgreSQL schema and use unique Redis namespaces. Browser tests register synthetic patient accounts in the configured app database.

PowerShell: `$env:E2E_BASE_URL='http://localhost:3001'; npm run test:e2e`.

Use the app's configured host port in `E2E_BASE_URL`. Create `sweety_test` once; subsequent runs reuse the database with a fresh test schema. For local Node development, stop the Compose app and worker as shown above, leave `E2E_BASE_URL` unset, and run `npm run test:e2e`. Playwright starts the development servers when needed.

The 26 tests cover validation, private CRUD, session handling, report boundaries, pagination, doctor assignments, cache invalidation, Redis-backed reminder jobs, and browser flows. The database-disconnection regression test checks process survival and reconnection.

Additional checks: `npm run build`, `npm run format:check`, and `npm audit`. GitHub Actions runs the suites against PostgreSQL and Redis, then repeats the browser flows against the full Docker stack.

## Screenshots

[The screenshot gallery](docs/screenshots/README.md) maps the assignment to 24 captures. To reproduce it, seed both demo accounts, start the worker, and queue a reminder run:

```sh
docker compose exec app npm run db:seed
docker compose exec app npm run reminders:run
APP_ORIGIN=http://localhost:3001 npm run screenshots
```

Use `$env:APP_ORIGIN='http://localhost:3001'; npm run screenshots` on PowerShell. Screenshot capture also requires `npm ci` and Playwright Chromium on the host. It creates a synthetic account for the CRUD and validation sequence and uses the seeded accounts for reports and doctor access.

## API

All endpoints are under `/api`.

| Method | Route                                       | Purpose                                         |
| ------ | ------------------------------------------- | ----------------------------------------------- |
| POST   | `/auth/register`                            | Create a patient account and session            |
| POST   | `/auth/login`                               | Start a session                                 |
| GET    | `/auth/me`                                  | Current account and role                        |
| POST   | `/auth/logout`                              | Revoke the session; send `{}`                   |
| GET    | `/readings?page=1&limit=20&date=YYYY-MM-DD` | Patient's reading history; optional date filter |
| POST   | `/readings`                                 | Create `{date, slot, value}`                    |
| PUT    | `/readings/:id`                             | Edit date, slot, and value                      |
| DELETE | `/readings/:id`                             | Delete an owned reading                         |
| GET    | `/reports?date=YYYY-MM-DD`                  | Patient's three reports                         |
| GET    | `/reports?date=YYYY-MM-DD&patientId=UUID`   | Doctor's assigned-patient reports               |
| GET    | `/patients`                                 | Doctor's assigned patients                      |
| GET    | `/reminders`                                | Patient's 30 latest check-ins                   |
| GET    | `/config`                                   | Calendar date and timezone                      |
| GET    | `/health`                                   | PostgreSQL and configured Redis connectivity    |

Slot IDs: `morning`, `breakfast`, `lunch`, `dinner`. Pagination limits range from 1 to 100. Responses include reading totals and page counts. Validation errors return a message and field errors; conflicts use HTTP 409. `X-Report-Cache` reports HIT, MISS, or BYPASS.

## Notes

- PostgreSQL is the database specified in the assignment.
- Calendar dates, seed data, reports, and scheduled jobs share `APP_TIMEZONE`, with UTC as the default. Refresh the page when the calendar day changes.
- The earliest supported reading date is 1 January 1900.
- Email addresses are trimmed and lowercased. Passwords use 8 characters minimum and 72 UTF-8 bytes maximum.
- Session tokens are random, stored as hashes, and expire after seven days. Cookies use HttpOnly and SameSite=Strict.
- Reminder counts describe the journal at check-in time. Demo data and screenshots are synthetic.
- The interface uses a neutral palette, self-hosted Manrope/Nunito Sans, and Lucide icons. Its initial dashboard reference was [Lovable's Customer Health Dashboard](https://lovable.dev/templates/apps/internal-tools/customer-health-dashboard-template).
- Further improvements: password recovery, email verification, patient-managed care-team invitations, per-user timezones, backup/restore tooling, and broader assistive-technology testing.
