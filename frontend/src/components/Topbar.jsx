import { useState, useEffect } from 'react';
import { Shield, Bell, Globe, Clock, Radio, Activity, Compass } from 'lucide-react';
import { useLang } from '../contexts/LangContext';

export default function Topbar({ activeAlertsCount = 0 }) {
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
    <header className="h-14 bg-[#091321] border-b border-[rgba(148,163,184,0.14)] px-6 flex items-center justify-between shrink-0 z-30 font-mono">
      {/* Left: Operational status badge */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 beacon-online" />
          <span className="font-bold text-white tracking-widest uppercase">{t('REGIONAL COMMAND CENTER')}</span>
        </div>
        <span className="text-[#8EA1B8] hidden sm:inline">•</span>
        <div className="hidden sm:flex items-center gap-2 text-xs text-[#8EA1B8]">
          <Radio size={13} className="text-[#4DA3FF]" />
          <span>{t('NER TELEMETRY NETWORK ONLINE')}</span>
        </div>
      </div>

      {/* Right: Clock, Notifications */}
      <div className="flex items-center gap-4 text-xs">
        <div className="hidden md:flex items-center gap-2 font-mono text-slate-300 bg-[#050A12] px-3 py-1 rounded border border-[rgba(148,163,184,0.14)]">
          <Clock size={13} className="text-[#4DA3FF]" />
          <span>{timeStr}</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0D1929] border border-[rgba(148,163,184,0.14)] text-xs text-slate-300">
          <Bell size={13} className={activeAlertsCount > 0 ? "text-red-400" : "text-slate-400"} />
          <span className="font-bold font-mono">{activeAlertsCount}</span>
        </div>
      </div>
    </header>
  );
}
