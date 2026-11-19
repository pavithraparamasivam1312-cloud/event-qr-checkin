import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import {
  BarChart3,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  Printer,
  TrendingUp,
  GraduationCap,
  RefreshCw,
  Search,
} from 'lucide-react';

export default function AttendanceReports() {
  const [analytics, setAnalytics] = useState(null);
  const [history, setHistory] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    try {
      setRefreshing(true);
      const [analyticsData, eventsData, historyData] = await Promise.all([
        api.getAnalytics(selectedEventId),
        api.getEvents(),
        api.getCheckInHistory(
          `${selectedEventId ? `event_id=${selectedEventId}&` : ''}${selectedStatus ? `status=${selectedStatus}` : ''}`
        ),
      ]);
      setAnalytics(analyticsData);
      setEvents(eventsData);
      setHistory(historyData);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedEventId, selectedStatus]);

  const exportCSV = () => {
    if (!history.length) return;
    const headers = ['CheckIn ID', 'Attendee Name', 'College', 'Event Name', 'Staff', 'Timestamp', 'Validation Status'];
    const rows = history.map((h) => [
      h.checkin_id,
      `"${h.attendee_name || ''}"`,
      `"${h.attendee_college || ''}"`,
      `"${h.event_name || ''}"`,
      `"${h.staff_name || ''}"`,
      `"${h.checkin_time || ''}"`,
      h.validation_status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `checkin_audit_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredHistory = history.filter((h) =>
    (h.attendee_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (h.attendee_college || '').toLowerCase().includes(search.toLowerCase()) ||
    (h.event_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-navy-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>Attendance Reports & Analytics</span>
            <BarChart3 className="h-6 w-6 text-brand-400" />
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Real-time verified entrance statistics, gate scans, and turnout reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={loadData}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-navy-700 bg-navy-850 hover:bg-navy-800 text-xs font-semibold text-slate-200 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-brand-400' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-navy-700 bg-navy-850 hover:bg-navy-800 text-xs font-semibold text-slate-200 transition"
          >
            <Printer className="h-3.5 w-3.5 text-slate-400" />
            <span>Print Report</span>
          </button>

          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-xs font-semibold text-white shadow-md transition"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-navy-800 bg-navy-900/90 p-4 sm:p-5 backdrop-blur-md shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="flex-1">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Filter by Event
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full rounded-xl border border-navy-700 bg-navy-950 px-3.5 py-2 text-xs sm:text-sm text-white focus:border-brand-500 focus:outline-none"
          >
            <option value="">All Events (Global)</option>
            {events.map((e) => (
              <option key={e.event_id} value={e.event_id}>
                {e.event_name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:w-60">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Filter by Scan Status
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full rounded-xl border border-navy-700 bg-navy-950 px-3.5 py-2 text-xs sm:text-sm text-white focus:border-brand-500 focus:outline-none"
          >
            <option value="">All Scan Results</option>
            <option value="SUCCESS">Valid / Check-In Success (Green)</option>
            <option value="ALREADY_USED">Already Used (Red)</option>
            <option value="INVALID_EVENT">Wrong Event (Yellow)</option>
            <option value="INVALID_TOKEN">Invalid Ticket (Red)</option>
            <option value="EXPIRED">Expired Ticket</option>
          </select>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Registered"
          value={analytics?.overview?.total_registered || 0}
          subtitle="Across filtered events"
          icon={Users}
          color="cyan"
        />
        <StatCard
          title="Total Checked In"
          value={analytics?.overview?.total_checked_in || 0}
          subtitle="Unique successful scans"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Pending Entrance"
          value={analytics?.overview?.total_pending || 0}
          subtitle="Registered but not yet scanned"
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Turnout Rate"
          value={`${analytics?.overview?.attendance_rate || 0}%`}
          subtitle="Checked in vs registered"
          icon={TrendingUp}
          trend={`${analytics?.overview?.total_checked_in || 0} admitted`}
          color="brand"
        />
      </div>

      {/* Charts & Distributions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* College Distribution Breakdown */}
        <div className="rounded-2xl border border-navy-800 bg-navy-900/90 p-5 sm:p-6 backdrop-blur-md shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-brand-400" />
              <span>Top Colleges & Institutions</span>
            </h3>
            <span className="text-xs text-slate-400">By registration count</span>
          </div>

          <div className="space-y-3 pt-2">
            {(!analytics?.college_breakdown || analytics.college_breakdown.length === 0) ? (
              <p className="text-xs text-slate-500 text-center py-8">No college data available.</p>
            ) : (
              analytics.college_breakdown.map((item, idx) => {
                const total = analytics.overview.total_registered || 1;
                const pct = Math.round((item.count / total) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-200 truncate">{item.college}</span>
                      <span className="font-mono text-brand-300 font-bold">{item.count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-navy-950 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-600 to-indigo-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Hourly Check-In Velocity Timeline */}
        <div className="rounded-2xl border border-navy-800 bg-navy-900/90 p-5 sm:p-6 backdrop-blur-md shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-emerald-400" />
              <span>Hourly Check-In Velocity</span>
            </h3>
            <span className="text-xs text-slate-400">Entrance flow rate</span>
          </div>

          <div className="space-y-3 pt-2">
            {(!analytics?.timeline || analytics.timeline.length === 0) ? (
              <p className="text-xs text-slate-500 text-center py-8">No check-in timeline activity yet.</p>
            ) : (
              analytics.timeline.map((item, idx) => {
                const maxScans = Math.max(...analytics.timeline.map((t) => t.scans), 1);
                const pct = Math.max(5, Math.round((item.scans / maxScans) * 100));

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-mono font-semibold text-slate-300">{item.time}</span>
                      <span className="font-mono text-emerald-400 font-bold">{item.scans} check-ins</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-navy-950 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Event-by-Event Comparison Table */}
      <div className="rounded-2xl border border-navy-800 bg-navy-900/90 p-5 sm:p-6 backdrop-blur-md shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Calendar className="h-5 w-5 text-indigo-400" />
          <span>Event-Wise Attendance Matrix</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-navy-800 bg-navy-950/60 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              <tr>
                <th className="py-3 px-4">Event Name</th>
                <th className="py-3 px-4">Date & Venue</th>
                <th className="py-3 px-4">Capacity</th>
                <th className="py-3 px-4">Registered</th>
                <th className="py-3 px-4">Checked In</th>
                <th className="py-3 px-4">Pending</th>
                <th className="py-3 px-4">Turnout %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60 text-slate-300">
              {(!analytics?.events_breakdown || analytics.events_breakdown.length === 0) ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500">
                    No events data available.
                  </td>
                </tr>
              ) : (
                analytics.events_breakdown.map((ev) => (
                  <tr key={ev.event_id} className="hover:bg-navy-800/40 transition">
                    <td className="py-3 px-4 font-bold text-white">{ev.event_name}</td>
                    <td className="py-3 px-4 text-slate-300">
                      <div>{ev.date}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-xs">{ev.venue}</div>
                    </td>
                    <td className="py-3 px-4 font-mono">{ev.capacity}</td>
                    <td className="py-3 px-4 font-mono text-cyan-400 font-bold">{ev.registered_count}</td>
                    <td className="py-3 px-4 font-mono text-emerald-400 font-bold">{ev.checked_in_count}</td>
                    <td className="py-3 px-4 font-mono text-amber-400 font-bold">{ev.pending_count}</td>
                    <td className="py-3 px-4 font-mono">
                      <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-300 font-bold border border-brand-500/20">
                        {ev.attendance_percentage}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Check-In Timestamps Audit Trail */}
      <div className="rounded-2xl border border-navy-800 bg-navy-900/90 p-5 sm:p-6 backdrop-blur-md shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <span>Check-In Timestamps Audit Trail</span>
            </h3>
            <p className="text-xs text-slate-400">
              Complete chronological scan log recorded at gate stations with staff identification.
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Filter audit log..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-60 rounded-xl border border-navy-700 bg-navy-950 py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-navy-800 bg-navy-950 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              <tr>
                <th className="py-3 px-4">Attendee Name</th>
                <th className="py-3 px-4">College</th>
                <th className="py-3 px-4">Event</th>
                <th className="py-3 px-4">Gate Staff</th>
                <th className="py-3 px-4">Check-In Timestamp</th>
                <th className="py-3 px-4">Validation Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60 text-slate-300">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No scan records found matching filters.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => (
                  <tr key={item.checkin_id} className="hover:bg-navy-800/40 transition">
                    <td className="py-3 px-4 font-semibold text-white">{item.attendee_name}</td>
                    <td className="py-3 px-4">{item.attendee_college || '—'}</td>
                    <td className="py-3 px-4 truncate max-w-xs">{item.event_name}</td>
                    <td className="py-3 px-4 text-slate-400">{item.staff_name}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                      {new Date(item.checkin_time).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={item.validation_status} type="checkin" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
