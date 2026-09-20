import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Alerts from './pages/Alerts';
import Priority from './pages/Priority';
import Reports from './pages/Reports';
import Stations from './pages/Stations';
import StationDetail from './pages/StationDetail';
import ModelPerformance from './pages/ModelPerformance';
import Prediction from './pages/Prediction';
import Timeline from './pages/Timeline';
import Resources from './pages/Resources';
import WeatherForecast from './pages/WeatherForecast';
import VoiceAlerts from './pages/VoiceAlerts';
import Research from './pages/Research';

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#0B1728', color: '#F8FAFC', border: '1px solid #1E293B', fontSize: '13px' },
          duration: 3500,
        }}
      />
      <Routes>
        {/* Landing Page as Entry Point */}
        <Route path="/" element={<LandingPage />} />

        {/* Command Center Layout Routes */}
        <Route element={<Layout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="priority" element={<Priority />} />
          <Route path="predict" element={<Prediction />} />
          <Route path="reports" element={<Reports />} />
          <Route path="stations" element={<Stations />} />
          <Route path="stations/:id" element={<StationDetail />} />
          <Route path="model-performance" element={<ModelPerformance />} />
          <Route path="timeline" element={<Timeline />} />
          <Route path="research" element={<Research />} />
          <Route path="resources" element={<Resources />} />
          <Route path="weather" element={<WeatherForecast />} />
          <Route path="calls" element={<VoiceAlerts />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
