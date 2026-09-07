import { useState } from 'react';
import { Cpu, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw, BarChart2, Info, Sliders } from 'lucide-react';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';
import { useLang } from '../contexts/LangContext';

export default function Prediction() {
  const { t } = useLang();
  const [formData, setFormData] = useState({
    elevation: 1200.0,
    slope: 28.0,
    aspect: 180.0,
    curvature: 0.2,
    twi: 7.5,
    distance_to_rivers: 350.0,
    annual_rainfall: 2200.0,
    event_rainfall: 85.0,
    ndvi: 0.45,
    lulc: 3.0,
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: parseFloat(val) || 0 }));
  };

  const handlePredict = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/predict', formData);
      setResult(res.data);
    } catch (err) {
      setError('Prediction calculation failed. Please verify API connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 page-fade">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E293B] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">{t('Scientific Landslide Risk Estimator')}</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase font-mono">
              DIRECT ML MODEL INFERENCE
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            {t('Gradient Boosting Classifier & Real-Time Terrain Ingest')}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-[#0B1728] border border-[#1E293B] px-3 py-1.5 rounded-lg">
          <Cpu size={14} className="text-blue-400" />
          <span>Model: <strong>Gradient Boosting</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Parameters Form */}
        <div className="lg:col-span-7 bg-[#0B1728] border border-[#1E293B] rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders size={16} className="text-blue-400" />
              Terrain & Hydrological Conditioning Parameters
            </h3>
            <span className="text-[11px] text-slate-400">10 Conditioning Features</span>
          </div>

          <form onSubmit={handlePredict} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Elevation */}
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-medium flex justify-between">
                  <span>Elevation (m)</span>
                  <span className="font-mono text-blue-400">{formData.elevation}m</span>
                </label>
                <input
                  type="number"
                  min="50"
                  max="5000"
                  step="10"
                  value={formData.elevation}
                  onChange={e => handleChange('elevation', e.target.value)}
                  className="w-full bg-[#07111F] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Slope */}
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-medium flex justify-between">
                  <span>Slope Angle (°)</span>
                  <span className="font-mono text-blue-400">{formData.slope}°</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="90"
                  step="0.5"
                  value={formData.slope}
                  onChange={e => handleChange('slope', e.target.value)}
                  className="w-full bg-[#07111F] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Aspect */}
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-medium flex justify-between">
                  <span>Aspect (0-360°)</span>
                  <span className="font-mono text-blue-400">{formData.aspect}°</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="360"
                  step="1"
                  value={formData.aspect}
                  onChange={e => handleChange('aspect', e.target.value)}
                  className="w-full bg-[#07111F] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Curvature */}
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-medium flex justify-between">
                  <span>Surface Curvature</span>
                  <span className="font-mono text-blue-400">{formData.curvature}</span>
                </label>
                <input
                  type="number"
                  min="-10"
                  max="10"
                  step="0.1"
                  value={formData.curvature}
                  onChange={e => handleChange('curvature', e.target.value)}
                  className="w-full bg-[#07111F] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* TWI */}
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-medium flex justify-between">
                  <span>Topographic Wetness Index (TWI)</span>
                  <span className="font-mono text-blue-400">{formData.twi}</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  step="0.1"
                  value={formData.twi}
                  onChange={e => handleChange('twi', e.target.value)}
                  className="w-full bg-[#07111F] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Distance to rivers */}
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-medium flex justify-between">
                  <span>Distance to River (m)</span>
                  <span className="font-mono text-blue-400">{formData.distance_to_rivers}m</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  step="10"
                  value={formData.distance_to_rivers}
                  onChange={e => handleChange('distance_to_rivers', e.target.value)}
                  className="w-full bg-[#07111F] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Annual Rainfall */}
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-medium flex justify-between">
                  <span>Annual Rainfall (mm)</span>
                  <span className="font-mono text-blue-400">{formData.annual_rainfall}mm</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  step="25"
                  value={formData.annual_rainfall}
                  onChange={e => handleChange('annual_rainfall', e.target.value)}
                  className="w-full bg-[#07111F] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Event Rainfall */}
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-medium flex justify-between">
                  <span>Trigger Event Rainfall (mm)</span>
                  <span className="font-mono text-blue-400">{formData.event_rainfall}mm</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="500"
                  step="1"
                  value={formData.event_rainfall}
                  onChange={e => handleChange('event_rainfall', e.target.value)}
                  className="w-full bg-[#07111F] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* NDVI */}
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-medium flex justify-between">
                  <span>NDVI (Vegetation Index -1 to 1)</span>
                  <span className="font-mono text-blue-400">{formData.ndvi}</span>
                </label>
                <input
                  type="number"
                  min="-1"
                  max="1"
                  step="0.05"
                  value={formData.ndvi}
                  onChange={e => handleChange('ndvi', e.target.value)}
                  className="w-full bg-[#07111F] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* LULC */}
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-medium flex justify-between">
                  <span>Land Cover Class (1-7)</span>
                  <span className="font-mono text-blue-400">Class {formData.lulc}</span>
                </label>
                <select
                  value={formData.lulc}
                  onChange={e => handleChange('lulc', e.target.value)}
                  className="w-full bg-[#07111F] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="1">1 - Forest / Dense Canopy</option>
                  <option value="2">2 - Scrubland / Sparse Vegetation</option>
                  <option value="3">3 - Agricultural Terraced</option>
                  <option value="4">4 - Built-up / Settlement</option>
                  <option value="5">5 - Bare Rock / Exposed Slope</option>
                  <option value="6">6 - Waterbody / River Bed</option>
                  <option value="7">7 - Degraded / Road Cut</option>
                </select>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>{t('Calculating Risk...')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('Run ML Prediction')}</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Inference Results Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#0B1728] border border-[#1E293B] rounded-xl p-6 shadow-xl space-y-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#1E293B] pb-3">
              <BarChart2 size={16} className="text-blue-400" />
              {t('Prediction Output')}
            </h3>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 flex items-center gap-2">
                <AlertTriangle size={15} />
                <span>{error}</span>
              </div>
            )}

            {!result && !loading && !error && (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <Info size={32} className="mx-auto text-slate-400 opacity-60" />
                <p className="text-xs">{t('Model Intelligence & Scientific Metrics')}</p>
                <p className="text-[10px] text-slate-400">Model: StandardScaler + GradientBoostingClassifier</p>
              </div>
            )}

            {result && (
              <div className="space-y-4 page-fade">
                {/* Score & Level Display */}
                <div className="p-4 rounded-xl bg-[#07111F] border border-[#1E293B] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">{t('Hazard Classification:')}</span>
                    <div className="mt-1">
                      <RiskBadge level={result.risk_level} size="lg" />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">{t('ML Risk')}</span>
                    <p className="text-3xl font-black text-white font-mono mt-0.5">
                      {result.risk_score.toFixed(1)} <span className="text-xs text-slate-400 font-normal">/ 100</span>
                    </p>
                  </div>
                </div>

                {/* Probability Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>{t('Landslide Risk Probability')}</span>
                    <span className="font-mono text-white">{(result.probability * 100).toFixed(2)}%</span>
                  </div>
                  <div className="w-full bg-[#07111F] rounded-full h-2 overflow-hidden border border-[#1E293B]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, result.probability * 100)}%`,
                        background: result.risk_level === 'CRITICAL' ? '#ef4444' : result.risk_level === 'HIGH' ? '#f97316' : result.risk_level === 'MODERATE' ? '#f59e0b' : '#22c55e'
                      }}
                    />
                  </div>
                </div>

                {/* Top Contributing Factors */}
                <div className="space-y-2 pt-2 border-t border-[#1E293B]">
                  <p className="text-xs font-semibold text-slate-300">{t('ML Contributing Factors')}:</p>
                  <ul className="space-y-1.5">
                    {result.top_contributing_factors?.map((factor, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-xs text-slate-300 p-2 rounded bg-[#07111F] border border-[#1E293B]/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        <span className="font-medium capitalize">{t(factor.replace(/_/g, ' ')) || factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
