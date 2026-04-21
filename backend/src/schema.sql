PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS shows (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  total_seats INTEGER NOT NULL CHECK(total_seats > 0)
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  show_id INTEGER NOT NULL,
  seat_number INTEGER NOT NULL,
  customer_name TEXT NOT NULL,
  booking_ref TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(show_id) REFERENCES shows(id) ON DELETE CASCADE,
  UNIQUE(show_id, seat_number)
);

INSERT OR IGNORE INTO shows (id, title, total_seats)
VALUES (1, 'Evening Show', 20);