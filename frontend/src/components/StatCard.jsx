import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'brand' }) {
  const colorMap = {
    brand: 'from-brand-600/20 to-indigo-600/10 border-brand-500/30 text-brand-400',
    emerald: 'from-emerald-600/20 to-teal-600/10 border-emerald-500/30 text-emerald-400',
    amber: 'from-amber-600/20 to-yellow-600/10 border-amber-500/30 text-amber-400',
    rose: 'from-rose-600/20 to-pink-600/10 border-rose-500/30 text-rose-400',
    cyan: 'from-cyan-600/20 to-blue-600/10 border-cyan-500/30 text-cyan-400',
  };

  const iconBgMap = {
    brand: 'bg-brand-500/10 text-brand-400 border border-brand-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 bg-gradient-to-br ${colorMap[color]} backdrop-blur-md shadow-lg transition-transform hover:-translate-y-0.5`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${iconBgMap[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-extrabold tracking-tight text-white font-mono">{value}</span>
        {trend && (
          <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            {trend}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
}
