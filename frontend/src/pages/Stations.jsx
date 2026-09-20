import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, CloudRain, Droplets, Mountain, Users, AlertTriangle, ArrowRight, Radio } from 'lucide-react';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';
import PageTransition, { containerVariants, cardVariants } from '../components/PageTransition';
import SkeletonCard from '../components/SkeletonCard';
import { STATION_META, RISK_COLORS } from '../constants/stations';
import { useLang } from '../contexts/LangContext';

export default function Stations() {
  const { t } = useLang();
  const [stations, setStations] = useState([]);
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/stations')
      .then(r => setStations(r.data))
      .catch(() => setError('Backend unreachable. Check if server is running on port 8000.'))
      .finally(() => setLoading(false));
  }, []);

  const states = ['ALL', 'Assam', 'Meghalaya', 'Arunachal Pradesh', 'Sikkim', 'Manipur', 'Mizoram', 'Nagaland', 'Tripura'];

  const filtered = stations.filter(s => {
    const meta = STATION_META[s.name] || {};
    const q = query.toLowerCase();
    const matchesQuery = s.name.toLowerCase().includes(q) || (meta.state || '').toLowerCase().includes(q);
    const matchesState = stateFilter === 'ALL' || meta.state === stateFilter;
    return matchesQuery && matchesState;
  });

  return (
    <PageTransition className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Radio size={22} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {t('NER Telemetry Network Stations')}
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
                {t('20 IoT edge telemetry stations continuously monitoring rainfall gauges and soil moisture')}
              </p>
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('Search station or district...')}
              className="bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 w-60 transition-colors"
            />
          </div>

          <select
            value={stateFilter}
            onChange={e => setStateFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
          >
            {states.map(st => (
              <option key={st} value={st}>{st === 'ALL' ? t('8 NER STATES') : st}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} rows={3} height="h-48" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-slate-900 border border-red-500/30 rounded-xl p-6">
          <AlertTriangle size={36} className="text-red-400 mx-auto mb-2" />
          <p className="text-white font-semibold text-sm">{error}</p>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {filtered.map(s => {
            const meta = STATION_META[s.name] || {};
            const c = RISK_COLORS[s.risk_level] || RISK_COLORS.LOW;
            const isCrit = s.risk_level === 'CRITICAL';

            return (
              <motion.div key={s.id} variants={cardVariants}>
                <Link
                  to={`/stations/${s.id}`}
                  className={`rounded-xl border bg-slate-800 p-4 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 block group relative overflow-hidden ${
                    isCrit ? 'border-red-500/50' : 'border-slate-700 hover:border-blue-500/40'
                  }`}
                >
                  {/* Top header */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-sm text-white group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                        {s.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">{meta.state || 'NER Corridor'}</p>
                    </div>
                    <RiskBadge level={s.risk_level} />
                  </div>

                  {/* Score */}
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-3xl font-black font-mono text-white">
                      {s.risk_score.toFixed(1)}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">/ 100 {t('ML Risk')}</span>
                  </div>

                  {/* Telemetry Metrics */}
                  <div className="grid grid-cols-3 gap-2 text-xs text-slate-300 py-2.5 border-y border-slate-700/80 mb-3">
                    <div>
                      <span className="text-[10px] text-slate-400 block">{t('Rainfall')}</span>
                      <span className="font-mono font-semibold text-cyan-300">{s.current_rainfall?.toFixed(1)}mm</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">{t('Moisture')}</span>
                      <span className="font-mono font-semibold text-amber-300">{((s.soil_moisture || 0.3) * 100).toFixed(0)}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">{t('Elevation')}</span>
                      <span className="font-mono font-semibold text-slate-300">{s.elevation?.toFixed(0)}m</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <span className="flex items-center gap-1 text-[11px]">
                      <Users size={12} className="text-slate-500" />
                      {(s.population || 5000).toLocaleString()} {t('Pop')}
                    </span>
                    <span className="text-blue-400 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1 text-xs">
                      {t('Inspect')} <ArrowRight size={13} />
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </PageTransition>
  );
}
