import { useEffect, useState } from 'react';
import api from '../services/api';
import { format, subDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Clock, ShieldAlert, AlertTriangle, Search, Filter, Calendar } from 'lucide-react';
import { STATION_META } from '../constants/stations';
import RiskBadge from '../components/RiskBadge';
import { useLang } from '../contexts/LangContext';

const timeAgo = (dateStr) => {
  if (!dateStr) return 'recently';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export default function Timeline() {
  const { t } = useLang();
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({ total_alerts: 0, critical_count: 0, high_count: 0, avg_response_minutes: 18.5 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [stateFilter, setStateFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        days: 7,
        level: riskFilter || undefined,
        search: search || undefined,
      };
      const [historyRes, statsRes] = await Promise.all([
        api.get('/alerts/history', { params }),
        api.get('/alerts/statistics'),
      ]);
      setAlerts(historyRes.data);
      setStats(statsRes.data);
      setError(null);
    } catch (e) {
      setError('Failed to load historical timeline telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [riskFilter]);

  const filteredAlerts = alerts.filter(a => {
    if (!stateFilter) return true;
    const sState = (STATION_META[a.station_name]?.state || '').toLowerCase();
    return sState.includes(stateFilter.toLowerCase());
  });

  // 7-day trend reduction
  const trendData = alerts
    .filter(a => a.timestamp)
    .reduce((acc, cur) => {
      const date = format(new Date(cur.timestamp), 'MM-dd');
      const existing = acc.find(item => item.date === date);
      if (existing) {
        existing.rainfall = (existing.rainfall + (cur.rainfall || 0)) / 2;
        existing.risk = (existing.risk + (cur.risk_score || 0)) / 2;
      } else {
        acc.push({ date, rainfall: cur.rainfall || 20.0, risk: cur.risk_score || 55.0 });
      }
      return acc;
    }, []);

  const totalCount = stats.total_alerts ?? stats.total ?? alerts.length;
  const critCount = stats.critical_count ?? stats.critical ?? 0;
  const highCount = stats.high_count ?? stats.high ?? 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 page-fade">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E293B] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">{t('Incident Timeline')}</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              7-DAY RETROSPECTIVE
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            {t('Historical audit log of all automated threshold escalations, severity classifications, and response times')}
          </p>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-[#0B1728] border border-[#1E293B] rounded-xl p-4">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">{t('Total Stations')} (7d)</p>
          <p className="text-2xl font-black text-white font-mono">{totalCount}</p>
        </div>
        <div className="bg-[#0B1728] border border-[#1E293B] rounded-xl p-4">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">{t('Critical Zones')}</p>
          <p className="text-2xl font-black text-red-400 font-mono">{critCount}</p>
        </div>
        <div className="bg-[#0B1728] border border-[#1E293B] rounded-xl p-4">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">{t('Active Alerts')}</p>
          <p className="text-2xl font-black text-orange-400 font-mono">{highCount}</p>
        </div>
        <div className="bg-[#0B1728] border border-[#1E293B] rounded-xl p-4">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">{t('Est. Time')}</p>
          <p className="text-2xl font-black text-emerald-400 font-mono">{stats.avg_response_minutes || 18.5}m</p>
        </div>
      </div>

      {/* 7-Day Trend Chart */}
      <div className="bg-[#0B1728] border border-[#1E293B] rounded-xl p-5 shadow-xl space-y-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Calendar size={15} className="text-blue-400" />
          {t('7-Day Rainfall')} &amp; {t('ML Risk')}
        </h3>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData.length > 0 ? trendData : [{ date: 'Today', rainfall: 20, risk: 50 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: '#0B1728', border: '1px solid #1E293B', borderRadius: 8, fontSize: 11 }}
              />
              <Line type="monotone" dataKey="risk" stroke="#f59e0b" strokeWidth={2} name={t('ML Risk')} />
              <Line type="monotone" dataKey="rainfall" stroke="#2F8CFF" strokeWidth={2} name={t('Daily Rainfall')} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0B1728] p-3 rounded-xl border border-[#1E293B]">
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchData()}
            placeholder={t('Search station or district...')}
            className="bg-[#07111F] border border-[#1E293B] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 w-56"
          />
          <button 
            onClick={fetchData}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
          >
            {t('Retry')}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={riskFilter}
            onChange={e => setRiskFilter(e.target.value)}
            className="bg-[#07111F] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="">{t('Filter Risk')}</option>
            <option value="CRITICAL">{t('CRITICAL')}</option>
            <option value="HIGH">{t('HIGH')}</option>
            <option value="MODERATE">{t('MODERATE')}</option>
          </select>
        </div>
      </div>

      {/* Incident Records Table */}
      <div className="bg-[#0B1728] border border-[#1E293B] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#07111F] border-b border-[#1E293B] text-[10px] text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="py-3 px-4">{t('Stations')}</th>
                <th className="py-3 px-3">{t('State')}</th>
                <th className="py-3 px-3">{t('ML Risk')}</th>
                <th className="py-3 px-3">{t('ML Contributing Factors')}</th>
                <th className="py-3 px-3">{t('Timestamp')}</th>
                <th className="py-3 px-4 text-right">{t('Status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]">
              {filteredAlerts.map(alert => {
                const meta = STATION_META[alert.station_name] || {};
                return (
                  <tr key={alert.id} className="hover:bg-[#101D30]/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">
                      {alert.station_name}
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {meta.state || 'NER'}
                    </td>
                    <td className="py-3 px-3">
                      <RiskBadge level={alert.risk_level} showScore score={alert.risk_score} />
                    </td>
                    <td className="py-3 px-3 text-slate-300 max-w-xs truncate">
                      {alert.message}
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono">
                      {timeAgo(alert.timestamp)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        alert.status === 'resolved' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-blue-500/15 text-blue-400'
                      }`}>
                        {t(alert.status || 'Active')}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filteredAlerts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    {t('No active alerts matching filter.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
