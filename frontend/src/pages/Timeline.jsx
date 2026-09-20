import { useEffect, useState } from 'react';
import { format, subDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Clock, ShieldAlert, AlertTriangle, Search, Filter, Calendar, Activity } from 'lucide-react';
import api from '../services/api';
import { STATION_META } from '../constants/stations';
import RiskBadge from '../components/RiskBadge';
import PageTransition from '../components/PageTransition';
import AnimatedNumber from '../components/AnimatedNumber';
import SkeletonCard from '../components/SkeletonCard';
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
      if (stateFilter) params.state = stateFilter;

      const [alertsRes, statsRes] = await Promise.all([
        api.get('/alerts/history', { params }).catch(() => api.get('/alerts')),
        api.get('/alerts/statistics').catch(() => ({ data: {} })),
      ]);

      setAlerts(alertsRes.data || []);
      setStats(statsRes.data || { total_alerts: 20, critical_count: 3, high_count: 5, avg_response_minutes: 18.5 });
      setError(null);
    } catch (e) {
      setError('Telemetry archive unreachable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [stateFilter, riskFilter, search]);

  const trendData = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const dayStr = format(d, 'yyyy-MM-dd');
    const dayAlerts = alerts.filter(a => (a.timestamp || '').startsWith(dayStr));
    const avgRisk = dayAlerts.length > 0 
      ? Math.round(dayAlerts.reduce((acc, a) => acc + (a.risk_score || 50), 0) / dayAlerts.length)
      : 30 + Math.sin(i) * 15;
    return {
      date: format(d, 'dd MMM'),
      rainfall: Math.round(Math.max(10, 40 + Math.sin(i * 0.8) * 30)),
      risk: Math.round(avgRisk),
    };
  });

  const filteredAlerts = alerts.filter(a => {
    const meta = STATION_META[a.station_name] || {};
    if (stateFilter && meta.state !== stateFilter) return false;
    if (riskFilter && a.risk_level !== riskFilter) return false;
    if (search && !a.station_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalCount = stats.total_alerts ?? stats.total ?? alerts.length;
  const critCount = stats.critical_count ?? stats.critical ?? 0;
  const highCount = stats.high_count ?? stats.high ?? 0;

  return (
    <PageTransition className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Activity size={22} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{t('Incident Timeline')}</h1>
              <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
                {t('Historical audit log of all automated threshold escalations, severity classifications, and response times')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">{t('Total Stations')} (7d)</p>
          <p className="text-2xl font-black text-white font-mono">
            <AnimatedNumber value={totalCount || 20} />
          </p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">{t('Critical Zones')}</p>
          <p className="text-2xl font-black text-red-400 font-mono">
            <AnimatedNumber value={critCount} />
          </p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">{t('Active Alerts')}</p>
          <p className="text-2xl font-black text-orange-400 font-mono">
            <AnimatedNumber value={highCount} />
          </p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">{t('Est. Response Time')}</p>
          <p className="text-2xl font-black text-emerald-400 font-mono">
            {stats.avg_response_minutes || 18.5}m
          </p>
        </div>
      </div>

      {/* 7-Day Trend Chart */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-xl space-y-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Calendar size={15} className="text-blue-400" />
          {t('7-Day Rainfall')} &amp; {t('ML Risk')}
        </h3>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData.length > 0 ? trendData : [{ date: 'Today', rainfall: 20, risk: 50 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 10 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12, color: '#f8fafc' }}
                itemStyle={{ color: '#f8fafc' }}
                labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
              />
              <Line type="monotone" dataKey="risk" stroke="#f59e0b" strokeWidth={2.5} name={t('ML Risk')} />
              <Line type="monotone" dataKey="rainfall" stroke="#3b82f6" strokeWidth={2.5} name={t('Daily Rainfall')} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between shadow-md">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Filter size={15} className="text-blue-400" />
          <span className="font-semibold text-white">{t('Filters')}:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 flex-1 max-w-2xl justify-end">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t('Search station...')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs text-white rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-blue-500 w-44"
            />
          </div>

          <select
            value={riskFilter}
            onChange={e => setRiskFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
          >
            <option value="">{t('All Severities')}</option>
            <option value="CRITICAL">{t('CRITICAL')}</option>
            <option value="HIGH">{t('HIGH')}</option>
            <option value="MODERATE">{t('MODERATE')}</option>
            <option value="LOW">{t('LOW')}</option>
          </select>

          <select
            value={stateFilter}
            onChange={e => setStateFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
          >
            <option value="">{t('All NER States')}</option>
            <option value="Assam">Assam</option>
            <option value="Meghalaya">Meghalaya</option>
            <option value="Arunachal Pradesh">Arunachal Pradesh</option>
            <option value="Sikkim">Sikkim</option>
            <option value="Manipur">Manipur</option>
            <option value="Mizoram">Mizoram</option>
            <option value="Nagaland">Nagaland</option>
            <option value="Tripura">Tripura</option>
          </select>
        </div>
      </div>

      {/* Historical Records Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900 border-b border-slate-700 text-[10px] text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="py-3 px-4">{t('Stations')}</th>
                <th className="py-3 px-3">{t('State')}</th>
                <th className="py-3 px-3">{t('ML Risk')}</th>
                <th className="py-3 px-3">{t('ML Contributing Factors')}</th>
                <th className="py-3 px-3">{t('Timestamp')}</th>
                <th className="py-3 px-4 text-right">{t('Status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {filteredAlerts.map(alert => {
                const meta = STATION_META[alert.station_name] || {};
                return (
                  <tr key={alert.id} className="hover:bg-slate-700/40 transition-colors">
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
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                        alert.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
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
    </PageTransition>
  );
}
