import { useEffect, useState } from 'react';
import api from '../services/api';
import { formatDistanceStrict } from 'date-fns';
import { RISK_COLORS } from '../constants/stations';
import { useLang } from '../contexts/LangContext';

/**
 * Hook to compute live countdown to a target timestamp.
 * Returns remaining time in seconds, updating every second.
 */
function useCountdown(targetTimestamp) {
  const [seconds, setSeconds] = useState(() => {
    const diff = Math.max(0, Math.floor((new Date(targetTimestamp) - new Date()) / 1000));
    return diff;
  });

  useEffect(() => {
    if (seconds <= 0) return undefined;
    const interval = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [seconds]);

  // Return formatted HH:MM:SS
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * RiskCountdownBanner
 * Shows live countdown for the top‑3 stations with HIGH or CRITICAL risk.
 * Background: redBanner color, red border, pulsing glow animation.
 */
function StationCountdownItem({ st }) {
  const { t } = useLang();
  const color = RISK_COLORS[st.current_level]?.bg || '#f59e0b';
  const countdown = useCountdown(st.target_timestamp);
  return (
    <div className="flex items-center gap-2 bg-[#07111F] px-2.5 py-1 rounded-lg border border-[#1E293B]">
      <span className="font-semibold text-white">{st.station_name}</span>
      <span className="text-[10px] px-1.5 py-0.2 rounded font-bold uppercase" style={{ color, background: `${color}20` }}>
        {t(st.current_level)}
      </span>
      <span className="font-mono text-amber-400 font-bold">{countdown}</span>
    </div>
  );
}

export default function RiskCountdownBanner() {
  const { t } = useLang();
  const [stations, setStations] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchForecast() {
      try {
        const { data } = await api.get('/stations/forecast');
        // Filter HIGH / CRITICAL, sort by minutes_to_escalation ascending
        const filtered = data
          .filter(s => s.current_level === 'HIGH' || s.current_level === 'CRITICAL')
          .sort((a, b) => a.minutes_to_escalation - b.minutes_to_escalation)
          .slice(0, 3);
        setStations(filtered);
        setError(null);
      } catch (e) {
        setError('Unable to load risk forecast.');
      }
    }
    fetchForecast();
    const interval = setInterval(fetchForecast, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (error || stations.length === 0) {
    return null; // Don't block screen with banner if forecast is empty or updating
  }

  return (
    <div className="bg-[#0B1728] border border-amber-500/40 text-white p-3.5 rounded-xl mb-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-xs font-bold text-white uppercase tracking-wider">
          {t('Early Warning: Projected Escalation Windows')}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs">
        {stations.map(st => (
          <StationCountdownItem key={st.station_name} st={st} />
        ))}
      </div>
    </div>
  );
}
