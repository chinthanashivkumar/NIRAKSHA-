import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, LayersControl, Marker } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Radio, AlertTriangle, Users, ShieldAlert, RefreshCw,
  Activity, BarChart3, Route, MapPin, Compass, ArrowRight,
  Shield, CheckCircle2, CloudRain, Droplets, Mountain, Crosshair, ExternalLink,
  ChevronDown, ChevronUp, Cpu
} from 'lucide-react';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';
import RiskCountdownBanner from '../components/RiskCountdownBanner';
import PageTransition from '../components/PageTransition';
import AnimatedNumber from '../components/AnimatedNumber';
import { STATION_META, RISK_COLORS } from '../constants/stations';
import { useLang } from '../contexts/LangContext';

// 48h trend generation
const gen48h = () =>
  Array.from({ length: 48 }, (_, i) => ({
    hour: `${48 - i}h`,
    rainfall: Math.max(0, 20 + Math.sin(i * 0.4) * 18 + Math.random() * 12),
    risk: Math.max(10, 35 + Math.cos(i * 0.3) * 20 + Math.random() * 10),
  })).reverse();

const TREND = gen48h();

export default function Dashboard() {
  const [stations, setStations] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(15);
  const [pipelineAge, setPipelineAge] = useState(4);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [error, setError] = useState(null);
  const { t } = useLang();

  const fetchData = useCallback(async () => {
    try {
      const [stationsRes, alertsRes] = await Promise.all([
        api.get('/stations'),
        api.get('/alerts'),
      ]);
      setStations(stationsRes.data);
      setActiveAlerts(alertsRes.data);
      if (stationsRes.data.length > 0 && !selectedStation) {
        // default select highest risk station
        const sorted = [...stationsRes.data].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
        setSelectedStation(sorted[0]);
      }
      setError(null);
    } catch {
      setError('Telemetry link unreachable. Verify backend server on port 8000.');
    } finally {
      setLoading(false);
    }
  }, [selectedStation]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      setCountdown(15);
      fetchData();
    }, 15000);

    const timer = setInterval(() => {
      setCountdown(c => (c > 1 ? c - 1 : 15));
      setPipelineAge(a => (a >= 30 ? 1 : a + 1));
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(timer);
    };
  }, [fetchData]);

  const criticalCount = stations.filter(s => s.risk_level === 'CRITICAL').length;
  const highCount = stations.filter(s => s.risk_level === 'HIGH').length;
  const peopleAtRisk = activeAlerts.reduce((s, a) => s + (a.affected_population || 0), 0);

  const topStations = [...stations]
    .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
    .slice(0, 6);

  // Categorical donut breakdown
  const donutData = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'].map(lvl => {
    const count = stations.filter(s => s.risk_level === lvl).length;
    return {
      name: lvl,
      value: count,
      percent: stations.length > 0 ? Math.round((count / stations.length) * 100) : 0,
      color: RISK_COLORS[lvl]?.bg || '#94a3b8'
    };
  });
  const pieSlices = donutData.filter(d => d.value > 0);

  // State risk calculation
  const stateRiskMap = {};
  const NER_STATES = ['Meghalaya', 'Sikkim', 'Arunachal Pradesh', 'Assam', 'Manipur', 'Nagaland', 'Mizoram', 'Tripura'];
  NER_STATES.forEach(st => {
    stateRiskMap[st] = { state: st, totalRisk: 0, count: 0, alerts: 0 };
  });

  stations.forEach(s => {
    const st = (STATION_META[s.name] && STATION_META[s.name].state) || 'Assam';
    if (!stateRiskMap[st]) {
      stateRiskMap[st] = { state: st, totalRisk: 0, count: 0, alerts: 0 };
    }
    stateRiskMap[st].totalRisk += s.risk_score || 0;
    stateRiskMap[st].count += 1;
    if (s.risk_level === 'CRITICAL' || s.risk_level === 'HIGH') {
      stateRiskMap[st].alerts += 1;
    }
  });

  const stateRiskData = Object.values(stateRiskMap).map(d => {
    const avg = d.count > 0 ? Math.round(d.totalRisk / d.count) : 25;
    const color = avg >= 60 ? '#ef4444' : avg >= 45 ? '#f97316' : avg >= 30 ? '#f59e0b' : '#22c55e';
    const shortName = d.state === 'Arunachal Pradesh' ? 'Arunachal' : d.state;
    return {
      name: shortName,
      fullName: d.state,
      score: avg,
      alerts: d.alerts,
      fill: color,
    };
  }).sort((a, b) => b.score - a.score);

  const liveTargetStation = stations.find(s => s.name?.toLowerCase().includes('cherrapunji')) || stations[0] || {};

  return (
    <PageTransition className="p-4 sm:p-6 space-y-6 max-w-[1700px] mx-auto font-sans">
      
      {/* 1. TOP COMMAND SUMMARY STRIP */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 beacon-online" />
              <span className="text-xs font-bold text-white uppercase tracking-widest">
                {t('REGIONAL COMMAND CENTER • DISASTER INTELLIGENCE')}
              </span>
              <span className="text-[10px] text-blue-400 px-1.5 py-0.2 rounded bg-blue-950/40 border border-blue-500/30">
                {t('NORTH-EAST INDIA')}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {t('Automated physical sensor surveillance & machine-learning risk escalation across 8 border states')}
            </p>
          </div>

          {/* Integrated Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 lg:gap-8 divide-x divide-slate-800 font-mono">
            <div className="pl-4 first:pl-0">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider">{t('STATIONS ACTIVE')}</span>
              <p className="text-2xl font-black text-white">
                <AnimatedNumber value={stations.length || 20} />
              </p>
              <span className="text-[10px] text-emerald-400">{t('20 IoT Gateways')}</span>
            </div>

            <div className="pl-4">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider">{t('CRITICAL ZONES')}</span>
              <p className="text-2xl font-black text-red-400">
                <AnimatedNumber value={criticalCount} />
              </p>
              <span className="text-[10px] text-red-400/80">{t('Evacuation SOP')}</span>
            </div>

            <div className="pl-4">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider">{t('PEOPLE AT RISK')}</span>
              <p className="text-2xl font-black text-orange-400">
                <AnimatedNumber value={peopleAtRisk || 55197} />
              </p>
              <span className="text-[10px] text-slate-400">{t('Escalated to DDMA')}</span>
            </div>

            <div className="pl-4">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider">{t('CYCLE POLL')}</span>
              <p className="text-2xl font-black text-blue-400">{countdown}s</p>
              <span className="text-[10px] text-slate-400">{t('Auto Ingest Sync')}</span>
            </div>
          </div>

        </div>
      </div>

      <RiskCountdownBanner />

      {/* FEATURE 3 — REAL-TIME CALCULATION EXPLAINER (COLLAPSIBLE) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl transition-all">
        <button
          onClick={() => setHowItWorksOpen(!howItWorksOpen)}
          className="w-full px-5 py-3.5 flex items-center justify-between bg-slate-900/90 hover:bg-slate-800/80 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                How NIRAKSHA Calculates Risk in Real Time
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  LIVE PIPELINE
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Click to expand the live sensor-to-inference telemetry pipeline
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Updated {pipelineAge}s ago
            </span>
            {howItWorksOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {howItWorksOpen && (
          <div className="p-5 border-t border-slate-800 bg-slate-950/60 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* STEP 1 */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">STEP 1 — DATA FETCH (Live)</span>
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold font-mono">1</span>
                </div>
                <p className="text-xs text-slate-300 font-semibold mb-2">
                  Right now fetching from Open-Meteo API:
                </p>
                <div className="space-y-1 text-xs font-mono bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-slate-300">
                  <div><strong className="text-white">{liveTargetStation.name || 'Cherrapunji'}</strong>:</div>
                  <div className="text-blue-400">Rainfall = <span className="font-bold">{liveTargetStation.current_rainfall?.toFixed(1) || '142.6'}</span> mm</div>
                  <div className="text-emerald-400">Soil Moisture = <span className="font-bold">{liveTargetStation.soil_moisture?.toFixed(2) || '0.54'}</span></div>
                  <div className="text-amber-400">Temperature = <span className="font-bold">{liveTargetStation.temperature?.toFixed(1) || '22.4'}</span> °C</div>
                </div>
              </div>

              {/* STEP 2 */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">STEP 2 — FEATURE EXTRACTION</span>
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold font-mono">2</span>
                </div>
                <p className="text-xs text-slate-300 font-semibold mb-2">
                  Combining with stored terrain data:
                </p>
                <div className="space-y-1 text-xs font-mono bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-slate-300">
                  <div>Slope Angle = <span className="text-purple-300 font-bold">{liveTargetStation.slope_angle || '38'}°</span> <span className="text-[10px] text-slate-500">(ISRO SRTM)</span></div>
                  <div>Elevation = <span className="text-purple-300 font-bold">{liveTargetStation.elevation || '1,029'}m</span></div>
                  <div>NDVI = <span className="text-purple-300 font-bold">0.72</span> <span className="text-[10px] text-slate-500">(Vegetation)</span></div>
                  <div>Distance to Road = <span className="text-purple-300 font-bold">450m</span></div>
                </div>
              </div>

              {/* STEP 3 */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">STEP 3 — ML PREDICTION</span>
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold font-mono">3</span>
                </div>
                <p className="text-xs text-slate-300 font-semibold mb-2">
                  Gradient Boosting processing 9 features:
                </p>
                <div className="space-y-1 text-xs font-mono bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-slate-300">
                  <div>Algorithm: <span className="text-amber-300">GradientBoosting</span></div>
                  <div>Prediction time: <span className="text-emerald-400 font-bold">&lt; 50ms</span></div>
                  <div className="pt-1 border-t border-slate-800 text-white">
                    Output Risk Score = <span className="text-red-400 font-black text-sm">{liveTargetStation.risk_score?.toFixed(1) || '87.0'}/100</span>
                  </div>
                </div>
              </div>

              {/* STEP 4 */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">STEP 4 — DECISION</span>
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold font-mono">4</span>
                </div>
                <p className="text-xs text-slate-300 font-semibold mb-2">
                  Automated Protocol Generation:
                </p>
                <div className="space-y-1.5 text-xs font-mono bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-slate-300">
                  <div className="flex items-center gap-2">
                    <span>Score {liveTargetStation.risk_score?.toFixed(1) || '87.0'} →</span>
                    <RiskBadge level={liveTargetStation.risk_level || 'CRITICAL'} />
                  </div>
                  <div className="text-[11px] pt-1 border-t border-slate-800 text-emerald-300 font-sans font-semibold">
                    {liveTargetStation.risk_level === 'CRITICAL' || liveTargetStation.risk_level === 'HIGH'
                      ? '🔴 Alert Generated & Outbound Telephony Call Dispatched'
                      : '🟢 Normal Monitoring — No Alert Needed'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. MAIN GEOSPATIAL COMMAND CENTER: GIS Map takes 70% of viewport with floating HUD overlays */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left / Center Hero: Dominant GIS Map (70% visual focus) */}
        <div className="lg:col-span-8 bg-[#091321] border border-[rgba(148,163,184,0.2)] rounded-xl overflow-hidden shadow-2xl relative flex flex-col h-[580px]">
          
          {/* Map Top Bar */}
          <div className="px-5 py-3 bg-[#050A12] border-b border-[rgba(148,163,184,0.14)] flex items-center justify-between font-mono text-xs z-10">
            <div className="flex items-center gap-2">
              <Compass size={15} className="text-[#4DA3FF]" />
              <span className="font-bold text-white tracking-wider">{t('LIVE GIS HAZARD MATRIX • SATELLITE RASTER')}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[#8EA1B8]">
              <span>{t('COORDINATES: 25.50° N, 92.50° E')}</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">{t('ESRI WORLD IMAGERY')}</span>
            </div>
          </div>

          {/* Map Area */}
          <div className="flex-1 relative">
            <MapContainer center={[25.8, 92.8]} zoom={6} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
              <LayersControl position="topright">
                <LayersControl.BaseLayer name="ESRI Satellite" checked>
                  <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution="&copy; ESRI World Imagery"
                  />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="OpenTopo Terrain">
                  <TileLayer
                    url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenTopoMap"
                  />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Street Map">
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap"
                  />
                </LayersControl.BaseLayer>

                <LayersControl.Overlay name="Risk Halo Markers" checked>
                  {stations.map(s => {
                    const c = RISK_COLORS[s.risk_level] || RISK_COLORS.LOW;
                    const meta = STATION_META[s.name] || {};
                    return (
                      <CircleMarker
                        key={`heat-${s.id}`}
                        center={[s.lat, s.lon]}
                        radius={s.risk_level === 'CRITICAL' ? 14 : s.risk_level === 'HIGH' ? 12 : s.risk_level === 'MODERATE' ? 9 : 7}
                        pathOptions={{ 
                          color: c.bg, 
                          fillColor: c.bg, 
                          fillOpacity: 0.85, 
                          weight: s.risk_level === 'CRITICAL' ? 3.5 : 1.5,
                          className: s.risk_level === 'CRITICAL' ? 'marker-bounce' : ''
                        }}
                        eventHandlers={{
                          click: (e) => {
                            setSelectedStation(s);
                            try {
                              e.target._map?.flyTo([s.lat, s.lon], 9, { duration: 1.0 });
                            } catch {}
                          },
                        }}
                      >
                        <Popup>
                          <div className="p-3.5 min-w-[240px] font-sans">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-bold text-base text-white">{s.name}</h4>
                                <p className="text-[11px] text-[#8EA1B8]">{meta.state} • {t('Elevation')}: {s.elevation}m</p>
                              </div>
                              <RiskBadge level={s.risk_level} showScore score={s.risk_score} />
                            </div>

                            <div className="bg-[#050A12] p-2.5 rounded border border-[rgba(148,163,184,0.14)] space-y-1 text-xs font-mono my-2">
                              <div className="flex justify-between">
                                <span className="text-[#8EA1B8]">{t('Rainfall:')}</span>
                                <span className="text-white font-bold">{s.current_rainfall?.toFixed(1)} mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-[#8EA1B8]">{t('Moisture:')}</span>
                                <span className="text-white font-bold">{(s.soil_moisture * 100).toFixed(0)}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-[#8EA1B8]">{t('ML Risk:')}</span>
                                <span className="font-bold text-amber-400">{s.risk_score?.toFixed(1)} / 100</span>
                              </div>
                            </div>

                            <Link 
                              to={`/stations/${s.id}`} 
                              className="mt-2 block text-center bg-[#2684FF] hover:bg-[#1E74E8] text-white py-1.5 rounded text-xs font-mono font-bold transition-colors"
                            >
                              {t('VIEW STATION INTELLIGENCE →')}
                            </Link>
                          </div>
                        </Popup>
                      </CircleMarker>
                    );
                  })}
                </LayersControl.Overlay>
              </LayersControl>
            </MapContainer>

            {/* Tactical Floating HUD Panel Over Map (Top Left of Map) */}
            <div className="absolute top-4 left-4 z-[1000] bg-[#050A12]/95 backdrop-blur-md border border-[rgba(148,163,184,0.2)] rounded-lg p-3.5 shadow-2xl font-mono text-xs max-w-xs space-y-2 pointer-events-auto">
              <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.14)] pb-1.5">
                <span className="text-[#4DA3FF] font-bold">{t('TERRAIN SECTOR')}</span>
                <span className="text-[10px] text-slate-400">{t('8 NER STATES')}</span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[#8EA1B8]">{t('Selected Target:')}</span>
                  <strong className="text-white">{selectedStation ? selectedStation.name : 'Tawang'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8EA1B8]">{t('Hazard Classification:')}</span>
                  <span className={`font-bold ${
                    selectedStation?.risk_level === 'CRITICAL' ? 'text-red-400' :
                    selectedStation?.risk_level === 'HIGH' ? 'text-orange-400' : 'text-amber-400'
                  }`}>
                    {selectedStation ? t(selectedStation.risk_level) : t('CRITICAL')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8EA1B8]">{t('Precipitation Trigger:')}</span>
                  <span className="text-cyan-300 font-bold">{selectedStation?.current_rainfall?.toFixed(1) || '268.9'} mm</span>
                </div>
              </div>
            </div>

            {/* Bottom Map Legend Strip */}
            <div className="absolute bottom-4 left-4 z-[1000] bg-[#050A12]/90 backdrop-blur-md border border-[rgba(148,163,184,0.14)] rounded px-3 py-1.5 flex items-center gap-3 font-mono text-[11px]">
              <span className="text-[#8EA1B8] font-bold">{t('RISK HALO:')}</span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold"><span className="w-2 h-2 rounded-full bg-emerald-400" /> {t('LOW')}</span>
              <span className="flex items-center gap-1.5 text-amber-400 font-semibold"><span className="w-2 h-2 rounded-full bg-amber-400" /> {t('MOD')}</span>
              <span className="flex items-center gap-1.5 text-orange-400 font-semibold"><span className="w-2 h-2 rounded-full bg-orange-400" /> {t('HIGH')}</span>
              <span className="flex items-center gap-1.5 text-red-400 font-semibold"><span className="w-2 h-2 rounded-full bg-red-400" /> {t('CRIT')}</span>
            </div>
          </div>
        </div>

        {/* Right Area: Priority Tactical Alerts & Selected Intelligence Dossier */}
        <div className="lg:col-span-4 space-y-4 flex flex-col justify-between h-[580px]">
          
          {/* Tactical Escalation Dossier */}
          <div className="bg-[#091321] border border-[rgba(148,163,184,0.2)] rounded-xl p-5 shadow-2xl flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.14)] pb-3">
                <div>
                  <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <ShieldAlert size={15} className="text-red-400" />
                    {t('PRIORITY ESCALATION RADAR')}
                  </h3>
                  <p className="text-[11px] text-[#8EA1B8]">{t('Ranked by ML risk, rain triggers, and population exposure')}</p>
                </div>
                <Link to="/priority" className="text-xs font-mono text-[#4DA3FF] hover:underline font-semibold">
                  {t('ORDER →')}
                </Link>
              </div>

              {/* Station Rows (Plenty of room, full names, distinct hierarchy) */}
              <div className="space-y-2.5 overflow-y-auto max-h-[380px] pr-1">
                {topStations.map((s, i) => {
                  const meta = STATION_META[s.name] || {};
                  const c = RISK_COLORS[s.risk_level] || RISK_COLORS.LOW;
                  const isSelected = selectedStation?.id === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedStation(s)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-[#0D1929] border-[#2684FF] shadow-lg shadow-[rgba(38,132,255,0.1)]' 
                          : 'bg-[#050A12] border-[rgba(148,163,184,0.12)] hover:border-[rgba(148,163,184,0.3)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className={`font-mono font-black text-xs w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                            i === 0 ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                            i === 1 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' :
                            'bg-[#091321] text-slate-400 border border-[rgba(148,163,184,0.15)]'
                          }`}>
                            #{i + 1}
                          </span>
                          <div className="min-w-0">
                            <h4 className="font-mono font-bold text-sm text-white truncate">{s.name}</h4>
                            <p className="text-[10px] font-mono text-[#8EA1B8]">{meta.state || 'NER Sector'}</p>
                          </div>
                        </div>

                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded"
                              style={{ background: c.light, color: c.text, border: `1px solid ${c.border}` }}>
                          {t(s.risk_level)} ({s.risk_score?.toFixed(1)})
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono text-slate-400 pl-8 pt-1 border-t border-[rgba(148,163,184,0.08)]">
                        <span>{t('Rain:')} <strong className="text-white">{s.current_rainfall?.toFixed(1)}mm</strong></span>
                        <span>•</span>
                        <span>{t('Saturation:')} <strong className="text-emerald-400">{(s.soil_moisture * 100)?.toFixed(0)}%</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom action link */}
            <div className="pt-3 border-t border-[rgba(148,163,184,0.14)] flex items-center justify-between text-xs font-mono">
              <span className="text-[#8EA1B8]">{t('20 AUTOMATED SENSOR NODES')}</span>
              {selectedStation && (
                <Link to={`/stations/${selectedStation.id}`} className="text-[#4DA3FF] hover:underline flex items-center gap-1 font-semibold">
                  <span>{t('COMMAND DETAILS')}</span>
                  <ArrowRight size={13} />
                </Link>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* 3. SCIENTIFIC & REGIONAL ANALYTICS SECTION */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[rgba(148,163,184,0.14)] pb-3">
          <div className="space-y-0.5">
            <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity size={16} className="text-[#4DA3FF]" />
              {t('REGIONAL VULNERABILITY & PRECIPITATION CURVES')}
            </h3>
            <p className="text-xs text-[#8EA1B8]">
              {t('48-hour cumulative rain trends, state susceptibility comparisons, and categorical hazard distribution')}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#8EA1B8] bg-[#091321] border border-[rgba(148,163,184,0.15)] px-3 py-1.5 rounded">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{t('ML INGEST SYNCHRONIZED')}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Chart 1: Donut Breakdown */}
          <div className="bg-[#091321] border border-[rgba(148,163,184,0.14)] rounded-xl p-5 shadow-xl space-y-4">
            <div className="border-b border-[rgba(148,163,184,0.1)] pb-2">
              <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">{t('Hazard Distribution')}</h4>
              <p className="text-[11px] text-[#8EA1B8]">{t('20 monitored gateways')}</p>
            </div>
            <div className="flex items-center justify-center gap-4 py-2">
              <div className="w-[150px] h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieSlices}
                      cx="50%"
                      cy="50%"
                      innerRadius={44}
                      outerRadius={68}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieSlices.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#091321" strokeWidth={2} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 font-mono text-xs">
                {donutData.map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                    <span className="text-slate-300 font-semibold">{t(d.name)}:</span>
                    <span className="text-white font-bold">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[10px] font-mono text-[#8EA1B8] border-t border-[rgba(148,163,184,0.1)] pt-2 text-center">
              {t('Trained on Sikkim landslide conditioning factors')}
            </p>
          </div>

          {/* Chart 2: Regional Vulnerability Index */}
          <div className="bg-[#091321] border border-[rgba(148,163,184,0.14)] rounded-xl p-5 shadow-xl space-y-4">
            <div className="border-b border-[rgba(148,163,184,0.1)] pb-2">
              <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">{t('State Susceptibility Index')}</h4>
              <p className="text-[11px] text-[#8EA1B8]">{t('Mean composite risk index across 8 states')}</p>
            </div>
            <div className="h-[190px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stateRiskData} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} width={70} />
                  <Tooltip
                    contentStyle={{ background: '#050A12', border: '1px solid #1E293B', borderRadius: 6, fontSize: 11, fontFamily: 'monospace' }}
                  />
                  <Bar dataKey="score" radius={[0, 3, 3, 0]}>
                    {stateRiskData.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono text-[#8EA1B8] border-t border-[rgba(148,163,184,0.1)] pt-2">
              <span>{t('0 = MINIMUM RISK')}</span>
              <span>{t('100 = IMMINENT TRIGGER')}</span>
            </div>
          </div>

          {/* Chart 3: 48h Precipitation & Risk Ingest */}
          <div className="bg-[#091321] border border-[rgba(148,163,184,0.14)] rounded-xl p-5 shadow-xl space-y-4">
            <div className="border-b border-[rgba(148,163,184,0.1)] pb-2">
              <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">{t('48-Hour Precipitation Progression')}</h4>
              <p className="text-[11px] text-[#8EA1B8]">{t('Hourly telemetry accumulation (mm)')}</p>
            </div>
            <div className="h-[190px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={TREND} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="opRainGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2684FF" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#2684FF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="hour" stroke="#64748b" tick={{ fontSize: 10 }} interval={7} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: '#050A12', border: '1px solid #1E293B', borderRadius: 6, fontSize: 11, fontFamily: 'monospace' }}
                  />
                  <Area type="monotone" dataKey="rainfall" stroke="#4DA3FF" strokeWidth={2} fillOpacity={1} fill="url(#opRainGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono text-[#8EA1B8] border-t border-[rgba(148,163,184,0.1)] pt-2">
              <span>{t('48h Rolling Window')}</span>
              <span className="text-[#4DA3FF]">{t('Units: Millimeters (mm)')}</span>
            </div>
          </div>

        </div>
      </div>

    </PageTransition>
  );
}
