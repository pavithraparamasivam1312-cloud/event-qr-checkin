import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import {
  Printer,
  Calendar,
  MapPin,
  Search,
  Filter,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Tag,
} from 'lucide-react';

export default function BadgePrinting() {
  const [searchParams] = useSearchParams();
  const initialEventId = searchParams.get('event_id');
  const initialTicketId = searchParams.get('ticket_id');

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(initialEventId || '');
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [printingTicketId, setPrintingTicketId] = useState(null);

  useEffect(() => {
    api.getEvents()
      .then((data) => {
        setEvents(data);
        if (!selectedEventId && data.length > 0) {
          setSelectedEventId(data[0].event_id);
        }
      })
      .catch((err) => console.error('Failed to load events:', err));
  }, []);

  const loadBadges = async () => {
    try {
      setLoading(true);
      const data = await api.getBadges(selectedEventId);
      setBadges(data);
    } catch (err) {
      console.error('Failed to fetch badges:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      loadBadges();
    }
  }, [selectedEventId]);

  const handlePrintIndividual = async (ticket) => {
    setPrintingTicketId(ticket.ticket_id);
    try {
      await api.recordBadgePrint({
        ticket_id: ticket.ticket_id,
        printed_by: 'Gate Print Station',
      });
    } catch (e) {
      console.warn('Could not record badge print log:', e);
    }

    // Set printable target class and trigger print
    setTimeout(() => {
      window.print();
      setPrintingTicketId(null);
    }, 200);
  };

  const handlePrintAll = () => {
    setPrintingTicketId(null);
    window.print();
  };

  const filteredBadges = badges.filter((b) => {
    const q = search.toLowerCase();
    const matchesSearch =
      b.attendee.name.toLowerCase().includes(q) ||
      b.attendee.college.toLowerCase().includes(q) ||
      b.attendee.email.toLowerCase().includes(q);

    if (initialTicketId) {
      return b.ticket_id === initialTicketId && matchesSearch;
    }
    return matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header & Print Control Bar (Hidden when printing) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-navy-800 pb-5 no-print">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>Attendee Badge Printing Studio</span>
            <Printer className="h-6 w-6 text-indigo-400" />
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Generate and print conference/workshop lanyards with attendee details and scannable QR pass.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handlePrintAll}
            disabled={filteredBadges.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-xs font-semibold text-white shadow-lg shadow-brand-600/30 transition active:scale-95 disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            <span>Print All Visible Badges ({filteredBadges.length})</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Toolbar (Hidden when printing) */}
      <div className="rounded-2xl border border-navy-800 bg-navy-900/90 p-4 sm:p-5 backdrop-blur-md shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center gap-4 no-print">
        <div className="flex-1">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Select Event to Print Badges
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full rounded-xl border border-navy-700 bg-navy-950 px-3.5 py-2 text-xs sm:text-sm text-white focus:border-brand-500 focus:outline-none"
          >
            {events.map((e) => (
              <option key={e.event_id} value={e.event_id}>
                {e.event_name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:w-72">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Search Attendee Name / College
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-navy-700 bg-navy-950 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center no-print">
          <div className="inline-block h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-xs text-slate-400">Loading attendee badges...</p>
        </div>
      ) : filteredBadges.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-navy-800 bg-navy-900/50 no-print">
          <Tag className="mx-auto h-10 w-10 text-slate-600 mb-2" />
          <p className="text-sm font-semibold text-slate-300">No attendees found to generate badges</p>
          <p className="text-xs text-slate-500 mt-1">Register attendees for this event to print their badges.</p>
        </div>
      ) : (
        /* Badges Grid (Visible on screen and printed via @media print) */
        <div className="printable-badge-area grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBadges.map((badge) => {
            const isTargetedPrint = !printingTicketId || printingTicketId === badge.ticket_id;
            if (!isTargetedPrint) return null;

            return (
              <div
                key={badge.ticket_id}
                className="relative rounded-3xl border-2 border-navy-700 bg-white text-slate-900 shadow-2xl overflow-hidden flex flex-col justify-between break-inside-avoid print:shadow-none print:border-2 print:border-black print:m-2"
                style={{ minHeight: '380px' }}
              >
                {/* Lanyard Hole cutout visual for realistic badge look */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-2 rounded-full bg-slate-300 border border-slate-400 no-print" />

                {/* Badge Top Header */}
                <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-navy-900 p-5 pt-6 text-white text-center print:bg-black print:text-white">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-brand-300 print:text-gray-300">
                    DELEGATE PASS
                  </span>
                  <h3 className="font-extrabold text-base leading-tight mt-1 line-clamp-1">
                    {badge.event.event_name}
                  </h3>
                  <p className="text-[10px] text-slate-300 font-mono mt-0.5">
                    {new Date(badge.event.date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                {/* Badge Body */}
                <div className="p-6 text-center space-y-4 flex-1 flex flex-col justify-center items-center">
                  <div className="space-y-1">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                      {badge.attendee.name}
                    </h2>
                    <p className="text-xs font-semibold text-brand-800 uppercase tracking-wide">
                      {badge.attendee.college}
                    </p>
                  </div>

                  {/* Scannable QR Code */}
                  <div className="p-2.5 rounded-xl border-2 border-slate-200 bg-white shadow-md inline-block">
                    <img
                      src={badge.qr_code_image}
                      alt="Badge QR"
                      className="w-32 h-32 object-contain"
                    />
                  </div>

                  <div className="text-[10px] text-slate-500 font-mono">
                    PASS: {badge.ticket_id.slice(0, 13)}
                  </div>
                </div>

                {/* Badge Footer */}
                <div className="p-3 bg-slate-100 border-t border-slate-200 text-center flex items-center justify-between text-[11px] text-slate-600 px-5">
                  <span className="truncate max-w-[180px] font-medium">{badge.event.venue}</span>
                  <span className="font-bold text-brand-700">ATTENDEE</span>
                </div>

                {/* Print button overlay on hover (Screen only) */}
                <div className="p-3 bg-navy-950/90 border-t border-navy-800 flex items-center justify-between no-print">
                  <span className="text-xs text-slate-400">Individual Badge</span>
                  <button
                    onClick={() => handlePrintIndividual(badge)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow transition"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print This Badge</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
