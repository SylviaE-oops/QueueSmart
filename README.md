# QueueSmart Full-Stack App

This version turns your A1-A4 QueueSmart project into a real full-stack app.

## Included features

- Login and registration
- User and admin roles
- Join queue / leave queue
- Live queue status and estimated wait time
- History tracking
- Notifications (in-app, email, SMS records)
- Service management
- Queue management (serve next, move up/down, remove)
- Stock status/textbook availability
- Usage statistics
- MySQL schema based on your A4 tables, extended with stock and pickup location
- AI Agent that Recommends Queue

## Project structure

- `backend/` - Node.js + Express + MySQL API
- `frontend/` - Vanilla HTML/CSS/JS client using your dark QueueSmart look

## Backend setup

1. Ensure MySQL is running
2. Navigate to `backend/` directory
3. Copy `backend/.env.example` to `backend/.env` (or use existing `.env`)
4. Run dependencies:
   ```bash
   npm install
   ```
5. Run database migrations:
   ```bash
   npm run migrate
   ```
   This will:
   - Create all necessary database tables
   - Seed test users (admin@uh.edu and user@cougarnet.uh.edu)
6. Start the backend:
   ```bash
   npm start
   ```

The backend runs on `http://localhost:5000`

## Frontend setup

Navigate to `frontend/` and start a static server:

```bash
npm start
```

Or manually:
```bash
npx serve
```

Then open the frontend URL in your browser (usually `http://localhost:3000`)

## Test Users

After running migrations, you can log in with:

**Admin:**
- Email: `admin@uh.edu`
- Password: `password`

**Regular User:**
- Email: `user@cougarnet.uh.edu`
- Password: `password`

Or register a new account through the frontend registration page.

## Notes

- Database migrations are version-controlled in `backend/migrations/`. Run `npm run migrate` to execute them.
- Passwords are currently stored in plain text (not hashed). For production, implement bcryptjs hashing.
- This app does not include JWT auth yet. It uses DB-backed login and browser localStorage session state.
- Notifications are stored in MySQL. Email/SMS are represented as notification records to match your assignment features without requiring third-party providers.
- The UI keeps the visual style from your uploaded `index.html`, `styles.css`, and `app.js`.


##UPDATE (2/4)
Student:
Requests books (just: title, quantity)
No location selection needed

Admin:
Reviews request
Decides the best location to prepare from
Marks ready + assigns location
Student notified: "Your books are ready at [Location Name]."

Student (after notification):
Sees all pickup queues at that location
Joins the queue with the lowest wait time
