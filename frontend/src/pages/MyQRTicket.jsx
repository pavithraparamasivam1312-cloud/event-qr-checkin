import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import {
  Ticket as TicketIcon,
  Download,
  Printer,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Search,
  Sparkles,
  Copy,
  ExternalLink,
} from 'lucide-react';

export default function MyQRTicket() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email');

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lookupEmail, setLookupEmail] = useState(emailParam || '');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (id) {
      loadTicketById(id);
    } else if (emailParam) {
      handleLookup(emailParam);
    } else {
      // Default to first demo ticket if exists
      api.getAnalytics()
        .then((data) => {
          if (data?.recent_activity?.length > 0) {
            // lookup through first attendee
            setLookupEmail('priya.s@mit.edu');
            handleLookup('priya.s@mit.edu');
          } else {
            setLoading(false);
          }
        })
        .catch(() => setLoading(false));
    }
  }, [id, emailParam]);

  const loadTicketById = async (ticketId) => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getTicket(ticketId);
      setTicket(data);
    } catch (err) {
      setError(err.message || 'Ticket not found.');
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = async (emailToSearch) => {
    const targetEmail = (emailToSearch || lookupEmail).trim();
    if (!targetEmail) return;

    try {
      setLoading(true);
      setError('');
      const data = await api.lookupTicket(targetEmail);
      setTicket(data);
    } catch (err) {
      setError(`No ticket pass found registered to '${targetEmail}'. Please check the email spelling or register first.`);
      setTicket(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    if (!ticket?.qr_code_image) return;
    const a = document.createElement('a');
    a.href = ticket.qr_code_image;
    a.download = `ticket-${ticket.attendee.name.replace(/\s+/g, '_')}-${ticket.ticket_id.slice(0, 8)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const copyTicketId = () => {
    if (!ticket) return;
    navigator.clipboard.writeText(ticket.ticket_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      {/* Search Bar to Lookup Any Ticket */}
      <div className="rounded-2xl border border-navy-800 bg-navy-900/80 p-4 sm:p-6 backdrop-blur-md shadow-lg">
        <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
          <Search className="h-4 w-4 text-brand-400" />
          <span>Retrieve Your Digital Ticket</span>
        </h2>
        <p className="text-xs text-slate-400 mb-3">
          Enter the email address you used during event registration to access your scannable pass.
        </p>

        <form
          onSubmit={(e) => { e.preventDefault(); handleLookup(); }}
          className="flex flex-col sm:flex-row gap-2.5"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              type="email"
              required
              placeholder="e.g. priya.s@mit.edu"
              value={lookupEmail}
              onChange={(e) => setLookupEmail(e.target.value)}
              className="w-full rounded-xl border border-navy-700 bg-navy-950 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-xs font-semibold text-white shadow-md transition"
          >
            Find My Ticket
          </button>
        </form>

        {/* Demo Quick Lookups */}
        <div className="mt-3 pt-3 border-t border-navy-800 flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span className="text-[11px] text-slate-500">Quick Test Lookups:</span>
          <button
            type="button"
            onClick={() => { setLookupEmail('priya.s@mit.edu'); handleLookup('priya.s@mit.edu'); }}
            className="px-2 py-0.5 rounded bg-navy-800 hover:bg-navy-750 text-brand-300 text-[11px] font-mono"
          >
            priya.s@mit.edu (Used)
          </button>
          <button
            type="button"
            onClick={() => { setLookupEmail('aarav.patel@iitd.ac.in'); handleLookup('aarav.patel@iitd.ac.in'); }}
            className="px-2 py-0.5 rounded bg-navy-800 hover:bg-navy-750 text-emerald-300 text-[11px] font-mono"
          >
            aarav.patel@iitd.ac.in (Unused)
          </button>
        </div>
      </div>

      {loading && (
        <div className="p-12 text-center">
          <div className="inline-block h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-xs text-slate-400">Fetching digital pass...</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 text-center">
          {error}
        </div>
      )}

      {/* Ticket Pass Container */}
      {ticket && !loading && (
        <div className="printable-badge-area space-y-6">
          <div className="max-w-xl mx-auto rounded-3xl overflow-hidden border border-navy-700 bg-gradient-to-b from-navy-900 via-navy-850 to-navy-900 shadow-2xl relative">
            {/* Top Bar Header */}
            <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-indigo-600 p-6 text-white text-center relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/20 backdrop-blur-sm text-[11px] font-semibold uppercase tracking-wider mb-2">
                <ShieldCheck className="h-3.5 w-3.5 text-brand-200" />
                <span>Single-Use Cryptographic Pass</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">{ticket.event.event_name}</h2>
              <p className="text-xs text-brand-100 mt-1 max-w-sm mx-auto line-clamp-1">{ticket.event.description}</p>
            </div>

            {/* Middle Section: QR Code & Status */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* Status Banner */}
              <div className="text-center">
                {ticket.is_used ? (
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>TICKET CHECKED IN (USED)</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>ACTIVE PASS – READY FOR ENTRANCE</span>
                  </div>
                )}
              </div>

              {/* Crisp QR Code Box */}
              <div className="flex flex-col items-center justify-center">
                <div className="p-4 rounded-2xl bg-white shadow-xl ring-4 ring-brand-500/10">
                  <img
                    src={ticket.qr_code_image}
                    alt="Cryptographic QR Ticket"
                    className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-lg"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-2 font-mono">
                  Scan with authorized gatekeeper device camera
                </p>
              </div>

              {/* Attendee Details Grid */}
              <div className="rounded-2xl border border-navy-800 bg-navy-950/80 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Attendee Name
                  </span>
                  <p className="text-sm font-bold text-white mt-0.5">{ticket.attendee.name}</p>
                  <p className="text-[11px] text-slate-400">{ticket.attendee.email}</p>
                </div>

                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    College / Organization
                  </span>
                  <p className="text-sm font-bold text-slate-200 mt-0.5">{ticket.attendee.college}</p>
                  <p className="text-[11px] text-slate-400">{ticket.attendee.phone}</p>
                </div>

                <div className="pt-2 border-t border-navy-850">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-brand-400" />
                    Date & Time
                  </span>
                  <p className="text-xs font-semibold text-slate-200 mt-0.5">
                    {new Date(ticket.event.date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <div className="pt-2 border-t border-navy-850">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-brand-400" />
                    Venue
                  </span>
                  <p className="text-xs font-semibold text-slate-200 mt-0.5 truncate">
                    {ticket.event.venue}
                  </p>
                </div>
              </div>

              {/* Ticket ID & Security Hash Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-3 rounded-xl bg-navy-900 border border-navy-800 text-[11px]">
                <div className="flex items-center gap-1.5 font-mono text-slate-400">
                  <span>Pass ID:</span>
                  <span className="text-slate-200 font-bold truncate max-w-[180px] sm:max-w-xs">{ticket.ticket_id}</span>
                </div>
                <button
                  onClick={copyTicketId}
                  className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition"
                >
                  <Copy className="h-3 w-3" />
                  <span>{copied ? 'Copied!' : 'Copy ID'}</span>
                </button>
              </div>

              {/* Check-In History Info if used */}
              {ticket.checkins && (
                <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-rose-400" />
                    Already Checked In
                  </p>
                  <p className="text-[11px] text-rose-200">
                    Checked in on {new Date(ticket.checkins.checkin_time).toLocaleString()} at entrance scanner station by {ticket.checkins.staff_name}.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="p-4 sm:p-6 bg-navy-950/60 border-t border-navy-800 flex flex-wrap items-center justify-center sm:justify-between gap-3 no-print">
              <Link
                to={`/register?event_id=${ticket.event.event_id}`}
                className="text-xs text-slate-400 hover:text-white"
              >
                Register another person
              </Link>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-navy-700 bg-navy-850 hover:bg-navy-800 text-xs font-semibold text-slate-200 transition"
                >
                  <Printer className="h-4 w-4 text-slate-400" />
                  <span>Print Ticket</span>
                </button>
                <button
                  onClick={downloadQR}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white shadow-md shadow-brand-600/30 transition active:scale-95"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Pass Image</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
