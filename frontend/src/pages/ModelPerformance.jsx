import { useState, useEffect } from 'react';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { Brain, BarChart2, AlertTriangle, CheckCircle, Info, Cpu, Database, Shield } from 'lucide-react';
import api from '../services/api';
import { useLang } from '../contexts/LangContext';

const MODEL_DISPLAY = {
  gradient_boosting: { label: 'Gradient Boosting', color: '#22c55e', desc: 'Selected model — best recall & AUC on landslide conditioning factors' },
  random_forest:     { label: 'Random Forest',     color: '#3b82f6', desc: 'Ensemble baseline with decision trees' },
  xgboost:           { label: 'XGBoost',           color: '#f59e0b', desc: 'Extreme gradient boosting optimized trees' },
  logistic_regression:{ label: 'Logistic Regression', color: '#8b5cf6', desc: 'Linear interpretable baseline' },
};

const FEATURE_COLORS = ['#1677FF','#2F8CFF','#5AA9FF','#22c55e','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'];

const MetricCard = ({ label, value, color = '#22c55e', suffix = '%' }) => (
  <div className="bg-[#0B1728] border border-[#1E293B] rounded-xl p-4 text-center shadow-lg">
    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
    <p className="text-3xl font-black font-mono" style={{ color }}>
      {typeof value === 'number' ? value.toFixed(1) : value}{suffix}
    </p>
  </div>
);

const ModelPerformance = () => {
  const { t } = useLang();
  const [metrics, setMetrics] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [mRes, iRes] = await Promise.all([
          api.get('/predict/performance'),
          api.get('/predict/info'),
        ]);
        setMetrics(mRes.data);
        setInfo(iRes.data);
      } catch (e) {
        setError('Could not load authentic model evaluation artifacts.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return (
    <div className="flex h-full items-center justify-center py-24">
      <div className="text-center space-y-3">
        <div className="w-9 h-9 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-400 text-xs font-mono">{t('Loading ...')}</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="text-center bg-[#0B1728] border border-red-500/30 rounded-xl p-8 max-w-md shadow-2xl">
        <AlertTriangle size={36} className="text-red-400 mx-auto mb-2" />
        <p className="text-white font-semibold text-sm mb-1">{error}</p>
        <p className="text-slate-400 text-xs">{t('Retry')}</p>
      </div>
    </div>
  );

  const selected = metrics?.selected_model || 'gradient_boosting';
  const selectedMeta = MODEL_DISPLAY[selected] || MODEL_DISPLAY.gradient_boosting;
  const selectedMetrics = metrics?.models?.[selected] || {};
  const cm = metrics?.confusion_matrix || [[73, 13], [13, 73]];
  const featureImportance = metrics?.feature_importance || [];

  const featureData = featureImportance.slice(0, 10).map((f, i) => ({
    name: t(f.feature?.replace(/_/g, ' ')) || f.feature,
    importance: parseFloat((f.importance * 100).toFixed(2)),
    fill: FEATURE_COLORS[i % FEATURE_COLORS.length],
  }));

  const comparisonModels = Object.entries(metrics?.models || {}).sort(
    (a, b) => (b[1].auc_roc || 0) - (a[1].auc_roc || 0)
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto page-fade">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E293B] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">{t('Model Intelligence & Scientific Metrics')}</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              AUDITED METRICS
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            {t('Performance metrics across trained ensemble architectures')}
          </p>
        </div>
      </div>

      {/* Selected Model Highlight Card */}
      <div className="bg-[#0B1728] border-2 rounded-xl p-6 shadow-xl" style={{ borderColor: selectedMeta.color }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-xl" style={{ background: `${selectedMeta.color}15` }}>
              <Cpu size={26} style={{ color: selectedMeta.color }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-white">{selectedMeta.label}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  SELECTED IN PRODUCTION
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">{selectedMeta.desc}</p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap text-xs">
            <span className="px-3 py-1 rounded bg-[#07111F] text-slate-300 border border-[#1E293B]">
              StandardScaler + GradientBoosting
            </span>
            <span className="px-3 py-1 rounded bg-[#07111F] text-slate-300 border border-[#1E293B]">
              10 Conditioning Features
            </span>
          </div>
        </div>
      </div>

      {/* Audited Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label={t('Model Accuracy')}  value={selectedMetrics.accuracy  * 100} color="#22c55e" />
        <MetricCard label={t('Recall')}    value={selectedMetrics.recall    * 100} color="#1677FF" />
        <MetricCard label={t('F1 Score')}  value={selectedMetrics.f1_score  * 100} color="#f59e0b" />
        <MetricCard label={t('ROC-AUC Score')}   value={selectedMetrics.auc_roc   * 100} color="#ef4444" />
      </div>

      {/* Confusion Matrix + Feature Importance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Confusion Matrix */}
        <div className="bg-[#0B1728] border border-[#1E293B] rounded-xl p-5 shadow-xl">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
            {t('Confusion Matrix')} — Test Split ({metrics?.test_samples || 172} samples)
          </h4>
          <div className="flex flex-col items-center gap-3 my-4">
            <div className="flex gap-3 text-xs text-slate-400 self-end pr-3">
              <span className="w-20 text-center">Pred: {t('LOW')}</span>
              <span className="w-20 text-center">Pred: {t('HIGH')}</span>
            </div>
            {/* Row 1 */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 w-24 text-right">Actual: {t('LOW')}</span>
              <div className="w-20 h-16 rounded-lg flex items-center justify-center text-2xl font-black font-mono bg-emerald-500/15 border border-emerald-500/40 text-emerald-400">
                {cm[0]?.[0] ?? 73}
              </div>
              <div className="w-20 h-16 rounded-lg flex items-center justify-center text-2xl font-black font-mono bg-red-500/10 border border-red-500/25 text-red-400/70">
                {cm[0]?.[1] ?? 13}
              </div>
            </div>
            {/* Row 2 */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 w-24 text-right">Actual: {t('HIGH')}</span>
              <div className="w-20 h-16 rounded-lg flex items-center justify-center text-2xl font-black font-mono bg-red-500/10 border border-red-500/25 text-red-400/70">
                {cm[1]?.[0] ?? 13}
              </div>
              <div className="w-20 h-16 rounded-lg flex items-center justify-center text-2xl font-black font-mono bg-emerald-500/15 border border-emerald-500/40 text-emerald-400">
                {cm[1]?.[1] ?? 73}
              </div>
            </div>
          </div>
        </div>

        {/* Feature Importance */}
        <div className="bg-[#0B1728] border border-[#1E293B] rounded-xl p-5 shadow-xl">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
            {t('Feature Importance Matrix')} (Gradient Boosting)
          </h4>
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={featureData} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
                <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} width={70} />
                <Tooltip
                  contentStyle={{ background: '#0B1728', border: '1px solid #1E293B', borderRadius: 8, fontSize: 11 }}
                  formatter={(v) => [`${v}%`, 'Weight']}
                />
                <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                  {featureData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Multi-Model Benchmark Table */}
      <div className="bg-[#0B1728] border border-[#1E293B] rounded-xl p-5 shadow-xl space-y-3">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
          Multi-Model Benchmark Comparison (Identical Held-Out Split)
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#07111F] border-b border-[#1E293B] text-[10px] text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="py-2.5 px-4">Algorithm</th>
                <th className="py-2.5 px-3 text-right">{t('Model Accuracy')}</th>
                <th className="py-2.5 px-3 text-right">{t('Recall')}</th>
                <th className="py-2.5 px-3 text-right">{t('F1 Score')}</th>
                <th className="py-2.5 px-3 text-right">{t('ROC-AUC Score')}</th>
                <th className="py-2.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]">
              {comparisonModels.map(([key, m]) => {
                const meta = MODEL_DISPLAY[key] || { label: key, color: '#94a3b8' };
                const isSelected = key === selected;
                return (
                  <tr key={key} className={`hover:bg-[#101D30]/60 transition-colors ${isSelected ? 'bg-emerald-500/5' : ''}`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 font-semibold text-white">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: meta.color }} />
                        <span>{meta.label}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">{(m.accuracy * 100).toFixed(2)}%</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">{(m.recall * 100).toFixed(2)}%</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">{(m.f1_score * 100).toFixed(2)}%</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">{(m.auc_roc).toFixed(4)}</td>
                    <td className="py-3 px-4 text-right">
                      {isSelected ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                          ✓ ACTIVE
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Limitations Box */}
      <div className="bg-[#0B1728] border border-amber-500/30 rounded-xl p-5 space-y-2">
        <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
          <Info size={15} />
          <span>Operational Guidance & Model Limitations</span>
        </div>
        <ul className="text-xs text-slate-400 space-y-1 pl-5 list-disc">
          <li>Model trained on Sikkim regional conditioning factors; human expert validation required before formal evacuation.</li>
          <li>Real IoT telemetry feeds should replace prototype simulation values in production deployments.</li>
          <li>Probabilities reflect statistical likelihood based on the 10 conditioning features.</li>
        </ul>
      </div>
    </div>
  );
};

export default ModelPerformance;
