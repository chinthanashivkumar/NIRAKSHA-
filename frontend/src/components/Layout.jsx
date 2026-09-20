import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ChatWidget from './ChatWidget';
import api from '../services/api';

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);

  useEffect(() => {
    const fetchAlertCount = async () => {
      try {
        const res = await api.get('/alerts/active');
        setActiveAlertsCount(res.data?.length || 0);
      } catch {
        // silent
      }
    };
    fetchAlertCount();
    const timer = setInterval(fetchAlertCount, 20000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex h-screen bg-[#0f172a] text-[#f1f5f9] overflow-hidden font-sans">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar activeAlertsCount={activeAlertsCount} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-[#0f172a]">
          <Outlet />
          <ChatWidget />
        </main>
      </div>
    </div>
  );
};

export default Layout;
