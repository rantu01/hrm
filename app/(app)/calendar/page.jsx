'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
const FullCalendar = dynamic(() => import('@fullcalendar/react'), { ssr: false });
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Modal,
  ErrorBanner,
  TableLoadingRow,
  readApiError,
} from '@/components/recruitment/recruitment-ui';
import { Calendar as CalendarIcon, Clock, Users, TentTree, Cake } from 'lucide-react';
import { format } from 'date-fns';

export default function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const calendarRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/calendar', { credentials: 'include' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.message || 'Failed to load calendar');
        if (!cancelled) setEvents(Array.isArray(json.events) ? json.events : []);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (calendarRef.current) {
        const api = calendarRef.current.getApi();
        if (window.innerWidth < 1024) {
          if (api.view.type !== 'timeGridDay') api.changeView('timeGridDay');
        } else {
          if (api.view.type === 'timeGridDay') api.changeView('dayGridMonth');
        }
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function handleEventClick(info) {
    const ev = events.find((e) => String(e.id) === String(info.event.id));
    if (ev) {
      setSelectedEvent(ev);
      setDialogOpen(true);
    }
    info.jsEvent?.target?.closest?.('.fc-popover')?.querySelector?.('.fc-popover-close')?.click?.();
  }

  const currentMonth = viewDate.getMonth();
  const currentYear = viewDate.getFullYear();
  const monthEvents = events.filter((e) => {
    const d = new Date(e.start);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const upcomingEvents = [...events]
    .filter((e) => new Date(e.start) >= new Date())
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const typeIcon = (type) => {
    if (type === 'meeting') return <Users className="h-4 w-4" />;
    if (type === 'holiday') return <TentTree className="h-4 w-4" />;
    if (type === 'birthday') return <Cake className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };
  const typeIconBoxClass = (type) => {
    if (type === 'meeting') return 'bg-blue-200 text-blue-700';
    if (type === 'holiday') return 'bg-green-200 text-green-700';
    if (type === 'birthday') return 'bg-pink-200 text-pink-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  if (loading) {
    return (
      <PageTemplate title="Calendar" description="View your scheduled events and activities.">
        <div className="py-10 text-center text-sm text-muted-foreground">Loading calendar...</div>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate title="Calendar" description="View your scheduled events and activities.">
      {error ? <ErrorBanner message={error} /> : null}
      <style>{`
        .fc .fc-event-title { font-size: 0.75rem; }
        .fc .fc-daygrid-event-harness { margin-bottom: 3px !important; }
        .fc .fc-popover-body { max-height: 130px; overflow-y: auto; }
        .fc .fc-toolbar { flex-wrap: wrap; gap: 0.75rem; }
        @media (max-width: 1023px) {
          .fc .fc-toolbar-chunk:nth-child(3) { display: none !important; }
          .fc .fc-toolbar-chunk { display: flex; align-items: center; justify-content: center; }
          .fc .fc-toolbar { justify-content: space-between; }
          .fc .fc-toolbar-title { font-size: 1.125rem !important; }
        }
      `}</style>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4 px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex-wrap">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Legend:</span>
              <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300"><div className="w-2.5 h-2.5 rounded-full bg-blue-700" />Meetings</div>
              <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300"><div className="w-2.5 h-2.5 rounded-full bg-green-700" />Holidays</div>
              <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300"><div className="w-2.5 h-2.5 rounded-full bg-yellow-700" />Leaves</div>
              <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300"><div className="w-2.5 h-2.5 rounded-full bg-pink-600" />Birthdays</div>
            </div>
            <div className="p-4" style={{ height: '800px' }}>
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView={typeof window !== 'undefined' && window.innerWidth < 1024 ? 'timeGridDay' : 'dayGridMonth'}
                headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
                buttonText={{ today: 'Today', month: 'Month', week: 'Week', day: 'Day' }}
                events={events}
                height="100%"
                editable={false}
                selectable={false}
                dayMaxEvents={true}
                weekends={true}
                eventDisplay="block"
                eventClick={handleEventClick}
                datesSet={(info) => setViewDate(info.view.currentStart)}
                displayEventTime={false}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 lg:space-y-6">
          <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
            <CardHeader className="pb-3 pt-4 px-4 border-b border-gray-100 dark:border-gray-800">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary shrink-0" />
                <span>Upcoming Events</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-80 overflow-y-auto overflow-x-hidden">
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 px-4 py-6 text-center">No upcoming events</p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      onClick={() => { setSelectedEvent(event); setDialogOpen(true); }}
                      className="flex items-start gap-3 p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer transition-colors min-w-0"
                    >
                      {(event.type === 'leave' || event.type === 'birthday') && event.avatar ? (
                        <img src={event.avatar} alt={event.title} className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg ${typeIconBoxClass(event.type)}`}>
                          {typeIcon(event.type)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 break-words leading-tight">{event.title}</p>
                        <p className="flex items-center gap-1 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 flex-wrap">
                          <CalendarIcon className="h-3 w-3 shrink-0" />
                          <span className="break-words">{format(new Date(event.start), 'PPp')}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
            <CardHeader className="pb-3 pt-4 px-4 border-b border-gray-100 dark:border-gray-800">
              <CardTitle className="text-sm font-semibold">This Month</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5">
              {[
                { label: 'Meetings', count: monthEvents.filter((e) => e.type === 'meeting').length, color: 'text-blue-600 dark:text-blue-400' },
                { label: 'Holidays', count: monthEvents.filter((e) => e.type === 'holiday').length, color: 'text-green-600 dark:text-green-400' },
                { label: 'Leaves', count: monthEvents.filter((e) => e.type === 'leave').length, color: 'text-yellow-600 dark:text-yellow-400' },
                { label: 'Birthdays', count: monthEvents.filter((e) => e.type === 'birthday').length, color: 'text-pink-600 dark:text-pink-400' },
                { label: 'Total Events', count: monthEvents.length, color: 'text-gray-700 dark:text-gray-300' },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex items-center justify-between text-xs sm:text-sm gap-2">
                  <span className="text-gray-500 dark:text-gray-400 break-words">{label}</span>
                  <span className={`font-semibold shrink-0 ${color}`}>{count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal open={dialogOpen} onClose={() => setDialogOpen(false)} title={selectedEvent?.title || 'Event'} size="sm">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {selectedEvent?.type === 'meeting' && 'Meeting'}
              {selectedEvent?.type === 'holiday' && 'Holiday'}
              {selectedEvent?.type === 'leave' && 'Leave'}
              {selectedEvent?.type === 'birthday' && 'Birthday'}
            </Badge>
            {selectedEvent?.status && <Badge variant="outline">{selectedEvent.status}</Badge>}
          </div>
          {!selectedEvent?.allDay && (
            <>
              <div>
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-medium">{selectedEvent?.start ? format(new Date(selectedEvent.start), 'PPpp') : ''}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">End Date</p>
                <p className="font-medium">{selectedEvent?.end ? format(new Date(selectedEvent.end), 'PPpp') : ''}</p>
              </div>
            </>
          )}
          {selectedEvent?.allDay && <Badge variant="outline">All Day Event</Badge>}
        </div>
      </Modal>
    </PageTemplate>
  );
}
