import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import {
  Calendar,
  CalendarPlus,
  MapPin,
  Users,
  Search,
  ChevronRight,
  QrCode,
  Printer,
} from 'lucide-react';

export default function EventsList() {
  const { isAdmin } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    api.getEvents()
      .then((data) => setEvents(data))
      .catch((err) => console.error('Failed to load events:', err))
      .finally(() => setLoading(false));
  }, []);

  const filteredEvents = events.filter((e) => {
    const matchesSearch =
      e.event_name.toLowerCase().includes(search.toLowerCase()) ||
      e.venue.toLowerCase().includes(search.toLowerCase());
    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && e.status === statusFilter;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-navy-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>All Events & Workshops</span>
            <Calendar className="h-6 w-6 text-brand-400" />
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Browse and manage all hosted conferences, workshops, and college hackathons.
          </p>
        </div>

        {isAdmin && (
          <Link
            to="/events/create"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-xs font-semibold text-white shadow-lg shadow-brand-600/30 transition active:scale-95"
          >
            <CalendarPlus className="h-4 w-4" />
            <span>Create New Event</span>
          </Link>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-navy-800 bg-navy-900/90 p-4 sm:p-5 backdrop-blur-md shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex rounded-xl bg-navy-950 p-1 border border-navy-800 text-xs">
          {['ALL', 'ACTIVE', 'UPCOMING', 'COMPLETED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                statusFilter === st
                  ? 'bg-brand-600 text-white font-semibold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative sm:w-72">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search event name, venue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-navy-700 bg-navy-950 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="p-12 text-center">
          <div className="inline-block h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-xs text-slate-400">Loading events catalog...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-navy-800 bg-navy-900/40">
          <Calendar className="mx-auto h-10 w-10 text-slate-600 mb-2" />
          <p className="text-sm font-semibold text-slate-300">No events found matching your filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((ev) => {
            const reg = ev.registered_count || 0;
            const chk = ev.checked_in_count || 0;
            const cap = ev.capacity || 100;
            const regPct = Math.min(100, Math.round((reg / cap) * 100));

            return (
              <div
                key={ev.event_id}
                className="group rounded-2xl border border-navy-800 bg-navy-900/90 p-5 backdrop-blur-md hover:border-brand-600/40 hover:bg-navy-850 transition flex flex-col justify-between space-y-4 shadow-lg"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <StatusBadge status={ev.status} type="event" />
                    <span className="text-[11px] font-mono text-slate-500">
                      Cap: {cap}
                    </span>
                  </div>

                  <Link to={`/events/${ev.event_id}`}>
                    <h3 className="font-extrabold text-base text-white group-hover:text-brand-300 transition-colors line-clamp-1">
                      {ev.event_name}
                    </h3>
                  </Link>

                  <p className="text-xs text-slate-400 line-clamp-2">
                    {ev.description || 'No description provided.'}
                  </p>

                  <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-navy-800/80">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-brand-400 shrink-0" />
                      <span className="font-mono text-[11px]">
                        {new Date(ev.date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-brand-400 shrink-0" />
                      <span className="truncate">{ev.venue}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-navy-800/80">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Registrations: {reg}/{cap}</span>
                      <span className="font-mono text-emerald-400 font-bold">{chk} checked in</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-navy-950 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-600 to-indigo-500 rounded-full"
                        style={{ width: `${regPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <Link
                      to={`/scanner?event_id=${ev.event_id}`}
                      className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 font-semibold"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      <span>Scanner</span>
                    </Link>

                    <Link
                      to={`/events/${ev.event_id}`}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-navy-700 bg-navy-800 hover:bg-navy-700 text-xs font-semibold text-white transition"
                    >
                      <span>Manage</span>
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
