import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { 
  LayoutDashboard, BellRing, Target, ClipboardList, Radio, 
  Activity, Users, CloudRain, PhoneCall, BarChart2, Shield, 
  ChevronLeft, ChevronRight, Menu, X, BookOpen 
} from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import { useLang } from '../contexts/LangContext';

export const SIDEBAR_ITEMS = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    tooltip: 'Real-time risk overview',
  },
  {
    name: 'Alerts',
    path: '/alerts',
    icon: BellRing,
    tooltip: 'Active emergency alerts',
  },
  {
    name: 'Priority Response',
    path: '/priority',
    icon: Target,
    tooltip: 'AI rescue team ranking',
    isNew: true,
  },
  {
    name: 'Field Reports',
    path: '/reports',
    icon: ClipboardList,
    tooltip: 'Citizen hazard photo intelligence',
  },
  {
    name: 'Stations',
    path: '/stations',
    icon: Radio,
    tooltip: '20 NER automated telemetry stations',
  },
  {
    name: 'Timeline',
    path: '/timeline',
    icon: Activity,
    tooltip: '7-day alert and incident log',
  },
  {
    name: 'Research & History',
    path: '/research',
    icon: BookOpen,
    tooltip: 'NASA/ISRO data, zero-history engine & probability calculator',
    isNew: true,
  },
  {
    name: 'Resources',
    path: '/resources',
    icon: Users,
    tooltip: 'NDRF rescue team and camp deployment',
  },
  {
    name: 'Weather Forecast',
    path: '/weather',
    icon: CloudRain,
    tooltip: '7-day precipitation & risk projection',
    isNew: true,
  },
  {
    name: 'Voice Alerts',
    path: '/calls',
    icon: PhoneCall,
    tooltip: 'Automated Twilio emergency voice calls',
    isNew: true,
  },
  {
    name: 'Model Performance',
    path: '/model-performance',
    icon: BarChart2,
    tooltip: 'ML classification metrics and ROC',
  },
];

export default function Sidebar({ mobileOpen = false, setMobileOpen = () => {} }) {
  const { t } = useLang();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      <aside 
        className={`
          fixed md:static inset-y-0 left-0 z-50
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${collapsed ? 'md:w-20' : 'w-64'} 
          h-full bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 transition-all duration-200 font-sans shadow-2xl md:shadow-none
        `}
      >
        {/* Brand Header */}
        <div className="px-4 py-4 border-b border-slate-800 flex items-center justify-between">
          {!collapsed && (
            <Link to="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <Shield size={18} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black text-white tracking-wider">NIRAKSHA</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono">
                    AI
                  </span>
                </div>
                <p className="text-[9px] text-slate-400 font-medium tracking-wider uppercase">SIH 2026 • MDoNER</p>
              </div>
            </Link>
          )}

          {collapsed && (
            <Link to="/" className="mx-auto w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Shield size={18} />
            </Link>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>

            {/* Mobile close button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {!collapsed && (
          <div className="px-4 py-2 border-b border-slate-800/80">
            <LanguageSwitcher />
          </div>
        )}

        {/* Navigation List - 10 Ordered Items */}
        <nav className="flex-1 py-3 overflow-y-auto px-2 space-y-1">
          {SIDEBAR_ITEMS.map(({ name, path, icon: Icon, tooltip, isNew }) => (
            <div key={name} className="relative group">
              <NavLink
                to={path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-tight transition-all duration-150 active:scale-95 ${
                    isActive
                      ? 'bg-blue-900/60 text-blue-300 border-l-4 border-blue-500 font-bold shadow-sm'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  } ${collapsed ? 'justify-center' : ''}`
                }
              >
                <Icon size={17} className="shrink-0 text-slate-400 group-hover:text-white transition-colors" />
                {!collapsed && <span className="flex-1 truncate">{t(name)}</span>}
                {!collapsed && isNew && (
                  <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                    NEW
                  </span>
                )}
              </NavLink>

              {/* Tooltip on Hover */}
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-[11px] text-slate-200 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50 shadow-xl hidden md:block">
                <p className="font-semibold text-white">{t(name)}</p>
                <p className="text-[10px] text-slate-400">{t(tooltip)}</p>
              </div>
            </div>
          ))}
        </nav>

        {/* Footer Status Bar */}
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/60 text-[11px]">
          {!collapsed ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 beacon-online" />
                  <span className="text-white font-bold text-xs">{t('SYSTEM ONLINE')}</span>
                </div>
                <span className="text-slate-500 font-mono text-[10px]">v3.0.0</span>
              </div>
              <p className="text-slate-400 truncate text-[10px]">{t('MDoNER • 8 NER States Active')}</p>
            </div>
          ) : (
            <div className="flex justify-center">
              <span className="w-2 h-2 rounded-full bg-emerald-400 beacon-online" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
