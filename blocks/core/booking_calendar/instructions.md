# Booking Calendar Block Instructions

When instructed to "Add a Booking Calendar" or "Add an Appointment System" to a client repository:

1. **Deploy Logic:**
   - Ensure the `appointments` table exists in the tenant's schema by running `blocks/booking_calendar/schema.sql`.
   - Copy `blocks/booking_calendar/engine.ts` into `src/hooks/useBookingCalendar.ts` in the client's repository.

2. **Generate UI (The Skin):**
   - Create a bespoke UI component (e.g., `src/components/BookingWidget.tsx`).
   - Import `useBookingCalendar` from `src/hooks/useBookingCalendar.ts`.
   - *Do not add raw fetch/Supabase calls in the UI component.* All state (loading, error, success) and submission logic MUST be handled by the hook.
   - Wire your bespoke date picker and time selection inputs to a local React state, and pass them to `requestAppointment({ customer_name, customer_email, appointment_date, appointment_time })` `onSubmit`.
   - Style the calendar and form completely uniquely using Tailwind CSS, ensuring it matches the tenant's exact aesthetic.
   - Render the `loading` state (e.g. spinning button) and `error`/`success` states gracefully.

3. **Admin Integration:**
   - Add a Calendar View or Data Table to the `/admin` route that fetches from `appointments` to let the business owner manage and confirm bookings.
