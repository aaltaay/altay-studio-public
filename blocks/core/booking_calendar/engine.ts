// blocks/booking_calendar/engine.ts
import { useState } from 'react';
import { supabase } from '@/lib/supabase'; // Assumes @altaystudio/core or similar provides this

export interface AppointmentData {
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // HH:MM
  service_requested?: string;
  notes?: string;
}

export function useBookingCalendar() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const requestAppointment = async (data: AppointmentData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. Insert into our Supabase database
      const { data: appointment, error: submitError } = await supabase
        .from('appointments')
        .insert([{
          customer_name: data.customer_name,
          customer_email: data.customer_email,
          customer_phone: data.customer_phone,
          appointment_date: data.appointment_date,
          appointment_time: data.appointment_time,
          service_requested: data.service_requested,
          notes: data.notes,
          status: 'pending'
        }])
        .select()
        .single();

      if (submitError) throw submitError;

      // 2. Sync to actual Google Calendar via Edge Function (Path A)
      // This function uses the business owner's stored OAuth token to create the event
      const { error: syncError } = await supabase.functions.invoke('sync-google-calendar', {
        body: { action: 'create', appointment_id: appointment.id }
      });
      
      if (syncError) {
        console.warn('Supabase DB inserted, but Google Calendar sync failed:', syncError);
        // We do not throw here so the user still sees success, but admins see sync failure.
      }

      setSuccess(true);
    } catch (err: any) {
      console.error('Failed to request appointment:', err);
      setError(err.message || 'An error occurred while booking the appointment.');
    } finally {
      setLoading(false);
    }
  };

  return {
    requestAppointment,
    loading,
    error,
    success,
    reset: () => {
      setError(null);
      setSuccess(false);
    }
  };
}
