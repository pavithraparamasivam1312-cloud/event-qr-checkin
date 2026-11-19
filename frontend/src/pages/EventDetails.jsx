import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import StatCard from '../components/StatCard';
import {
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  Clock,
  QrCode,
  Printer,
  Copy,
  Trash2,
  Edit,
  ArrowLeft,
  Search,
  ExternalLink,
  UserPlus,
} from 'lucide-react';

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [event, setEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [copied, setCopied] = useState(false);

  // Edit Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    event_name: '',
    description: '',
    date: '',
    venue: '',
    capacity: 100,
    status: 'UPCOMING',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eventData, attendeesData] = await Promise.all([
        api.getEvent(id),
        api.getEventAttendees(id),
      ]);
      setEvent(eventData);
      setAttendees(attendeesData);
      setEditForm({
        event_name: eventData.event_name,
        description: eventData.description,
        date: new Date(eventData.date).toISOString().slice(0, 16),
        venue: eventData.venue,
        capacity: eventData.capacity,
        status: eventData.status,
      });
    } catch (err) {
      console.error('Failed to load event details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/register?event_id=${id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to permanently delete this event and all associated tickets?')) {
      try {
        await api.deleteEvent(id);
        navigate('/dashboard');
      } catch (err) {
        alert(err.message || 'Failed to delete event');
      }
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const updated = await api.updateEvent(id, {
        ...editForm,
        date: new Date(editForm.date).toISOString(),
        capacity: parseInt(editForm.capacity, 10),
      });
      setEvent(updated);
      setIsEditing(false);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to update event');
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-xs text-slate-400">Loading event information...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-12 text-center text-slate-400">
        <p>Event not found or has been removed.</p>
        <Link to="/dashboard" className="mt-4 inline-block text-brand-400 text-xs font-semibold">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const filteredTickets = attendees.filter((t) => {
    const matchesSearch =
      t.attendee.name.toLowerCase().includes(search.toLowerCase()) ||
      t.attendee.email.toLowerCase().includes(search.toLowerCase()) ||
      t.attendee.college.toLowerCase().includes(search.toLowerCase());

    if (statusFilter === 'CHECKED_IN') return matchesSearch && t.is_used;
    if (statusFilter === 'PENDING') return matchesSearch && !t.is_used;
    return matchesSearch;
  });

  const reg = event.registered_count || attendees.length;
  const chk = event.checked_in_count || attendees.filter(a => a.is_used).length;
  const pending = reg - chk;
  const rate = reg > 0 ? Math.round((chk / reg) * 100) : 0;

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Top Breadcrumb & Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-navy-700 bg-navy-850 hover:bg-navy-800 text-xs text-slate-200 transition"
          >
            <Copy className="h-3.5 w-3.5 text-brand-400" />
            <span>{copied ? 'Copied Link!' : 'Registration Link'}</span>
          </button>

          <Link
            to={`/register?event_id=${id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-navy-700 bg-navy-850 hover:bg-navy-800 text-xs text-slate-200 transition"
          >
            <UserPlus className="h-3.5 w-3.5 text-emerald-400" />
            <span>Register Attendee</span>
          </Link>

          <Link
            to={`/badges?event_id=${id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-navy-700 bg-navy-850 hover:bg-navy-800 text-xs text-slate-200 transition"
          >
            <Printer className="h-3.5 w-3.5 text-indigo-400" />
            <span>Print Badges</span>
          </Link>

          <Link
            to={`/scanner?event_id=${id}`}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-xs font-semibold text-white shadow-md shadow-brand-600/30 transition active:scale-95"
          >
            <QrCode className="h-4 w-4" />
            <span>Open Scanner</span>
          </Link>

          {isAdmin && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 rounded-lg border border-navy-700 hover:bg-navy-800 text-slate-300 hover:text-white transition"
                title="Edit Event"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={handleDelete}
                className="p-2 rounded-lg border border-rose-900/50 hover:bg-rose-950/50 text-rose-400 transition"
                title="Delete Event"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Event Header Banner */}
      <div className="rounded-2xl border border-navy-800 bg-gradient-to-br from-navy-900 via-navy-850 to-navy-900 p-6 sm:p-8 backdrop-blur-xl shadow-xl space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={event.status} type="event" />
          <span className="text-xs font-mono text-slate-400">ID: {event.event_id}</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          {event.event_name}
        </h1>

        <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
          {event.description || 'No description provided.'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-navy-800/80 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-brand-400 shrink-0" />
            <span>
              {new Date(event.date).toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-brand-400 shrink-0" />
            <span className="truncate">{event.venue}</span>
          </div>

          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-400 shrink-0" />
            <span>Capacity Limit: <strong className="text-white font-mono">{event.capacity} Attendees</strong></span>
          </div>
        </div>
      </div>

      {/* Attendance Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Registered"
          value={reg}
          subtitle={`${event.capacity - reg} seats remaining`}
          icon={Users}
          color="cyan"
        />
        <StatCard
          title="Entrance Check-Ins"
          value={chk}
          subtitle="Unique QR codes scanned"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Pending Arrivals"
          value={pending}
          subtitle="Expected at gate"
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Live Turnout"
          value={`${rate}%`}
          subtitle="Of registered attendees"
          icon={QrCode}
          color="brand"
        />
      </div>

      {/* Attendees Table Section */}
      <div className="rounded-2xl border border-navy-800 bg-navy-900/90 backdrop-blur-md shadow-xl overflow-hidden space-y-4 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Registered Attendees</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-navy-800 text-brand-300 font-mono">
                {filteredTickets.length} / {attendees.length}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Each attendee has a cryptographically signed single-use digital QR pass.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <div className="flex rounded-xl bg-navy-950 p-1 border border-navy-800 text-xs">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  statusFilter === 'ALL' ? 'bg-navy-800 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('CHECKED_IN')}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  statusFilter === 'CHECKED_IN' ? 'bg-emerald-600/30 text-emerald-300 font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Checked In
              </button>
              <button
                onClick={() => setStatusFilter('PENDING')}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  statusFilter === 'PENDING' ? 'bg-amber-600/30 text-amber-300 font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Pending
              </button>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search attendee, college..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-56 rounded-xl border border-navy-700 bg-navy-950 py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-navy-800 bg-navy-950/50 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              <tr>
                <th className="py-3 px-4">Attendee Name</th>
                <th className="py-3 px-4">College / University</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Pass Status</th>
                <th className="py-3 px-4">Check-In Time</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60 text-slate-300">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No attendees match the criteria.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((t) => (
                  <tr key={t.ticket_id} className="hover:bg-navy-800/40 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{t.attendee.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">
                        ID: {t.ticket_id.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-200">
                      {t.attendee.college}
                    </td>
                    <td className="py-3 px-4">
                      <div>{t.attendee.email}</div>
                      <div className="text-[10px] text-slate-400">{t.attendee.phone}</div>
                    </td>
                    <td className="py-3 px-4">
                      {t.is_used ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="h-3 w-3" />
                          Checked In
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          <Clock className="h-3 w-3" />
                          Pending Gate
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {t.checkins ? (
                        <div>
                          <div>{new Date(t.checkins.checkin_time).toLocaleTimeString()}</div>
                          <div className="text-[9px] text-slate-500">By {t.checkins.staff_name}</div>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/ticket/${t.ticket_id}`}
                          title="View Digital Ticket Pass"
                          className="p-1.5 rounded-lg border border-navy-700 bg-navy-800 hover:bg-navy-700 text-slate-200 hover:text-white transition"
                        >
                          <QrCode className="h-3.5 w-3.5 text-brand-400" />
                        </Link>
                        <Link
                          to={`/badges?event_id=${id}&ticket_id=${t.ticket_id}`}
                          title="Print Attendee Badge"
                          className="p-1.5 rounded-lg border border-navy-700 bg-navy-800 hover:bg-navy-700 text-slate-200 hover:text-white transition"
                        >
                          <Printer className="h-3.5 w-3.5 text-indigo-400" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Event Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-navy-800 bg-navy-900 p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Edit Event Details</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Event Name</label>
                <input
                  type="text"
                  required
                  value={editForm.event_name}
                  onChange={(e) => setEditForm({ ...editForm, event_name: e.target.value })}
                  className="w-full rounded-xl border border-navy-700 bg-navy-950 px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full rounded-xl border border-navy-700 bg-navy-950 px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    className="w-full rounded-xl border border-navy-700 bg-navy-950 px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Capacity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editForm.capacity}
                    onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })}
                    className="w-full rounded-xl border border-navy-700 bg-navy-950 px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Venue</label>
                  <input
                    type="text"
                    required
                    value={editForm.venue}
                    onChange={(e) => setEditForm({ ...editForm, venue: e.target.value })}
                    className="w-full rounded-xl border border-navy-700 bg-navy-950 px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full rounded-xl border border-navy-700 bg-navy-950 px-3 py-2 text-xs text-white"
                  >
                    <option value="UPCOMING">Upcoming</option>
                    <option value="ACTIVE">Active</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-navy-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 rounded-lg border border-navy-700 text-xs text-slate-300 hover:bg-navy-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white shadow"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
