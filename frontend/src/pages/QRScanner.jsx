import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  QrCode,
  Camera,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Upload,
  Keyboard,
  Sparkles,
  Volume2,
  VolumeX,
  History,
  ShieldCheck,
} from 'lucide-react';

export default function QRScanner() {
  const [searchParams] = useSearchParams();
  const initialEventId = searchParams.get('event_id');
  const { user } = useAuth();

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(
    initialEventId || user?.assigned_event?.event_id || ''
  );

  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scannerResult, setScannerResult] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Session Statistics
  const [sessionSuccess, setSessionSuccess] = useState(0);
  const [sessionRejected, setSessionRejected] = useState(0);
  const [sessionLogs, setSessionLogs] = useState([]);

  // HTML5 QR Code instance reference
  const html5QrCodeRef = useRef(null);
  const isProcessingRef = useRef(false);

  // Load events
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

  // Web Audio Chimes for scanning feedback
  const playSound = (type) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'SUCCESS') {
        // High pleasant ding-dong chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      } else if (type === 'YELLOW') {
        // Warning double beep
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } else {
        // Error buzz
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      }
    } catch (e) {
      // Audio not permitted or not supported
    }
  };

  const startCamera = async () => {
    setCameraError('');
    setScannerResult(null);

    try {
      const scanner = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = scanner;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await scanner.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Frame read errors are normal while scanning
        }
      );

      setIsScanning(true);
    } catch (err) {
      console.warn('Camera launch error:', err);
      setCameraError(
        'Unable to open camera. Please grant camera permission, or use file upload / manual code below.'
      );
      setIsScanning(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.error('Error stopping camera:', e);
      }
      setIsScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleScanSuccess = async (qrString) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    // Temporarily pause camera if active
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.pause();
      } catch (e) {}
    }

    try {
      const response = await api.validateCheckIn({
        qr_data: qrString,
        event_id: selectedEventId,
      });

      setScannerResult(response);

      if (response.status === 'SUCCESS') {
        playSound('SUCCESS');
        setSessionSuccess((prev) => prev + 1);
      } else if (response.status === 'INVALID_EVENT') {
        playSound('YELLOW');
        setSessionRejected((prev) => prev + 1);
      } else {
        playSound('ERROR');
        setSessionRejected((prev) => prev + 1);
      }

      setSessionLogs((prev) => [
        {
          id: Date.now(),
          time: new Date().toLocaleTimeString(),
          status: response.status,
          title: response.title,
          attendee: response.attendee?.name || response.ticket_details?.attendee_name || 'Unknown',
        },
        ...prev.slice(0, 19),
      ]);
    } catch (err) {
      playSound('ERROR');
      setScannerResult({
        status: 'INVALID_TOKEN',
        color: 'red',
        title: 'Validation Error',
        message: err.message || 'Server connection failed while validating QR ticket.',
      });
      setSessionRejected((prev) => prev + 1);
    } finally {
      // Auto-resume camera after 3 seconds
      setTimeout(() => {
        isProcessingRef.current = false;
        if (html5QrCodeRef.current && isScanning) {
          try {
            html5QrCodeRef.current.resume();
          } catch (e) {}
        }
      }, 3000);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const scanner = html5QrCodeRef.current || new Html5Qrcode('qr-reader');
      const decodedText = await scanner.scanFile(file, true);
      handleScanSuccess(decodedText);
    } catch (err) {
      alert('Could not detect a clear QR code in this image. Please upload a clear ticket image.');
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleScanSuccess(manualCode.trim());
    setManualCode('');
  };

  // Test Simulator Scenarios (using seed data)
  const triggerSimulation = (type) => {
    if (type === 'VALID') {
      // Valid unused ticket
      handleScanSuccess('EQR-V1::simulated-valid::' + selectedEventId + '::test::sig');
    } else if (type === 'REUSED') {
      // Re-scan trigger
      if (events.length > 0) {
        api.getEventAttendees(selectedEventId || events[0].event_id)
          .then((tickets) => {
            const used = tickets.find((t) => t.is_used);
            if (used) {
              handleScanSuccess(used.qr_payload);
            } else if (tickets.length > 0) {
              handleScanSuccess(tickets[0].qr_payload);
            }
          });
      }
    } else if (type === 'WRONG_EVENT') {
      // Fetch ticket from another event
      const otherEvent = events.find((e) => e.event_id !== selectedEventId);
      if (otherEvent) {
        api.getEventAttendees(otherEvent.event_id)
          .then((tickets) => {
            if (tickets.length > 0) {
              handleScanSuccess(tickets[0].qr_payload);
            } else {
              handleScanSuccess('EQR-V1::fake::' + otherEvent.event_id + '::token::sig');
            }
          });
      }
    } else if (type === 'TAMPERED') {
      handleScanSuccess('EQR-V1::tampered-ticket-id::9999::fake-token::invalid-hmac-hash');
    }
  };

  const selectedEvent = events.find((e) => e.event_id === selectedEventId);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-navy-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Gatekeeper QR Scanner
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/30 text-xs font-semibold">
              Live Validator
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Real-time single-use ticket verification with atomic row-level locking.
          </p>
        </div>

        {/* Audio Mute & Session Stats */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-navy-700 bg-navy-850 hover:bg-navy-800 text-xs text-slate-300 transition"
            title="Toggle Sound Effects"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-400" /> : <VolumeX className="h-4 w-4 text-slate-500" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Audio On' : 'Muted'}</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-navy-900 border border-navy-800 text-xs font-mono">
            <span className="text-emerald-400 font-bold">{sessionSuccess} Valid</span>
            <span className="text-slate-600">|</span>
            <span className="text-rose-400 font-bold">{sessionRejected} Rejected</span>
          </div>
        </div>
      </div>

      {/* Event Selection Bar */}
      <div className="rounded-2xl border border-navy-800 bg-navy-900/90 p-4 sm:p-5 backdrop-blur-md shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Current Scanner Gate Assignment
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(e.target.value);
              setScannerResult(null);
            }}
            className="w-full sm:max-w-md rounded-xl border border-navy-700 bg-navy-950 px-3.5 py-2 text-xs sm:text-sm text-white font-semibold focus:border-brand-500 focus:outline-none"
          >
            {events.map((e) => (
              <option key={e.event_id} value={e.event_id}>
                {e.event_name} ({e.venue})
              </option>
            ))}
          </select>
        </div>

        {selectedEvent && (
          <div className="flex items-center gap-4 text-xs font-mono text-slate-400 shrink-0">
            <div>
              <span className="text-slate-500">Checked In:</span>{' '}
              <strong className="text-emerald-400">{selectedEvent.checked_in_count || 0}</strong>
            </div>
            <div>
              <span className="text-slate-500">Capacity:</span>{' '}
              <strong className="text-white">{selectedEvent.capacity}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Main Scanner Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera / Scan Feed (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-navy-800 bg-navy-900/90 p-4 sm:p-6 backdrop-blur-md shadow-xl">
            {/* Viewport Frame */}
            <div className="relative rounded-2xl overflow-hidden bg-navy-950 border border-navy-800 aspect-square sm:aspect-video flex flex-col items-center justify-center">
              {/* HTML5 Qr Code Camera Mount Element */}
              <div id="qr-reader" className="w-full h-full max-h-[420px]" />

              {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-navy-950/95 space-y-4">
                  <div className="h-16 w-16 rounded-2xl bg-brand-600/10 border border-brand-500/20 text-brand-400 flex items-center justify-center">
                    <Camera className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Camera Standby</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      Click below to request camera permission and start continuous QR ticket verification.
                    </p>
                  </div>
                  <button
                    onClick={startCamera}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-xs font-semibold text-white shadow-lg shadow-brand-600/30 transition active:scale-95"
                  >
                    <Camera className="h-4 w-4" />
                    <span>Start Device Camera</span>
                  </button>
                  {cameraError && (
                    <p className="text-xs text-amber-400 max-w-md bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                      {cameraError}
                    </p>
                  )}
                </div>
              )}

              {isScanning && (
                <div className="absolute top-3 right-3 z-10">
                  <button
                    onClick={stopCamera}
                    className="px-3 py-1.5 rounded-lg bg-navy-900/80 border border-navy-700 text-xs text-rose-400 hover:bg-navy-850 font-semibold transition"
                  >
                    Stop Camera
                  </button>
                </div>
              )}
            </div>

            {/* Alternative Input Methods: File Upload & Manual Code */}
            <div className="mt-4 pt-4 border-t border-navy-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* File Upload */}
              <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-navy-700 bg-navy-850 hover:bg-navy-800 text-xs font-semibold text-slate-300 cursor-pointer transition">
                <Upload className="h-4 w-4 text-brand-400" />
                <span>Upload Ticket Image / QR</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Manual Code Input Form */}
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste Token / Ticket ID"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="flex-1 rounded-xl border border-navy-700 bg-navy-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-xs font-semibold text-white border border-navy-700 transition"
                >
                  Verify
                </button>
              </form>
            </div>
          </div>

          {/* Quick Test Simulator Bar */}
          <div className="rounded-2xl border border-navy-800 bg-navy-900/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-brand-400" />
                Live QR Validation Test Bench
              </span>
              <span className="text-[11px] text-slate-500">Simulate scanner inputs</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  // Find an unused ticket from attendees
                  api.getEventAttendees(selectedEventId).then((tickets) => {
                    const unused = tickets.find((t) => !t.is_used);
                    if (unused) {
                      handleScanSuccess(unused.qr_payload);
                    } else {
                      alert('All tickets in this event are already used! Register a new attendee to test.');
                    }
                  });
                }}
                className="p-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold text-center transition"
              >
                🟢 Valid Ticket (Green)
              </button>

              <button
                type="button"
                onClick={() => triggerSimulation('REUSED')}
                className="p-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold text-center transition"
              >
                🔴 Reused Ticket (Red)
              </button>

              <button
                type="button"
                onClick={() => triggerSimulation('WRONG_EVENT')}
                className="p-2 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold text-center transition"
              >
                🟡 Wrong Event (Yellow)
              </button>

              <button
                type="button"
                onClick={() => triggerSimulation('TAMPERED')}
                className="p-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold text-center transition"
              >
                🔴 Tampered/Fake (Red)
              </button>
            </div>
          </div>
        </div>

        {/* Scan Result Feedback Card (1 Col) */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Validation Result</span>
            {scannerResult && (
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-navy-800 text-slate-300">
                {scannerResult.status}
              </span>
            )}
          </h2>

          {!scannerResult ? (
            <div className="rounded-2xl border border-dashed border-navy-800 bg-navy-900/40 p-8 text-center space-y-2">
              <QrCode className="h-12 w-12 text-slate-600 mx-auto" />
              <p className="text-xs font-semibold text-slate-300">Ready to Scan</p>
              <p className="text-[11px] text-slate-500">
                Point your camera at an attendee's QR ticket. Result will appear here instantly.
              </p>
            </div>
          ) : (
            <div
              className={`rounded-2xl border p-6 shadow-2xl transition-all duration-300 ${
                scannerResult.color === 'green'
                  ? 'border-emerald-500 bg-gradient-to-b from-emerald-950/80 via-navy-900 to-navy-900 text-emerald-100 ring-2 ring-emerald-500/30'
                  : scannerResult.color === 'yellow'
                  ? 'border-amber-500 bg-gradient-to-b from-amber-950/80 via-navy-900 to-navy-900 text-amber-100 ring-2 ring-amber-500/30'
                  : 'border-rose-500 bg-gradient-to-b from-rose-950/80 via-navy-900 to-navy-900 text-rose-100 ring-2 ring-rose-500/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
                    scannerResult.color === 'green'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : scannerResult.color === 'yellow'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  }`}
                >
                  {scannerResult.color === 'green' ? (
                    <CheckCircle2 className="h-7 w-7" />
                  ) : scannerResult.color === 'yellow' ? (
                    <AlertTriangle className="h-7 w-7" />
                  ) : (
                    <XCircle className="h-7 w-7" />
                  )}
                </div>

                <div>
                  <h3 className="font-extrabold text-lg text-white leading-tight">
                    {scannerResult.title}
                  </h3>
                  <p className="text-xs mt-0.5 opacity-90 leading-snug">
                    {scannerResult.message}
                  </p>
                </div>
              </div>

              {/* Attendee Details Card if available */}
              {scannerResult.attendee && (
                <div className="mt-5 p-4 rounded-xl bg-navy-950/90 border border-navy-800 text-xs space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-400 font-semibold">Attendee Name:</span>
                    <span className="font-bold text-white text-sm">{scannerResult.attendee.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">College:</span>
                    <span className="text-slate-200">{scannerResult.attendee.college}</span>
                  </div>
                  {scannerResult.checkin && (
                    <div className="flex justify-between pt-2 border-t border-navy-850">
                      <span className="text-slate-400">Check-in Timestamp:</span>
                      <span className="font-mono text-emerald-400 font-bold">{scannerResult.checkin.checkin_time}</span>
                    </div>
                  )}
                  {scannerResult.previous_checkin && (
                    <div className="flex justify-between pt-2 border-t border-navy-850 text-rose-300">
                      <span>First Scanned:</span>
                      <span className="font-mono font-bold">{scannerResult.previous_checkin.time}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Wrong Event Ticket Info */}
              {scannerResult.ticket_details && (
                <div className="mt-5 p-4 rounded-xl bg-navy-950/90 border border-amber-500/30 text-xs space-y-2 text-amber-200">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Attendee:</span>
                    <span className="font-bold text-white">{scannerResult.ticket_details.attendee_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Belongs to:</span>
                    <span className="font-bold text-amber-300">{scannerResult.ticket_details.ticket_event}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current Gate:</span>
                    <span className="text-slate-300">{scannerResult.ticket_details.scanner_event}</span>
                  </div>
                </div>
              )}

              <button
                onClick={() => setScannerResult(null)}
                className="mt-5 w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition"
              >
                Scan Next Ticket
              </button>
            </div>
          )}

          {/* Session Log Activity */}
          <div className="rounded-2xl border border-navy-800 bg-navy-900/90 p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <History className="h-3.5 w-3.5 text-brand-400" />
              Session Scan History
            </h4>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {sessionLogs.length === 0 ? (
                <p className="text-[11px] text-slate-500 text-center py-4">
                  No scans logged in this session yet.
                </p>
              ) : (
                sessionLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between text-xs p-2 rounded-lg bg-navy-950 border border-navy-850"
                  >
                    <div className="truncate pr-2">
                      <span className="font-semibold text-white truncate block">{log.attendee}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{log.time}</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        log.status === 'SUCCESS'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : log.status === 'INVALID_EVENT'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {log.status === 'SUCCESS' ? 'VALID' : log.status === 'INVALID_EVENT' ? 'WRONG' : 'REJECT'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
