const express = require('express');
const cors = require('cors');
const { all, get, run, exec, initializeDatabase } = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

function parseSeatNumbers(seatNumbers, totalSeats) {
  if (!Array.isArray(seatNumbers) || seatNumbers.length === 0) {
    return { error: 'seatNumbers must be a non-empty array.' };
  }

  const parsed = seatNumbers.map((value) => Number(value));
  const invalid = parsed.some(
    (seat) => !Number.isInteger(seat) || seat < 1 || seat > totalSeats,
  );

  if (invalid) {
    return { error: `Each seat number must be an integer between 1 and ${totalSeats}.` };
  }

  const unique = [...new Set(parsed)];
  if (unique.length !== parsed.length) {
    return { error: 'Duplicate seat numbers are not allowed.' };
  }

  return { seats: unique.sort((a, b) => a - b) };
}

function buildSeats(totalSeats, reservedRows) {
  const reservedMap = new Map(reservedRows.map((row) => [row.seat_number, row]));
  return Array.from({ length: totalSeats }, (_, idx) => {
    const seatNumber = idx + 1;
    const booking = reservedMap.get(seatNumber);

    return {
      number: seatNumber,
      status: booking ? 'booked' : 'available',
      bookingRef: booking ? booking.booking_ref : null,
      bookingId: booking ? booking.id : null,
      customerName: booking ? booking.customer_name : null,
    };
  });
}

app.get('/api/shows/:showId/seats', async (req, res) => {
  const showId = Number(req.params.showId);

  try {
    const show = await get('SELECT id, title, total_seats FROM shows WHERE id = ?', [showId]);
    if (!show) {
      res.status(404).json({ error: 'Show not found.' });
      return;
    }

    const reservedRows = await all(
      'SELECT id, seat_number, booking_ref, customer_name FROM bookings WHERE show_id = ?',
      [showId],
    );

    res.json({
      show: {
        id: show.id,
        title: show.title,
        totalSeats: show.total_seats,
      },
      seats: buildSeats(show.total_seats, reservedRows),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load seats.', detail: err.message });
  }
});

app.get('/api/shows/:showId/bookings', async (req, res) => {
  const showId = Number(req.params.showId);

  try {
    const rows = await all(
      `SELECT booking_ref, customer_name, created_at,
              GROUP_CONCAT(seat_number) AS seats
       FROM bookings
       WHERE show_id = ?
       GROUP BY booking_ref, customer_name, created_at
       ORDER BY datetime(created_at) DESC`,
      [showId],
    );

    const bookings = rows.map((row) => ({
      bookingRef: row.booking_ref,
      customerName: row.customer_name,
      createdAt: row.created_at,
      seats: row.seats.split(',').map((seat) => Number(seat)).sort((a, b) => a - b),
    }));

    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load bookings.', detail: err.message });
  }
});

app.post('/api/shows/:showId/bookings', async (req, res) => {
  const showId = Number(req.params.showId);
  const customerName = String(req.body.customerName || '').trim();

  try {
    const show = await get('SELECT id, total_seats FROM shows WHERE id = ?', [showId]);
    if (!show) {
      res.status(404).json({ error: 'Show not found.' });
      return;
    }

    if (!customerName) {
      res.status(400).json({ error: 'customerName is required.' });
      return;
    }

    const seatValidation = parseSeatNumbers(req.body.seatNumbers, show.total_seats);
    if (seatValidation.error) {
      res.status(400).json({ error: seatValidation.error });
      return;
    }

    const seatNumbers = seatValidation.seats;
    const bookingRef = `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    await exec('BEGIN IMMEDIATE TRANSACTION');

    try {
      const placeholders = seatNumbers.map(() => '?').join(',');
      const occupiedRows = await all(
        `SELECT seat_number
         FROM bookings
         WHERE show_id = ? AND seat_number IN (${placeholders})`,
        [showId, ...seatNumbers],
      );

      if (occupiedRows.length > 0) {
        await exec('ROLLBACK');
        res.status(409).json({
          error: 'Some selected seats are already booked.',
          occupiedSeats: occupiedRows.map((row) => row.seat_number).sort((a, b) => a - b),
        });
        return;
      }

      for (const seatNumber of seatNumbers) {
        await run(
          `INSERT INTO bookings (show_id, seat_number, customer_name, booking_ref)
           VALUES (?, ?, ?, ?)`,
          [showId, seatNumber, customerName, bookingRef],
        );
      }

      await exec('COMMIT');

      res.status(201).json({
        message: 'Booking confirmed.',
        bookingRef,
        customerName,
        seatNumbers,
      });
    } catch (err) {
      await exec('ROLLBACK');
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: 'Booking failed.', detail: err.message });
  }
});

app.delete('/api/bookings/:bookingRef', async (req, res) => {
  const bookingRef = String(req.params.bookingRef || '').trim();

  if (!bookingRef) {
    res.status(400).json({ error: 'bookingRef is required.' });
    return;
  }

  try {
    const result = await run('DELETE FROM bookings WHERE booking_ref = ?', [bookingRef]);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }

    res.json({ message: 'Booking cancelled.', bookingRef, releasedSeats: result.changes });
  } catch (err) {
    res.status(500).json({ error: 'Cancellation failed.', detail: err.message });
  }
});

async function startServer() {
  await initializeDatabase();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});