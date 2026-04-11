import { lazy, Suspense, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import GuideStartPage from '../pages/GuideStartPage';
import GuideAddChildPage from '../pages/GuideAddChildPage';
import GuidePlanningPage from '../pages/GuidePlanningPage';
import GuideExportReportPage from '../pages/GuideExportReportPage';
import GuideSecurityPage from '../pages/GuideSecurityPage';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Listens for sw:navigate events dispatched when a push notification is clicked
function SWNavigationHandler() {
  const navigate = useNavigate();
  useEffect(() => {
    const handler = (e: Event) => {
      const url = (e as CustomEvent<{ url: string }>).detail?.url;
      if (url) navigate(url);
    };
    window.addEventListener('sw:navigate', handler);
    return () => window.removeEventListener('sw:navigate', handler);
  }, [navigate]);
  return null;
}

/**
 * Wrapper around React.lazy that auto-reloads the page when a dynamic
 * import fails (e.g. after a new deployment replaced the hashed chunks).
 * A sessionStorage flag prevents infinite reload loops.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lazyWithRetry(factory: () => Promise<{ default: React.ComponentType<any> }>) {
  return lazy(() =>
    factory().catch((err: unknown) => {
      const key = 'chunk-reload';
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
        // Return a never-resolving promise so React doesn't render the broken module
        return new Promise(() => {});
      }
      // Already tried reloading once — throw to let error boundary handle it
      sessionStorage.removeItem(key);
      throw err;
    })
  );
}

// Clear the reload flag once we successfully load the page
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => sessionStorage.removeItem('chunk-reload'));
}

// Lazy load non-critical pages for better code splitting
const LandingPage = lazyWithRetry(() => import('../pages/LandingPage'));
const LoginPage = lazyWithRetry(() => import('../pages/LoginPage'));
const RegisterPage = lazyWithRetry(() => import('../pages/RegisterPage'));
const VerifyEmailPage = lazyWithRetry(() => import('../pages/VerifyEmailPage'));
const CompleteProfilePage = lazyWithRetry(() => import('../pages/CompleteProfilePage'));
const InvitePage = lazyWithRetry(() => import('../pages/InvitePage'));
const ResetPassword = lazyWithRetry(() => import('../pages/ResetPassword'));
const Dashboard = lazyWithRetry(() => import('../pages/Dashboard'));
const Children = lazyWithRetry(() => import('../pages/Children'));
const Nannies = lazyWithRetry(() => import('../pages/Nannies'));
const ProtectedLayout = lazyWithRetry(() => import('../components/ProtectedLayout'));
const MonPlanning = lazyWithRetry(() => import('../pages/MonPlanning'));
const Activites = lazyWithRetry(() => import('../pages/Activites'));
const ReportsPage = lazyWithRetry(() => import('../pages/ReportsPage'));
const NotificationsPage = lazyWithRetry(() => import('../pages/Notifications'));
const Settings = lazyWithRetry(() => import('../pages/Settings'));
const PaymentHistory = lazyWithRetry(() => import('../pages/PaymentHistory'));
const ParentDashboard = lazyWithRetry(() => import('../pages/ParentDashboard'));
const ParentChildSchedule = lazyWithRetry(() => import('../pages/ParentChildSchedule'));
const ParentChildReports = lazyWithRetry(() => import('../pages/ParentChildReports'));
const Feed = lazyWithRetry(() => import('../pages/Feed'));
const AdminReviews = lazyWithRetry(() => import('../pages/AdminReviews'));
const AboutPage = lazyWithRetry(() => import('../pages/AboutPage'));
const FeaturesPage = lazyWithRetry(() => import('../pages/FeaturesPage'));
const PricingPage = lazyWithRetry(() => import('../pages/PricingPage'));
const SupportPage = lazyWithRetry(() => import('../pages/SupportPage'));
const PrivacyPolicyPage = lazyWithRetry(() => import('../pages/PrivacyPolicyPage'));
const TermsPage = lazyWithRetry(() => import('../pages/TermsPage'));
const LegalNoticePage = lazyWithRetry(() => import('../pages/LegalNoticePage'));
const AssistantPage = lazyWithRetry(() => import('../pages/Assistant'));
const SubscriptionManagement = lazyWithRetry(() => import('../pages/SubscriptionManagement'));
const AdminEmailLogs = lazyWithRetry(() => import('../pages/AdminEmailLogs'));
const AdminCenters = lazyWithRetry(() => import('../pages/AdminCenters'));
const AdminSupport = lazyWithRetry(() => import('../pages/AdminSupport'));
const AdminAnnouncements = lazyWithRetry(() => import('../pages/AdminAnnouncements'));
const PresenceSheets = lazyWithRetry(() => import('../pages/PresenceSheets'));
const Messaging = lazyWithRetry(() => import('../pages/Messaging'));
const DirectoryPage = lazyWithRetry(() => import('../pages/DirectoryPage'));
const TrialExpiredPage = lazyWithRetry(() => import('../pages/TrialExpiredPage'));
const LandingMAMPage = lazyWithRetry(() => import('../pages/LandingMAMPage'));
const LandingCrechePage = lazyWithRetry(() => import('../pages/LandingCrechePage'));
const LandingMicroCrechePage = lazyWithRetry(() => import('../pages/LandingMicroCrechePage'));
const NotFoundPage = lazyWithRetry(() => import('../pages/NotFoundPage'));

const LoadingFallback = () => (
  <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-brand-800 via-brand-600 to-brand-500">
    <div className="flex flex-col items-center gap-6 animate-fade-in">
      <div className="w-24 h-24 rounded-full flex items-center justify-center bg-white/10 shadow-lg mb-2">
        <img src="/imgs/LogoFrimousse.webp" alt="Les Frimousses" className="w-16 h-16 object-contain" />
      </div>
      <div className="text-white text-xl font-bold tracking-tight">Chargement…</div>
      <div className="mt-2">
        <svg className="animate-spin w-8 h-8 text-white/70" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.2"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" fill="none"/></svg>
      </div>
    </div>
  </div>
);



function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <SWNavigationHandler />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/invite" element={<InvitePage />} />
          <Route path="/complete-profile" element={<CompleteProfilePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/fonctionnalites" element={<FeaturesPage />} />
          <Route path="/tarifs" element={<PricingPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/confidentialite" element={<PrivacyPolicyPage />} />
          <Route path="/cgu" element={<TermsPage />} />
          <Route path="/mentions-legales" element={<LegalNoticePage />} />
          <Route path="/annuaire" element={<DirectoryPage />} />
          <Route path="/trial-expired" element={<TrialExpiredPage />} />
          <Route path="/logiciel-mam" element={<LandingMAMPage />} />
          <Route path="/logiciel-creche" element={<LandingCrechePage />} />
          <Route path="/logiciel-micro-creche" element={<LandingMicroCrechePage />} />
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
            <Route path="/admin/centers" element={<AdminCenters />} />
            <Route path="/admin/support" element={<AdminSupport />} />
            <Route path="/admin/announcements" element={<AdminAnnouncements />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/subscription" element={<SubscriptionManagement />} />
            <Route path="/presence-sheets" element={<PresenceSheets />} />
            <Route path="/messages" element={<Messaging />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

