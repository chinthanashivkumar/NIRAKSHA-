import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  PhoneCall, PhoneOutgoing, ShieldAlert, Radio, Clock, CheckCircle2, 
  AlertTriangle, RefreshCw, Volume2, UserCheck, Activity, PhoneForwarded 
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import PageTransition, { cardVariants, containerVariants } from '../components/PageTransition';
import RiskBadge from '../components/RiskBadge';
import { useLang } from '../contexts/LangContext';

export default function VoiceAlerts() {
  const { t } = useLang();
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState('');
  const [callLogs, setCallLogs] = useState([]);
  const [modeInfo, setModeInfo] = useState({ mode: 'LIVE', configured: true, to_number: '+918660567628', from_number: '+17372212163' });
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState(false);
  const [callSuccess, setCallSuccess] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [stationsRes, logsRes, modeRes] = await Promise.all([
        api.get('/stations'),
        api.get('/calls/log').catch(() => ({ data: [] })),
        api.get('/calls/mode').catch(() => ({ data: { mode: 'MOCK', configured: false } })),
      ]);

      setStations(stationsRes.data || []);
      setCallLogs(logsRes.data || []);
      setModeInfo(modeRes.data || {});

      if (stationsRes.data?.length > 0 && !selectedStation) {
        // Default to highest risk station
        const top = [...stationsRes.data].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))[0];
        setSelectedStation(top?.name || stationsRes.data[0].name);
      }
    } catch (err) {
      console.error('Error fetching voice alert data:', err);
      toast.error('Failed to load voice alert telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const currentStationObj = stations.find((s) => s.name === selectedStation) || stations[0];

  const handleTriggerCall = async () => {
    if (!currentStationObj) return;

    setCalling(true);
    setCallSuccess(false);

    try {
      const res = await api.post('/calls/alert', {
        station_name: currentStationObj.name,
        risk_score: currentStationObj.risk_score || 78.5,
        risk_level: currentStationObj.risk_level || 'CRITICAL',
      });

      setCallSuccess(true);
      toast.success(
        `Emergency Voice Alert dispatched to ${modeInfo.to_number || '+918660567628'} (${res.data.mode || 'LIVE'})`,
        { icon: '📞', duration: 5000 }
      );

      // Refresh log
      const logsRes = await api.get('/calls/log');
      setCallLogs(logsRes.data || []);

      setTimeout(() => setCallSuccess(false), 3000);
    } catch (err) {
      console.error('Trigger call error:', err);
      toast.error('Voice call trigger request failed');
    } finally {
      setCalling(false);
    }
  };

  return (
    <PageTransition className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
              <PhoneCall size={22} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {t('Emergency Voice Alert System')}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                {t('Automated Twilio telephony dispatch for critical landslide escalations (75+ risk threshold)')}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold active:scale-95 hover:-translate-y-0.5 transition-all duration-200"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {t('Refresh Telemetry')}
        </button>
      </div>

      {/* Mode Status Banner */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg ${
        modeInfo.mode === 'LIVE' 
          ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' 
          : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
      }`}>
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full shrink-0 ${modeInfo.mode === 'LIVE' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wide uppercase">
                {modeInfo.mode === 'LIVE' ? 'LIVE TWILIO TELEPHONY ONLINE' : 'MOCK CALL MODE (SIMULATION)'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700 font-mono text-white">
                {modeInfo.mode}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {modeInfo.mode === 'LIVE' 
                ? `Outbound calls routed via Twilio (${modeInfo.from_number || '+17372212163'}) to Emergency Officer at ${modeInfo.to_number || '+918660567628'}`
                : 'Twilio credentials simulated. Outbound audio payload logged and verified in sandbox environment.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-xs font-mono bg-slate-900/90 px-3 py-2 rounded-lg border border-slate-800">
          <span className="text-slate-400">Target Line:</span>
          <span className="font-bold text-white">{modeInfo.to_number || '+918660567628'}</span>
        </div>
      </div>

      {/* Auto-Call Protocol Indicator */}
      <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex items-start gap-3 text-xs text-slate-300 shadow-md">
        <Activity size={18} className="text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-white">
            {t('Automated Critical Escalation Rule')}
          </p>
          <p className="text-slate-400 leading-relaxed">
            {t('When real-time telemetry or simulated rainfall drives any station risk score across')} <span className="text-red-400 font-bold">75.0 (CRITICAL)</span>, {t('an automated text-to-speech voice call with localized coordinates and evacuation warnings is instantly triggered to the District Disaster Commissioner. (Enforces 1-hour anti-spam deduplication per station).')}
          </p>
        </div>
      </div>

      {/* Manual Voice Call Trigger Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 rounded-xl border border-slate-700 bg-slate-800 p-5 space-y-5 shadow-xl hover:shadow-2xl transition-all duration-200">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <PhoneForwarded size={16} className="text-red-400" />
              {t('Manual Trigger Console')}
            </h3>
            <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
              {t('Operator Override')}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                {t('Select Monitoring Station')}
              </label>
              <select
                value={selectedStation}
                onChange={(e) => setSelectedStation(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
              >
                {stations.map((st) => (
                  <option key={st.id} value={st.name}>
                    {st.name} — Risk: {(st.risk_score || 0).toFixed(1)}/100 ({st.risk_level || 'LOW'})
                  </option>
                ))}
              </select>
            </div>

            {currentStationObj && (
              <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-700/80 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{t('Current Risk Level')}:</span>
                  <RiskBadge 
                    level={currentStationObj.risk_level || 'MODERATE'} 
                    score={currentStationObj.risk_score} 
                    showScore 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{t('Telemetry Rainfall')}:</span>
                  <span className="font-mono text-cyan-300 font-semibold">
                    {(currentStationObj.current_rainfall || 0).toFixed(1)} mm
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{t('Soil Moisture (TWI)')}:</span>
                  <span className="font-mono text-amber-300 font-semibold">
                    {((currentStationObj.soil_moisture || 0.3) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{t('Settlement Population')}:</span>
                  <span className="font-mono text-slate-200 font-semibold">
                    {(currentStationObj.population || 5000).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Red Trigger Voice Call Button */}
            <button
              onClick={handleTriggerCall}
              disabled={calling}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all duration-200 ${
                callSuccess
                  ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                  : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30 active:scale-95 hover:-translate-y-0.5'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {calling ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>{t('Processing Voice Dispatch...')}</span>
                </>
              ) : callSuccess ? (
                <>
                  <CheckCircle2 size={16} />
                  <span>{t('Voice Call Dispatched!')}</span>
                </>
              ) : (
                <>
                  <Volume2 size={16} className="animate-bounce" />
                  <span>{t('TRIGGER VOICE CALL NOW')}</span>
                </>
              )}
            </button>

            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              {t('Initiates an automated Indian English text-to-speech advisory with station name, severity level, and rapid evacuation advisories.')}
            </p>
          </div>
        </div>

        {/* Call Log Table */}
        <div className="lg:col-span-2 rounded-xl border border-slate-700 bg-slate-800 p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-blue-400" />
              <h3 className="font-bold text-white text-sm">{t('Voice Call Transmission Log')}</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {callLogs.length} {t('Recorded Calls')}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 uppercase text-[10px] tracking-wider bg-slate-900/60">
                  <th className="py-2.5 px-3 font-semibold">{t('Time (UTC)')}</th>
                  <th className="py-2.5 px-3 font-semibold">{t('Station')}</th>
                  <th className="py-2.5 px-3 font-semibold">{t('Risk Score')}</th>
                  <th className="py-2.5 px-3 font-semibold">{t('Status')}</th>
                  <th className="py-2.5 px-3 font-semibold">{t('Duration')}</th>
                  <th className="py-2.5 px-3 font-semibold">{t('Recipient')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 font-mono">
                {callLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                      {t('No voice alert records logged yet. Trigger a call above to test dispatch.')}
                    </td>
                  </tr>
                ) : (
                  callLogs.map((log) => (
                    <tr key={log.id || log.call_sid} className="hover:bg-slate-700/40 transition-colors">
                      <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white font-sans">
                        {log.station_name}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-red-400">
                        {log.risk_score ? `${Number(log.risk_score).toFixed(1)}/100` : 'CRITICAL'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          log.status === 'completed' || log.status === 'in-progress'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          <CheckCircle2 size={10} />
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {log.duration || '35s'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                        {log.recipient || modeInfo.to_number || '+918660567628'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
