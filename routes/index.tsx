import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import Dashboard from '../pages/Dashboard';
import Children from '../pages/Children';
import Nannies from '../pages/Nannies';
import ProtectedLayout from '../components/ProtectedLayout';
import MonPlanning from '../pages/MonPlanning';
import Activites from '../pages/Activites';
import ReportsPage from '../pages/ReportsPage';
import Settings from '../pages/Settings';



export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/children" element={<Children />} />
          <Route path="/nannies" element={<Nannies />} />
          <Route path="/mon-planning" element={<MonPlanning />} />
          <Route path="/activites" element={<Activites />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

