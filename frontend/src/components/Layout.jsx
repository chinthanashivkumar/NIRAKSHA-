import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ChatWidget from './ChatWidget';

const Layout = () => (
  <div className="flex h-screen bg-[#07111F] text-[#F8FAFC] overflow-hidden font-sans">
    <Sidebar />
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <Topbar />
      <main className="flex-1 overflow-y-auto bg-[#07111F]">
        <div className="page-fade">
          <Outlet />
        </div>
        <ChatWidget />
      </main>
    </div>
  </div>
);

export default Layout;
