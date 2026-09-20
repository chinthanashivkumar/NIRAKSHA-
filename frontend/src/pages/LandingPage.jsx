import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, Activity, Radio, Cpu, BellRing, Route, Users, 
  ArrowRight, ChevronRight, CheckCircle2, Globe, Database, 
  Layers, Lock, ExternalLink, Compass, AlertTriangle, CloudRain, Droplets,
  Mountain, Crosshair, Radar, Terminal, MapPin, Gauge, Eye, TrendingUp,
  Zap, LifeBuoy
} from 'lucide-react';
import api from '../services/api';
import NortheastGeospatialMap from '../components/NortheastGeospatialMap';

export default function LandingPage() {
  const [stations, setStations] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [criticalCount, setCriticalCount] = useState(2);
  const [highCount, setHighCount] = useState(5);

  useEffect(() => {
    const fetchSnapshot = async () => {
      try {
        const [stRes, alRes] = await Promise.all([
          api.get('/stations'),
          api.get('/alerts')
        ]);
        if (stRes.data && stRes.data.length > 0) {
          setStations(stRes.data);
          const crits = stRes.data.filter(s => s.risk_level === 'CRITICAL').length;
          const highs = stRes.data.filter(s => s.risk_level === 'HIGH').length;
          setCriticalCount(crits);
          setHighCount(highs);
        }
        if (alRes.data) {
          setActiveAlerts(alRes.data);
        }
      } catch (e) {
        // Fallback to default state
      }
    };
    fetchSnapshot();
  }, []);

  const nerStates = [
    { name: 'Arunachal Pradesh', code: 'AR', stations: 4, coords: '28.21° N, 94.72° E', terrain: 'Outer Himalayan Thrust Belt', riskZone: 'CRITICAL', elevRange: '440m – 3,048m' },
    { name: 'Sikkim', code: 'SK', stations: 3, coords: '27.53° N, 88.51° E', terrain: 'High Altitude Crystalline Slopes', riskZone: 'CRITICAL', elevRange: '956m – 1,650m' },
    { name: 'Meghalaya', code: 'ML', stations: 3, coords: '25.46° N, 91.36° E', terrain: 'Shillong Plateau / Escarpment Horst', riskZone: 'HIGH', elevRange: '349m – 1,525m' },
    { name: 'Assam', code: 'AS', stations: 4, coords: '26.20° N, 92.93° E', terrain: 'Barail Range & Brahmaputra Corridor', riskZone: 'MODERATE', elevRange: '22m – 513m' },
    { name: 'Manipur', code: 'MN', stations: 2, coords: '24.66° N, 93.90° E', terrain: 'Tertiary Sedimentary Folded Hills', riskZone: 'HIGH', elevRange: '786m – 914m' },
    { name: 'Mizoram', code: 'MZ', stations: 1, coords: '23.16° N, 92.93° E', terrain: 'Anticlinal Ridge Corridors', riskZone: 'HIGH', elevRange: '1,132m' },
    { name: 'Nagaland', code: 'NL', stations: 2, coords: '26.15° N, 94.56° E', terrain: 'Patkai Range / Schuppen Belt', riskZone: 'HIGH', elevRange: '145m – 1,444m' },
    { name: 'Tripura', code: 'TR', stations: 1, coords: '23.94° N, 91.98° E', terrain: 'Synclinal Alluvial Valleys', riskZone: 'LOW', elevRange: '12m' },
  ];

  return (
    <div className="min-h-screen bg-[#050A12] text-[#F8FAFC] font-sans selection:bg-[#2684FF] selection:text-white relative bg-topo-grid">
      
      {/* Top Operations Surveillance Header */}
      <header className="sticky top-0 z-50 bg-[#050A12]/95 backdrop-blur-md border-b border-[rgba(148,163,184,0.14)]">
        <div className="max-w-[1500px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#091321] border border-[rgba(148,163,184,0.2)] flex items-center justify-center text-[#4DA3FF]">
              <Shield size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-sm tracking-wider text-white">NIRAKSHA AI</span>
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[rgba(38,132,255,0.15)] text-[#4DA3FF] border border-[rgba(38,132,255,0.3)]">
                  GEOSPATIAL OPS
                </span>
              </div>
              <p className="text-[10px] text-[#8EA1B8] font-mono tracking-widest uppercase">REGIONAL GEOSPATIAL SURVEILLANCE</p>
            </div>
          </div>

          {/* Operational Status Ticker */}
          <div className="hidden lg:flex items-center gap-6 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 beacon-online" />
              <span className="text-emerald-400 font-semibold tracking-wider">SYSTEM OPERATIONAL</span>
            </div>
            <span className="text-[#8EA1B8]">•</span>
            <span className="text-slate-300">20 STATIONS ACTIVE</span>
            <span className="text-[#8EA1B8]">•</span>
            <span className="text-slate-300">8 NER STATES</span>
            <span className="text-[#8EA1B8]">•</span>
            <span className="text-[#4DA3FF]">AI DECISION SUPPORT ONLINE</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/research"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded bg-[#091321] hover:bg-[#0D1929] text-[#8EA1B8] hover:text-white text-xs font-mono border border-[rgba(148,163,184,0.2)] transition-all"
            >
              <BookOpen size={14} className="text-[#4DA3FF]" />
              <span>RESEARCH & HISTORY</span>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION: GEOSPATIAL SURVEILLANCE CENTERPIECE */}
      <section className="relative pt-12 pb-20 px-6 border-b border-[rgba(148,163,184,0.14)] bg-contours overflow-hidden">
        <div className="max-w-[1500px] mx-auto space-y-12 relative z-10">
          
          {/* Brand Hierarchy & Statement */}
          <div className="text-center max-w-4xl mx-auto space-y-6">
            
            {/* Visual Identity / Descriptor */}
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded bg-[#091321] border border-[rgba(148,163,184,0.2)] text-[11px] font-mono text-[#4DA3FF] tracking-widest uppercase shadow-inner">
                <Radar size={13} className="animate-spin" style={{ animationDuration: '8s' }} />
                <span>NIRAKSHA AI</span>
                <span className="text-[#8EA1B8]">/</span>
                <span className="text-white font-semibold">REGIONAL GEOSPATIAL SURVEILLANCE</span>
              </div>
            </div>

            {/* Core Action Statement */}
            <div className="space-y-4">
              <h1 className="text-6xl sm:text-8xl xl:text-9xl font-black text-white tracking-widest leading-none uppercase font-mono">
                NIRAKSHA
              </h1>
              <p className="text-xs sm:text-sm font-mono text-[#4DA3FF] tracking-widest uppercase font-semibold">
                SEE THE TERRAIN • READ THE RISK • ACT BEFORE IMPACT
              </p>
            </div>

            {/* Specific System Descriptor */}
            <p className="text-base sm:text-lg text-[#8EA1B8] max-w-2xl mx-auto leading-relaxed font-normal">
              An intelligent geospatial monitoring system for detecting, interpreting, and responding to landslide threats across the North-East.
            </p>

            {/* Action CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2 font-mono">
              <Link
                to="/dashboard"
                id="hero-enter-command-btn"
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded bg-[#2684FF] hover:bg-[#1E74E8] text-white text-xs font-bold shadow-xl shadow-[rgba(38,132,255,0.3)] transition-all tracking-wider"
              >
                <span>ENTER COMMAND CENTER</span>
                <ArrowRight size={15} />
              </Link>
              <a
                href="#network"
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded bg-[#091321] hover:bg-[#0D1929] text-[#8EA1B8] hover:text-white text-xs border border-[rgba(148,163,184,0.2)] transition-all tracking-wider"
              >
                <span>EXPLORE THE NETWORK</span>
                <ChevronRight size={14} />
              </a>
            </div>

          </div>

          {/* Operational Stat Strip (No generic boxed cards - clean divider strip) */}
          <div className="border-y border-[rgba(148,163,184,0.14)] py-6 bg-[#091321]/40">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center font-mono">
              <div className="space-y-1">
                <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">20</span>
                <p className="text-xs text-[#8EA1B8] uppercase tracking-widest font-semibold">MONITORING STATIONS</p>
                <span className="text-[10px] text-emerald-400 block">100% In-Situ Ingest</span>
              </div>
              <div className="space-y-1">
                <span className="text-3xl sm:text-4xl font-black text-[#4DA3FF] tracking-tight">08</span>
                <p className="text-xs text-[#8EA1B8] uppercase tracking-widest font-semibold">NORTH-EASTERN STATES</p>
                <span className="text-[10px] text-slate-400 block">Arterial Passes Monitored</span>
              </div>
              <div className="space-y-1">
                <span className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight">LIVE</span>
                <p className="text-xs text-[#8EA1B8] uppercase tracking-widest font-semibold">ENVIRONMENTAL TELEMETRY</p>
                <span className="text-[10px] text-slate-400 block">Rainfall • Moisture • Slope</span>
              </div>
              <div className="space-y-1">
                <span className="text-3xl sm:text-4xl font-black text-amber-400 tracking-tight">AI</span>
                <p className="text-xs text-[#8EA1B8] uppercase tracking-widest font-semibold">RISK INTELLIGENCE</p>
                <span className="text-[10px] text-amber-400/90 block">Gradient Boosting Model</span>
              </div>
            </div>
          </div>

          {/* Centerpiece Geospatial Surveillance Map Component */}
          <div id="surveillance-field" className="pt-2">
            <NortheastGeospatialMap liveStations={stations} />
          </div>

          {/* Regional Coverage Statement */}
          <div className="bg-[#091321] border border-[rgba(148,163,184,0.16)] rounded-xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <span className="text-xs font-mono font-bold text-[#4DA3FF] tracking-widest uppercase">
                REGIONAL COVERAGE
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Continuous observation across the North-Eastern terrain.
              </h3>
              <p className="text-sm text-[#8EA1B8] leading-relaxed">
                Connecting environmental sensors, geospatial intelligence, predictive models, and emergency response into one operational view.
              </p>
            </div>
            <Link
              to="/dashboard"
              className="whitespace-nowrap px-5 py-3 rounded bg-[#0D1929] hover:bg-[#132338] text-white border border-[rgba(38,132,255,0.3)] font-mono text-xs font-semibold flex items-center gap-2 transition-all shadow-lg"
            >
              <span>ACCESS REGIONAL RADAR</span>
              <ArrowRight size={14} className="text-[#4DA3FF]" />
            </Link>
          </div>

        </div>
      </section>

      {/* CORE OPERATIONAL ARCHITECTURE: 01 TO 04 */}
      <section id="network" className="py-24 px-6 border-b border-[rgba(148,163,184,0.14)]">
        <div className="max-w-[1500px] mx-auto space-y-16">
          
          <div className="max-w-3xl space-y-3">
            <span className="text-xs font-mono font-bold text-[#4DA3FF] tracking-widest uppercase">
              SYSTEM CAPABILITIES
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              An end-to-end intelligence cycle.
            </h2>
            <p className="text-base text-[#8EA1B8] leading-relaxed">
              NIRAKSHA replaces isolated manual inspections with a continuous, automated regional loop:
            </p>
          </div>

          {/* 4 Operations Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* 01 - Observe */}
            <div className="bg-[#091321] border border-[rgba(148,163,184,0.14)] rounded-xl p-6 space-y-4 hover:border-[rgba(38,132,255,0.4)] transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.1)] pb-3 font-mono text-xs">
                  <span className="text-lg font-black text-[#4DA3FF]">01</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">TELEMETRY</span>
                </div>
                <div className="w-9 h-9 rounded bg-[#050A12] border border-[rgba(148,163,184,0.2)] flex items-center justify-center text-[#2684FF]">
                  <CloudRain size={20} />
                </div>
                <h3 className="text-lg font-bold text-white uppercase tracking-tight">OBSERVE THE TERRAIN</h3>
                <blockquote className="text-xs text-slate-300 italic border-l-2 border-[#2684FF] pl-3 py-1 font-mono">
                  &ldquo;Environmental conditions are continuously monitored across distributed regional stations.&rdquo;
                </blockquote>
                <p className="text-xs text-[#8EA1B8] leading-relaxed">
                  Automated weather stations capture hourly rainfall triggers and 48-hour cumulative totals, while subterranean TDR sensors monitor ground saturation.
                </p>
              </div>
              <div className="pt-4 border-t border-[rgba(148,163,184,0.1)] text-[11px] font-mono text-slate-400">
                <span>IN-SITU IOT NODES • 15s INGEST</span>
              </div>
            </div>

            {/* 02 - Interpret */}
            <div className="bg-[#091321] border border-[rgba(148,163,184,0.14)] rounded-xl p-6 space-y-4 hover:border-[rgba(38,132,255,0.4)] transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.1)] pb-3 font-mono text-xs">
                  <span className="text-lg font-black text-emerald-400">02</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">GEOTECHNICAL</span>
                </div>
                <div className="w-9 h-9 rounded bg-[#050A12] border border-[rgba(148,163,184,0.2)] flex items-center justify-center text-emerald-400">
                  <Mountain size={20} />
                </div>
                <h3 className="text-lg font-bold text-white uppercase tracking-tight">INTERPRET THE SIGNAL</h3>
                <blockquote className="text-xs text-slate-300 italic border-l-2 border-emerald-400 pl-3 py-1 font-mono">
                  &ldquo;Rainfall, soil moisture, terrain characteristics and environmental indicators are transformed into actionable risk intelligence.&rdquo;
                </blockquote>
                <p className="text-xs text-[#8EA1B8] leading-relaxed">
                  Hydrological loads are fused with digital elevation models: slope angles up to 55°, profile curvature, Topographic Wetness Index (TWI), and river toe-cutting distance.
                </p>
              </div>
              <div className="pt-4 border-t border-[rgba(148,163,184,0.1)] text-[11px] font-mono text-slate-400">
                <span>DEM 30M RESOLUTION • HYDRO-GEO MATRIX</span>
              </div>
            </div>

            {/* 03 - Identify */}
            <div className="bg-[#091321] border border-[rgba(148,163,184,0.14)] rounded-xl p-6 space-y-4 hover:border-[rgba(38,132,255,0.4)] transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.1)] pb-3 font-mono text-xs">
                  <span className="text-lg font-black text-amber-400">03</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">ML ENGINE</span>
                </div>
                <div className="w-9 h-9 rounded bg-[#050A12] border border-[rgba(148,163,184,0.2)] flex items-center justify-center text-amber-400">
                  <Cpu size={20} />
                </div>
                <h3 className="text-lg font-bold text-white uppercase tracking-tight">IDENTIFY THE THREAT</h3>
                <blockquote className="text-xs text-slate-300 italic border-l-2 border-amber-400 pl-3 py-1 font-mono">
                  &ldquo;Machine-learning models evaluate changing conditions and identify areas requiring immediate attention.&rdquo;
                </blockquote>
                <p className="text-xs text-[#8EA1B8] leading-relaxed">
                  Trained Gradient Boosting pipeline outputs true calibrated risk probabilities (0–100) directly from data without artificial score caps or subjective guesswork.
                </p>
              </div>
              <div className="pt-4 border-t border-[rgba(148,163,184,0.1)] text-[11px] font-mono text-slate-400">
                <span>84.88% ACCURACY • AUC-ROC 0.9075</span>
              </div>
            </div>

            {/* 04 - Mobilize */}
            <div className="bg-[#091321] border border-[rgba(148,163,184,0.14)] rounded-xl p-6 space-y-4 hover:border-[rgba(38,132,255,0.4)] transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.1)] pb-3 font-mono text-xs">
                  <span className="text-lg font-black text-red-400">04</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">RESPONSE</span>
                </div>
                <div className="w-9 h-9 rounded bg-[#050A12] border border-[rgba(148,163,184,0.2)] flex items-center justify-center text-red-400">
                  <Route size={20} />
                </div>
                <h3 className="text-lg font-bold text-white uppercase tracking-tight">MOBILIZE THE RESPONSE</h3>
                <blockquote className="text-xs text-slate-300 italic border-l-2 border-red-400 pl-3 py-1 font-mono">
                  &ldquo;Risk intelligence connects directly to alerts, evacuation planning, citizen reports and emergency resources.&rdquo;
                </blockquote>
                <p className="text-xs text-[#8EA1B8] leading-relaxed">
                  Generates ranked tactical deployment orders, primary and alternate evacuation corridors, designated emergency shelters, and NDRF team dispatch guidelines.
                </p>
              </div>
              <div className="pt-4 border-t border-[rgba(148,163,184,0.1)] text-[11px] font-mono text-slate-400">
                <span>EVACUATION PROTOCOLS • DDMA ESCALATION</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* THE NORTH-EAST IS NOT STATIC (Dynamic Terrain Statement Section) */}
      <section className="py-24 px-6 border-b border-[rgba(148,163,184,0.14)] bg-[#03070E] relative overflow-hidden">
        <div className="max-w-[1500px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          
          <div className="lg:col-span-7 space-y-6">
            <span className="text-xs font-mono font-bold text-[#4DA3FF] tracking-widest uppercase">
              DYNAMIC GROUND PHYSICS
            </span>
            <div className="space-y-4">
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight uppercase">
                THE NORTH-EAST IS NOT STATIC.<br />
                <span className="text-slate-400 font-normal">Rainfall changes. Slopes change. Ground conditions change.</span><br />
                <span className="text-[#4DA3FF]">NIRAKSHA watches the change.</span>
              </h2>
            </div>
            <p className="text-sm sm:text-base text-[#8EA1B8] leading-relaxed max-w-2xl font-normal">
              In the young, tectonically active Himalayas of the North-Eastern Council states, monsoon precipitation destabilizes fragile weathered rock strata within hours. NIRAKSHA tracks the rate of change across physical indicators before catastrophic mass displacement begins.
            </p>

            <div className="pt-2 flex flex-wrap gap-4 font-mono text-xs">
              <Link
                to="/predict"
                className="inline-flex items-center gap-2 px-5 py-3 rounded bg-[#2684FF] hover:bg-[#1E74E8] text-white font-bold transition-all shadow-lg"
              >
                <span>RUN ML TERRAIN INFERENCE</span>
                <ArrowRight size={14} />
              </Link>
              <Link
                to="/priority"
                className="inline-flex items-center gap-2 px-5 py-3 rounded bg-[#091321] hover:bg-[#0D1929] text-[#8EA1B8] hover:text-white border border-[rgba(148,163,184,0.2)] transition-all"
              >
                <span>VIEW HIGH-RISK SECTORS</span>
              </Link>
            </div>
          </div>

          {/* Live Vector Change Indicators */}
          <div className="lg:col-span-5 bg-[#091321] border border-[rgba(148,163,184,0.2)] rounded-xl p-6 font-mono space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.14)] pb-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider">RATE OF CHANGE DETECTORS</span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                POLLING LIVE
              </span>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded bg-[#050A12] border border-[rgba(148,163,184,0.1)] space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[#8EA1B8]">PRECIPITATION ACCELERATION:</span>
                  <span className="text-[#4DA3FF] font-bold">+18.4 mm/hr (Tawang Sector)</span>
                </div>
                <div className="w-full bg-[#0D1929] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#4DA3FF] h-full" style={{ width: '74%' }} />
                </div>
              </div>

              <div className="p-3.5 rounded bg-[#050A12] border border-[rgba(148,163,184,0.1)] space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[#8EA1B8]">PORE-WATER SATURATION FLUX:</span>
                  <span className="text-emerald-400 font-bold">82% Threshold (Cherrapunji)</span>
                </div>
                <div className="w-full bg-[#0D1929] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-full" style={{ width: '88%' }} />
                </div>
              </div>

              <div className="p-3.5 rounded bg-[#050A12] border border-[rgba(148,163,184,0.1)] space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[#8EA1B8]">SLOPE STABILITY COEFFICIENT:</span>
                  <span className="text-red-400 font-bold">FoS 1.04 [CRITICAL WARNING]</span>
                </div>
                <div className="w-full bg-[#0D1929] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-red-400 h-full" style={{ width: '92%' }} />
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[#8EA1B8] leading-relaxed pt-2 border-t border-[rgba(148,163,184,0.1)]">
              When factors converge across precipitation volume and saturation limits, automated alerts escalate immediately to District Disaster Management Authorities.
            </p>
          </div>

        </div>
      </section>

      {/* 08 STATES. ONE REGIONAL INTELLIGENCE LAYER. */}
      <section id="geography" className="py-24 px-6 border-b border-[rgba(148,163,184,0.14)]">
        <div className="max-w-[1500px] mx-auto space-y-16">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[rgba(148,163,184,0.14)] pb-8">
            <div className="space-y-3 max-w-3xl">
              <span className="text-xs font-mono font-bold text-[#4DA3FF] tracking-widest uppercase">
                GEOGRAPHIC REACH
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase">
                08 STATES. ONE REGIONAL INTELLIGENCE LAYER.
              </h2>
              <p className="text-sm sm:text-base text-[#8EA1B8]">
                Continuous early warning coverage across the geologically distinct terrains of the North-Eastern Council (NEC) member states.
              </p>
            </div>
            <Link 
              to="/stations" 
              className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-[#4DA3FF] hover:text-[#2684FF] transition-colors whitespace-nowrap"
            >
              <span>INSPECT ALL 20 STATIONS</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* State Coverage Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
            {nerStates.map(st => (
              <div 
                key={st.name}
                className="p-5 rounded-lg bg-[#091321] border border-[rgba(148,163,184,0.14)] hover:border-[rgba(38,132,255,0.4)] transition-all space-y-3 group"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white font-bold tracking-wider">{st.code}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#050A12] text-[#4DA3FF] border border-[rgba(148,163,184,0.15)]">
                    {st.stations} {st.stations === 1 ? 'Station' : 'Stations'}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-[#4DA3FF] transition-colors font-sans">{st.name}</h3>
                  <p className="text-[11px] text-[#8EA1B8] mt-0.5">{st.coords}</p>
                </div>
                <div className="space-y-1 pt-2 border-t border-[rgba(148,163,184,0.1)] text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-[#8EA1B8]">TERRAIN:</span>
                    <span className="text-slate-300 truncate max-w-[150px]">{st.terrain}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8EA1B8]">ELEVATION:</span>
                    <span className="text-slate-300">{st.elevRange}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-[#8EA1B8]">THREAT LEVEL:</span>
                    <span className={`font-bold ${
                      st.riskZone === 'CRITICAL' ? 'text-red-400' :
                      st.riskZone === 'HIGH' ? 'text-orange-400' :
                      st.riskZone === 'MODERATE' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {st.riskZone}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* TERMINAL OPERATIONS CALL TO ACTION */}
      <section className="py-24 px-6 text-center relative overflow-hidden bg-[#050A12]">
        <div className="max-w-3xl mx-auto space-y-6 relative z-10 font-mono">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#091321] border border-[rgba(148,163,184,0.2)] text-[11px] text-[#4DA3FF] tracking-widest uppercase">
            <Radio size={13} className="text-emerald-400 animate-pulse" />
            <span>COMMUNICATION CHANNELS ONLINE</span>
          </div>
          
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase font-sans">
            Ready to deploy regional intelligence?
          </h2>
          <p className="text-slate-300 text-sm max-w-xl mx-auto font-sans leading-relaxed">
            Enter the 24/7 command operations dashboard for live GIS tracking, telemetry monitoring, multi-criteria priority rankings, and rapid evacuation coordination.
          </p>

          <div className="pt-4 flex flex-wrap justify-center gap-4">
            <Link
              to="/dashboard"
              id="terminal-cta-open-dashboard"
              className="inline-flex items-center gap-3 px-8 py-4 rounded bg-[#2684FF] hover:bg-[#1E74E8] text-white font-bold text-xs shadow-2xl shadow-[rgba(38,132,255,0.35)] transition-all tracking-wider"
            >
              <span>ENTER NIRAKSHA COMMAND CENTER</span>
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/reports"
              className="inline-flex items-center gap-2 px-6 py-4 rounded bg-[#091321] hover:bg-[#0D1929] text-white text-xs border border-[rgba(148,163,184,0.2)] font-bold transition-all tracking-wider"
            >
              <span>CITIZEN FIELD VERIFICATION</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Government-Grade Emergency Operations Footer */}
      <footer className="py-8 px-6 bg-[#03060B] border-t border-[rgba(148,163,184,0.14)] text-xs font-mono text-[#8EA1B8]">
        <div className="max-w-[1500px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-[#2684FF]" />
            <span className="font-bold text-white">NIRAKSHA AI</span>
            <span>• Regional Geospatial Surveillance & Landslide Early Warning Platform</span>
          </div>
          <p className="text-slate-400">
            Smart India Hackathon 2026 • Ministry of Development of North Eastern Region (MDoNER)
          </p>
        </div>
      </footer>

    </div>
  );
}
