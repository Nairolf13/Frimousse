import { lazy, Suspense } from 'react';
import GuideStartPage from '../pages/GuideStartPage';
import GuideAddChildPage from '../pages/GuideAddChildPage';
import GuidePlanningPage from '../pages/GuidePlanningPage';
import GuideExportReportPage from '../pages/GuideExportReportPage';
import GuideSecurityPage from '../pages/GuideSecurityPage';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Lazy load non-critical pages for better code splitting
const LandingPage = lazy(() => import('../pages/LandingPage'));
const LoginPage = lazy(() => import('../pages/LoginPage'));
const RegisterPage = lazy(() => import('../pages/RegisterPage'));
const InvitePage = lazy(() => import('../pages/InvitePage'));
const ResetPassword = lazy(() => import('../pages/ResetPassword'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Children = lazy(() => import('../pages/Children'));
const Nannies = lazy(() => import('../pages/Nannies'));
const ProtectedLayout = lazy(() => import('../components/ProtectedLayout'));
const MonPlanning = lazy(() => import('../pages/MonPlanning'));
const Activites = lazy(() => import('../pages/Activites'));
const ReportsPage = lazy(() => import('../pages/ReportsPage'));
const NotificationsPage = lazy(() => import('../pages/Notifications'));
const Settings = lazy(() => import('../pages/Settings'));
const PaymentHistory = lazy(() => import('../pages/PaymentHistory'));
const ParentDashboard = lazy(() => import('../pages/ParentDashboard'));
const ParentChildSchedule = lazy(() => import('../pages/ParentChildSchedule'));
const ParentChildReports = lazy(() => import('../pages/ParentChildReports'));
const Feed = lazy(() => import('../pages/Feed'));
const AdminReviews = lazy(() => import('../pages/AdminReviews'));
const AboutPage = lazy(() => import('../pages/AboutPage'));
const FeaturesPage = lazy(() => import('../pages/FeaturesPage'));
const PricingPage = lazy(() => import('../pages/PricingPage'));
const SupportPage = lazy(() => import('../pages/SupportPage'));
const PrivacyPolicyPage = lazy(() => import('../pages/PrivacyPolicyPage'));
const TermsPage = lazy(() => import('../pages/TermsPage'));
const LegalNoticePage = lazy(() => import('../pages/LegalNoticePage'));



export default function AppRoutes() {
  const AssistantPage = lazy(() => import('../pages/Assistant'));
  const AdminEmailLogs = lazy(() => import('../pages/AdminEmailLogs'));

  // Loading fallback component
  const LoadingFallback = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: '#f7f4d7'
    }}>
      <div style={{ textAlign: 'center' }}>
        <img src="/imgs/LogoFrimousse.webp" alt="Les Frimousses" style={{ width: '80px', height: '80px', marginBottom: '1rem' }} />
        <div style={{ color: '#08323a', fontFamily: 'system-ui, sans-serif' }}>Chargement...</div>
      </div>
    </div>
  );

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/invite" element={<InvitePage />} />
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
            <Route path="/feed" element={<Feed />} />
            <Route path="/activites" element={<Activites />} />
            <Route path="/parent" element={<ParentDashboard />} />
            <Route path="/parent/child/:childId/schedule" element={<ParentChildSchedule />} />
            <Route path="/parent/child/:childId/reports" element={<ParentChildReports />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/payment-history" element={<PaymentHistory />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin/reviews" element={<AdminReviews />} />
            <Route path="/admin/emaillogs" element={<AdminEmailLogs />} />
            <Route path="/assistant" element={<AssistantPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

