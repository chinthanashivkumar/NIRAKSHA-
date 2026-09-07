import { useEffect, useState } from 'react';
import { Users, Tent, CheckCircle2, AlertCircle, ShieldAlert, ArrowRight, Truck, Compass } from 'lucide-react';
import api from '../services/api';
import { useLang } from '../contexts/LangContext';

export default function Resources() {
  const [teams, setTeams] = useState([]);
  const [camps, setCamps] = useState([]);
  const [assignment, setAssignment] = useState(null);
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t } = useLang();

  const fetchData = async () => {
    try {
      const [teamRes, campRes] = await Promise.all([
        api.get('/resources'),
        api.get('/resources/camps'),
      ]);
      setTeams(teamRes.data);
      setCamps(campRes.data);
      setError(null);
    } catch (e) {
      setError('Failed to load emergency resource rosters.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignment = async () => {
    try {
      const { data } = await api.get('/resources/assignment');
      setAssignment(data);
    } catch (e) {
      console.error(e);
    }
  };

  const assignNow = async () => {
    if (!assignment || !assignment.team) return;
    try {
      await api.post('/resources/assign', {
        team: assignment.team,
        camp: assignment.camp,
      });
      const timestamp = new Date().toLocaleTimeString();
      setLog(prev => [{ timestamp, team: assignment.team, camp: assignment.camp }, ...prev]);
      fetchData();
      fetchAssignment();
    } catch (e) {
      console.error('Assign error', e);
    }
  };

  useEffect(() => {
    fetchData();
    fetchAssignment();
  }, []);

  const availableTeams = teams.filter(t => t.status === 'available').length;
  const deployedTeams = teams.filter(t => t.status === 'deployed').length;
  const totalCapacity = camps.reduce((sum, c) => sum + (c.capacity || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 page-fade">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E293B] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Resource Command & NDRF Logistics</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              DISPATCH
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Real-time tracking of NDRF emergency battalions, relief camp shelter occupancy, and automated battalion assignment
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl text-red-400 text-xs flex items-center gap-3">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Top Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0B1728] border border-[#1E293B] rounded-xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Available Teams</p>
            <p className="text-2xl font-black text-white font-mono">{availableTeams}</p>
            <p className="text-[10px] text-slate-500">Standby for rapid deployment</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-[#0B1728] border border-[#1E293B] rounded-xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Deployed Teams</p>
            <p className="text-2xl font-black text-white font-mono">{deployedTeams}</p>
            <p className="text-[10px] text-slate-500">Active ground search & rescue</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-orange-500/15 border border-orange-500/25 flex items-center justify-center text-orange-400">
            <ShieldAlert size={20} />
          </div>
        </div>

        <div className="bg-[#0B1728] border border-[#1E293B] rounded-xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Total Shelter Capacity</p>
            <p className="text-2xl font-black text-white font-mono">{totalCapacity.toLocaleString()}</p>
            <p className="text-[10px] text-slate-500">Registered across {camps.length} relief centers</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400">
            <Tent size={20} />
          </div>
        </div>
      </div>

      {/* AI Recommendation Card */}
      {assignment && (
        <div className="bg-[#0B1728] border border-blue-500/40 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Automated Resource Assignment Recommendation
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
              DISPATCH READY
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-[#07111F] border border-[#1E293B]">
              <span className="text-slate-400 block text-[10px] uppercase">Recommended Team</span>
              <span className="text-sm font-bold text-white font-mono">{assignment.team}</span>
            </div>
            <div className="p-3 rounded-lg bg-[#07111F] border border-[#1E293B]">
              <span className="text-slate-400 block text-[10px] uppercase">Assigned Relief Camp</span>
              <span className="text-sm font-bold text-white">{assignment.camp}</span>
            </div>
            <div className="p-3 rounded-lg bg-[#07111F] border border-[#1E293B]">
              <span className="text-slate-400 block text-[10px] uppercase">Target Emergency Zone</span>
              <span className="text-sm font-bold text-red-400">{assignment.station || 'Critical Hillside'}</span>
            </div>
          </div>

          {assignment.reasoning && (
            <p className="text-xs text-slate-300 bg-[#07111F] p-3 rounded-lg border border-[#1E293B]">
              <strong className="text-white">Reasoning:</strong> {assignment.reasoning}
            </p>
          )}

          <button
            onClick={assignNow}
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-blue-600/20"
          >
            <span>Confirm & Dispatch Battalion</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Teams & Camps Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* NDRF Teams */}
        <div className="bg-[#0B1728] border border-[#1E293B] rounded-xl p-5 shadow-xl space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Users size={15} className="text-blue-400" />
            NDRF Emergency Battalions
          </h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {teams.map(team => (
              <div 
                key={team.id || team.name}
                className="flex items-center justify-between p-3 rounded-lg bg-[#07111F] border border-[#1E293B] text-xs"
              >
                <div>
                  <p className="font-bold text-white">{team.name}</p>
                  <p className="text-slate-400 text-[11px]">Personnel: {team.capacity || 45} responders</p>
                </div>
                <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                  team.status === 'available'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                    : 'bg-orange-500/15 text-orange-400 border border-orange-500/25'
                }`}>
                  {team.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Relief Camps */}
        <div className="bg-[#0B1728] border border-[#1E293B] rounded-xl p-5 shadow-xl space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Tent size={15} className="text-blue-400" />
            Designated Relief Shelters
          </h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {camps.map(camp => (
              <div 
                key={camp.id || camp.name}
                className="flex items-center justify-between p-3 rounded-lg bg-[#07111F] border border-[#1E293B] text-xs"
              >
                <div>
                  <p className="font-bold text-white">{camp.name}</p>
                  <p className="text-slate-400 text-[11px]">{camp.location || 'NER Shelter Center'}</p>
                </div>
                <span className="font-mono text-slate-300 font-semibold bg-[#101D30] px-2.5 py-1 rounded border border-[#1E293B]">
                  Cap: {camp.capacity}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
