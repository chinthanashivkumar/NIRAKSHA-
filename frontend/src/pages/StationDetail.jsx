import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CloudRain, Droplets, Mountain, Thermometer, Wind, ShieldAlert, Route, Users, Clock } from 'lucide-react';
import api from '../services/api';
import EvacuationPanel from '../components/EvacuationPanel';
import { STATION_META, RISK_COLORS } from '../constants/stations';
import { useLang } from '../contexts/LangContext';

// Clean SVG Semicircle Gauge
const RiskGauge = ({ score, level }) => {
  const c = RISK_COLORS[level] || RISK_COLORS.LOW;
  const angle = (score / 100) * 180;
  const rad = ((angle - 90) * Math.PI) / 180;
  const cx = 100, cy = 100, r = 75;
  const nx = cx + r * Math.cos(rad);
  const ny = cy + r * Math.sin(rad);

  const largeArc = angle > 180 ? 1 : 0;

  return (
    <div className="flex justify-center">
      <svg width="200" height="110" viewBox="0 0 200 110">
        <path d={`M 25 100 A 75 75 0 0 1 175 100`} fill="none" stroke="#1E293B" strokeWidth="16" strokeLinecap="round" />
        <path d={`M 25 100 A 75 75 0 ${largeArc} 1 ${nx} ${ny}`} fill="none" stroke={c.bg} strokeWidth="16" strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="white" strokeWidth="2" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="4" fill="white" />
        <text x={cx} y={cy - 6} textAnchor="middle" fill="white" fontSize="26" fontWeight="900" fontFamily="JetBrains Mono">{score.toFixed(1)}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill={c.bg} fontSize="11" fontWeight="800">{level}</text>
      </svg>
    </div>
  );
};

const StationDetail = () => {
  const { id } = useParams();
  const { t } = useLang();
  const [station, setStation] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  const RECS = {
    LOW:      { color: '#22c55e', text: 'Continue routine environmental monitoring. All telemetry within safe baselines.' },
    MODERATE: { color: '#f59e0b', text: 'Notify District Disaster Management Authority (DDMA). Elevate sensor polling interval.' },
    HIGH:     { color: '#f97316', text: 'Pre-position SDRF/NDRF rescue teams. Alert high-risk vulnerable hillside communities.' },
    CRITICAL: { color: '#ef4444', text: 'IMMEDIATE EVACUATION DIRECTIVE: Critical slope saturation threshold breached. Close arterial road passes.' },
  };

  useEffect(() => {
    const fetch = async () => {
      try {
        const [sr, wr] = await Promise.all([
          api.get(`/stations/${id}`),
          api.get(`/weather/${id}`).catch(() => ({ data: null }))
        ]);
        setStation(sr.data);
        setWeather(wr.data);
      } catch (e) { 
        console.error(e); 
      } finally { 
        setLoading(false); 
      }
    };
    fetch();
    const i = setInterval(fetch, 30000);
    return () => clearInterval(i);
  }, [id]);

  if (loading) return (
    <div className="flex h-full items-center justify-center py-24">
      <div className="w-9 h-9 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  
  if (!station) return (
    <div className="flex h-full items-center justify-center text-slate-400 py-24">
      Monitoring station not found.
    </div>
  );

  const meta = STATION_META[station.name] || {};
  const rec = RECS[station.risk_level] || RECS.LOW;
  const c = RISK_COLORS[station.risk_level] || RISK_COLORS.LOW;

  const factors = [
    { name: 'Rainfall Accumulation', pct: Math.min(100, (station.current_rainfall || 20) / 2), color: '#1677FF' },
    { name: 'Soil Saturation', pct: Math.min(100, (station.soil_moisture || 0.4) * 100 * 1.4), color: '#10b981' },
    { name: 'Slope Gradient', pct: Math.min(100, (meta.slope_angle || 30) * 1.5), color: '#f59e0b' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto page-fade">
      {/* Back button */}
      <Link to="/stations" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors">
        <ArrowLeft size={15} /> Back to Telemetry Stations
      </Link>

      {/* Station Overview Hero */}
      <div className="bg-[#0B1728] border border-[#1E293B] rounded-xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-white tracking-tight">{station.name} Station</h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded uppercase"
                    style={{ background: `${c.bg}20`, color: c.bg, border: `1px solid ${c.bg}40` }}>
                {station.risk_level} RISK
              </span>
            </div>
            <p className="text-xs text-slate-400">
              State: <strong className="text-white">{meta.state || 'NER'}</strong> • Coordinates: <span className="font-mono text-slate-300">{station.lat}°N, {station.lon}°E</span> • Elevation: <span className="font-mono text-slate-300">{station.elevation}m</span>
            </p>
            <p className="text-xs text-slate-400">
              Corridor Census Exposure: <strong className="text-white">{meta.population ? meta.population.toLocaleString() : '—'} residents</strong>
            </p>
          </div>

          <div className="bg-[#07111F] p-4 rounded-xl border border-[#1E293B] shrink-0">
            <RiskGauge score={station.risk_score} level={station.risk_level} />
          </div>
        </div>
      </div>

      {/* Live Telemetry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#0B1728] border border-[#1E293B] rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Precipitation Trigger</span>
            <CloudRain size={16} className="text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white font-mono">{station.current_rainfall?.toFixed(1)} <span className="text-xs text-slate-400 font-normal">mm</span></p>
          <p className="text-[10px] text-slate-400">Automated tipping-bucket</p>
        </div>

        <div className="bg-[#0B1728] border border-[#1E293B] rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Soil Saturation</span>
            <Droplets size={16} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white font-mono">{(station.soil_moisture * 100)?.toFixed(0)} <span className="text-xs text-slate-400 font-normal">%</span></p>
          <p className="text-[10px] text-slate-400">TDR volumetric probe</p>
        </div>

        <div className="bg-[#0B1728] border border-[#1E293B] rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Slope Incline</span>
            <Mountain size={16} className="text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white font-mono">{meta.slope_angle || 32} <span className="text-xs text-slate-400 font-normal">degrees</span></p>
          <p className="text-[10px] text-slate-400">DEM derived contour</p>
        </div>

        <div className="bg-[#0B1728] border border-[#1E293B] rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Ambient Weather</span>
            <Thermometer size={16} className="text-cyan-400" />
          </div>
          <p className="text-2xl font-black text-white font-mono">
            {weather?.temperature != null ? `${weather.temperature.toFixed(1)}°C` : '19.4°C'}
          </p>
          <p className="text-[10px] text-slate-400">
            {weather?.description ? weather.description : 'Overcast Mountain Weather'}
          </p>
        </div>
      </div>

      {/* Advisory & Contributing Factors */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-[#0B1728] border border-[#1E293B] rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Operational Directive (SOP)</h3>
          <div className="p-4 rounded-lg border text-xs leading-relaxed"
               style={{ background: `${rec.color}15`, borderColor: `${rec.color}35`, color: '#F8FAFC' }}>
            <p className="font-semibold">{rec.text}</p>
          </div>
          <p className="text-[11px] text-slate-400">
            Standard Operating Procedures automatically routed to State Disaster Management Authority (SDMA).
          </p>
        </div>

        <div className="lg:col-span-6 bg-[#0B1728] border border-[#1E293B] rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Hazard Contribution Factors</h3>
          <div className="space-y-3">
            {factors.map((f, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>{f.name}</span>
                  <span className="font-mono font-semibold">{f.pct.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-[#07111F] rounded-full h-1.5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${f.pct}%`, background: f.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Evacuation Protocol Component if High/Critical */}
      <EvacuationPanel stationId={station.id} riskLevel={station.risk_level} lat={station.lat} lon={station.lon} />
    </div>
  );
};

export default StationDetail;
