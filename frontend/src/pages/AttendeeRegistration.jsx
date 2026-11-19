import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import {
  UserPlus,
  Calendar,
  MapPin,
  Mail,
  Phone,
  GraduationCap,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Ticket,
} from 'lucide-react';

export default function AttendeeRegistration() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const preselectedEventId = searchParams.get('event_id');

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(preselectedEventId || '');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    college: '',
  });
  const [loading, setLoading] = useState(false);
  const [fetchingEvents, setFetchingEvents] = useState(true);
  const [error, setError] = useState('');
  const [registeredTicket, setRegisteredTicket] = useState(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  useEffect(() => {
    api.getEvents()
      .then((data) => {
        setEvents(data);
        if (!selectedEventId && data.length > 0) {
          setSelectedEventId(data[0].event_id);
        }
      })
      .catch((err) => console.error('Failed to load events:', err))
      .finally(() => setFetchingEvents(false));
  }, []);

  const selectedEvent = events.find((e) => e.event_id === selectedEventId);
  const isFull = selectedEvent && selectedEvent.registered_count >= selectedEvent.capacity;
  const remaining = selectedEvent ? Math.max(0, selectedEvent.capacity - (selectedEvent.registered_count || 0)) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEventId) {
      setError('Please select an event.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.registerAttendee({
        event_id: selectedEventId,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        college: formData.college.trim(),
      });

      setRegisteredTicket(res.ticket);
      setAlreadyRegistered(res.already_registered || false);
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 flex items-center justify-center">
      <div className="w-full max-w-2xl space-y-6">
        {/* If registered successfully, show digital pass preview banner */}
        {registeredTicket ? (
          <div className="rounded-2xl border border-emerald-500/40 bg-navy-900/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center space-y-6">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                {alreadyRegistered ? 'Existing Pass Retrieved' : 'Registration Confirmed!'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                {alreadyRegistered
                  ? 'Welcome Back! Here is Your Digital QR Ticket'
                  : 'You Are Registered! Your QR Pass is Ready'}
              </h2>
              <p className="text-sm text-slate-400">
                Present this cryptographically secure QR code at the entrance scanner gate.
              </p>
            </div>

            {/* QR Card Preview */}
            <div className="max-w-xs mx-auto p-4 rounded-2xl border border-navy-800 bg-white text-slate-900 shadow-xl">
              <div className="text-center pb-3 border-b border-slate-200">
                <span className="text-[10px] uppercase font-bold text-brand-700 tracking-wider">Official Event Pass</span>
                <p className="font-extrabold text-sm text-slate-900 truncate mt-0.5">{registeredTicket.event.event_name}</p>
              </div>

              <div className="py-4 flex justify-center">
                <img
                  src={registeredTicket.qr_code_image}
                  alt="Attendee QR Code"
                  className="w-48 h-48 object-contain rounded-lg"
                />
              </div>

              <div className="text-center pt-2 border-t border-slate-200 text-xs text-slate-700">
                <p className="font-bold text-slate-900">{registeredTicket.attendee.name}</p>
                <p className="text-[11px] text-slate-500">{registeredTicket.attendee.college}</p>
                <p className="text-[10px] font-mono text-brand-600 font-semibold mt-1">Single-Use Gate Pass</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link
                to={`/ticket/${registeredTicket.ticket_id}`}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-xs font-semibold text-white shadow-lg shadow-brand-600/30 transition flex items-center justify-center gap-2"
              >
                <Ticket className="h-4 w-4" />
                <span>Open Full Ticket & Download PNG</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  setRegisteredTicket(null);
                  setFormData({ name: '', email: '', phone: '', college: '' });
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-navy-700 bg-navy-850 hover:bg-navy-800 text-xs text-slate-300 transition"
              >
                Register Another Attendee
              </button>
            </div>
          </div>
        ) : (
          /* Registration Form Box */
          <div className="rounded-2xl border border-navy-800 bg-navy-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600/20 text-brand-400 border border-brand-500/30 mb-1">
                <UserPlus className="h-6 w-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Event Registration
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Register to receive your unique cryptographic digital QR ticket pass.
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Event Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Select Event *</span>
                  {selectedEvent && (
                    <span className={`text-[11px] font-mono font-bold ${isFull ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {isFull ? 'Event Sold Out / Full' : `${remaining} Seats Available`}
                    </span>
                  )}
                </label>

                {fetchingEvents ? (
                  <div className="h-10 rounded-xl bg-navy-950 animate-pulse border border-navy-800" />
                ) : events.length === 0 ? (
                  <div className="p-3 text-xs text-slate-400 bg-navy-950 rounded-xl border border-navy-800">
                    No active events open for registration right now.
                  </div>
                ) : (
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    required
                    className="w-full rounded-xl border border-navy-700 bg-navy-950/90 px-4 py-2.5 text-xs sm:text-sm text-white focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    {events.map((e) => (
                      <option key={e.event_id} value={e.event_id}>
                        {e.event_name} — {new Date(e.date).toLocaleDateString()} ({e.capacity - (e.registered_count || 0)} left)
                      </option>
                    ))}
                  </select>
                )}

                {/* Selected Event Card Pill */}
                {selectedEvent && (
                  <div className="mt-2.5 p-3 rounded-xl bg-navy-950/80 border border-navy-800 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-slate-200">
                      <MapPin className="h-3.5 w-3.5 text-brand-400 shrink-0" />
                      {selectedEvent.venue}
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-400 font-mono">
                      <Calendar className="h-3.5 w-3.5 text-brand-400 shrink-0" />
                      {new Date(selectedEvent.date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Attendee Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Johnathan Doe"
                    className="w-full rounded-xl border border-navy-700 bg-navy-950/80 px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@college.edu"
                      className="w-full rounded-xl border border-navy-700 bg-navy-950/80 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 (555) 019-2834"
                      className="w-full rounded-xl border border-navy-700 bg-navy-950/80 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    College / Institute *
                  </label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={formData.college}
                      onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                      placeholder="e.g. Stanford University"
                      className="w-full rounded-xl border border-navy-700 bg-navy-950/80 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || isFull || events.length === 0}
                className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-indigo-600 py-3 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-brand-600/30 hover:from-brand-500 hover:to-indigo-500 transition active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Generate & Download My QR Ticket</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-4 border-t border-navy-800 text-center">
              <p className="text-xs text-slate-400">
                Already registered previously?{' '}
                <Link to="/my-ticket" className="text-brand-400 hover:text-brand-300 font-semibold underline underline-offset-4">
                  Find & Download Existing QR Pass
                </Link>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
