# QueueSmart Frontend

Simple setup for running the frontend locally.

## Install

Requirements:
- Node.js 18+
- npm 9+

Install dependencies:

```bash
cd frontend
npm install
```

## Run

Start dev server:

```bash
npm run dev
```

Frontend URL:
- `http://localhost:3000`

## Backend Requirement

The frontend needs the backend running at:
- `http://localhost:5000`

Start backend in a separate terminal:

```bash
cd backend
npm start
```

## Environment Variable

Create `frontend/.env` if needed:

```env
VITE_API_URL=http://localhost:5000
```

If not set, the app defaults to `http://localhost:5000`.

## Important Files To Work On

Core app flow:
- `frontend/src/App.jsx` - app routing, auth state, page switching
- `frontend/src/index.jsx` - frontend entry point

API and config:
- `frontend/src/api.js` - all backend API calls
- `frontend/src/config.js` - API base URL configuration

Main pages/components:
- `frontend/src/components/LoginPage.jsx` - login logic
- `frontend/src/components/RegisterPage.jsx` - registration logic
- `frontend/src/components/UserDashboard.jsx` - user dashboard
- `frontend/src/components/JoinQueuePage.jsx` - queue join flow
- `frontend/src/components/ServiceManagement.jsx` - admin service management
- `frontend/src/components/Shell.jsx` - shared layout/navigation

Styling:
- `frontend/src/base.css` - global CSS variables and base styles
- `frontend/src/components/*.module.css` - component-level styles

## Important Notes

- Use `npm run dev` in `frontend` (not `npm start`).
- If you change `.env`, restart the dev server.
- Protected backend routes depend on `x-user-id` set after login.
- In-memory backend data resets when backend restarts.

## Quick Troubleshooting

- Frontend fails to start:

```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

- "Failed to load data from server":
1. Ensure backend is running on port `5000`.
2. Check `VITE_API_URL` in `frontend/.env`.
3. Hard refresh browser (`Ctrl+F5`).
