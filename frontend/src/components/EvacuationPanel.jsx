import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, Marker } from 'react-leaflet';
import L from 'leaflet';
import { ShieldAlert, Route, Users, Clock, Truck, CheckCircle2, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { useLang } from '../contexts/LangContext';

export default function EvacuationPanel({ stationId, riskLevel, lat, lon }) {
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (riskLevel !== 'CRITICAL' && riskLevel !== 'HIGH') {
      return;
    }
    const fetchEvac = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/stations/${stationId}/evacuation`);
        setData(res.data);
        setError(null);
      } catch (e) {
        setError('Failed to fetch tactical evacuation routing.');
      } finally {
        setLoading(false);
      }
    };
    fetchEvac();
  }, [stationId, riskLevel]);

  if (riskLevel !== 'CRITICAL' && riskLevel !== 'HIGH') return null;

  if (loading) return (
    <div className="bg-[#0B1728] border border-[#1E293B] rounded-xl p-6 text-center text-slate-400 text-xs">
      Computing optimal mountain evacuation corridors and camp allocation...
    </div>
  );

  if (error) return (
    <div className="bg-[#0B1728] border border-red-500/30 rounded-xl p-4 text-xs text-red-400">
      {error}
    </div>
  );

  if (!data) return null;

  const validLat = lat || 25.5;
  const validLon = lon || 92.5;
  const stationPos = [validLat, validLon];
  const campPos = [validLat + 0.08, validLon + 0.08];
  const primaryPath = [stationPos, [validLat + 0.04, validLon + 0.03], campPos];
  const alternatePath = [stationPos, [validLat + 0.02, validLon + 0.07], campPos];

  const campIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconSize: [22, 36],
    iconAnchor: [11, 36]
  });

  return (
    <div className="bg-[#0B1728] border border-red-500/40 rounded-xl overflow-hidden shadow-2xl space-y-4">
      <div className="bg-red-500/10 px-5 py-3 border-b border-red-500/25 flex items-center justify-between">
        <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider">
          <ShieldAlert size={16} />
          <span>EVACUATION COMMAND & ROUTING PROTOCOL</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-bold">
          CODE RED
        </span>
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Route Details */}
        <div className="lg:col-span-6 space-y-3">
          {/* Primary Route */}
          <div className="p-3.5 bg-[#07111F] border border-[#1E293B] rounded-lg space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Route size={14} className="text-emerald-400" /> Primary Arterial Route
              </span>
              <span className="text-[10px] px-2 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-semibold">
                Status: {data.primary_route?.status || 'Clear'}
              </span>
            </div>
            <p className="text-xs text-slate-300">{data.primary_route?.description}</p>
          </div>

          {/* Alternate Route */}
          <div className="p-3.5 bg-[#07111F] border border-[#1E293B] rounded-lg space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Route size={14} className="text-amber-400" /> Secondary / Bypass Corridor
              </span>
              <span className="text-[10px] px-2 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25 font-semibold">
                Status: {data.alternate_route?.status || 'Monitored'}
              </span>
            </div>
            <p className="text-xs text-slate-300">{data.alternate_route?.description}</p>
          </div>

          {/* Relief Camp */}
          <div className="p-3.5 bg-[#07111F] border border-[#1E293B] rounded-lg space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">Designated Relief Shelter</span>
              <span className="text-xs font-mono text-blue-400">
                {data.relief_camp?.distance_km || data.nearest_camp?.distance_km || 14} km transit
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-200">{data.relief_camp?.name || data.nearest_camp?.name}</p>
            <p className="text-[11px] text-slate-400">
              Capacity: <strong className="text-white">{data.relief_camp?.capacity || data.nearest_camp?.capacity || 800}</strong> persons
            </p>
          </div>

          {/* Deployment KPIs */}
          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="p-3 bg-[#07111F] border border-[#1E293B] rounded-lg text-center">
              <Users size={15} className="mx-auto text-blue-400 mb-1" />
              <p className="text-[10px] text-slate-400 uppercase">Target Pop.</p>
              <p className="text-base font-bold text-white font-mono">{data.population_to_evacuate}</p>
            </div>
            <div className="p-3 bg-[#07111F] border border-[#1E293B] rounded-lg text-center">
              <Clock size={15} className="mx-auto text-orange-400 mb-1" />
              <p className="text-[10px] text-slate-400 uppercase">Est. Evac Time</p>
              <p className="text-base font-bold text-white font-mono">{data.full_evacuation_time_hours || data.estimated_total_hours}h</p>
            </div>
            <div className="p-3 bg-[#07111F] border border-[#1E293B] rounded-lg text-center">
              <Truck size={15} className="mx-auto text-emerald-400 mb-1" />
              <p className="text-[10px] text-slate-400 uppercase">Buses / Fleet</p>
              <p className="text-base font-bold text-white font-mono">{data.vehicles_needed}</p>
            </div>
          </div>
        </div>

        {/* Tactical Route Map */}
        <div className="lg:col-span-6 h-[320px] rounded-lg overflow-hidden border border-[#1E293B] relative shadow-inner">
          <MapContainer center={stationPos} zoom={10} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="&copy; ESRI World Imagery"
            />
            
            <Polyline positions={primaryPath} pathOptions={{ color: '#22c55e', weight: 4, dashArray: '6, 8' }} />
            <Polyline positions={alternatePath} pathOptions={{ color: '#f59e0b', weight: 3, dashArray: '4, 8' }} />

            <CircleMarker center={stationPos} radius={9} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.9 }}>
              <Popup>Threat Origin: {data.station_name}</Popup>
            </CircleMarker>

            <Marker position={campPos} icon={campIcon}>
              <Popup>Relief Shelter: {data.relief_camp?.name || data.nearest_camp?.name}</Popup>
            </Marker>
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
