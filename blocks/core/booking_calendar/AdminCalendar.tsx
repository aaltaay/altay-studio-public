// blocks/booking_calendar/AdminCalendar.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Event } from 'react-big-calendar';
import withDragAndDropFn from 'react-big-calendar/lib/addons/dragAndDrop';
import type { withDragAndDropProps } from 'react-big-calendar/lib/addons/dragAndDrop';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { supabase } from '@/lib/supabase';

// Handle Vite CJS/ESM interop for react-big-calendar
const withDragAndDrop = (withDragAndDropFn as any).default || withDragAndDropFn;

// Setup date-fns localizer for react-big-calendar
const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const DnDCalendar = withDragAndDrop(Calendar);

export interface AppointmentEvent extends Event {
  id: string;
  title: string;
  customer_name: string;
  customer_email: string;
  service_requested: string;
  google_event_id?: string;
}

export function AdminCalendar() {
  const [events, setEvents] = useState<AppointmentEvent[]>([
    // Mock event to show modern styling
    {
      id: '1',
      title: 'Haircut - John Doe',
      customer_name: 'John Doe',
      customer_email: 'john@example.com',
      service_requested: 'Haircut',
      start: new Date(new Date().setHours(10, 0, 0, 0)),
      end: new Date(new Date().setHours(11, 0, 0, 0)),
    }
  ]);

  // Handle Drag & Drop to Reschedule
  const onEventDrop: withDragAndDropProps['onEventDrop'] = useCallback(
    async ({ event, start, end }) => {
      const updatedEvent = event as AppointmentEvent;
      
      // Optimistic UI Update
      setEvents((prev) => {
        const existing = prev.find((ev) => ev.id === updatedEvent.id) ?? {};
        const filtered = prev.filter((ev) => ev.id !== updatedEvent.id);
        return [...filtered, { ...existing, start, end }] as AppointmentEvent[];
      });

      // 1. Update Supabase
      // 2. Invoke sync-google-calendar edge function to update the real Google Calendar
      /*
      await supabase.from('appointments').update({
        appointment_date: format(start, 'yyyy-MM-dd'),
        appointment_time: format(start, 'HH:mm:ss')
      }).eq('id', updatedEvent.id);

      await supabase.functions.invoke('sync-google-calendar', {
        body: { action: 'update', appointment_id: updatedEvent.id }
      });
      */
    },
    []
  );

  const onEventResize: withDragAndDropProps['onEventResize'] = useCallback(
    async ({ event, start, end }) => {
      const updatedEvent = event as AppointmentEvent;
      setEvents((prev) => {
        const existing = prev.find((ev) => ev.id === updatedEvent.id) ?? {};
        const filtered = prev.filter((ev) => ev.id !== updatedEvent.id);
        return [...filtered, { ...existing, start, end }] as AppointmentEvent[];
      });
    },
    []
  );

  // Custom Event Component (The "Skin")
  const CustomEvent = useMemo(() => {
    return ({ event }: { event: AppointmentEvent }) => (
      <div className="flex flex-col h-full overflow-hidden p-1 bg-primary text-primary-foreground rounded-md shadow-sm border border-primary/20">
        <span className="text-xs font-bold truncate">{event.title}</span>
        <span className="text-[10px] opacity-80 truncate">{event.service_requested}</span>
      </div>
    );
  }, []);

  return (
    <div className="h-[700px] w-full p-4 bg-background rounded-xl border shadow-sm">
      <div className="mb-4">
        <h2 className="text-2xl font-semibold tracking-tight">Schedule</h2>
        <p className="text-sm text-muted-foreground">Manage your Google Calendar synced appointments.</p>
      </div>

      {/* 
        Tailwind overrides for react-big-calendar to make it look modern.
        We apply a wrapper class to isolate styles.
      */}
      <div className="rbc-modern-wrapper h-[600px]">
        <DnDCalendar
          localizer={localizer}
          events={events}
          onEventDrop={onEventDrop}
          onEventResize={onEventResize}
          resizable
          selectable
          defaultView="week"
          views={['month', 'week', 'day']}
          step={30}
          timeslots={2}
          components={{
            event: CustomEvent,
          }}
          // Style Overrides injected via Tailwind classes 
          className="font-sans border-border"
        />
      </div>
      
      {/* 
        Add this to your global index.css to make it truly match the tenant's brand:
        .rbc-modern-wrapper .rbc-header { @apply py-2 bg-muted/50 font-medium border-border; }
        .rbc-modern-wrapper .rbc-time-view, .rbc-modern-wrapper .rbc-month-view { @apply border-border rounded-lg overflow-hidden; }
        .rbc-modern-wrapper .rbc-today { @apply bg-primary/5; }
        .rbc-modern-wrapper .rbc-event { @apply bg-transparent border-none p-0; }
      */}
    </div>
  );
}
