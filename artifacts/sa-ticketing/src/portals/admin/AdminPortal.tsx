import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Shield, Menu, X, Users, BarChart3, Settings, Shield as ShieldIcon, FileText, Wallet, Flag, Mail, Activity, LogOut, ArrowLeft, ArrowRight, TicketCheck, CalendarDays, CreditCard, Users as UsersIcon, Ticket as TicketIcon, BarChart3 as BarChart3Icon, Settings as SettingsIcon, Shield as ShieldIcon2, FileText as FileTextIcon, Wallet as WalletIcon, Flag as FlagIcon, Mail as MailIcon, Activity as ActivityIcon } from 'lucide-react';
import { useAuth } from '@/portals/shared/hooks/useAuth';
import { api } from '@/portals/shared/api';
import type { AdminDashboardStats, AdminApplication, AdminDashboardStats as AdminStats } from '@/portals/shared/types';

const adminNavItems = [
  ['Overview', '/admin', ShieldIcon2, 'overview'],
  ['Organiser Applications', '/admin/applications', FileText, 'applications'],
  ['Verified Organisers', '/admin/organisers', Shield, 'organisers'],
  ['Event Applications', '/admin/events', CalendarDays, 'events'],
  ['Customer Management', '/admin/customers', UsersIcon, 'customers'],
  ['Ticket Sales', '/admin/sales', TicketIcon, 'sales'],
  ['Transactions', '/admin/transactions', Wallet, 'transactions'],
  ['Commission & Payouts', '/admin/payouts', WalletIcon, 'payouts'],
  ['Refunds & Disputes', '/admin/disputes', Flag, 'disputes'],
  ['Reports', '/admin/reports', BarChart3Icon, 'reports'],
  ['Communications', '/admin/communications', Mail, 'communications'],
  ['Email Outbox', '/admin/emails', Mail, 'emails'],
  ['Onboarding Payments', '/admin/onboarding', Wallet, 'onboarding'],
  ['Audit Logs', '/admin/audit', Activity, 'audit'],
  ['Platform Settings', '/admin/settings', SettingsIcon, 'settings'],
] as const;

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [path, navigate] = useLocation();
  const { account, loading, isAuthorized, logout, refresh } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isAuthorized) {
      api.getAdminDashboard().then(setStats).catch(() => {});
    }
  }, [isAuthorized]);

  const signOut = async () => {
    await logout();
    navigate('/admin');
  };

  if (loading) return <div className="portal-loading">Loading…</div>;

  return (
    <div className={`admin-portal ${mobileMenuOpen ? 'mobile-open' : ''}`}>
      <header className="admin-header">
        <button className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <button className="wordmark" onClick={() => navigate('/admin')}>
          <span className="brand-icon"><Shield size={20} /></span>
          <span>out<span>there</span><i>ZA</i></span>
          <span className="portal-badge">ADMIN</span>
        </button>

        <nav className="admin-nav">
          {adminNavItems.map(([name, href, Icon]) => (
            <button key={href} className={path === href || (href !== '/admin' && path.startsWith(href + '/')) ? 'active' : ''} onClick={() => navigate(href)}>
              <Icon size={17} /> <span>{name}</span>
            </button>
          ))}
        </nav>

        <div className="admin-actions">
          <button className="btn-secondary slim" onClick={() => navigate('/customer')}>
            <ArrowLeft size={14} /> View marketplace
          </button>
          {isAuthorized ? (
            <>
              <button className="btn-secondary slim" onClick={() => navigate('/admin/settings')}>
                <Shield size={16} /> {account?.name?.split(' ')[0] || 'Admin'} <ArrowRight size={14} />
              </button>
              <button className="icon-button" onClick={signOut} aria-label="Sign out">
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <button className="btn-primary slim" onClick={() => navigate('/admin/login')}>
              Sign in <ArrowRight size={14} />
            </button>
          )}
        </div>
      </header>

      <aside className={`admin-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <nav>
          {adminNavItems.map(([name, href, Icon]) => (
            <button key={href} className={path === href || (href !== '/admin' && path.startsWith(href + '/')) ? 'active' : ''} onClick={() => { navigate(href); setMobileMenuOpen(false); }}>
              <Icon size={17} /> <span>{name}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button onClick={signOut} className="btn-secondary"><LogOut size={16} /> Sign out</button>
        </div>
      </aside>

      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}

export function AdminDashboardPage() {
  const [, navigate] = useLocation();
  const { isAuthorized } = useAuth();
  const [stats, setStats] = useState<import('@/portals/shared/types').AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthorized) {
      api.getAdminDashboard().then(setStats).finally(() => setLoading(false));
    }
  }, [isAuthorized]);

  if (loading) return <div className="loading">Loading dashboard…</div>;

  const money = (n: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="admin-dashboard">
      <div className="page-heading">
        <div>
          <span className="eyebrow">PLATFORM ADMINISTRATION</span>
          <h1>Platform Overview</h1>
          <p>System-wide metrics and platform health.</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard label="Total Events" value={stats?.events || 0} Icon={CalendarDays} />
        <StatCard label="Pending Event Apps" value={stats?.pendingEventApplications || 0} Icon={FileText} tone="warning" />
        <StatCard label="Pending Org Apps" value={stats?.pendingOrganiserApplications || 0} Icon={FileText} tone="warning" />
        <StatCard label="Verified Organisers" value={stats?.verifiedOrganisers || 0} Icon={Shield} tone="success" />
        <StatCard label="Tickets Sold" value={stats?.ticketsSold || 0} Icon={TicketCheck} />
        <StatCard label="Gross Revenue" value={money(stats?.grossRevenue || 0)} Icon={Wallet} tone="green" />
      </div>

      <div className="dashboard-sections">
        <section className="section-card">
          <h2>Quick Actions</h2>
          <div className="action-buttons">
            <button className="btn-secondary" onClick={() => navigate('/admin/applications')}>Review Organiser Applications</button>
            <button className="btn-secondary" onClick={() => navigate('/admin/events')}>Review Event Applications</button>
            <button className="btn-secondary" onClick={() => navigate('/admin/onboarding')}>Manage Onboarding Payments</button>
            <button className="btn-secondary" onClick={() => navigate('/admin/organisers')}>Manage Organisers</button>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, Icon, tone = 'violet' }: { label: string; value: number | string; Icon: React.ComponentType<{ size?: number }>; tone?: string }) {
  return (
    <div className={`stat-card ${tone}`}>
      <span className={`stat-icon ${tone}`}><Icon size={18} /></span>
      <span className="stat-label">{label}</span>
      <b>{value}</b>
    </div>
  );
}

export function AdminApplicationsPage() {
  const [applications, setApplications] = useState<import('@/portals/shared/types').AdminApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthorized } = useAuth();

  useEffect(() => {
    if (isAuthorized) {
      api.getAdminApplications().then(setApplications).finally(() => setLoading(false));
    }
  }, [isAuthorized]);

  const decide = async (id: number, decision: 'approve' | 'reject' | 'request_information') => {
    const note = prompt(`Review note for ${decision}:`);
    if (!note) return;
    try {
      await api.decideApplication(id, decision, note);
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status: decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'more_information_required' } : a));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to decide');
    }
  };

  if (loading) return <div className="loading">Loading applications…</div>;

  return (
    <div className="admin-applications-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">ORGANISER APPLICATIONS</span>
          <h1>Applications</h1>
          <p>Review and decide on organiser applications.</p>
        </div>
      </div>

      {applications.length ? (
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Organiser</th><th>Organisation</th><th>Type</th><th>City</th><th>Status</th><th>Submitted</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {applications.map(app => (
                <tr key={app.id}>
                  <td><b>{app.name}</b><br /><small>{app.email}</small></td>
                  <td>{app.org}</td>
                  <td>{app.type}</td>
                  <td>{app.city}</td>
                  <td><span className={`status status-${app.status.toLowerCase().replace(' ', '-')}`}>{app.status.charAt(0).toUpperCase() + app.status.slice(1)}</span></td>
                  <td>{new Date(app.date).toLocaleDateString('en-ZA')}</td>
                  <td>
                    {app.status === 'pending' && (
                      <>
                        <button className="btn-success slim" onClick={() => decide(app.id, 'approve')}>Approve</button>
                        <button className="btn-warning slim" onClick={() => decide(app.id, 'request_information')}>More Info</button>
                        <button className="btn-danger slim" onClick={() => decide(app.id, 'reject')}>Reject</button>
                      </>
                    )}
                    {app.status !== 'pending' && <span className="status-badge">{app.status}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">No applications yet.</div>
      )}
    </div>
  );
}

export function AdminOrganisersPage() {
  const [organisers, setOrganisers] = useState<Array<{
    id: number; name: string; email: string; phone: string; role: string; marketingConsent: boolean; createdAt: string; organisationName: string | null; organiserStatus: string; onboardingPaymentStatus: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthorized } = useAuth();

  useEffect(() => {
    if (isAuthorized) {
      api.getAdminOrganisers().then(setOrganisers).finally(() => setLoading(false));
    }
  }, [isAuthorized]);

  if (loading) return <div className="loading">Loading organisers…</div>;

  return (
    <div className="admin-organisers-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">VERIFIED ORGANISERS</span>
          <h1>Organisers</h1>
          <p>Manage verified organisers on the platform.</p>
        </div>
      </div>

      {organisers.length ? (
        <div className="table-container">
          <table>
            <thead><tr><th>Organiser</th><th>Organisation</th><th>Email</th><th>Status</th><th>Payment</th><th>Joined</th></tr></thead>
            <tbody>
              {organisers.map(org => (
                <tr key={org.id}>
                  <td><b>{org.name}</b><br /><small>{org.email}</small></td>
                  <td>{org.organisationName || '—'}</td>
                  <td>{org.email}</td>
                  <td><span className={`status status-${org.organiserStatus.toLowerCase()}`}>{org.organiserStatus}</span></td>
                  <td><span className={`status status-${org.onboardingPaymentStatus.toLowerCase()}`}>{org.onboardingPaymentStatus}</span></td>
                  <td>{new Date(org.createdAt).toLocaleDateString('en-ZA')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">No organisers yet.</div>
      )}
    </div>
  );
}

export function AdminEventsPage() {
  const [events, setEvents] = useState<import('@/portals/shared/types').EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthorized } = useAuth();

  useEffect(() => {
    if (isAuthorized) {
      api.getAdminEvents().then(setEvents).finally(() => setLoading(false));
    }
  }, [isAuthorized]);

  const decide = async (id: number, decision: 'approve' | 'publish' | 'reject' | 'request_information' | 'suspend' | 'restore') => {
    const note = prompt(`Review note for ${decision}:`);
    if (!note) return;
    try {
      await api.decideEvent(id, decision, note);
      // Refresh would be needed
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to decide');
    }
  };

  if (loading) return <div className="loading">Loading events…</div>;

  return (
    <div className="admin-events-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">EVENT APPLICATIONS</span>
          <h1>Events</h1>
          <p>Review and manage platform events.</p>
        </div>
      </div>

      {events.length ? (
        <div className="table-container">
          <table>
            <thead><tr><th>Event</th><th>Organiser</th><th>Date</th><th>City</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {events.map(event => (
                <tr key={event.id}>
                  <td><b>{event.title}</b><br /><small>{event.category}</small></td>
                  <td>{event.organiser}</td>
                  <td>{new Date(event.date).toLocaleDateString('en-ZA')}</td>
                  <td>{event.city}</td>
                  <td><span className={`status status-${event.status.toLowerCase().replace(' ', '-')}`}>{event.status}</span></td>
                  <td>
                    {event.status === 'pending' && (
                      <>
                        <button className="btn-success slim" onClick={() => decide(event.id, 'approve')}>Approve</button>
                        <button className="btn-warning slim" onClick={() => decide(event.id, 'request_information')}>More Info</button>
                        <button className="btn-danger slim" onClick={() => decide(event.id, 'reject')}>Reject</button>
                      </>
                    )}
                    {event.status === 'approved' && <button className="btn-success slim" onClick={() => decide(event.id, 'publish')}>Publish</button>}
                    {event.status === 'published' && <button className="btn-warning slim" onClick={() => decide(event.id, 'suspend')}>Suspend</button>}
                    {event.status === 'suspended' && <button className="btn-success slim" onClick={() => decide(event.id, 'restore')}>Restore</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">No events yet.</div>
      )}
    </div>
  );
}

export function AdminReportsPage() {
  return <div className="admin-reports-page"><div className="page-heading"><h1>Reports</h1><p>View and manage customer reports.</p></div></div>;
}

export function AdminCustomersPage() {
  return <div className="admin-customers-page"><div className="page-heading"><h1>Customer Management</h1><p>Manage customer accounts.</p></div></div>;
}

export function AdminSalesPage() {
  return <div className="admin-sales-page"><div className="page-heading"><h1>Ticket Sales</h1><p>View all ticket sales across the platform.</p></div></div>;
}

export function AdminTransactionsPage() {
  return <div className="admin-transactions-page"><div className="page-heading"><h1>Transactions</h1><p>Monitor all platform transactions.</p></div></div>;
}

export function AdminPayoutsPage() {
  return <div className="admin-payouts-page"><div className="page-heading"><h1>Commission & Payouts</h1><p>Manage commissions and organiser payouts.</p></div></div>;
}

export function AdminDisputesPage() {
  return <div className="admin-disputes-page"><div className="page-heading"><h1>Refunds & Disputes</h1><p>Handle refunds and payment disputes.</p></div></div>;
}

export function AdminCommunicationsPage() {
  return <div className="admin-communications-page"><div className="page-heading"><h1>Communications</h1><p>Send platform-wide communications.</p></div></div>;
}

export function AdminEmailsPage() {
  return <div className="admin-emails-page"><div className="page-heading"><h1>Email Outbox</h1><p>View all emails sent by the platform.</p></div></div>;
}

export function AdminOnboardingPage() {
  return <div className="admin-onboarding-page"><div className="page-heading"><h1>Onboarding Payments</h1><p>Track organiser onboarding payments.</p></div></div>;
}

export function AdminAuditPage() {
  return <div className="admin-audit-page"><div className="page-heading"><h1>Audit Logs</h1><p>View platform audit trail.</p></div></div>;
}

export function AdminSettingsPage() {
  return <div className="admin-settings-page"><div className="page-heading"><h1>Platform Settings</h1><p>Configure platform-wide settings.</p></div></div>;
}