import { useLocation } from 'wouter';
import { lazy, Suspense, useState, useEffect } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';

// Lazy-load portals to isolate failures and reduce initial bundle
const CustomerApp = lazy(() => import('@/portals/customer/CustomerApp').then(m => ({ default: m.CustomerApp })));
const OrganizerApp = lazy(() => import('@/portals/organizer/OrganizerApp').then(m => ({ default: m.OrganizerApp })));
const AdminApp = lazy(() => import('@/portals/admin/AdminApp').then(m => ({ default: m.AdminApp })));

function PortalFallback({ portalName }: { portalName: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-500 border-t-transparent mx-auto mb-4" />
        <p className="text-gray-600">Loading {portalName}…</p>
      </div>
    </div>
  );
}

function LandingPage() {
  return (
    <main className="landing-page">
      <header className="landing-header">
        <span className="brand-wordmark">out<span>there</span><i>ZA</i></span>
      </header>

      <section className="landing-hero">
        <div className="hero-content">
          <span className="eyebrow">OUT THERE ZA</span>
          <h1>South Africa's<br /><em>event marketplace.</em></h1>
          <p>Discover live events across the country or create your own. Tickets, check-in, payouts — all in one platform.</p>
        </div>
        <div className="hero-image" />
      </section>

      <section className="landing-cta">
        <a href="/customer/login" className="cta-card customer">
          <div className="cta-icon">🎫</div>
          <h3>Buy Tickets</h3>
          <p>Browse events, purchase securely, get instant QR tickets.</p>
          <span className="cta-arrow">Enter as Customer →</span>
        </a>
        <a href="/organizer/login" className="cta-card organizer">
          <div className="cta-icon">🎭</div>
          <h3>Create Events</h3>
          <p>Organise, sell tickets, manage attendees, get paid.</p>
          <span className="cta-arrow">Enter as Organiser →</span>
        </a>
      </section>

      <footer className="landing-footer">
        <p>Platform administration: <a href="/admin">/admin</a></p>
      </footer>
    </main>
  );
}

export function App() {
  const [path] = useLocation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  // Portal routing with error boundaries + lazy loading
  if (path.startsWith('/customer')) {
    return (
      <ErrorBoundary resetKey={path}>
        <Suspense fallback={<PortalFallback portalName="Customer Portal" />}>
          <CustomerApp />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (path.startsWith('/organizer')) {
    return (
      <ErrorBoundary resetKey={path}>
        <Suspense fallback={<PortalFallback portalName="Organiser Portal" />}>
          <OrganizerApp />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (path.startsWith('/admin')) {
    return (
      <ErrorBoundary resetKey={path}>
        <Suspense fallback={<PortalFallback portalName="Admin Portal" />}>
          <AdminApp />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // Default: landing page (no portal chrome, no auth, no suspense)
  return <LandingPage />;
}

export default App;