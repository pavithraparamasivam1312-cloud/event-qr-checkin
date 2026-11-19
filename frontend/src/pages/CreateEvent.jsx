import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Calendar, MapPin, Users, FileText, ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react';

export default function CreateEvent() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    event_name: '',
    description: '',
    date: '',
    venue: '',
    capacity: 100,
    status: 'UPCOMING',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Ensure date is valid ISO format
      const isoDate = new Date(formData.date).toISOString();
      const res = await api.createEvent({
        ...formData,
        date: isoDate,
        capacity: parseInt(formData.capacity, 10),
      });
      navigate(`/events/${res.event_id}`);
    } catch (err) {
      setError(err.message || 'Failed to create event. Please verify all fields.');
    } finally {
      setLoading(false);
    }
  };

  const setTemplate = (name, venue, cap, desc) => {
    // Tomorrow at 10 AM
    const d = new Date();
    d.setDate(d.getDate() + 2);
    d.setHours(10, 0, 0, 0);
    const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    setFormData({
      event_name: name,
      venue: venue,
      capacity: cap,
      description: desc,
      date: localIso,
      status: 'UPCOMING',
    });
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Events</span>
      </button>

      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Create New Event
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Configure event parameters, attendee capacity limit, venue, and ticketing rules.
        </p>
      </div>

      {/* Quick Templates */}
      <div className="rounded-2xl border border-navy-800 bg-navy-900/60 p-4">
        <p className="text-xs font-semibold text-brand-300 flex items-center gap-1.5 mb-2">
          <Sparkles className="h-3.5 w-3.5" />
          Quick Event Presets:
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTemplate(
              'National Inter-College Hackathon 2026',
              'Auditorium complex & Innovation Lab 3',
              200,
              '36-hour intense hackathon focused on Web3, Generative AI, and Autonomous Systems.'
            )}
            className="px-3 py-1.5 rounded-lg border border-navy-700 bg-navy-850 hover:bg-navy-800 text-xs text-slate-200 transition"
          >
            💻 36-Hr Hackathon
          </button>
          <button
            type="button"
            onClick={() => setTemplate(
              'Hands-on Machine Learning & LLM Workshop',
              'Computer Center Lab 4',
              60,
              'Practical workshop exploring transformer fine-tuning, retrieval-augmented generation, and deployment.'
            )}
            className="px-3 py-1.5 rounded-lg border border-navy-700 bg-navy-850 hover:bg-navy-800 text-xs text-slate-200 transition"
          >
            🤖 AI Masterclass
          </button>
          <button
            type="button"
            onClick={() => setTemplate(
              'Tech Leadership & Startup Seminar',
              'Main Seminar Hall A',
              150,
              'Keynote talks and fireside chats with founders, investors, and campus alumni.'
            )}
            className="px-3 py-1.5 rounded-lg border border-navy-700 bg-navy-850 hover:bg-navy-800 text-xs text-slate-200 transition"
          >
            🎤 Campus Seminar
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-navy-800 bg-navy-900/90 p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-xl">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Event Name *
            </label>
            <input
              type="text"
              required
              value={formData.event_name}
              onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
              placeholder="e.g. Annual Tech Symposium & Hackfest"
              className="w-full rounded-xl border border-navy-700 bg-navy-950/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Description & Highlights
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief details about the event schedule, rules, and speaker list..."
              className="w-full rounded-xl border border-navy-700 bg-navy-950/80 p-3 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-brand-400" />
                Date & Start Time *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full rounded-xl border border-navy-700 bg-navy-950/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-brand-400" />
                Attendee Capacity Limit *
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                className="w-full rounded-xl border border-navy-700 bg-navy-950/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-brand-400" />
                Venue / Room / Campus Location *
              </label>
              <input
                type="text"
                required
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                placeholder="e.g. Science Block Auditorium, Gate 2"
                className="w-full rounded-xl border border-navy-700 bg-navy-950/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Initial Event Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full rounded-xl border border-navy-700 bg-navy-950/80 px-4 py-2.5 text-sm text-white focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="UPCOMING">Upcoming</option>
                <option value="ACTIVE">Active / Gate Open</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-navy-800">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2.5 rounded-xl border border-navy-700 text-xs font-semibold text-slate-300 hover:bg-navy-800 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-xs font-semibold text-white shadow-lg shadow-brand-600/30 transition active:scale-95 disabled:opacity-60"
          >
            {loading ? (
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Publish Event & Enable Registration</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
