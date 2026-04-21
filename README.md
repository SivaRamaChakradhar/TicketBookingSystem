# Movie Ticket Booking System

A full-stack cinema booking app built with Node.js, React, and SQL (SQLite).

## Features

- View available seats for a show
- Book multiple seats in a single booking
- Cancel booking by booking reference
- Enforces a fixed show capacity of 20 seats
- Prevents double booking with transaction-safe booking flow

## Tech Stack

- Backend: Node.js, Express, SQLite3
- Frontend: React + Vite
- Database: SQL schema in `backend/src/schema.sql`

## Project Structure

- `backend/` API server and database
- `frontend/` React client

## Run Locally

### 1) Start backend

```bash
cd backend
npm install
npm start
```

Backend runs at `http://localhost:4000`.

### 2) Start frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

If needed, set a custom backend URL:

```bash
# frontend/.env
VITE_API_URL=http://localhost:4000
```

## Deploy Frontend On GitHub Pages

The frontend can be deployed to GitHub Pages, but it still needs a live backend URL.

1. Deploy the backend first on Render.
2. Copy the Render backend URL.
3. Set `VITE_API_URL` in `frontend/.env.production` before building.
4. From `frontend/`, run:

```bash
npm install
npm run deploy
```

5. In GitHub repository settings, enable GitHub Pages from the `gh-pages` branch.

The frontend build uses the repository base path `/TicketBookingSystem/`, so it is ready for GitHub Pages hosting.

## API Endpoints

- `GET /api/shows/1/seats` - Seat map with availability
- `GET /api/shows/1/bookings` - Current bookings
- `POST /api/shows/1/bookings` - Create booking
- `DELETE /api/bookings/:bookingRef` - Cancel a booking

### Booking payload

```json
{
  "customerName": "Alex",
  "seatNumbers": [4, 5, 6]
}
```

## Notes

- Default seeded show: `id=1`, title `Evening Show`, `20` seats.
- Database file is created automatically at `backend/cinema.db`.
