import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  CalendarPlus,
  QrCode,
  UserPlus,
  Ticket,
  BarChart3,
  Printer,
  Users,
  Database,
  ExternalLink,
  Shield,
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const { user, isAdmin } = useAuth();

  const links = [
    { to: '/dashboard', label: 'Admin Dashboard', icon: LayoutDashboard, role: 'STAFF' },
    { to: '/events', label: 'All Events', icon: Calendar, role: 'STAFF' },
    { to: '/events/create', label: 'Create New Event', icon: CalendarPlus, role: 'ADMIN' },
    { to: '/scanner', label: 'Live QR Scanner', icon: QrCode, highlight: true },
    { to: '/register', label: 'Attendee Registration', icon: UserPlus },
    { to: '/my-ticket', label: 'My QR Ticket', icon: Ticket },
    { to: '/reports', label: 'Attendance Reports', icon: BarChart3, role: 'STAFF' },
    { to: '/badges', label: 'Printable Badges', icon: Printer, role: 'STAFF' },
    { to: '/staff', label: 'Staff Management', icon: Users, role: 'ADMIN' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed top-16 bottom-0 left-0 z-30 w-64 border-r border-navy-800 bg-navy-900/95 backdrop-blur-lg flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 space-y-6 overflow-y-auto">
          {/* Active Event Staff Banner if assigned */}
          {user?.assigned_event && (
            <div className="p-3 rounded-xl bg-gradient-to-br from-brand-950 to-navy-800 border border-brand-800/40">
              <span className="text-[10px] uppercase font-bold tracking-wider text-brand-300">
                Assigned Station
              </span>
              <p className="text-xs font-semibold text-white truncate mt-0.5">
                {user.assigned_event.event_name}
              </p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Gate Active
              </p>
            </div>
          )}

          {/* Nav List */}
          <nav className="space-y-1">
            <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Navigation
            </div>
            {links.map((link) => {
              if (link.role === 'ADMIN' && !isAdmin) return null;
              const Icon = link.icon;

              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-lg shadow-brand-600/20 font-semibold'
                        : link.highlight
                        ? 'text-brand-300 hover:bg-brand-950/60 hover:text-white border border-brand-800/40'
                        : 'text-slate-300 hover:bg-navy-800/80 hover:text-white'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{link.label}</span>
                  {link.highlight && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-brand-400 animate-ping"></span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Database & Security Info Footer */}
        <div className="p-4 border-t border-navy-800 bg-navy-950/40 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-300 font-mono">
              <Database className="h-3.5 w-3.5 text-emerald-400" />
              Supabase / PG Ready
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3 text-brand-400" />
              HMAC-SHA256 Token Auth
            </span>
            <span>Single-Use</span>
          </div>
        </div>
      </aside>
    </>
  );
}
