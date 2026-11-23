import { useLocation } from 'wouter';
import { CustomerApp } from '@/portals/customer/CustomerApp';
import { OrganizerApp } from '@/portals/organizer/OrganizerApp';
import { AdminApp } from '@/portals/admin/AdminApp';

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

  // Portal routing
  if (path.startsWith('/customer')) {
    return <CustomerApp />;
  }
  if (path.startsWith('/organizer')) {
    return <OrganizerApp />;
  }
  if (path.startsWith('/admin')) {
    return <AdminApp />;
  }

  // Default: landing page
  return <LandingPage />;
}

export default App;