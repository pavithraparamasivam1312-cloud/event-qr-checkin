import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  UserPlus,
  ShieldCheck,
  QrCode,
  Calendar,
  Lock,
  Mail,
  Trash2,
  CheckCircle2,
  XCircle,
  Plus,
  Edit,
} from 'lucide-react';

export default function StaffManagement() {
  const { user } = useAuth();
  const [staffList, setStaffList] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: 'Staff@123',
    role: 'STAFF',
    assigned_event_id: '',
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [staffData, eventsData] = await Promise.all([
        api.getStaff(),
        api.getEvents(),
      ]);
      setStaffList(staffData);
      setEvents(eventsData);
      if (eventsData.length > 0 && !formData.assigned_event_id) {
        setFormData((prev) => ({ ...prev, assigned_event_id: eventsData[0].event_id }));
      }
    } catch (err) {
      console.error('Failed to load staff list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');

    try {
      await api.createStaff({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
        assigned_event_id: formData.assigned_event_id || null,
      });

      setShowAddModal(false);
      setFormData({
        name: '',
        email: '',
        password: 'Staff@123',
        role: 'STAFF',
        assigned_event_id: events[0]?.event_id || '',
      });
      fetchData();
    } catch (err) {
      setFormError(err.message || 'Failed to create staff member.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (staffId) => {
    if (staffId === user?.staff_id) {
      alert('You cannot delete your own active administrator account!');
      return;
    }
    if (window.confirm('Are you sure you want to remove this staff member?')) {
      try {
        await api.deleteStaff(staffId);
        fetchData();
      } catch (err) {
        alert(err.message || 'Failed to delete staff member.');
      }
    }
  };

  const handleToggleActive = async (staff) => {
    try {
      await api.updateStaff(staff.staff_id, {
        is_active: !staff.is_active,
      });
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to toggle status.');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-navy-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>Scanner Staff & Gatekeeper Management</span>
            <Users className="h-6 w-6 text-brand-400" />
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Create gatekeeper credentials, assign staff to specific event entrances, and monitor scan activity.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-xs font-semibold text-white shadow-lg shadow-brand-600/30 transition active:scale-95"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add New Scanner Staff</span>
        </button>
      </div>

      {/* Staff Table */}
      <div className="rounded-2xl border border-navy-800 bg-navy-900/90 backdrop-blur-md shadow-xl overflow-hidden p-5 sm:p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <span>Active Staff Accounts</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-navy-800 text-brand-300 font-mono">
            {staffList.length}
          </span>
        </h2>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-3 text-xs text-slate-400">Loading staff members...</p>
          </div>
        ) : staffList.length === 0 ? (
          <p className="py-8 text-center text-slate-500 text-xs">No staff accounts configured.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-navy-800 bg-navy-950/60 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">System Role</th>
                  <th className="py-3 px-4">Assigned Entrance Event</th>
                  <th className="py-3 px-4">Access Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800/60 text-slate-300">
                {staffList.map((member) => (
                  <tr key={member.staff_id} className="hover:bg-navy-800/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{member.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        ID: {member.staff_id.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono">{member.email}</td>
                    <td className="py-3.5 px-4">
                      {member.role === 'ADMIN' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-500/15 text-brand-300 border border-brand-500/30">
                          <ShieldCheck className="h-3 w-3 text-brand-400" />
                          Lead Organizer
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                          <QrCode className="h-3 w-3 text-indigo-400" />
                          Scanner Gatekeeper
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {member.assigned_event ? (
                        <div>
                          <p className="font-semibold text-white">{member.assigned_event.event_name}</p>
                          <p className="text-[10px] text-slate-400 truncate max-w-xs">{member.assigned_event.venue}</p>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">All Events / General Gate</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleActive(member)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition ${
                          member.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20'
                        }`}
                      >
                        {member.is_active ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        <span>{member.is_active ? 'Active' : 'Disabled'}</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {member.role !== 'ADMIN' && (
                        <button
                          onClick={() => handleDelete(member.staff_id)}
                          className="p-1.5 rounded-lg border border-navy-700 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition"
                          title="Remove Staff"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-navy-800 bg-navy-900 p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-brand-400" />
              <span>Create Scanner Staff Account</span>
            </h3>

            {formError && (
              <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mike Ross"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-navy-700 bg-navy-950 px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="mike.scanner@eventqr.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-xl border border-navy-700 bg-navy-950 px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Default Password *</label>
                <input
                  type="text"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full rounded-xl border border-navy-700 bg-navy-950 px-3 py-2 text-xs sm:text-sm text-white font-mono focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full rounded-xl border border-navy-700 bg-navy-950 px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
                  >
                    <option value="STAFF">Scanner Staff</option>
                    <option value="ADMIN">Organizer / Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Event</label>
                  <select
                    value={formData.assigned_event_id}
                    onChange={(e) => setFormData({ ...formData, assigned_event_id: e.target.value })}
                    className="w-full rounded-xl border border-navy-700 bg-navy-950 px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
                  >
                    <option value="">General Gate (All Events)</option>
                    {events.map((e) => (
                      <option key={e.event_id} value={e.event_id}>
                        {e.event_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-navy-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-navy-700 text-xs text-slate-300 hover:bg-navy-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white shadow transition"
                >
                  {saving ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
