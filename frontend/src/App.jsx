import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const SHOW_ID = 1

function App() {
  const [show, setShow] = useState(null)
  const [seats, setSeats] = useState([])
  const [bookings, setBookings] = useState([])
  const [customerName, setCustomerName] = useState('')
  const [selectedSeats, setSelectedSeats] = useState([])
  const [feedback, setFeedback] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const availableSeatCount = useMemo(
    () => seats.filter((seat) => seat.status === 'available').length,
    [seats],
  )

  async function loadData() {
    setIsLoading(true)
    setFeedback('')

    try {
      const [seatsRes, bookingsRes] = await Promise.all([
        fetch(`${API_BASE}/api/shows/${SHOW_ID}/seats`),
        fetch(`${API_BASE}/api/shows/${SHOW_ID}/bookings`),
      ])

      if (!seatsRes.ok || !bookingsRes.ok) {
        throw new Error('Could not load booking data.')
      }

      const seatsJson = await seatsRes.json()
      const bookingsJson = await bookingsRes.json()

      setShow(seatsJson.show)
      setSeats(seatsJson.seats)
      setBookings(bookingsJson.bookings)
      setSelectedSeats((current) =>
        current.filter((seatNumber) =>
          seatsJson.seats.some(
            (seat) => seat.number === seatNumber && seat.status === 'available',
          ),
        ),
      )
    } catch (error) {
      setFeedback(error.message || 'Failed to load seat data.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function toggleSeat(seatNumber) {
    const seat = seats.find((item) => item.number === seatNumber)
    if (!seat || seat.status === 'booked') {
      return
    }

    setSelectedSeats((current) => {
      if (current.includes(seatNumber)) {
        return current.filter((value) => value !== seatNumber)
      }
      return [...current, seatNumber].sort((a, b) => a - b)
    })
  }

  async function handleBooking(event) {
    event.preventDefault()

    if (!customerName.trim() || selectedSeats.length === 0) {
      setFeedback('Enter customer name and select at least one available seat.')
      return
    }

    setIsSubmitting(true)
    setFeedback('')

    try {
      const res = await fetch(`${API_BASE}/api/shows/${SHOW_ID}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          seatNumbers: selectedSeats,
        }),
      })

      const payload = await res.json()
      if (!res.ok) {
        throw new Error(payload.error || 'Booking failed.')
      }

      setCustomerName('')
      setSelectedSeats([])
      setFeedback(
        `Booking confirmed (${payload.bookingRef}) for seats ${payload.seatNumbers.join(', ')}.`,
      )
      await loadData()
    } catch (error) {
      setFeedback(error.message || 'Booking failed.')
      await loadData()
    } finally {
      setIsSubmitting(false)
    }
  }

  async function cancelBooking(bookingRef) {
    setIsSubmitting(true)
    setFeedback('')

    try {
      const res = await fetch(`${API_BASE}/api/bookings/${bookingRef}`, {
        method: 'DELETE',
      })
      const payload = await res.json()

      if (!res.ok) {
        throw new Error(payload.error || 'Cancellation failed.')
      }

      setFeedback(
        `Booking ${payload.bookingRef} cancelled (${payload.releasedSeats} seat(s) released).`,
      )
      await loadData()
    } catch (error) {
      setFeedback(error.message || 'Cancellation failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="app-shell">
      <section className="header-card">
        <p className="eyebrow">Cinema Hall</p>
        <h1>Movie Ticket Booking System</h1>
        <p>
          {show ? show.title : 'Show'} | Total Seats: {show?.totalSeats ?? 20} | Available:{' '}
          {availableSeatCount}
        </p>
      </section>

      <section className="panel two-column">
        <div>
          <h2>1. View and Select Seats</h2>
          <p className="hint">
            Click available seats to select them. Booked seats cannot be selected.
          </p>
          {isLoading ? (
            <p>Loading seats...</p>
          ) : (
            <div className="seat-grid" aria-label="Seat map">
              {seats.map((seat) => {
                const isSelected = selectedSeats.includes(seat.number)
                const className = [
                  'seat',
                  seat.status === 'booked' ? 'booked' : 'available',
                  isSelected ? 'selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')

                return (
                  <button
                    key={seat.number}
                    type="button"
                    className={className}
                    disabled={seat.status === 'booked' || isSubmitting}
                    onClick={() => toggleSeat(seat.number)}
                  >
                    {seat.number}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <form onSubmit={handleBooking} className="booking-form">
          <h2>2. Book Tickets</h2>
          <label htmlFor="customerName">Customer Name</label>
          <input
            id="customerName"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            placeholder="e.g., Alex"
            disabled={isSubmitting}
          />

          <p className="hint">
            Selected seats:{' '}
            {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None'}
          </p>
          <button type="submit" disabled={isSubmitting || selectedSeats.length === 0}>
            {isSubmitting ? 'Processing...' : 'Confirm Booking'}
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>3. Cancel Booking</h2>
        <p className="hint">Cancel by booking reference to release all seats in that booking.</p>
        {bookings.length === 0 ? (
          <p>No bookings yet.</p>
        ) : (
          <ul className="booking-list">
            {bookings.map((booking) => (
              <li key={booking.bookingRef}>
                <div>
                  <strong>{booking.bookingRef}</strong>
                  <p>
                    {booking.customerName} | Seats: {booking.seats.join(', ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => cancelBooking(booking.bookingRef)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {feedback ? <p className="feedback">{feedback}</p> : null}
    </main>
  )
}

export default App
