# QueueSmart

A full-stack queue management system built with **Node.js / Express / MySQL** on the backend and a **Vanilla JS** single-page app on the frontend.

QueueSmart is a queue management system designed to streamline how users at the University of Houston specifically for students interact with campus services and help admins efficiently pick up their desired textbook needed for class at three main loctions with the location they intend to pickup.

This web app helps improve 

---

## Features

### User-facing
| Feature | Details |
|---|---|
| Registration & Login | Email + password, role-based (user / admin) |
| Join a queue | Pick a service, receive a position and estimated wait time |
| Leave a queue | Self-removal at any time |
| Live queue status | Current position, estimated wait, queue length |
| Book requests | Request a book/resource from a service |
| Notification centre | In-app notifications for position changes and queue events |
| Activity history | Full personal visit history with status |
| User dashboard | Overview of active queue, recent history, and notifications |

### Admin-facing
| Feature | Details |
|---|---|
| Service management | Create, edit, open/close services; assign to locations |
| Queue management | Serve next, reorder entries, remove users |
| Location management | Add and update campus locations |
| Book request review | Approve or reject incoming book requests |
| Usage statistics | Live KPI cards (users served, active queues, notification counts) |
| **Stats Reporting** | Rich analytics dashboard with filters, charts, CSV export, and PDF report |

### Stats & Reporting
- **Filters**: period (daily / weekly / monthly), specific service, individual user
- **KPI cards**: total served, average wait, average service time, max queue length, drop-off rate, queue efficiency
- **Charts** (Chart.js 4):
  - Queue activity over time — area line chart
  - Visit status distribution — pie chart
  - Users served per service — bar chart
  - Average wait time per service — horizontal bar chart
  - Wait time distribution — histogram
  - Per-service queue load timeline — line chart per service card
  - Peak-hours heatmap — CSS heatmap grid
- **CSV export**: selective datasets (overview, status breakdown, user participation, service activity), column customisation, ISO 8601 timestamps, RFC 4180 compliant, UTF-8 BOM for Excel
- **PDF / Print**: opens a dedicated print window with all chart images embedded, formatted tables, KPI grid, and applied-filter metadata

---

## Project structure

```
QueueSmart/
├── backend/
│   ├── server.js          # Express API (all routes)
│   ├── migrate.js         # DB migration runner
│   ├── schema.sql         # Base schema
│   ├── seed.sql           # Seed data
│   ├── migrations/        # Versioned SQL migration files
│   ├── data/store.js      # In-memory fallback store (unused in production)
│   ├── tests/             # Jest test suites
│   └── package.json
└── frontend/
    ├── index.html         # Entry point
    ├── app.js             # Full SPA (routing, pages, API calls, charts)
    ├── styles.css         # Global styles + print CSS
    ├── course-materials-data.js
    └── package.json
```

---

## Backend setup

### Prerequisites
- Node.js 18+
- MySQL 8+ running locally (or remote)

### Steps

```bash
cd backend
npm install
```

Create a `.env` file (copy from the example below):

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=queuesmart_user
DB_PASSWORD=queuesmart123
DB_NAME=queuesmart
PORT=5000
```

Run migrations (creates tables and seeds test users):

```bash
npm run migrate
```

Start the server:

```bash
npm start
```

Backend runs at **http://localhost:5000**

---

## Frontend setup

```bash
cd frontend
npx serve
```

Open the URL printed in the terminal (usually **http://localhost:3000**).

> The frontend is a plain HTML/CSS/JS app. No build step is required.

---

## Test users

| Role | Email | Password |
|---|---|---|
| Admin | `admin@uh.edu` | `password` |
| User | `user@cougarnet.uh.edu` | `password` |

---

## API reference

### Auth
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login and return user object |

### Services
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/services` | List all services |
| `POST` | `/api/services` | Create a service (admin) |
| `PUT` | `/api/services/:id` | Update a service (admin) |

### Queues
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/queues/service/:serviceId` | Get queue for a service |
| `GET` | `/api/queues/user/:userId/current` | Get user's active queue entry |
| `POST` | `/api/queues/join` | Join a queue |
| `POST` | `/api/queues/leave` | Leave a queue |

### Admin — Queue management
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/admin/queue/serve-next` | Mark next user as served |
| `POST` | `/api/admin/queue/reorder` | Reorder queue positions |
| `POST` | `/api/admin/queue/remove-entry` | Remove a user from the queue |

### Reporting & Stats
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/stats` | Live KPI totals and per-service counts |
| `GET` | `/api/admin/reports` | Full analytics report; accepts `?period=`, `?serviceId=`, `?userId=` |

### Locations
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/locations` | List locations |
| `POST` | `/api/locations` | Create location (admin) |
| `PUT` | `/api/locations/:id` | Update location (admin) |
| `DELETE` | `/api/locations/:id` | Delete location (admin) |

### Book requests
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/book-requests` | Submit a book request |
| `GET` | `/api/book-requests/user/:userId` | Get requests for a user |
| `GET` | `/api/admin/book-requests` | List all book requests (admin) |
| `PATCH` | `/api/admin/book-requests/:id/status` | Approve or reject a request (admin) |

### Notifications & History
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/notifications/:userId` | Get notifications for a user |
| `POST` | `/api/notifications/:id/read` | Mark a notification as read |
| `GET` | `/api/history/:userId` | Get activity history for a user |

### Health
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Returns `{ ok: true }` |

---

## Database migrations

Migration files live in `backend/migrations/` and are executed in filename order by `migrate.js`.

```bash
npm run migrate   # run all pending migrations
```

---

## Notes

- Passwords are stored in plain text. For production, enable the commented-out `bcryptjs` hashing in `server.js`.
- Auth uses browser `localStorage` (no JWT). For production, replace with signed JWTs and HTTP-only cookies.
- Notifications are stored in MySQL. Email/SMS channels are recorded as notification rows — no third-party providers are required.
- Chart.js 4 is loaded via CDN in `frontend/index.html`.

