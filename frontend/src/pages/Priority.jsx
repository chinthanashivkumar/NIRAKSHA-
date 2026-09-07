import { useState, useEffect } from 'react';
import { Shield, Users, AlertOctagon, Clock, Target, CheckCircle2, ChevronRight, Info } from 'lucide-react';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';
import { STATION_META } from '../constants/stations';
import { useLang } from '../contexts/LangContext';

const RANK_STYLE = {
  1: { border: '#ef4444', bg: '#0B1728', badge: '#ef4444', text: '#fca5a5' },
  2: { border: '#f97316', bg: '#0B1728', badge: '#f97316', text: '#fdba74' },
  3: { border: '#f59e0b', bg: '#0B1728', badge: '#f59e0b', text: '#fcd34d' },
};
const DEFAULT_RANK = { border: '#1E293B', bg: '#0B1728', badge: '#1677FF', text: '#94a3b8' };

const Priority = () => {
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState('');

  useEffect(() => {
    const fetch = async () => {
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
    fetch();
    const i = setInterval(fetch, 15000);
    return () => clearInterval(i);
  }, []);

  const hasCritical = items.some(i => i.alert.risk_level === 'CRITICAL');

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 page-fade">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E293B] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">{t('Tactical Disaster Response Priority Order')}</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              MCDA ALGORITHM
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            {t('Automated operational deployment order based on multi-factor vulnerability')}
          </p>
        </div>
        {updatedAt && (
          <span className="text-[11px] font-mono text-slate-400 bg-[#0B1728] border border-[#1E293B] px-3 py-1.5 rounded-lg">
            {t('Timestamp')}: {updatedAt}
          </span>
        )}
      </div>

      {/* Rationale Banner */}
      <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
        hasCritical ? 'bg-red-500/10 border-red-500/30' : 'bg-[#0B1728] border-[#1E293B]'
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
        <span className="text-[10px] font-mono px-2 py-1 rounded bg-[#101D30] text-blue-400 border border-[#1E293B] shrink-0">
          {t('Rank')} #1, #2, #3
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-[#0B1728] border border-[#1E293B] rounded-xl">
          <CheckCircle2 size={44} className="text-emerald-500 mx-auto mb-3" />
          <h3 className="text-white font-bold text-base">{t('System normal — continuous sensor telemetry active.')}</h3>
          <p className="text-slate-400 text-xs mt-1">{t('Continue routine monitoring')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(item => {
            const st = RANK_STYLE[item.rank] || DEFAULT_RANK;
            const meta = STATION_META[item.alert.station_name] || {};
            return (
              <div 
                key={item.alert.id} 
                className="rounded-xl overflow-hidden flex border shadow-xl bg-[#0B1728]" 
                style={{ borderColor: st.border }}
              >
                {/* Ranking Pillar */}
                <div className="w-20 bg-[#07111F] border-r border-[#1E293B] flex flex-col items-center justify-center shrink-0 py-4">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-400">{t('Rank')}</span>
                  <span className="text-3xl font-black font-mono my-1" style={{ color: st.badge }}>
                    #{item.rank}
                  </span>
                  <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.2 rounded bg-[#101D30] text-slate-300">
                    {t('ORDER')}
                  </span>
                </div>

                {/* Content Details */}
                <div className="flex-1 p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-lg font-black text-white">{item.alert.station_name} {t('Stations')}</h2>
                        <span className="text-xs text-slate-400">— {meta.state || 'NER Corridor'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <RiskBadge level={item.alert.risk_level} showScore score={item.alert.risk_score} />
                        <span className="text-xs text-slate-400">
                          {t('Target Pop.')}: <strong className="text-slate-200">{meta.population ? meta.population.toLocaleString() : '—'}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="bg-[#07111F] px-3 py-1.5 rounded-lg border border-[#1E293B] text-right">
                      <span className="text-[10px] text-slate-400 block">{t('Composite Risk')}</span>
                      <span className="text-base font-black font-mono text-blue-400">{item.priority_score.toFixed(1)} / 100</span>
                    </div>
                  </div>

                  {/* Why this location is prioritized */}
                  <div className="bg-[#07111F] p-3 rounded-lg border border-[#1E293B] space-y-1">
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Priority;
