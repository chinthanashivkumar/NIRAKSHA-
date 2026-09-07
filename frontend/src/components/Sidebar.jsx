import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { 
  LayoutDashboard, BellRing, Target, ClipboardList, Radio, 
  Activity, Users, BarChart2, Shield, ChevronLeft, ChevronRight,
  Sliders, Compass, Terminal, MapPin
} from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import { useLang } from '../contexts/LangContext';

const navGroups = [
  {
    title: 'OVERVIEW',
    links: [
      { name: 'Dashboard / GIS Matrix', path: '/dashboard', icon: LayoutDashboard },
    ]
  },
  {
    title: 'MONITORING',
    links: [
      { name: 'Telemetry Stations', path: '/stations', icon: Radio },
      { name: 'Incident Timeline', path: '/timeline', icon: Activity },
    ]
  },
  {
    title: 'INTELLIGENCE',
    links: [
      { name: 'Scientific Risk Prediction', path: '/predict', icon: Sliders },
      { name: 'Model Intelligence', path: '/model-performance', icon: BarChart2 },
      { name: 'Tactical Priority Order', path: '/priority', icon: Target, isNew: true },
    ]
  },
  {
    title: 'EMERGENCY RESPONSE',
    links: [
      { name: 'Alert Command Center', path: '/alerts', icon: BellRing },
      { name: 'NDRF Resource Command', path: '/resources', icon: Users },
    ]
  },
  {
    title: 'FIELD SURVEILLANCE',
    links: [
      { name: 'Ground Hazard Reports', path: '/reports', icon: ClipboardList },
    ]
  }
];

export default function Sidebar() {
  const { t } = useLang();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside 
      className={`${
        collapsed ? 'w-18' : 'w-64'
      } h-full bg-[#091321] border-r border-[rgba(148,163,184,0.14)] flex flex-col shrink-0 transition-all duration-200 z-40 font-mono`}
    >
      {/* Brand Header */}
      <div className="px-5 py-4 border-b border-[rgba(148,163,184,0.14)] flex items-center justify-between">
        {!collapsed && (
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#050A12] border border-[rgba(148,163,184,0.2)] flex items-center justify-center text-[#4DA3FF]">
              <Shield size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-white tracking-widest">NIRAKSHA</span>
                <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-[rgba(38,132,255,0.15)] text-[#4DA3FF] border border-[rgba(38,132,255,0.3)]">
                  OPS
                </span>
              </div>
              <p className="text-[9px] text-[#8EA1B8] font-bold tracking-widest uppercase">DISASTER INTEL</p>
            </div>
          </Link>
        )}

        {collapsed && (
          <Link to="/" className="mx-auto w-8 h-8 rounded bg-[#050A12] border border-[rgba(148,163,184,0.2)] flex items-center justify-center text-[#4DA3FF]">
            <Shield size={18} />
          </Link>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded text-[#8EA1B8] hover:text-white hover:bg-[#0D1929] transition-colors"
          title={collapsed ? "Expand Console" : "Collapse Console"}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {!collapsed && (
        <div className="px-4 py-2 border-b border-[rgba(148,163,184,0.14)]">
          <LanguageSwitcher />
        </div>
      )}

      {/* Navigation Sections */}
      <nav className="flex-1 py-3 overflow-y-auto px-2 space-y-4">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            {!collapsed && (
              <p className="text-[10px] text-[#8EA1B8] uppercase font-bold tracking-widest px-3 mb-1">
                {t(group.title)}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.links.map(({ name, path, icon: Icon, isNew }) => (
                <li key={name}>
                  <NavLink
                    to={path}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded text-xs font-semibold tracking-tight transition-all ${
                        isActive
                          ? 'bg-[rgba(38,132,255,0.15)] text-[#4DA3FF] border border-[rgba(38,132,255,0.3)] shadow-sm'
                          : 'text-slate-300 hover:text-white hover:bg-[#0D1929]'
                      } ${collapsed ? 'justify-center' : ''}`
                    }
                    title={collapsed ? t(name) : undefined}
                  >
                    <Icon size={16} className="shrink-0 text-[#8EA1B8]" />
                    {!collapsed && <span className="flex-1 truncate">{t(name)}</span>}
                    {!collapsed && isNew && (
                      <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">
                        {t('LIVE')}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer Console Strip */}
      <div className="px-4 py-3 border-t border-[rgba(148,163,184,0.14)] bg-[#050A12]/80 text-[10px]">
        {!collapsed ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 beacon-online" />
                <span className="text-white font-bold tracking-wider">{t('GATEWAY ONLINE')}</span>
              </div>
              <span className="text-[#8EA1B8]">v2.4.0</span>
            </div>
            <p className="text-[#8EA1B8] truncate">{t('MDoNER • 8 NER BORDER STATES')}</p>
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 beacon-online" />
          </div>
        )}
      </div>
    </aside>
  );
}
