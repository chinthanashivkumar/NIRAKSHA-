import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Users, AlertOctagon, Clock, Target, CheckCircle2, ChevronRight, Info, RefreshCw } from 'lucide-react';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';
import PageTransition, { containerVariants, cardVariants } from '../components/PageTransition';
import SkeletonCard from '../components/SkeletonCard';
import { STATION_META } from '../constants/stations';
import { useLang } from '../contexts/LangContext';

const RANK_STYLE = {
  1: { border: '#ef4444', badge: '#ef4444', text: '#fca5a5' },
  2: { border: '#f97316', badge: '#f97316', text: '#fdba74' },
  3: { border: '#eab308', badge: '#eab308', text: '#fcd34d' },
};
const DEFAULT_RANK = { border: '#334155', badge: '#3b82f6', text: '#94a3b8' };

export default function Priority() {
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState('');

  const fetchPriorities = async () => {
    try {
      const res = await api.get('/alerts/prioritize');
      setItems(res.data);
      setUpdatedAt(new Date().toLocaleTimeString());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPriorities();
    const i = setInterval(fetchPriorities, 15000);
    return () => clearInterval(i);
  }, []);

  const hasCritical = items.some(i => i.alert.risk_level === 'CRITICAL');

  return (
    <PageTransition className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {t('Tactical Disaster Response Priority Order')}
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
              MCDA ALGORITHM
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            {t('Automated operational deployment order based on multi-factor vulnerability')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {updatedAt && (
            <span className="text-[11px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
              {t('Timestamp')}: {updatedAt}
            </span>
          )}
          <button
            onClick={fetchPriorities}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all active:scale-95 hover:-translate-y-0.5"
            title="Refresh priorities"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Rationale Banner */}
      <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
        hasCritical ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Target size={14} className="text-blue-400" />
            {t('Recommended Action')}
          </p>
          <p className="text-xs text-slate-400">
            {t('Top Priority High-Risk Zones')}
          </p>
        </div>
        <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-slate-800 text-blue-400 border border-slate-700 shrink-0 font-bold">
          {t('Rank')} #1, #2, #3
        </span>
      </div>

      {loading ? (
        <div className="space-y-4">
          <SkeletonCard rows={3} height="h-36" />
          <SkeletonCard rows={3} height="h-36" />
          <SkeletonCard rows={3} height="h-36" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-slate-900 border border-slate-800 rounded-xl shadow-md">
          <CheckCircle2 size={44} className="text-emerald-500 mx-auto mb-3" />
          <h3 className="text-white font-bold text-base">{t('System normal — continuous sensor telemetry active.')}</h3>
          <p className="text-slate-400 text-xs mt-1">{t('Continue routine monitoring')}</p>
        </div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="initial"
          animate="animate"
          className="space-y-4"
        >
          {items.map(item => {
            const st = RANK_STYLE[item.rank] || DEFAULT_RANK;
            const meta = STATION_META[item.alert.station_name] || {};
            return (
              <motion.div 
                key={item.alert.id}
                variants={cardVariants}
                className="rounded-xl overflow-hidden flex border shadow-lg bg-slate-800 hover:shadow-xl hover:-translate-y-1 transition-all duration-200" 
                style={{ borderColor: st.border }}
              >
                {/* Ranking Pillar */}
                <div className="w-20 bg-slate-900 border-r border-slate-700/80 flex flex-col items-center justify-center shrink-0 py-4">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-400">{t('Rank')}</span>
                  <span className="text-3xl font-black font-mono my-1" style={{ color: st.badge }}>
                    #{item.rank}
                  </span>
                  <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700">
                    {t('ORDER')}
                  </span>
                </div>

                {/* Content Details */}
                <div className="flex-1 p-4 sm:p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-lg font-bold text-white">{item.alert.station_name} {t('Stations')}</h2>
                        <span className="text-xs text-slate-400">— {meta.state || 'NER Corridor'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <RiskBadge level={item.alert.risk_level} showScore score={item.alert.risk_score} />
                        <span className="text-xs text-slate-400">
                          {t('Target Pop.')}: <strong className="text-slate-200">{meta.population ? meta.population.toLocaleString() : '—'}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 text-right shrink-0">
                      <span className="text-[10px] text-slate-400 block">{t('Composite Risk')}</span>
                      <span className="text-base font-black font-mono text-blue-400">{item.priority_score.toFixed(1)} / 100</span>
                    </div>
                  </div>

                  {/* Why this location is prioritized */}
                  <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-700 space-y-1">
                    <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Info size={13} className="text-blue-400" />
                      {t('Action SOP')}:
                    </p>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {item.reasoning || `Location evaluated with ${item.alert.risk_level} ML hazard score, high precipitation accumulation, and dense transportation corridor exposure.`}
                    </p>
                  </div>

                  {/* Operational stats */}
                  <div className="flex flex-wrap gap-4 text-xs text-slate-400 pt-1">
                    <span>{t('People at Risk')}: <strong className="text-slate-200">{item.alert.affected_population?.toLocaleString()}</strong></span>
                    <span>•</span>
                    <span>{t('Road Blocked')}: <strong className="text-slate-200">{item.alert.affected_roads}</strong></span>
                    <span>•</span>
                    <span>{t('Recommended Resource')}: <strong className="text-blue-400">NDRF Unit {item.rank}</strong></span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </PageTransition>
  );
}
