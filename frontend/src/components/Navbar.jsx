import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { QrCode, LogOut, ShieldCheck, UserCheck, Menu, X, Sparkles } from 'lucide-react';

export default function Navbar({ onToggleSidebar, isSidebarOpen }) {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-navy-800 bg-navy-900/90 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="rounded-lg p-2 text-slate-400 hover:bg-navy-800 hover:text-white lg:hidden"
            aria-label="Toggle Navigation"
          >
            {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-700 via-brand-600 to-indigo-500 shadow-lg shadow-brand-600/30 group-hover:scale-105 transition-transform">
              <QrCode className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                CheckIn<span className="text-brand-400">QR</span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-brand-900/80 text-brand-300 border border-brand-700/50">PRO</span>
              </span>
              <p className="text-[10px] text-slate-400 hidden sm:block">Event & Workshop Attendance System</p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {/* Public Quick Links */}
          <Link
            to="/register"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white rounded-lg hover:bg-navy-800 transition"
          >
            Attendee Registration
          </Link>
          <Link
            to="/my-ticket"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white rounded-lg hover:bg-navy-800 transition"
          >
            Find My Ticket
          </Link>

          {/* Scanner shortcut button */}
          <Link
            to="/scanner"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-brand-600/25 transition active:scale-95"
          >
            <QrCode className="h-4 w-4" />
            <span>Launch Scanner</span>
          </Link>

          {/* User Profile / Auth State */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2 pl-2 border-l border-navy-800">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-white leading-tight">{user.name}</span>
                <span className="text-[10px] text-brand-400 font-mono flex items-center justify-end gap-1">
                  {user.role === 'ADMIN' ? (
                    <ShieldCheck className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <UserCheck className="h-3 w-3 text-brand-400" />
                  )}
                  {user.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Log Out"
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-navy-800 transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="px-3.5 py-1.5 rounded-lg border border-navy-700 bg-navy-850 hover:bg-navy-800 text-xs font-semibold text-slate-200 hover:text-white transition"
            >
              Staff Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
