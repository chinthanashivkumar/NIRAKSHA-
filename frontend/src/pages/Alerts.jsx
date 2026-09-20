import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Clock, Users, Navigation, AlertCircle, CheckCircle, ShieldAlert, Filter, RefreshCw } from 'lucide-react';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';
import PageTransition, { containerVariants, cardVariants } from '../components/PageTransition';
import SkeletonCard from '../components/SkeletonCard';
import { STATION_META } from '../constants/stations';
import { useLang } from '../contexts/LangContext';

const timeAgo = (d) => {
  const m = Math.floor((Date.now() - new Date(d + 'Z')) / 60000);
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ${m % 60}m ago`;
  return `${Math.floor(m / 1440)}d ago`;
};

export default function Alerts() {
  const { t } = useLang();
  const [all, setAll] = useState([]);
  const [filter, setFilter] = useState('active');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await api.get(filter === 'active' ? '/alerts/active' : '/alerts');
      let data = res.data || [];
      if (filter !== 'all' && filter !== 'active') data = data.filter(a => a.status === filter);

      // Deduplicate active alerts so each station appears at most once
      if (filter === 'active') {
        const map = new Map();
        data.forEach(a => {
          const key = a.station_id || a.station_name;
          if (!map.has(key) || (a.risk_score || 0) > (map.get(key).risk_score || 0)) {
            map.set(key, a);
          }
        });
        data = Array.from(map.values()).sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
      }

      setAll(data);
      setError(null);
    } catch {
      setError(t('Telemetry link unreachable. Verify backend server.'));
    } finally {
      setLoading(false);
    }
  }, [filter, t]);

  useEffect(() => { 
    fetchAlerts(); 
    const i = setInterval(fetchAlerts, 10000); 
    return () => clearInterval(i); 
  }, [fetchAlerts]);

  const action = async (id, act) => {
    setProcessingId(id);
    try {
      await api.put(`/alerts/${id}/${act}`);
      await fetchAlerts();
    } finally {
      setProcessingId(null);
    }
  };

  const tabs = [
    { id: 'active', label: 'Active Alerts' },
    { id: 'all', label: 'All Records' },
    { id: 'acknowledged', label: 'Acknowledged' },
    { id: 'resolved', label: 'Resolved' },
  ];

  const filteredAlerts = all.filter(a => {
    if (riskFilter === 'ALL') return true;
    return a.risk_level === riskFilter;
  });

  return (
    <PageTransition className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
              <ShieldAlert size={22} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {t('Emergency Alert Command')}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                {t('Incident verification, community exposure telemetry & authority resolution')}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchAlerts}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold active:scale-95 hover:-translate-y-0.5 transition-all duration-200"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {t('Sync Alerts')}
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-md">
        <div className="flex flex-wrap gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all duration-200 active:scale-95 hover:-translate-y-0.5 ${
                filter === tab.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {t(tab.label)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <span className="text-xs text-slate-400 font-medium">{t('Severity')}:</span>
          <select
            value={riskFilter}
            onChange={e => setRiskFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-500 font-medium"
          >
            <option value="ALL">{t('All Severities')}</option>
            <option value="CRITICAL">{t('CRITICAL')}</option>
            <option value="HIGH">{t('HIGH')}</option>
            <option value="MODERATE">{t('MODERATE')}</option>
            <option value="LOW">{t('LOW')}</option>
          </select>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-4">
          <SkeletonCard rows={3} height="h-32" />
          <SkeletonCard rows={3} height="h-32" />
          <SkeletonCard rows={3} height="h-32" />
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-12 text-center text-slate-400">
          <CheckCircle size={40} className="mx-auto mb-3 text-emerald-400" />
          <p className="text-base font-bold text-white mb-1">{t('No incidents matching current filters')}</p>
          <p className="text-xs text-slate-400">{t('All telemetry corridors within safe operational parameters.')}</p>
        </div>
      ) : (
        /* Staggered Alert Cards List */
        <motion.div
          variants={containerVariants}
          initial="initial"
          animate="animate"
          className="space-y-4"
        >
          {filteredAlerts.map(alert => {
            const meta = STATION_META[alert.station_name] || {};
            const isCritical = alert.risk_level === 'CRITICAL';
            const isBusy = processingId === alert.id;

            return (
              <motion.div
                key={alert.id}
                variants={cardVariants}
                className={`rounded-xl border bg-slate-800 p-4 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 relative overflow-hidden ${
                  isCritical
                    ? 'border-red-500/50 pulse-glow-critical'
                    : alert.risk_level === 'HIGH'
                    ? 'border-orange-500/40'
                    : 'border-slate-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/80 pb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-bold text-white tracking-tight">
                        {alert.station_name}
                      </h3>
                      {meta.state && <span className="text-slate-400 text-xs font-medium">— {meta.state}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <RiskBadge level={alert.risk_level} showScore score={alert.risk_score} />
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider ${
                        alert.status === 'active' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                        alert.status === 'acknowledged' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {t(alert.status)}
                      </span>
                    </div>
                  </div>

                  {/* Incident Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {alert.status === 'active' && (
                      <button 
                        onClick={() => action(alert.id, 'acknowledge')}
                        disabled={isBusy}
                        className="px-3.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold active:scale-95 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50"
                      >
                        {isBusy ? t('Processing...') : t('Acknowledge')}
                      </button>
                    )}
                    {alert.status !== 'resolved' && (
                      <button 
                        onClick={() => action(alert.id, 'resolve')}
                        disabled={isBusy}
                        className="px-3.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold active:scale-95 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50"
                      >
                        {isBusy ? t('Processing...') : t('Resolve')}
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-slate-300 text-xs leading-relaxed bg-slate-900/90 p-3 rounded-lg border border-slate-700/80 my-3 font-normal">
                  {alert.message}
                </p>

                {/* Metadata footer */}
                <div className="flex flex-wrap items-center gap-5 text-xs text-slate-400 pt-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Clock size={13} className="text-blue-400" />
                    <span>{timeAgo(alert.timestamp)}</span>
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <Users size={13} className="text-blue-400" />
                    <span className="text-slate-300 font-bold">{alert.affected_population?.toLocaleString()}</span> {t('People at Risk')}
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <Navigation size={13} className="text-blue-400" />
                    <span className="text-slate-300 font-bold">{alert.affected_roads}</span> {t('Corridor(s) Affected')}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </PageTransition>
  );
}
