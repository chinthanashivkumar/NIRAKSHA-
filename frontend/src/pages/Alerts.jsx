import { useState, useEffect, useCallback } from 'react';
import { Clock, Users, Navigation, AlertCircle, CheckCircle, ShieldAlert, Filter } from 'lucide-react';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';
import { STATION_META } from '../constants/stations';
import { useLang } from '../contexts/LangContext';

const timeAgo = (d) => {
  const m = Math.floor((Date.now() - new Date(d + 'Z')) / 60000);
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ${m % 60}m ago`;
  return `${Math.floor(m / 1440)}d ago`;
};

const Alerts = () => {
  const { t } = useLang();
  const [all, setAll] = useState([]);
  const [filter, setFilter] = useState('active');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await api.get(filter === 'active' ? '/alerts/active' : '/alerts');
      let data = res.data;
      if (filter !== 'all' && filter !== 'active') data = data.filter(a => a.status === filter);
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
    await api.put(`/alerts/${id}/${act}`);
    fetchAlerts();
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
    <div className="p-6 max-w-5xl mx-auto space-y-6 page-fade">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E293B] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">{t('Emergency Alert Center')}</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {t('OPERATIONAL')}
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            {t('Real-time threshold triggers dispatched to District Disaster Management Authorities • Auto-polled every 10s')}
          </p>
        </div>

        {/* Tab filters */}
        <div className="flex items-center gap-2">
          <div className="flex bg-[#0B1728] border border-[#1E293B] rounded-lg p-1">
            {tabs.map(item => (
              <button 
                key={item.id} 
                onClick={() => { setFilter(item.id); setLoading(true); }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  filter === item.id 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t(item.label)}
              </button>
            ))}
          </div>

          <select
            value={riskFilter}
            onChange={e => setRiskFilter(e.target.value)}
            className="bg-[#0B1728] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">{t('Filter Risk')}</option>
            <option value="CRITICAL">{t('CRITICAL')}</option>
            <option value="HIGH">{t('HIGH')}</option>
            <option value="MODERATE">{t('MODERATE')}</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-[#0B1728] border border-red-500/30 rounded-xl p-6">
          <AlertCircle size={36} className="text-red-400 mx-auto mb-2" />
          <p className="text-white font-semibold text-sm">{error}</p>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="text-center py-20 bg-[#0B1728] border border-[#1E293B] rounded-xl">
          <CheckCircle size={44} className="text-emerald-500 mx-auto mb-3" />
          <h3 className="text-white font-bold text-base">{t('No active alerts matching filter.')}</h3>
          <p className="text-slate-400 text-xs mt-1">{t('System normal — continuous sensor telemetry active.')}</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredAlerts.map(alert => {
            const meta = STATION_META[alert.station_name] || {};
            const isCritical = alert.status === 'active' && alert.risk_level === 'CRITICAL';
            return (
              <div 
                key={alert.id} 
                className={`bg-[#0B1728] border rounded-xl overflow-hidden shadow-xl transition-all ${
                  isCritical ? 'border-red-500/50 critical-pulse' : 'border-[#1E293B]'
                }`}
              >
                <div className="flex">
                  {/* Semantic colored stripe */}
                  <div className="w-1.5 shrink-0" style={{
                    background: alert.risk_level === 'CRITICAL' ? '#ef4444' : alert.risk_level === 'HIGH' ? '#f97316' : alert.risk_level === 'MODERATE' ? '#f59e0b' : '#22c55e'
                  }} />

                  <div className="flex-1 p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-black text-white">{alert.station_name} {t('Stations')}</h3>
                          {meta.state && <span className="text-slate-400 text-xs">— {meta.state}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <RiskBadge level={alert.risk_level} showScore score={alert.risk_score} />
                          <span className={`text-[10px] px-2 py-0.2 rounded font-mono font-bold uppercase tracking-wider ${
                            alert.status === 'active' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25' :
                            alert.status === 'acknowledged' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' :
                            'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                          }`}>
                            {t(alert.status)}
                          </span>
                        </div>
                      </div>

                      {/* Incident Action Buttons */}
                      <div className="flex gap-2 shrink-0">
                        {alert.status === 'active' && (
                          <button 
                            onClick={() => action(alert.id, 'acknowledge')}
                            className="px-3 py-1.5 bg-[#101D30] hover:bg-[#162742] text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors"
                          >
                            {t('Acknowledge')}
                          </button>
                        )}
                        {alert.status !== 'resolved' && (
                          <button 
                            onClick={() => action(alert.id, 'resolve')}
                            className="px-3 py-1.5 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors"
                          >
                            {t('Resolve')}
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-slate-300 text-xs leading-relaxed bg-[#07111F] p-3 rounded-lg border border-[#1E293B]">
                      {alert.message}
                    </p>

                    {/* Metadata footer */}
                    <div className="flex flex-wrap gap-5 text-xs text-slate-400 pt-1">
                      <span className="flex items-center gap-1.5">
                        <Clock size={13} className="text-blue-400" />
                        <span>{timeAgo(alert.timestamp)}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users size={13} className="text-blue-400" />
                        <span>{alert.affected_population?.toLocaleString()} {t('People at Risk')}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Navigation size={13} className="text-blue-400" />
                        <span>{alert.affected_roads} {t('Road Blocked')}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Alerts;
