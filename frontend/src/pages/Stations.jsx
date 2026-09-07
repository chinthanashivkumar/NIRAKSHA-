import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, CloudRain, Droplets, Mountain, Users, AlertTriangle, Compass, ArrowRight } from 'lucide-react';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';
import { STATION_META, RISK_COLORS } from '../constants/stations';
import { useLang } from '../contexts/LangContext';

const Stations = () => {
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
    <div className="p-6 max-w-7xl mx-auto space-y-6 page-fade">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E293B] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">{t('Telemetry Stations')}</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              20 {t('STATIONS ACTIVE')}
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            {t('Real-time environmental sensor gateways deployed across 8 North-Eastern states of India')}
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('Search station or district...')}
              className="bg-[#0B1728] border border-[#1E293B] rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 w-60 transition-colors"
            />
          </div>

          <select
            value={stateFilter}
            onChange={e => setStateFilter(e.target.value)}
            className="bg-[#0B1728] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            {states.map(st => (
              <option key={st} value={st}>{st === 'ALL' ? t('8 NER STATES') : st}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-9 h-9 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-[#0B1728] border border-red-500/30 rounded-xl p-6">
          <AlertTriangle size={36} className="text-red-400 mx-auto mb-2" />
          <p className="text-white font-semibold text-sm">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map(s => {
            const meta = STATION_META[s.name] || {};
            const c = RISK_COLORS[s.risk_level] || RISK_COLORS.LOW;
            return (
              <Link
                key={s.id}
                to={`/stations/${s.id}`}
                className="bg-[#0B1728] border border-[#1E293B] rounded-xl p-5 hover:bg-[#101D30] hover:border-blue-500/40 transition-all block group shadow-lg"
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
                  <span className="text-3xl font-black font-mono" style={{ color: c.bg }}>
                    {s.risk_score.toFixed(1)}
                  </span>
                  <span className="text-[11px] text-slate-400">/ 100 {t('ML Risk')}</span>
                </div>

                {/* Telemetry Metrics */}
                <div className="grid grid-cols-3 gap-2 text-xs text-slate-300 py-2 border-y border-[#1E293B] mb-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block">{t('Daily Rainfall')}</span>
                    <span className="font-mono font-semibold text-blue-400">{s.current_rainfall?.toFixed(1)}mm</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">{t('Soil Moisture')}</span>
                    <span className="font-mono font-semibold text-emerald-400">{(s.soil_moisture * 100)?.toFixed(0)}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">{t('Slope Angle')}</span>
                    <span className="font-mono font-semibold text-amber-400">{meta.slope_angle || '—'}°</span>
                  </div>
                </div>

                {/* Footer details */}
                <div className="flex justify-between items-center text-[11px] text-slate-400">
                  <span>{t('Elevation')}: <strong className="text-slate-300">{s.elevation}m</strong></span>
                  <span className="flex items-center gap-1">
                    <Users size={12} /> {meta.population ? meta.population.toLocaleString() : '—'}
                  </span>
                </div>
              </Link>
            );
          })}

          {filtered.length === 0 && (
            <div className="col-span-full text-center py-20 bg-[#0B1728] border border-[#1E293B] rounded-xl text-slate-400 text-xs">
              {t('No monitoring stations match your search filters.')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Stations;
