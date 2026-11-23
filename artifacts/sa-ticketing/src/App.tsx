import { useLocation } from 'wouter';
import { CustomerApp } from '@/portals/customer/CustomerApp';
import { OrganizerApp } from '@/portals/organizer/OrganizerApp';
import { AdminApp } from '@/portals/admin/AdminApp';

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-shell">
      {children}
    </div>
  );
}

function PublicHomePage() {
  return (
    <PublicShell>
      <main className="public-home">
        <section className="hero">
          <div className="hero-content">
            <span className="eyebrow">OUT THERE ZA</span>
            <h1>Three portals.<br /><em>One platform.</em></h1>
            <p>Choose your entry point to access the right experience for you.</p>
          </div>
          <div className="portal-cards">
            <a href="/customer" className="portal-card customer">
              <div className="card-icon">🎫</div>
              <h3>Customer Portal</h3>
              <p>Discover events, buy tickets, manage your bookings.</p>
              <span className="card-cta">Enter <span aria-hidden="true">→</span></span>
            </a>
            <a href="/organizer" className="portal-card organizer">
              <div className="card-icon">🎭</div>
              <h3>Organizer Portal</h3>
              <p>Create events, manage tickets, track sales.</p>
              <span className="card-cta">Enter <span aria-hidden="true">→</span></span>
            </a>
            <a href="/admin" className="portal-card admin">
              <div className="card-icon">🛡️</div>
              <h3>Admin Portal</h3>
              <p>Platform administration and control centre.</p>
              <span className="card-cta">Enter <span aria-hidden="true">→</span></span>
            </a>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}

export function App() {
  const [path] = useLocation();

  // Route to appropriate portal based on URL prefix
  if (path.startsWith('/customer')) {
    return <CustomerApp />;
  }
  if (path.startsWith('/organizer')) {
    return <OrganizerApp />;
  }
  if (path.startsWith('/admin')) {
    return <AdminApp />;
  }

  // Default: public landing page with portal selection
  return <PublicHomePage />;
}

export default App;