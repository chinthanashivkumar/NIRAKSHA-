import { useState, useEffect } from 'react';
import { 
  CloudRain, Sun, Wind, Droplets, AlertTriangle, 
  Calendar, TrendingUp, RefreshCw, MapPin, ChevronRight, ShieldAlert 
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import api from '../services/api';
import PageTransition from '../components/PageTransition';
import RiskBadge from '../components/RiskBadge';
import SkeletonCard from '../components/SkeletonCard';
import { useLang } from '../contexts/LangContext';

const CustomChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 z-50">
        <p className="font-bold text-white text-sm border-b border-slate-800 pb-1">
          {label} — {data.formatted_date || data.date}
        </p>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400">Predicted Risk:</span>
          <span className="font-bold text-amber-400 text-sm">
            {data.risk_score_forecast}/100
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400">Rainfall:</span>
          <span className="font-bold text-cyan-300">
            {data.rainfall_mm} mm ({data.rain_probability}% chance)
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400">Temp Range:</span>
          <span className="text-slate-200">
            {data.min_temp}°C - {data.max_temp}°C
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export default function WeatherForecast() {
  const { t } = useLang();
  const [allStationsData, setAllStationsData] = useState([]);
  const [criticalWarnings, setCriticalWarnings] = useState([]);
  const [selectedStationId, setSelectedStationId] = useState(null);
  const [selectedStationForecast, setSelectedStationForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchForecastData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/weather/forecast/all');
      const stations = res.data?.stations || [];
      setAllStationsData(stations);
      setCriticalWarnings(res.data?.critical_warnings || []);

      if (stations.length > 0) {
        const currentId = selectedStationId || stations[0].station_id;
        setSelectedStationId(currentId);
        const match = stations.find((s) => s.station_id === currentId) || stations[0];
        setSelectedStationForecast(match);
      }
    } catch (err) {
      console.error('Error loading weather forecast:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecastData();
  }, []);

  const handleSelectStation = (id) => {
    const numId = Number(id);
    setSelectedStationId(numId);
    const match = allStationsData.find((s) => s.station_id === numId);
    if (match) setSelectedStationForecast(match);
  };

  const daysList = selectedStationForecast?.forecast || [];
  const highestRiskDay = daysList.length > 0
    ? [...daysList].sort((a, b) => b.risk_score_forecast - a.risk_score_forecast)[0]
    : null;

  return (
    <PageTransition className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <CloudRain size={22} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {t('7-Day Landslide Risk Forecast')}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                {t('AI-predicted landslide vulnerability based on Open-Meteo precipitation models + terrain conditioning')}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchForecastData}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold active:scale-95 hover:-translate-y-0.5 transition-all duration-200"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {t('Refresh Forecast')}
        </button>
      </div>

      {/* WEATHER ALERT BOX - Advance Warning */}
      {criticalWarnings.length > 0 && (
        <div className="p-4 rounded-xl border border-red-500/60 bg-red-950/40 critical-pulse shadow-xl flex items-start gap-3">
          <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5 animate-bounce" />
          <div className="space-y-1">
            <p className="font-bold text-red-300 text-sm tracking-wide">
              {t('⚠️ ADVANCE WARNING: CRITICAL LANDSLIDE RISK PREDICTED')}
            </p>
            <p className="text-xs text-red-200/90 leading-relaxed">
              {t('High precipitation front will escalate slope instability. Predicted critical zones:')}{' '}
              {criticalWarnings.map((cw, idx) => (
                <span key={idx} className="font-bold text-white underline decoration-red-400 mr-2">
                  {cw.station_name} ({cw.state}) on {cw.day}
                </span>
              ))}
              — <span className="text-amber-300 font-semibold">{t('Pre-position NDRF rescue teams at least 24h in advance.')}</span>
            </p>
          </div>
        </div>
      )}

      {/* Station Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-800 border border-slate-700 shadow-md">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <MapPin size={16} className="text-blue-400" />
          <span className="font-semibold text-white">{t('Select Monitoring Station')}:</span>
        </div>

        <select
          value={selectedStationId || ''}
          onChange={(e) => handleSelectStation(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-medium min-w-[280px]"
        >
          {allStationsData.map((st) => (
            <option key={st.station_id} value={st.station_id}>
              {st.station_name}, {st.state} — Peak: {st.peak_day} ({st.peak_risk_score}/100)
            </option>
          ))}
        </select>
      </div>

      {/* TOP SECTION — 7-Day Risk Calendar Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Calendar size={16} className="text-blue-400" />
            {selectedStationForecast?.station_name} {t('7-Day Trajectory')}
          </h2>
          <span className="text-xs text-slate-400">
            {t('Peak Day')}: <strong className="text-red-400">{selectedStationForecast?.peak_day}</strong>
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <SkeletonCard key={i} rows={2} height="h-36" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {daysList.map((day, idx) => {
              const isPeak = highestRiskDay && day.date === highestRiskDay.date;
              return (
                <div
                  key={idx}
                  className={`rounded-xl border p-3 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 shadow-lg relative ${
                    isPeak
                      ? 'border-red-500 bg-red-950/20 shadow-red-500/20 ring-1 ring-red-500/50'
                      : 'border-slate-700 bg-slate-800'
                  }`}
                >
                  {isPeak && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-black uppercase tracking-wider shadow">
                      ⚠️ {t('HIGHEST RISK')}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white text-xs">{day.day_name}</span>
                      <span className="text-[10px] text-slate-400">{day.formatted_date}</span>
                    </div>

                    <div className="flex items-center justify-center py-2 text-2xl">
                      {day.weather_icon || '🌧️'}
                    </div>

                    <div className="text-center text-xs text-slate-300 font-mono mb-2">
                      <span className="text-white font-bold">{day.max_temp}°</span> /{' '}
                      <span className="text-slate-400">{day.min_temp}°C</span>
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-400">
                      <div className="flex items-center justify-between">
                        <span>Rain:</span>
                        <span className="font-bold text-cyan-300">{day.rainfall_mm}mm</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Prob:</span>
                        <span className="text-slate-300">{day.rain_probability}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-700/80 mt-2 space-y-1.5 text-center">
                    <RiskBadge level={day.predicted_risk_level} size="sm" />
                    <div className="text-[11px] font-mono font-bold text-amber-400">
                      {day.risk_score_forecast}/100
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MIDDLE SECTION — Risk Forecast Chart */}
      <div className="rounded-xl border border-slate-700 bg-slate-800 p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/80 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-amber-400" />
              {t('Predictive Slope Vulnerability Curve (7-Day Projection)')}
            </h3>
            <p className="text-xs text-slate-400">
              {t('Real-time AI ML risk score escalation across upcoming meteorological conditions')}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-red-500" />
              <span className="text-slate-300">{t('Critical (75)')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-orange-500" />
              <span className="text-slate-300">{t('High (50)')}</span>
            </div>
          </div>
        </div>

        <div className="h-[260px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={daysList} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="day_name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} domain={[0, 100]} />
              <Tooltip content={<CustomChartTooltip />} />
              <ReferenceLine
                y={75}
                stroke="#ef4444"
                strokeDasharray="4 4"
                label={{ value: 'CRITICAL (75)', fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }}
              />
              <ReferenceLine
                y={50}
                stroke="#f97316"
                strokeDasharray="4 4"
                label={{ value: 'HIGH (50)', fill: '#f97316', fontSize: 10, position: 'insideTopRight' }}
              />
              <Line
                type="monotone"
                dataKey="risk_score_forecast"
                name="Risk Score"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 4, fill: '#60a5fa' }}
                activeDot={{ r: 6, fill: '#fbbf24' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* BOTTOM SECTION — All Stations Summary Table */}
      <div className="rounded-xl border border-slate-700 bg-slate-800 p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-blue-400" />
            <h3 className="font-bold text-white text-sm">
              {t('NER 20-Station 7-Day Risk Projection Summary')}
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {allStationsData.length} {t('Stations Monitored')}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 uppercase text-[10px] tracking-wider bg-slate-900/60">
                <th className="py-2.5 px-3 font-semibold">{t('Station')}</th>
                <th className="py-2.5 px-3 font-semibold">{t('State')}</th>
                <th className="py-2.5 px-3 font-semibold">{t('Today Risk')}</th>
                <th className="py-2.5 px-3 font-semibold">{t('Peak Risk Day')}</th>
                <th className="py-2.5 px-3 font-semibold">{t('Peak Score')}</th>
                <th className="py-2.5 px-3 font-semibold">{t('Recommended Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {allStationsData.map((st) => {
                const peakLevel = st.peak_risk_level;
                const rowBg =
                  peakLevel === 'CRITICAL'
                    ? 'bg-red-950/20 hover:bg-red-950/30'
                    : peakLevel === 'HIGH'
                    ? 'bg-orange-950/15 hover:bg-orange-950/25'
                    : peakLevel === 'MODERATE'
                    ? 'bg-amber-950/10 hover:bg-amber-950/20'
                    : 'hover:bg-slate-700/30';

                return (
                  <tr
                    key={st.station_id}
                    onClick={() => handleSelectStation(st.station_id)}
                    className={`cursor-pointer transition-colors ${rowBg} ${
                      selectedStationId === st.station_id ? 'ring-1 ring-blue-500' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-white">
                      {st.station_name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {st.state}
                    </td>
                    <td className="py-2.5 px-3">
                      <RiskBadge level={st.today_risk_level} score={st.today_risk_score} showScore />
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-200">
                      {st.peak_day}
                    </td>
                    <td className="py-2.5 px-3 font-bold font-mono">
                      <span className={
                        st.peak_risk_score >= 75
                          ? 'text-red-400'
                          : st.peak_risk_score >= 50
                          ? 'text-orange-400'
                          : 'text-amber-400'
                      }>
                        {st.peak_risk_score}/100
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate text-[11px]">
                      {st.recommended_action}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </PageTransition>
  );
}
