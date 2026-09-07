import { useState, useEffect, useRef } from 'react';
import { MapPin, AlertCircle, Clock, Camera, CheckCircle, X, FileText, Upload, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { REPORT_TYPES } from '../constants/stations';
import { useLang } from '../contexts/LangContext';

const timeAgo = (d) => {
  const m = Math.floor((Date.now() - new Date(d + 'Z')) / 60000);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
};

// Photo Upload Box — Field evidence for human verification
const PhotoUploadBox = ({ onUploadComplete }) => {
  const { t } = useLang();
  const fileRef = useRef();
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadState, setUploadState] = useState('idle');

  const handleFile = async (f) => {
    if (!f) return;
    setPreview(URL.createObjectURL(f));
    await doUpload(f);
  };

  const doUpload = async (f) => {
    setUploadState('uploading');
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('photo', f);
    try {
      const res = await api.post('/reports/upload-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setUploadProgress(Math.round((e.loaded * 100) / e.total)),
      });
      const { photo_url } = res.data;
      setUploadState('done');
      onUploadComplete(photo_url);
    } catch {
      setUploadState('error');
      toast.error(t('Photo upload failed'));
    }
  };

  const clear = () => {
    setPreview(null);
    setUploadState('idle');
    setUploadProgress(0);
    onUploadComplete('');
  };

  return (
    <div>
      <div
        className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
          dragging ? 'border-blue-500 bg-blue-500/10' : preview ? 'border-[#1E293B] bg-[#07111F]' : 'border-[#1E293B] bg-[#07111F] hover:border-blue-500/40'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
        onClick={() => !preview && fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files[0];
            if (f) handleFile(f);
          }}
        />

        {preview ? (
          <div className="relative group">
            <img src={preview} alt="Field Evidence" className="max-h-48 rounded-lg mx-auto object-cover border border-[#1E293B]" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); clear(); }}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-500"
            >
              <X size={14} />
            </button>
            <div className="mt-2 text-[11px] text-emerald-400 flex items-center justify-center gap-1">
              <CheckCircle size={13} /> {t('Photo uploaded as field photographic evidence')}
            </div>
          </div>
        ) : (
          <div className="py-6 space-y-2">
            <Camera size={28} className="mx-auto text-blue-400" />
            <p className="text-xs font-semibold text-white">{t('Click or drag & drop photographic evidence')}</p>
            <p className="text-[10px] text-slate-400">{t('JPEG, PNG up to 10MB • Archived for authority field verification')}</p>
          </div>
        )}

        {uploadState === 'uploading' && (
          <div className="mt-2 w-full bg-[#101D30] rounded-full h-1.5 overflow-hidden">
            <div className="bg-blue-500 h-full transition-all" style={{ width: `${uploadProgress}%` }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default function Reports() {
  const { t } = useLang();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    report_type: 'slope_movement',
    description: '',
    severity: 3,
    reporter_name: '',
    state: 'Sikkim',
    district: '',
    city: '',
    pincode: '',
    landmark: '',
    lat: 27.33,
    lon: 88.61,
    photo_url: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchReports = async () => {
    try {
      const res = await api.get('/reports');
      setReports(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description) {
      toast.error(t('Please provide hazard description'));
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/reports', form);
      toast.success(t('Field report submitted successfully'));
      setForm({
        report_type: 'slope_movement',
        description: '',
        severity: 3,
        reporter_name: '',
        state: 'Sikkim',
        district: '',
        city: '',
        pincode: '',
        landmark: '',
        lat: 27.33,
        lon: 88.61,
        photo_url: '',
      });
      fetchReports();
    } catch {
      toast.error(t('Failed to submit report'));
    } finally {
      setSubmitting(false);
    }
  };

  const getSeverityBadge = (sev) => {
    if (sev <= 2) {
      return {
        label: `${t('Sev')} ${sev} • ${t('Low')}`,
        className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold px-2 py-0.5 rounded text-[10px]',
      };
    }
    if (sev === 3) {
      return {
        label: `${t('Sev')} 3 • ${t('Medium')}`,
        className: 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold px-2 py-0.5 rounded text-[10px]',
      };
    }
    return {
      label: `${t('Sev')} ${sev} • ${t('Critical')}`,
      className: 'bg-red-500/15 text-red-400 border border-red-500/30 font-bold px-2 py-0.5 rounded text-[10px]',
    };
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 page-fade">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E293B] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">{t('Citizen & Field Hazard Reports')}</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              FIELD EVIDENCE
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            {t('Community ground observations and photo evidence submitted for human authority ground inspection')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Submission Form */}
        <div className="lg:col-span-6 bg-[#0B1728] border border-[#1E293B] rounded-xl p-6 shadow-xl space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#1E293B] pb-3">
            <FileText size={15} className="text-blue-400" />
            {t('Submit Ground Hazard Incident')}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-medium block mb-1">{t('Hazard Type')}</label>
                <select
                  value={form.report_type}
                  onChange={e => setForm({ ...form, report_type: e.target.value })}
                  className="w-full bg-[#07111F] border border-[#1E293B] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="slope_movement">{t('Slope Movement / Creep')}</option>
                  <option value="crack">{t('Ground Crack / Fissure')}</option>
                  <option value="road_blocked">{t('Road Corridor Blocked')}</option>
                  <option value="flooding">{t('Flash Flooding / Runoff')}</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">{t('Observed Severity (1-5)')}</label>
                <select
                  value={form.severity}
                  onChange={e => setForm({ ...form, severity: parseInt(e.target.value) })}
                  className="w-full bg-[#07111F] border border-[#1E293B] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value={1}>{t('1 - Minor Surface Rill')}</option>
                  <option value={2}>{t('2 - Low Displacement')}</option>
                  <option value={3}>{t('3 - Moderate Tension Cracks')}</option>
                  <option value={4}>{t('4 - High Active Failure')}</option>
                  <option value={5}>{t('5 - Critical Debris Avalanche')}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">{t('Description')}</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder={t('Describe slope condition, rainfall duration, road blockage, or settlement risk...')}
                className="w-full bg-[#07111F] border border-[#1E293B] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-medium block mb-1">{t('Reporter Name / Agency')}</label>
                <input
                  type="text"
                  value={form.reporter_name}
                  onChange={e => setForm({ ...form, reporter_name: e.target.value })}
                  placeholder={t('Citizen / Patrol Officer')}
                  className="w-full bg-[#07111F] border border-[#1E293B] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">{t('State')}</label>
                <select
                  value={form.state}
                  onChange={e => setForm({ ...form, state: e.target.value })}
                  className="w-full bg-[#07111F] border border-[#1E293B] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Sikkim">Sikkim</option>
                  <option value="Assam">Assam</option>
                  <option value="Meghalaya">Meghalaya</option>
                  <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                  <option value="Manipur">Manipur</option>
                  <option value="Mizoram">Mizoram</option>
                  <option value="Nagaland">Nagaland</option>
                  <option value="Tripura">Tripura</option>
                </select>
              </div>
            </div>

            {/* Photo Upload Section */}
            <div>
              <label className="text-slate-300 font-medium block mb-1">{t('Field Photographic Evidence')}</label>
              <PhotoUploadBox onUploadComplete={(url) => setForm({ ...form, photo_url: url })} />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-blue-600/25 disabled:opacity-50"
            >
              {submitting ? t('Submitting Field Report...') : t('File Hazard Report')}
            </button>
          </form>
        </div>

        {/* Existing Reports Stream */}
        <div className="lg:col-span-6 bg-[#0B1728] border border-[#1E293B] rounded-xl p-6 shadow-xl space-y-4 flex flex-col">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between border-b border-[#1E293B] pb-3">
            <span>{t('Verified Citizen & Field Stream')} ({reports.length})</span>
            <span className="text-[10px] font-mono text-slate-400">{t('Authority Verification Queue')}</span>
          </h3>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-[560px] pr-1">
            {reports.map((r) => {
              const badge = getSeverityBadge(r.severity);
              return (
                <div key={r.id} className="p-4 rounded-lg bg-[#07111F] border border-[#1E293B] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs capitalize">{t(r.report_type?.replace(/_/g, ' '))}</span>
                      <span className="text-slate-400 text-[11px]">— {r.state || 'NER'}</span>
                    </div>
                    <span className={badge.className}>{badge.label}</span>
                  </div>

                  <p className="text-slate-300 text-xs">{r.description}</p>

                  {r.photo_url && (
                    <div className="pt-2">
                      <p className="text-[10px] text-slate-400 mb-1 flex items-center gap-1">
                        <Camera size={11} className="text-blue-400" /> {t('Field Evidence Attachment')}:
                      </p>
                      <img
                        src={`http://localhost:8000${r.photo_url}`}
                        alt="Hazard Evidence"
                        className="max-h-36 rounded-md border border-[#1E293B] object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  )}

                  <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-[#1E293B]">
                    <span>{t('Reported by')}: <strong className="text-slate-400">{r.reporter_name || t('Anonymous Citizen')}</strong></span>
                    <span className="font-mono">{timeAgo(r.timestamp)}</span>
                  </div>
                </div>
              );
            })}

            {reports.length === 0 && (
              <div className="text-center py-20 text-slate-400 text-xs">
                {t('No citizen hazard reports filed yet.')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
