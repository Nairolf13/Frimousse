import GuideStartPage from '../pages/GuideStartPage';
import GuideAddChildPage from '../pages/GuideAddChildPage';
import GuidePlanningPage from '../pages/GuidePlanningPage';
import GuideExportReportPage from '../pages/GuideExportReportPage';
import GuideSecurityPage from '../pages/GuideSecurityPage';
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
import ParentDashboard from '../pages/ParentDashboard';
import ParentChildSchedule from '../pages/ParentChildSchedule';
import ParentChildReports from '../pages/ParentChildReports';


import AboutPage from '../pages/AboutPage';
import FeaturesPage from '../pages/FeaturesPage';
import PricingPage from '../pages/PricingPage';
import SupportPage from '../pages/SupportPage';
import PrivacyPolicyPage from '../pages/PrivacyPolicyPage';
import TermsPage from '../pages/TermsPage';
import LegalNoticePage from '../pages/LegalNoticePage';



export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />
  <Route path="/about" element={<AboutPage />} />
  <Route path="/fonctionnalites" element={<FeaturesPage />} />
  <Route path="/tarifs" element={<PricingPage />} />
  <Route path="/support" element={<SupportPage />} />
  <Route path="/confidentialite" element={<PrivacyPolicyPage />} />
  <Route path="/cgu" element={<TermsPage />} />
  <Route path="/mentions-legales" element={<LegalNoticePage />} />
  <Route path="/guide-demarrage" element={<GuideStartPage />} />
  <Route path="/guide-ajouter-enfant" element={<GuideAddChildPage />} />
  <Route path="/guide-planning" element={<GuidePlanningPage />} />
  <Route path="/guide-export-rapport" element={<GuideExportReportPage />} />
  <Route path="/guide-securite" element={<GuideSecurityPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/children" element={<Children />} />
          <Route path="/nannies" element={<Nannies />} />
          <Route path="/mon-planning" element={<MonPlanning />} />
          <Route path="/activites" element={<Activites />} />
          <Route path="/parent" element={<ParentDashboard />} />
          <Route path="/parent/child/:childId/schedule" element={<ParentChildSchedule />} />
          <Route path="/parent/child/:childId/reports" element={<ParentChildReports />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

