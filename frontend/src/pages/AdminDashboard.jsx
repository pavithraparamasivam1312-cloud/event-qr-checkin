import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import {
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  QrCode,
  CalendarPlus,
  Printer,
  ArrowUpRight,
  RefreshCw,
  Search,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [analyticsData, eventsData] = await Promise.all([
        api.getAnalytics(),
        api.getEvents(),
      ]);
      setAnalytics(analyticsData);
      setEvents(eventsData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh stats every 20 seconds
    const interval = setInterval(fetchData, 20000);
    return () => clearInterval(interval);
  }, []);

  const filteredEvents = events.filter((e) =>
    e.event_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.venue.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-navy-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Organizer Dashboard
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Feed
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Welcome back, <span className="text-white font-medium">{user?.name}</span>. Real-time entrance check-ins and capacity stats.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-navy-700 bg-navy-850 hover:bg-navy-800 text-xs font-semibold text-slate-200 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-brand-400' : ''}`} />
            <span>Refresh</span>
          </button>

          {isAdmin && (
            <Link
              to="/events/create"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-navy-800 hover:bg-navy-700 border border-navy-600 text-xs font-semibold text-white shadow transition"
            >
              <CalendarPlus className="h-4 w-4 text-brand-400" />
              <span>New Event</span>
            </Link>
          )}

          <Link
            to="/scanner"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-xs font-semibold text-white shadow-lg shadow-brand-600/30 transition active:scale-95"
          >
            <QrCode className="h-4 w-4" />
            <span>Open Scanner</span>
          </Link>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Active Events"
          value={analytics?.overview?.total_events || events.length}
          subtitle="Managed in system"
          icon={Calendar}
          color="brand"
        />
        <StatCard
          title="Total Registrations"
          value={analytics?.overview?.total_registered || 0}
          subtitle="Unique attendees registered"
          icon={Users}
          color="cyan"
        />
        <StatCard
          title="Checked In"
          value={analytics?.overview?.total_checked_in || 0}
          subtitle={`${analytics?.overview?.total_pending || 0} pending entrance`}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Attendance Rate"
          value={`${analytics?.overview?.attendance_rate || 0}%`}
          subtitle="Overall attendance turnout"
          icon={Clock}
          trend={`${analytics?.overview?.total_checked_in || 0} verified`}
          color="amber"
        />
      </div>

      {/* Main Grid: Events & Live Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Events List (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Active & Upcoming Events</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-navy-800 text-brand-300">
                  {events.length}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Monitor registration caps and real-time check-in velocity.
              </p>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-56 rounded-xl border border-navy-700 bg-navy-900 py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center rounded-2xl border border-navy-800 bg-navy-900/60">
              <div className="inline-block h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-3 text-xs text-slate-400">Loading events and statistics...</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-navy-800 bg-navy-900/40">
              <Calendar className="mx-auto h-10 w-10 text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-300">No events found</p>
              <p className="text-xs text-slate-500 mt-1">Create your first event to get started.</p>
              {isAdmin && (
                <Link
                  to="/events/create"
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white transition"
                >
                  <CalendarPlus className="h-4 w-4" />
                  <span>Create Event</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredEvents.map((ev) => {
                const reg = ev.registered_count || 0;
                const chk = ev.checked_in_count || 0;
                const cap = ev.capacity || 100;
                const regPct = Math.min(100, Math.round((reg / cap) * 100));
                const chkPct = reg > 0 ? Math.round((chk / reg) * 100) : 0;

                return (
                  <div
                    key={ev.event_id}
                    className="group relative overflow-hidden rounded-2xl border border-navy-800 bg-navy-900/80 p-5 backdrop-blur-md transition-all hover:border-brand-600/40 hover:bg-navy-850 shadow-md"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5">
                          <StatusBadge status={ev.status} type="event" />
                          <h3 className="font-bold text-white text-base group-hover:text-brand-300 transition-colors">
                            {ev.event_name}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-1">{ev.description || 'No description provided'}</p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-1">
                          <span className="flex items-center gap-1 text-slate-300 font-mono">
                            <Calendar className="h-3.5 w-3.5 text-brand-400" />
                            {new Date(ev.date).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span>•</span>
                          <span className="text-slate-300 truncate max-w-xs">{ev.venue}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          to={`/scanner?event_id=${ev.event_id}`}
                          title="Open Gate Scanner for this event"
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-600/20 hover:bg-brand-600/30 border border-brand-500/30 text-brand-300 text-xs font-semibold transition"
                        >
                          <QrCode className="h-3.5 w-3.5" />
                          <span>Scan</span>
                        </Link>
                        <Link
                          to={`/events/${ev.event_id}`}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-navy-700 bg-navy-800 hover:bg-navy-700 text-slate-200 text-xs font-semibold transition"
                        >
                          <span>Manage</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>

                    {/* Progress Bar & Counters */}
                    <div className="mt-4 pt-4 border-t border-navy-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400">Capacity Filled</span>
                          <span className="font-mono text-white font-semibold">{reg} / {cap} ({regPct}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-navy-950 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full"
                            style={{ width: `${regPct}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400">Entrance Turnout</span>
                          <span className="font-mono text-emerald-400 font-semibold">{chk} ({chkPct}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-navy-950 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                            style={{ width: `${chkPct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2 text-xs text-slate-400">
                        <Link
                          to={`/badges?event_id=${ev.event_id}`}
                          className="hover:text-brand-300 flex items-center gap-1 underline underline-offset-4"
                        >
                          <Printer className="h-3 w-3" />
                          <span>Print Badges</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Live Check-In Activity Feed (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Gate Activity Feed</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </h2>
            <Link to="/reports" className="text-xs text-brand-400 hover:text-brand-300 font-semibold">
              View History
            </Link>
          </div>

          <div className="rounded-2xl border border-navy-800 bg-navy-900/90 p-4 backdrop-blur-md shadow-lg divide-y divide-navy-800/60 max-h-[600px] overflow-y-auto">
            {(!analytics?.recent_activity || analytics.recent_activity.length === 0) ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <QrCode className="h-8 w-8 mx-auto mb-2 opacity-40 text-slate-400" />
                No scans recorded yet. Ready at the gate!
              </div>
            ) : (
              analytics.recent_activity.map((item) => (
                <div key={item.checkin_id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{item.attendee_name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{item.college}</p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {item.checkin_time}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400 truncate max-w-[140px]">
                      {item.event_name}
                    </span>
                    <StatusBadge status={item.validation_status} type="checkin" />
                  </div>

                  {item.notes && (
                    <p className="mt-1 text-[10px] text-slate-500 truncate italic">
                      {item.notes}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Quick Staff Checklist Banner */}
          <div className="rounded-2xl border border-brand-800/40 bg-gradient-to-br from-brand-950/60 to-navy-900 p-4 text-xs text-slate-300 space-y-2">
            <h4 className="font-semibold text-brand-300 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-brand-400" />
              Security Protocol Reminder
            </h4>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Every digital ticket is bound to a single attendee and validated with atomic database locks. Never admit reused or tampered QR passes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
