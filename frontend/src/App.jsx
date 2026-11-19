import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

// Pages
import LoginSignup from './pages/LoginSignup';
import AdminDashboard from './pages/AdminDashboard';
import EventsList from './pages/EventsList';
import CreateEvent from './pages/CreateEvent';
import EventDetails from './pages/EventDetails';
import AttendeeRegistration from './pages/AttendeeRegistration';
import MyQRTicket from './pages/MyQRTicket';
import QRScanner from './pages/QRScanner';
import AttendanceReports from './pages/AttendanceReports';
import BadgePrinting from './pages/BadgePrinting';
import StaffManagement from './pages/StaffManagement';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-950">
        <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Full screen mode for dedicated public ticket display when printing
  const isPrintOnly = location.pathname.startsWith('/ticket/') && window.location.search.includes('print');

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col">
      {!isPrintOnly && (
        <Navbar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          isSidebarOpen={sidebarOpen}
        />
      )}

      <div className="flex flex-1">
        {!isPrintOnly && (
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        )}

        <main className={`flex-1 transition-all duration-300 ${!isPrintOnly ? 'lg:pl-64' : ''}`}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginSignup />} />
            <Route path="/register" element={<AttendeeRegistration />} />
            <Route path="/my-ticket" element={<MyQRTicket />} />
            <Route path="/ticket/:id" element={<MyQRTicket />} />

            {/* Scanner (Accessible by scanner staff & admins) */}
            <Route
              path="/scanner"
              element={
                <ProtectedRoute>
                  <QRScanner />
                </ProtectedRoute>
              }
            />

            {/* Dashboard & Event Management */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events"
              element={
                <ProtectedRoute>
                  <EventsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events/create"
              element={
                <ProtectedRoute adminOnly>
                  <CreateEvent />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events/:id"
              element={
                <ProtectedRoute>
                  <EventDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <AttendanceReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/badges"
              element={
                <ProtectedRoute>
                  <BadgePrinting />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff"
              element={
                <ProtectedRoute adminOnly>
                  <StaffManagement />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <MainLayout />
      </BrowserRouter>
    </AuthProvider>
  );
}
