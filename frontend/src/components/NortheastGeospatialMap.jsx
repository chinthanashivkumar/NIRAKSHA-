import { useState, useMemo } from 'react';
import { Radio, AlertTriangle, CloudRain, Droplets, Mountain, Crosshair, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

// Base station geographic dataset with exact NER coordinates
const BASE_STATIONS = [
  { id: 1, name: "Guwahati", code: "ST-001", state: "Assam", lat: 26.1445, lon: 91.7362, elev: 55, slope: 15, defaultRisk: 24.2, defaultLevel: "LOW", defaultRain: 18.4, defaultMoisture: 32 },
  { id: 2, name: "Shillong", code: "ST-002", state: "Meghalaya", lat: 25.5788, lon: 91.8933, elev: 1525, slope: 38, defaultRisk: 84.9, defaultLevel: "CRITICAL", defaultRain: 123.4, defaultMoisture: 68 },
  { id: 3, name: "Imphal", code: "ST-003", state: "Manipur", lat: 24.8170, lon: 93.9368, elev: 786, slope: 12, defaultRisk: 42.1, defaultLevel: "MODERATE", defaultRain: 45.2, defaultMoisture: 48 },
  { id: 4, name: "Aizawl", code: "ST-004", state: "Mizoram", lat: 23.7307, lon: 92.7173, elev: 1132, slope: 42, defaultRisk: 52.8, defaultLevel: "MODERATE", defaultRain: 62.0, defaultMoisture: 54 },
  { id: 5, name: "Kohima", code: "ST-005", state: "Nagaland", lat: 25.6751, lon: 94.1086, elev: 1444, slope: 45, defaultRisk: 68.4, defaultLevel: "HIGH", defaultRain: 89.6, defaultMoisture: 61 },
  { id: 6, name: "Agartala", code: "ST-006", state: "Tripura", lat: 23.8315, lon: 91.2868, elev: 12, slope: 8, defaultRisk: 19.5, defaultLevel: "LOW", defaultRain: 12.0, defaultMoisture: 28 },
  { id: 7, name: "Itanagar", code: "ST-007", state: "Arunachal Pradesh", lat: 27.0844, lon: 93.6053, elev: 440, slope: 32, defaultRisk: 48.3, defaultLevel: "MODERATE", defaultRain: 58.1, defaultMoisture: 50 },
  { id: 8, name: "Gangtok", code: "ST-008", state: "Sikkim", lat: 27.3314, lon: 88.6138, elev: 1650, slope: 48, defaultRisk: 72.5, defaultLevel: "HIGH", defaultRain: 94.0, defaultMoisture: 65 },
  { id: 9, name: "Cherrapunji", code: "ST-009", state: "Meghalaya", lat: 25.2800, lon: 91.7200, elev: 1484, slope: 35, defaultRisk: 88.2, defaultLevel: "CRITICAL", defaultRain: 245.0, defaultMoisture: 82 },
  { id: 10, name: "Tawang", code: "ST-010", state: "Arunachal Pradesh", lat: 27.5861, lon: 91.8594, elev: 3048, slope: 55, defaultRisk: 94.7, defaultLevel: "CRITICAL", defaultRain: 268.9, defaultMoisture: 78 },
  { id: 11, name: "Ziro", code: "ST-011", state: "Arunachal Pradesh", lat: 27.5462, lon: 93.8310, elev: 1500, slope: 28, defaultRisk: 61.2, defaultLevel: "HIGH", defaultRain: 76.5, defaultMoisture: 58 },
  { id: 12, name: "Mangan", code: "ST-012", state: "Sikkim", lat: 27.5100, lon: 88.5200, elev: 956, slope: 50, defaultRisk: 83.3, defaultLevel: "CRITICAL", defaultRain: 128.0, defaultMoisture: 74 },
  { id: 13, name: "Namchi", code: "ST-013", state: "Sikkim", lat: 27.1667, lon: 88.3667, elev: 1315, slope: 40, defaultRisk: 51.0, defaultLevel: "MODERATE", defaultRain: 54.0, defaultMoisture: 49 },
  { id: 14, name: "Pasighat", code: "ST-014", state: "Arunachal Pradesh", lat: 28.0664, lon: 95.3270, elev: 153, slope: 22, defaultRisk: 46.5, defaultLevel: "MODERATE", defaultRain: 60.2, defaultMoisture: 52 },
  { id: 15, name: "Dima Hasao", code: "ST-015", state: "Assam", lat: 25.1000, lon: 93.0167, elev: 513, slope: 36, defaultRisk: 78.4, defaultLevel: "CRITICAL", defaultRain: 112.5, defaultMoisture: 71 },
  { id: 16, name: "Churachandpur", code: "ST-016", state: "Manipur", lat: 24.3333, lon: 93.6833, elev: 914, slope: 30, defaultRisk: 58.7, defaultLevel: "HIGH", defaultRain: 71.0, defaultMoisture: 56 },
  { id: 17, name: "Tura", code: "ST-017", state: "Meghalaya", lat: 25.5198, lon: 90.2201, elev: 349, slope: 25, defaultRisk: 38.0, defaultLevel: "MODERATE", defaultRain: 36.4, defaultMoisture: 44 },
  { id: 18, name: "Dimapur", code: "ST-018", state: "Nagaland", lat: 25.9091, lon: 93.7226, elev: 145, slope: 10, defaultRisk: 22.0, defaultLevel: "LOW", defaultRain: 15.6, defaultMoisture: 35 },
  { id: 19, name: "Silchar", code: "ST-019", state: "Assam", lat: 24.8333, lon: 92.7789, elev: 22, slope: 5, defaultRisk: 18.0, defaultLevel: "LOW", defaultRain: 14.2, defaultMoisture: 30 },
  { id: 20, name: "Jorhat", code: "ST-020", state: "Assam", lat: 26.7509, lon: 94.2037, elev: 116, slope: 8, defaultRisk: 26.5, defaultLevel: "LOW", defaultRain: 22.1, defaultMoisture: 38 },
];

export default function NortheastGeospatialMap({ liveStations = [] }) {
  // Merge live API stations data with geographic metadata
  const stations = useMemo(() => {
    return BASE_STATIONS.map(base => {
      const live = liveStations.find(s => s.name?.toLowerCase() === base.name.toLowerCase() || s.id === base.id);
      if (live) {
        return {
          ...base,
          risk: live.risk_score !== undefined ? live.risk_score : base.defaultRisk,
          level: live.risk_level || base.defaultLevel,
          rain: live.current_rainfall !== undefined ? live.current_rainfall : base.defaultRain,
          moisture: live.soil_moisture !== undefined ? (live.soil_moisture * 100) : base.defaultMoisture,
          status: live.status || 'ONLINE',
        };
      }
      return {
        ...base,
        risk: base.defaultRisk,
        level: base.defaultLevel,
        rain: base.defaultRain,
        moisture: base.defaultMoisture,
        status: 'ONLINE',
      };
    });
  }, [liveStations]);

  const [activeStation, setActiveStation] = useState(() => {
    return BASE_STATIONS.find(s => s.name === "Tawang") || BASE_STATIONS[0];
  });

  // Projection formula: Longitude 88.0° to 96.2° -> X (80 to 820)
  // Latitude 23.0° to 28.8° -> Y (570 to 80)
  const project = (lat, lon) => {
    const x = ((lon - 88.0) / (96.2 - 88.0)) * 740 + 80;
    const y = ((28.8 - lat) / (28.8 - 23.0)) * 490 + 75;
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  };

  const activeData = useMemo(() => {
    return stations.find(s => s.name === activeStation?.name) || stations[0];
  }, [stations, activeStation]);

  return (
    <div className="relative w-full bg-[#050A12] border border-[rgba(148,163,184,0.18)] rounded-xl overflow-hidden shadow-2xl">
      
      {/* Top Operations Header Bar */}
      <div className="h-12 bg-[#091321] border-b border-[rgba(148,163,184,0.14)] px-4 flex items-center justify-between font-mono text-xs">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 beacon-online" />
          <span className="text-white font-bold tracking-wider">NER GEOSPATIAL SURVEILLANCE FIELD</span>
          <span className="hidden sm:inline text-[#8EA1B8]">• WGS84 / DEM 30m</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-[#8EA1B8]">
          <span className="hidden md:flex items-center gap-1.5 text-emerald-400">
            <Radio size={12} className="animate-pulse" />
            20 TELEMETRY STATIONS ACTIVE
          </span>
          <span className="text-[#4DA3FF] font-semibold">GRID: 23°N–29°N / 88°E–96°E</span>
        </div>
      </div>

      {/* Main Map Canvas Area */}
      <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] min-h-[460px] bg-[#03070E] overflow-hidden select-none">
        
        {/* Background Graticule & Topographic Contours Texture */}
        <svg 
          viewBox="0 0 900 600" 
          className="w-full h-full object-cover"
          style={{ filter: 'drop-shadow(0 0 1px rgba(38,132,255,0.2))' }}
        >
          <defs>
            {/* Radar gradient sweep */}
            <radialGradient id="radarCenter" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#2684FF" stopOpacity="0.25" />
              <stop offset="70%" stopColor="#2684FF" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#2684FF" stopOpacity="0" />
            </radialGradient>

            {/* Critical glow filter */}
            <filter id="glow-crit" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-high" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            
            {/* Grid Pattern */}
            <pattern id="microGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(148,163,184,0.06)" strokeWidth="0.5" />
              <circle cx="0" cy="0" r="0.8" fill="rgba(77,163,255,0.25)" />
            </pattern>
          </defs>

          {/* Micro Grid Background */}
          <rect width="900" height="600" fill="url(#microGrid)" />

          {/* Geographic Coordinates Overlay */}
          <g stroke="rgba(148,163,184,0.12)" strokeWidth="0.5" strokeDasharray="3 4">
            {/* Latitude parallels */}
            <line x1="40" y1="130" x2="860" y2="130" />
            <line x1="40" y1="230" x2="860" y2="230" />
            <line x1="40" y1="330" x2="860" y2="330" />
            <line x1="40" y1="430" x2="860" y2="430" />
            <line x1="40" y1="530" x2="860" y2="530" />

            {/* Longitude meridians */}
            <line x1="120" y1="40" x2="120" y2="560" />
            <line x1="280" y1="40" x2="280" y2="560" />
            <line x1="440" y1="40" x2="440" y2="560" />
            <line x1="600" y1="40" x2="600" y2="560" />
            <line x1="760" y1="40" x2="760" y2="560" />
          </g>

          {/* Coordinate Labels */}
          <g fill="#8EA1B8" fontSize="9" fontFamily="monospace" opacity="0.6">
            <text x="50" y="126">28°00&apos; N (Himalayan Crest)</text>
            <text x="50" y="226">27°00&apos; N</text>
            <text x="50" y="326">26°00&apos; N (Brahmaputra Axis)</text>
            <text x="50" y="426">25°00&apos; N (Meghalaya Plateau)</text>
            <text x="50" y="526">24°00&apos; N (Lushai Hills)</text>

            <text x="125" y="55" textAnchor="middle">88°E (Sikkim)</text>
            <text x="285" y="55" textAnchor="middle">90°E</text>
            <text x="445" y="55" textAnchor="middle">92°E (Guwahati/Shillong)</text>
            <text x="605" y="55" textAnchor="middle">94°E (Naga Hills)</text>
            <text x="765" y="55" textAnchor="middle">96°E (Eastern Arcs)</text>
          </g>

          {/* Topographic Contour Lines representing Northeast Himalayan & Hill Ranges */}
          <g fill="none" stroke="rgba(38,132,255,0.18)" strokeWidth="1">
            {/* Outer Himalayas (Arunachal / Bhutan border arc) */}
            <path d="M 100 170 C 220 150, 360 130, 520 120 C 650 110, 780 130, 850 160" />
            <path d="M 105 185 C 230 165, 380 150, 530 140 C 660 130, 770 150, 830 175" strokeOpacity="0.4" />
            <path d="M 110 200 C 240 180, 400 170, 540 160 C 650 155, 750 170, 800 190" strokeOpacity="0.25" />

            {/* Sikkim High Crystalline Wedge */}
            <path d="M 90 230 C 110 180, 130 170, 140 220 C 130 240, 110 250, 90 230 Z" stroke="#4DA3FF" strokeOpacity="0.3" fill="rgba(38,132,255,0.03)" />
            <circle cx="120" cy="205" r="28" stroke="rgba(38,132,255,0.2)" strokeDasharray="2 3" />

            {/* Shillong Plateau / Escarpment Horst Block */}
            <path d="M 280 370 C 350 340, 450 340, 500 380 C 470 410, 360 415, 280 370 Z" stroke="#2684FF" strokeOpacity="0.35" fill="rgba(38,132,255,0.04)" />
            <path d="M 310 375 C 360 355, 430 355, 470 382 C 450 400, 370 405, 310 375 Z" stroke="rgba(239,68,68,0.25)" />

            {/* Barail Range & Naga Hills Fold Axis */}
            <path d="M 520 370 C 580 330, 640 300, 700 240" stroke="rgba(245,158,11,0.3)" strokeDasharray="4 2" />
            <path d="M 530 390 C 590 350, 650 320, 710 260" stroke="rgba(245,158,11,0.2)" />

            {/* Lushai / Mizo Folded Ridge System */}
            <path d="M 500 450 C 520 500, 510 540, 505 570" stroke="rgba(38,132,255,0.3)" />
            <path d="M 530 440 C 545 490, 535 530, 530 560" stroke="rgba(38,132,255,0.2)" />
            <path d="M 480 470 C 490 510, 485 540, 480 560" stroke="rgba(38,132,255,0.15)" />
          </g>

          {/* Major Drainage Corridor: Brahmaputra River Basin */}
          <path 
            d="M 820 150 C 760 170, 700 210, 640 240 C 560 270, 480 290, 420 310 C 350 320, 270 330, 210 350" 
            fill="none" 
            stroke="#4DA3FF" 
            strokeWidth="2" 
            strokeOpacity="0.45"
            strokeDasharray="8 3"
          />
          <text x="640" y="232" fill="#4DA3FF" fontSize="8" fontFamily="monospace" opacity="0.6">BRAHMAPUTRA VALLEY CORRIDOR</text>

          {/* Telemetry Interconnect Lines to Regional Operations Hubs */}
          <g stroke="rgba(77,163,255,0.2)" strokeWidth="0.8" strokeDasharray="3 3">
            {stations.map(st => {
              const p = project(st.lat, st.lon);
              const gwh = project(26.1445, 91.7362);
              const shl = project(25.5788, 91.8933);
              const target = st.lat > 26.0 ? gwh : shl;
              return (
                <line 
                  key={`link-${st.id}`} 
                  x1={p.x} 
                  y1={p.y} 
                  x2={target.x} 
                  y2={target.y} 
                  stroke={st.level === 'CRITICAL' ? 'rgba(239,68,68,0.35)' : 'rgba(38,132,255,0.18)'}
                />
              );
            })}
          </g>

          {/* Regional Hub Markers */}
          {(() => {
            const g = project(26.1445, 91.7362);
            return (
              <g transform={`translate(${g.x}, ${g.y})`}>
                <polygon points="0,-7 6,4 -6,4" fill="#2684FF" opacity="0.9" />
                <circle cx="0" cy="0" r="12" stroke="#2684FF" strokeWidth="0.8" fill="none" opacity="0.5" />
                <text x="10" y="3" fill="#4DA3FF" fontSize="8" fontFamily="monospace" fontWeight="bold">REGIONAL GATEWAY</text>
              </g>
            );
          })()}

          {/* Surveillance Scanning Radar Beam (centered near Brahmaputra axis) */}
          <g transform="translate(480, 290)">
            <circle cx="0" cy="0" r="220" fill="url(#radarCenter)" />
            <circle cx="0" cy="0" r="220" stroke="rgba(38,132,255,0.25)" strokeWidth="1" fill="none" strokeDasharray="4 6" />
            <circle cx="0" cy="0" r="140" stroke="rgba(38,132,255,0.18)" strokeWidth="0.8" fill="none" />
            <circle cx="0" cy="0" r="60" stroke="rgba(38,132,255,0.15)" strokeWidth="0.8" fill="none" />
            <line x1="0" y1="0" x2="220" y2="0" stroke="#4DA3FF" strokeWidth="1.5" opacity="0.7" className="radar-sweep" />
          </g>

          {/* Plotting All 20 Monitoring Stations */}
          {stations.map(st => {
            const { x, y } = project(st.lat, st.lon);
            const isSelected = activeStation?.name === st.name;
            const isCritical = st.level === 'CRITICAL';
            const isHigh = st.level === 'HIGH';
            
            const color = isCritical ? '#ef4444' : isHigh ? '#f97316' : st.level === 'MODERATE' ? '#f59e0b' : '#22c55e';

            return (
              <g 
                key={st.id} 
                transform={`translate(${x}, ${y})`}
                className="cursor-pointer transition-transform duration-200 hover:scale-125"
                onClick={() => setActiveStation(st)}
              >
                {/* Critical / High Risk Outer Pulse Wave */}
                {isCritical && (
                  <circle cx="0" cy="0" r="16" fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.8" className="animate-ping" />
                )}
                {isHigh && (
                  <circle cx="0" cy="0" r="12" fill="none" stroke="#f97316" strokeWidth="1" opacity="0.6" className="animate-ping" style={{ animationDuration: '3s' }} />
                )}

                {/* Selection Halo */}
                {isSelected && (
                  <circle cx="0" cy="0" r="14" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="3 2" />
                )}

                {/* Base Glow */}
                <circle 
                  cx="0" 
                  cy="0" 
                  r="7" 
                  fill={color} 
                  opacity={isCritical ? 0.4 : 0.25} 
                  filter={isCritical ? 'url(#glow-crit)' : isHigh ? 'url(#glow-high)' : undefined}
                />

                {/* Core Station Dot */}
                <circle 
                  cx="0" 
                  cy="0" 
                  r={isSelected ? 5 : 4} 
                  fill={color} 
                  stroke="#050A12" 
                  strokeWidth="1.5" 
                />

                {/* Micro Station Label */}
                <text 
                  x={x > 700 ? -8 : 8} 
                  y={y < 120 ? 12 : -6} 
                  textAnchor={x > 700 ? "end" : "start"}
                  fill={isSelected ? "#FFFFFF" : isCritical ? "#f87171" : "#E2E8F0"}
                  fontSize={isSelected ? "11" : "9"} 
                  fontFamily="monospace"
                  fontWeight={isSelected || isCritical ? "bold" : "normal"}
                  className="pointer-events-none drop-shadow-md"
                >
                  {st.name}
                  {isCritical && " [CRIT]"}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Live Telemetry HUD Card (Top Left) */}
        <div className="absolute top-4 left-4 bg-[#091321]/95 backdrop-blur-md border border-[rgba(148,163,184,0.25)] rounded-lg p-3.5 shadow-2xl max-w-[280px] font-mono text-xs pointer-events-auto">
          <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.15)] pb-2 mb-2.5">
            <div className="flex items-center gap-1.5">
              <Crosshair size={13} className="text-[#4DA3FF]" />
              <span className="font-bold text-white uppercase tracking-wider">{activeData.name}</span>
            </div>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
              activeData.level === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
              activeData.level === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' :
              activeData.level === 'MODERATE' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
              'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
            }`}>
              {activeData.level}
            </span>
          </div>

          <div className="space-y-1.5 text-[11px] text-[#8EA1B8]">
            <div className="flex justify-between">
              <span>LOCATION:</span>
              <span className="text-white font-semibold">{activeData.state}</span>
            </div>
            <div className="flex justify-between">
              <span>COORDINATES:</span>
              <span className="text-slate-300">{activeData.lat.toFixed(2)}°N, {activeData.lon.toFixed(2)}°E</span>
            </div>
            <div className="flex justify-between">
              <span>ELEV / SLOPE:</span>
              <span className="text-slate-300">{activeData.elev}m / {activeData.slope}°</span>
            </div>
            <div className="flex justify-between">
              <span>PRECIPITATION:</span>
              <span className="text-[#4DA3FF] font-bold">{Number(activeData.rain).toFixed(1)} mm</span>
            </div>
            <div className="flex justify-between">
              <span>SOIL MOISTURE:</span>
              <span className="text-emerald-400 font-bold">{Number(activeData.moisture).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-[rgba(148,163,184,0.12)]">
              <span>ML RISK INDEX:</span>
              <span className={`font-black text-sm ${
                activeData.level === 'CRITICAL' ? 'text-red-400' :
                activeData.level === 'HIGH' ? 'text-orange-400' :
                activeData.level === 'MODERATE' ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {Number(activeData.risk).toFixed(1)} / 100
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-[rgba(148,163,184,0.15)] flex justify-between items-center">
            <span className="text-[9px] text-[#8EA1B8]">STATUS: LIVE FEED</span>
            <Link 
              to={`/stations/${activeData.id}`}
              className="text-[10px] text-[#4DA3FF] hover:underline font-bold flex items-center gap-0.5"
            >
              <span>TELEMETRY</span>
              <ChevronRight size={12} />
            </Link>
          </div>
        </div>

        {/* Legend / Status Overlay (Bottom Right) */}
        <div className="absolute bottom-4 right-4 bg-[#091321]/90 backdrop-blur-md border border-[rgba(148,163,184,0.2)] rounded-lg px-3.5 py-2.5 font-mono text-[10px] text-[#8EA1B8] space-y-1.5 hidden sm:block">
          <div className="text-white font-bold tracking-wider text-[10px] uppercase border-b border-[rgba(148,163,184,0.15)] pb-1 mb-1">
            SURVEILLANCE CLASSIFICATION
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-red-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> CRITICAL (≥75)
            </span>
            <span className="flex items-center gap-1.5 text-orange-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-orange-500" /> HIGH (55–74)
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> MODERATE (30–54)
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> LOW (&lt;30)
            </span>
          </div>
        </div>

      </div>

      {/* Bottom Operational Footer */}
      <div className="bg-[#091321] border-t border-[rgba(148,163,184,0.14)] p-3 px-5 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono text-xs text-[#8EA1B8]">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold">INTERACTIVE GIS MATRIX:</span>
          <span>Click any mountain station to stream real-time physics telemetry & ML inference score.</span>
        </div>
        <Link 
          to="/dashboard"
          className="text-[#4DA3FF] hover:text-[#2684FF] font-bold flex items-center gap-1 tracking-wider uppercase text-[11px]"
        >
          <span>OPEN COMMAND CENTER RADAR</span>
          <ChevronRight size={13} />
        </Link>
      </div>

    </div>
  );
}
