# QueueSmart Backend

Simple setup for running the backend locally.

## Install

Requirements:
- Node.js 18+
- npm 9+

Install dependencies:

```bash
cd backend
npm install
```

## Run

Start server:

```bash
npm start
```

Backend URL:
- `http://localhost:5000`

Health check:
- `GET http://localhost:5000/health`

## Test

Run all tests:

```bash
npm test
```

Run a specific test file:

```bash
npx jest tests/registerationService.test.js --verbose
```

## Important Files To Work On

Core app wiring:
- `backend/server.js` - server startup
- `backend/app.js` - Express app setup, routes, error middleware

Routes layer:
- `backend/routes/authRoutes.js`
- `backend/routes/serviceRoutes.js`
- `backend/routes/queueRoutes.js`
- `backend/routes/notificationRoutes.js`
- `backend/routes/historyRoutes.js`

Controllers layer:
- `backend/controllers/AuthController.js`
- `backend/controllers/ServiceController.js`
- `backend/controllers/QueueController.js`
- `backend/controllers/NotificationController.js`
- `backend/controllers/HistoryController.js`

Services layer (business logic):
- `backend/services/AuthService.js`
- `backend/services/ServiceService.js`
- `backend/services/QueueService.js`
- `backend/services/NotificationService.js`
- `backend/services/HistoryService.js`
- `backend/services/errors.js`

Data layer:
- `backend/data/store.js` - in-memory store (`users`, `services`, `queues`, `history`, `notifications`)

Middleware:
- `backend/middleware/auth.js` - auth/admin guards
- `backend/middleware/errorHandler.js` - HTTP error responses

Tests:
- `backend/tests/authService.test.js`
- `backend/tests/queueService.test.js`
- `backend/tests/registerationService.test.js`

## API Endpoints

Auth:
- `POST /auth/register`
- `POST /auth/login`

Services:
- `POST /services` (admin only)
- `GET /services`
- `PUT /services/:id` (admin only)

Queue:
- `POST /queue/join`
- `POST /queue/leave`
- `GET /queue/:serviceId`
- `POST /queue/serve-next` (admin only)
- `GET /queue/wait-time/:serviceId/:userId`

Notifications:
- `GET /notifications/:userId`

History:
- `GET /history/:userId`

## Important Notes

- This backend is in-memory only. Data resets when server restarts.
- Protected endpoints require `x-user-id` header.
- Admin endpoints require the logged-in user role to be `admin`.
- If you want preloaded users/services, seed them in `backend/data/store.js`.

## Quick Troubleshooting

- Server does not start:

```bash
rm -rf node_modules package-lock.json
npm install
npm start
```

- Route returns `401`:
1. Make sure `x-user-id` header is set.
2. Confirm that user exists in in-memory store.

- Route returns `404`:
1. Check route path matches exactly (for example `/queue/...` not `/queues/...`).
2. Confirm resource ID exists in memory.
