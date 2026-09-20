import { useState, useEffect } from 'react';
import { Shield, Bell, Clock, Radio, Menu } from 'lucide-react';
import { useLang } from '../contexts/LangContext';

export default function Topbar({ activeAlertsCount = 0, onMenuClick }) {
  const { t } = useLang();
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' IST');
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 font-sans">
      {/* Left: Hamburger for mobile + Operational status */}
      <div className="flex items-center gap-3 text-xs">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          title="Open Menu"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 beacon-online" />
          <span className="font-bold text-white tracking-wide uppercase text-xs">
            {t('REGIONAL COMMAND CENTER')}
          </span>
        </div>

        <span className="text-slate-600 hidden sm:inline">•</span>
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-mono">
          <Radio size={13} className="text-blue-400" />
          <span>{t('NER TELEMETRY ONLINE')}</span>
        </div>
      </div>

      {/* Right: Clock, Notifications */}
      <div className="flex items-center gap-3 text-xs">
        <div className="hidden md:flex items-center gap-2 font-mono text-slate-300 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
          <Clock size={13} className="text-blue-400" />
          <span>{timeStr}</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300">
          <Bell size={14} className={activeAlertsCount > 0 ? "text-red-400 animate-bounce" : "text-slate-400"} />
          <span className="font-bold font-mono text-white">{activeAlertsCount}</span>
        </div>
      </div>
    </header>
  );
}
