import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { CalendarDays, Menu, X, TicketCheck, User, LogOut, ShieldCheck, Plus, Users, Ticket, BarChart3, Settings2, LifeBuoy, CreditCard, FileText, Bell, LogOut as LogOutIcon, ArrowLeft, ArrowRight, ShieldCheck as ShieldCheckIcon, CalendarDays as CalendarDaysIcon, Plus as PlusIcon, Ticket as TicketIcon, Users as UsersIcon, BarChart3 as BarChart3Icon, Settings2 as Settings2Icon, LifeBuoy as LifeBuoyIcon, CreditCard as CreditCardIcon, FileText as FileTextIcon, Bell as BellIcon, ShieldCheck as ShieldCheckIcon2, Clock3, Mail, Shield, Wallet, Activity, Settings } from 'lucide-react';
import { useAuth } from '@/portals/shared/hooks/useAuth';
import { api } from '@/portals/shared/api';
import type { OrganiserEvent, OrganiserDashboardData, OrganiserApplication } from '@/portals/shared/types';

const navItems = [
  ['Overview', '/organizer', CalendarDays, 'overview'],
  ['Create Event', '/organizer/create', Plus, 'create'],
  ['My Events', '/organizer/events', CalendarDays, 'events'],
  ['Tickets & Categories', '/organizer/tickets', Ticket, 'tickets'],
  ['Attendees', '/organizer/attendees', Users, 'attendees'],
  ['Sales & Reports', '/organizer/sales', BarChart3, 'sales'],
  ['Communications', '/organizer/communications', Bell, 'communications'],
  ['Verification', '/organizer/verification', ShieldCheck, 'verification'],
  ['PayFast Settings', '/organizer/payments', CreditCard, 'payments'],
  ['Settings', '/organizer/settings', Settings2, 'settings'],
  ['Support', '/organizer/help', LifeBuoy, 'help'],
] as const;

interface OrganizerLayoutProps {
  children: React.ReactNode;
}

export function OrganizerLayout({ children }: OrganizerLayoutProps) {
  const [path, navigate] = useLocation();
  const { account, loading, isAuthorized, logout, refresh } = useAuth();
  const [dashboardData, setDashboardData] = useState<OrganiserDashboardData | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentOrg, setCurrentOrg] = useState('');

  useEffect(() => {
    if (isAuthorized) {
      api.getOrganiserDashboard().then(data => {
        setDashboardData(data);
        setCurrentOrg(data.events[0]?.organiser || '');
      }).catch(() => {});
    }
  }, [isAuthorized]);

  const signOut = async () => {
    await logout();
    navigate('/organizer');
  };

  if (loading) return <div className="portal-loading">Loading…</div>;

  const activeItem = navItems.find(item => path === item[1] || (item[1] !== '/organizer' && path.startsWith(item[1] + '/')));

  return (
    <div className={`organizer-portal ${mobileMenuOpen ? 'mobile-open' : ''}`}>
      <header className="organizer-header">
        <button className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <button className="wordmark" onClick={() => navigate('/organizer')}>
          <span className="brand-icon"><ShieldCheckIcon2 size={20} /></span>
          <span>out<span>there</span><i>ZA</i></span>
          <span className="portal-badge">ORGANIZER</span>
        </button>

        <nav className="organizer-nav">
          {navItems.map(([name, href, Icon]) => (
            <button key={href} className={path === href || (href !== '/organizer' && path.startsWith(href + '/')) ? 'active' : ''} onClick={() => navigate(href)}>
              <Icon size={17} /> <span>{name}</span>
            </button>
          ))}
        </nav>

        <div className="organizer-actions">
          <button className="btn-secondary slim" onClick={() => navigate('/customer')}>
            <ArrowLeft size={14} /> View marketplace
          </button>
          {isAuthorized ? (
            <>
              <button className="btn-secondary slim" onClick={() => navigate('/organizer/settings')}>
                <User size={16} /> {account?.name?.split(' ')[0] || 'Account'} <ArrowRight size={14} />
              </button>
              <button className="icon-button" onClick={signOut} aria-label="Sign out">
                <LogOutIcon size={18} />
              </button>
            </>
          ) : (
            <button className="btn-primary slim" onClick={() => navigate('/organizer/login')}>
              Sign in <ArrowRight size={14} />
            </button>
          )}
        </div>
      </header>

      <aside className={`organizer-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <nav>
          {navItems.map(([name, href, Icon]) => (
            <button key={href} className={path === href || (href !== '/organizer' && path.startsWith(href + '/')) ? 'active' : ''} onClick={() => { navigate(href); setMobileMenuOpen(false); }}>
              <Icon size={17} /> <span>{name}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button onClick={() => { navigate('/customer'); setMobileMenuOpen(false); }}><ArrowLeft size={16} /> View marketplace</button>
          <button onClick={signOut} className="btn-secondary"><LogOutIcon size={16} /> Sign out</button>
        </div>
      </aside>

      <main className="organizer-main">
        {children}
      </main>
    </div>
  );
}

export function OrganizerDashboardPage() {
  const [, navigate] = useLocation();
  const { dashboardData, isAuthorized } = useAuth();
  const [data, setData] = useState<OrganiserDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthorized) {
      api.getOrganiserDashboard().then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
    }
  }, [isAuthorized]);

  if (loading) return <div className="loading">Loading dashboard…</div>;
  if (!data) return <div className="auth-required">Please sign in.</div>;

  const money = (n: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="organizer-dashboard">
      <div className="page-heading">
        <div>
          <span className="eyebrow">ORGANIZER STUDIO</span>
          <h1>Dashboard</h1>
          <p>Your events, sales and overview at a glance.</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard label="Events" value={data.eventCount} delta="" Icon={CalendarDays} />
        <StatCard label="Tickets sold" value={data.ticketsSold} delta="" Icon={TicketCheck} />
        <StatCard label="Revenue" value={money(data.revenue)} delta="" Icon={BarChart3} tone="green" />
        <StatCard label="Status" value={data.status} delta={data.paymentStatus} Icon={ShieldCheckIcon} tone="violet" />
      </div>

      <div className="dashboard-sections">
        <section className="section-card">
          <div className="section-header">
            <h2>Your Events</h2>
            <button className="btn-primary" onClick={() => navigate('/organizer/create')}><Plus size={16} /> Create Event</button>
          </div>
          {data.events.length ? (
            <div className="event-table">
              <table>
                <thead><tr><th>Event</th><th>Date</th><th>City</th><th>Status</th><th>Sold</th><th>Revenue</th><th></th></tr></thead>
                <tbody>
                  {data.events.map(event => (
                    <tr key={event.id}>
                      <td><b>{event.title}</b><br /><small>{event.category}</small></td>
                      <td>{new Date(event.date).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' })}</td>
                      <td>{event.city}</td>
                      <td><span className={`status status-${event.status.toLowerCase().replace(' ', '-')}`}>{event.status}</span></td>
                      <td>{event.sold} / {event.capacity}</td>
                      <td>{money(event.revenue || 0)}</td>
                      <td><button className="btn-secondary slim" onClick={() => navigate(`/organizer/events/${event.id}`)}>Manage</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <CalendarDays size={32} />
              <h3>No events yet</h3>
              <p>Create your first event to get started.</p>
              <button className="btn-primary" onClick={() => navigate('/organizer/create')}><Plus size={16} /> Create Event</button>
            </div>
          )}
        </section>

        <section className="section-card">
          <div className="section-header">
            <h2>Verification Status</h2>
          </div>
          <div className="verification-status">
            <div className={`status-badge ${data.status}`}>
              <ShieldCheckIcon size={20} />
              <span>{data.status.charAt(0).toUpperCase() + data.status.slice(1)}</span>
            </div>
            <p>Payment: {data.paymentStatus}</p>
            {data.status !== 'approved' && (
              <button className="btn-primary" onClick={() => navigate('/organizer/verification')}>
                View Application
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, delta, Icon, tone = 'violet' }: { label: string; value: string | number; delta: string; Icon: React.ComponentType<{ size?: number }>; tone?: string }) {
  return (
    <div className={`stat-card ${tone}`}>
      <span className={`stat-icon ${tone}`}><Icon size={18} /></span>
      <span className="stat-label">{label}</span>
      <b>{value}</b>
      {delta && <small className="stat-delta">{delta}</small>}
    </div>
  );
}

export function OrganizerEventsPage() {
  const [, navigate] = useLocation();
  const [events, setEvents] = useState<OrganiserEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthorized } = useAuth();

  useEffect(() => {
    if (isAuthorized) {
      api.getOrganiserEvents().then(setEvents).finally(() => setLoading(false));
    }
  }, [isAuthorized]);

  if (loading) return <div className="loading">Loading events…</div>;

  return (
    <div className="organizer-events-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">MANAGE EVENTS</span>
          <h1>Your Events</h1>
          <p>Create, edit and manage all your events.</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/organizer/create')}><Plus size={16} /> Create Event</button>
      </div>

      {events.length ? (
        <div className="event-table">
          <table>
            <thead><tr><th>Event</th><th>Date</th><th>City</th><th>Status</th><th>Sold</th><th>Revenue</th><th></th></tr></thead>
            <tbody>
              {events.map(event => (
                <tr key={event.id}>
                  <td><b>{event.title}</b><br /><small>{event.category}</small></td>
                  <td>{new Date(event.date).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' })}</td>
                  <td>{event.city}</td>
                  <td><span className={`status status-${event.status.toLowerCase().replace(' ', '-')}`}>{event.status}</span></td>
                  <td>{event.sold} / {event.capacity}</td>
                  <td>{new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(event.revenue || 0)}</td>
                  <td><button className="btn-secondary slim" onClick={() => navigate(`/organizer/events/${event.id}`)}>Manage</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <CalendarDays size={32} />
          <h3>No events yet</h3>
          <p>Create your first event to get started.</p>
          <button className="btn-primary" onClick={() => navigate('/organizer/create')}><Plus size={16} /> Create Event</button>
        </div>
      )}
    </div>
  );
}

export function OrganizerCreateEventPage() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '', description: '', category: '', city: '', venue: '',
    startsAt: '', imageUrl: '', authenticityAccepted: false, organiserTermsAccepted: false,
    ticketCategories: [{ name: '', description: '', price: 0, quantityAvailable: 1, salesStart: '', salesEnd: '' }],
    submitForReview: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (name.startsWith('ticketCategories.')) {
      const [, index, field] = name.split('.');
      const categories = [...formData.ticketCategories];
      categories[Number(index)] = { ...categories[Number(index)], [field]: type === 'number' ? Number(value) : value };
      setFormData({ ...formData, ticketCategories: categories });
    } else {
      setFormData({ ...formData, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value });
    }
  };

  const addTicketCategory = () => setFormData({ ...formData, ticketCategories: [...formData.ticketCategories, { name: '', description: '', price: 0, quantityAvailable: 1, salesStart: '', salesEnd: '' }] });
  const removeTicketCategory = (index: number) => setFormData({ ...formData, ticketCategories: formData.ticketCategories.filter((_, i) => i !== index) });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const payload = {
        ...formData,
        startsAt: new Date(formData.startsAt),
        ticketCategories: formData.ticketCategories.map(c => ({
          ...c, price: Number(c.price), quantityAvailable: Number(c.quantityAvailable),
          salesStart: c.salesStart ? new Date(c.salesStart) : null,
          salesEnd: c.salesEnd ? new Date(c.salesEnd) : null,
        })),
      };
      await api.createEvent(payload);
      navigate('/organizer/events');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="organizer-create-event">
      <div className="page-heading">
        <div>
          <span className="eyebrow">CREATE EVENT</span>
          <h1>{step === 1 ? 'Event Details' : step === 2 ? 'Tickets & Pricing' : 'Review & Submit'}</h1>
          <p>{step === 1 ? 'Tell us about your event.' : step === 2 ? 'Set up ticket types and pricing.' : 'Review and submit for review.'}</p>
        </div>
      </div>

      <div className="step-indicator">
        {['Details', 'Tickets', 'Review'].map((s, i) => (
          <div key={s} className={`step ${i + 1 < step ? 'complete' : i + 1 === step ? 'active' : ''}`}>
            <span className="step-number">{i + 1}</span>
            <span className="step-label">{s}</span>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="create-event-form">
        {step === 1 && (
          <>
            <div className="form-section">
              <h3>Basic Information</h3>
              <label>Event title<input name="title" value={formData.title} onChange={handleChange} placeholder="Enter event title" required /></label>
              <label>Category<select name="category" value={formData.category} onChange={handleChange} required>
                <option value="">Select category</option>
                <option>Music</option><option>Food & drink</option><option>Arts & culture</option>
                <option>Sport & outdoors</option><option>Markets</option>
              </select></label>
              <label>Description<textarea name="description" value={formData.description} onChange={handleChange} rows={4} placeholder="Describe your event…" required /></label>
            </div>
            <div className="form-section">
              <h3>Date, Time & Location</h3>
              <label>Date & Time<input type="datetime-local" name="startsAt" value={formData.startsAt} onChange={handleChange} required /></label>
              <label>City<select name="city" value={formData.city} onChange={handleChange} required>
                <option value="">Select city</option>
                <option>Cape Town</option><option>Johannesburg</option><option>Durban</option><option>Pretoria</option>
              </select></label>
              <label>Venue<input name="venue" value={formData.venue} onChange={handleChange} placeholder="Venue name" required /></label>
              <label>Image URL (optional)<input type="url" name="imageUrl" value={formData.imageUrl} onChange={handleChange} placeholder="https://…" /></label>
            </div>
          </>
        )}

        {step === 2 && (
          <div className="form-section">
            <h3>Ticket Categories</h3>
            {formData.ticketCategories.map((cat, i) => (
              <div key={i} className="ticket-category-card">
                <button type="button" className="remove-btn" onClick={() => removeTicketCategory(i)}>×</button>
                <label>Ticket name<input name={`ticketCategories.${i}.name`} value={cat.name} onChange={handleChange} placeholder="e.g. General Admission" required /></label>
                <label>Description<input name={`ticketCategories.${i}.description`} value={cat.description} onChange={handleChange} placeholder="What's included?" /></label>
                <label>Price (ZAR)<input type="number" min="0" step="1" name={`ticketCategories.${i}.price`} value={cat.price} onChange={handleChange} required /></label>
                <label>Quantity<input type="number" min="1" step="1" name={`ticketCategories.${i}.quantityAvailable`} value={cat.quantityAvailable} onChange={handleChange} required /></label>
                <label>Sales start<input type="datetime-local" name={`ticketCategories.${i}.salesStart`} value={cat.salesStart} onChange={handleChange} /></label>
                <label>Sales end<input type="datetime-local" name={`ticketCategories.${i}.salesEnd`} value={cat.salesEnd} onChange={handleChange} /></label>
              </div>
            ))}
            <button type="button" className="btn-secondary" onClick={addTicketCategory}><Plus size={16} /> Add ticket category</button>
            <div className="declarations">
              <label><input type="checkbox" name="authenticityAccepted" checked={formData.authenticityAccepted} onChange={handleChange} required /> I confirm all information is accurate and authentic.</label>
              <label><input type="checkbox" name="organiserTermsAccepted" checked={formData.organiserTermsAccepted} onChange={handleChange} required /> I accept the Organiser Terms & Conditions.</label>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="review-section">
            <h3>Review your event</h3>
            <div className="review-grid">
              <div><strong>Title:</strong> {formData.title}</div>
              <div><strong>Category:</strong> {formData.category}</div>
              <div><strong>Date:</strong> {formData.startsAt ? new Date(formData.startsAt).toLocaleString('en-ZA') : '—'}</div>
              <div><strong>Venue:</strong> {formData.venue}, {formData.city}</div>
              <div><strong>Ticket categories:</strong> {formData.ticketCategories.length}</div>
            </div>
            <label><input type="checkbox" name="submitForReview" checked={formData.submitForReview} onChange={handleChange} /> Submit for review (event will be published after admin approval)</label>
          </div>
        )}

        {error && <div className="form-error">{error}</div>}

        <div className="form-actions">
          {step > 1 && <button type="button" className="btn-secondary" onClick={() => setStep(s => s - 1)}><ArrowLeft size={16} /> Back</button>}
          {step < 3 ? (
            <button type="button" className="btn-primary" onClick={() => setStep(s => s + 1)}>Continue <ArrowRight size={16} /></button>
          ) : (
            <button type="submit" className="btn-primary wide" disabled={busy}>{busy ? 'Creating…' : 'Create Event'} <ArrowRight size={16} /></button>
          )}
        </div>
      </form>
    </div>
  );
}

export function OrganizerVerificationPage() {
  const [, navigate] = useLocation();
  const { isAuthorized } = useAuth();
  const [application, setApplication] = useState<OrganiserApplication | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthorized) {
      api.getOrganiserApplication().then(setApplication).finally(() => setLoading(false));
    }
  }, [isAuthorized]);

  if (loading) return <div className="loading">Loading…</div>;
  if (!application) return <div className="auth-required">No application found.</div>;

  const statusConfig = {
    pending: { title: 'Awaiting Approval', desc: 'Your application is under review.', color: 'warning' },
    approved: { title: 'Verified', desc: 'Your organiser account is approved!', color: 'success' },
    rejected: { title: 'Not Approved', desc: 'Your application was not approved. Review the reason below.', color: 'danger' },
    more_information_required: { title: 'More Information Needed', desc: 'Please update your application with the requested details.', color: 'warning' },
  } as const;

  const status = application.status as keyof typeof statusConfig;
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <div className="organizer-verification">
      <div className="page-heading">
        <div>
          <span className="eyebrow">VERIFICATION</span>
          <h1>Organiser Verification</h1>
          <p>Track your application status and manage documents.</p>
        </div>
      </div>

      <div className={`status-card ${config.color}`}>
        <div className="status-icon">{config.color === 'success' ? <ShieldCheck size={32} /> : config.color === 'danger' ? <X size={32} /> : <Clock3 size={32} />}</div>
        <h2>{config.title}</h2>
        <p>{config.desc}</p>
        {application.decisionReason && <div className="decision-reason"><strong>Decision reason:</strong> {application.decisionReason}</div>}
      </div>

      <div className="verification-details">
        <section className="detail-section">
          <h3>Application Details</h3>
          <div className="detail-grid">
            <div><strong>Organisation:</strong> {application.org}</div>
            <div><strong>Type:</strong> {application.type}</div>
            <div><strong>City:</strong> {application.city}</div>
            <div><strong>Contact:</strong> {application.email}</div>
            <div><strong>Submitted:</strong> {new Date(application.date).toLocaleDateString('en-ZA')}</div>
            <div><strong>Status:</strong> <span className={`status ${application.verificationStatus.toLowerCase()}`}>{application.verificationStatus}</span></div>
          </div>
        </section>

        {application.docs.length > 0 && (
          <section className="detail-section">
            <h3>Documents</h3>
            <ul>{application.docs.map(d => <li key={d}>{d}</li>)}</ul>
          </section>
        )}

        {(application.status === 'rejected' || application.status === 'more_information_required') && (
          <button className="btn-primary" onClick={() => navigate('/organizer/apply')}>
            {application.status === 'rejected' ? 'Resubmit Application' : 'Update Application'}
          </button>
        )}
      </div>
    </div>
  );
}

export function OrganizerSettingsPage() {
  const { account, isAuthorized } = useAuth();
  const [formData, setFormData] = useState({
    name: account?.name || '',
    email: account?.email || '',
    phone: '',
    marketingConsent: false,
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setSaved(false);
    // TODO: API call
    await new Promise(r => setTimeout(r, 500));
    setBusy(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <OrganizerLayout>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ACCOUNT SETTINGS</span>
          <h1>Settings</h1>
          <p>Manage your organiser account and preferences.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="settings-form">
        <section className="form-section">
          <h3>Profile</h3>
          <label>Full name<input name="name" value={formData.name} onChange={handleChange} required /></label>
          <label>Email<input type="email" name="email" value={formData.email} onChange={handleChange} required /></label>
          <label>Phone<input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+27" /></label>
        </section>

        <section className="form-section">
          <h3>Preferences</h3>
          <label className="checkbox-label">
            <input type="checkbox" name="marketingConsent" checked={formData.marketingConsent} onChange={handleChange} />
            <span>Receive marketing emails and platform updates</span>
          </label>
        </section>

        {saved && <div className="form-success">Settings saved successfully!</div>}

        <div className="form-actions">
          <button type="submit" className="btn-primary wide" disabled={busy}>{busy ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </form>
    </OrganizerLayout>
  );
}

export function OrganizerPaymentsPage() {
  const { isAuthorized } = useAuth();
  const [config, setConfig] = useState<{
    sandboxMerchantId: string;
    sandboxMerchantKey: string;
    sandboxPassphrase: string;
    liveMerchantId: string;
    liveMerchantKey: string;
    livePassphrase: string;
    environment: 'sandbox' | 'live';
  }>({
    sandboxMerchantId: '', sandboxMerchantKey: '', sandboxPassphrase: '',
    liveMerchantId: '', liveMerchantKey: '', livePassphrase: '',
    environment: 'sandbox',
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setConfig({ ...config, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setSaved(false);
    // TODO: API call
    await new Promise(r => setTimeout(r, 500));
    setBusy(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <OrganizerLayout>
      <div className="page-heading">
        <div>
          <span className="eyebrow">PAYMENT SETTINGS</span>
          <h1>PayFast Configuration</h1>
          <p>Configure your PayFast credentials for ticket payments.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="payments-form">
        <div className="env-tabs">
          <button type="button" className={config.environment === 'sandbox' ? 'active' : ''} onClick={() => setConfig({ ...config, environment: 'sandbox' })}>Sandbox (Testing)</button>
          <button type="button" className={config.environment === 'live' ? 'active' : ''} onClick={() => setConfig({ ...config, environment: 'live' })}>Live (Production)</button>
        </div>

        <section className="form-section">
          <h3>{config.environment === 'sandbox' ? 'Sandbox' : 'Live'} Credentials</h3>
          <label>Merchant ID<input name={config.environment === 'sandbox' ? 'sandboxMerchantId' : 'liveMerchantId'} value={config[config.environment === 'sandbox' ? 'sandboxMerchantId' : 'liveMerchantId']} onChange={handleChange} placeholder="10000100" /></label>
          <label>Merchant Key<input name={config.environment === 'sandbox' ? 'sandboxMerchantKey' : 'liveMerchantKey'} value={config[config.environment === 'sandbox' ? 'sandboxMerchantKey' : 'liveMerchantKey']} onChange={handleChange} placeholder="46f0cd69..." /></label>
          <label>Passphrase<input type="password" name={config.environment === 'sandbox' ? 'sandboxPassphrase' : 'livePassphrase'} value={config[config.environment === 'sandbox' ? 'sandboxPassphrase' : 'livePassphrase']} onChange={handleChange} placeholder="Optional passphrase" /></label>
        </section>

        {saved && <div className="form-success">PayFast settings saved!</div>}

        <div className="form-actions">
          <button type="submit" className="btn-primary wide" disabled={busy}>{busy ? 'Saving…' : 'Save Configuration'}</button>
        </div>
      </form>
    </OrganizerLayout>
  );
}

export function OrganizerCommunicationsPage() {
  const [, navigate] = useLocation();
  const [messages, setMessages] = useState<Array<{ id: number; subject: string; audience: string; sentAt: string; recipients: number; status: string }>>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ subject: '', message: '', audience: 'all' });

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: API call
    await new Promise(r => setTimeout(r, 500));
    setMessages([{ id: Date.now(), subject: formData.subject, audience: formData.audience, sentAt: new Date().toISOString(), recipients: 10, status: 'sent' }, ...messages]);
    setShowModal(false);
    setFormData({ subject: '', message: '', audience: 'all' });
  };

  return (
    <OrganizerLayout>
      <div className="page-heading">
        <div>
          <span className="eyebrow">COMMUNICATIONS</span>
          <h1>Messages</h1>
          <p>Send messages to your event attendees.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}><Plus size={16} /> New Message</button>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>New Message</h2>
            <form onSubmit={sendMessage} className="modal-form">
              <label>Subject<input name="subject" value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} placeholder="Your message subject" required /></label>
              <label>Audience<select name="audience" value={formData.audience} onChange={e => setFormData({ ...formData, audience: e.target.value })}>
                <option value="all">All attendees</option>
                <option value="upcoming">Upcoming events</option>
                <option value="past">Past events</option>
              </select></label>
              <label>
                Message
                <textarea name="message" value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} rows={6} placeholder="Your message…" required />
              </label>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Send Message</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="communications-list">
        {messages.length ? (
          <table>
            <thead><tr><th>Subject</th><th>Audience</th><th>Sent</th><th>Recipients</th><th>Status</th></tr></thead>
            <tbody>
              {messages.map(m => (
                <tr key={m.id}>
                  <td><b>{m.subject}</b></td>
                  <td>{m.audience}</td>
                  <td>{new Date(m.sentAt).toLocaleString('en-ZA')}</td>
                  <td>{m.recipients}</td>
                  <td><span className={`status status-${m.status}`}>{m.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <Mail size={32} />
            <h3>No messages sent yet</h3>
            <p>Send your first message to attendees.</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}><Plus size={16} /> Compose Message</button>
          </div>
        )}
      </div>
    </OrganizerLayout>
  );
}

export function OrganizerTicketsPage() {
  const [, navigate] = useLocation();
  return (
    <OrganizerLayout>
      <div className="page-heading">
        <div>
          <span className="eyebrow">TICKETS & CATEGORIES</span>
          <h1>Ticket Types & Pricing</h1>
          <p>Manage ticket categories across your events.</p>
        </div>
      </div>
      <div className="empty-state">
        <Ticket size={32} />
        <h3>No ticket categories configured yet</h3>
        <p>Create an event and add ticket categories to get started.</p>
        <button className="btn-primary" onClick={() => navigate('/organizer/create')}><Plus size={16} /> Create Event</button>
      </div>
    </OrganizerLayout>
  );
}

export function OrganizerAttendeesPage() {
  return (
    <OrganizerLayout>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ATTENDEES</span>
          <h1>Attendees</h1>
          <p>View and manage all event attendees.</p>
        </div>
      </div>
      <div className="empty-state">
        <Users size={32} />
        <h3>No attendees yet</h3>
        <p>Attendees will appear here once tickets are sold.</p>
      </div>
    </OrganizerLayout>
  );
}

export function OrganizerSalesPage() {
  return (
    <OrganizerLayout>
      <div className="page-heading">
        <div>
          <span className="eyebrow">SALES & REPORTS</span>
          <h1>Sales & Reports</h1>
          <p>Track your ticket sales and revenue.</p>
        </div>
      </div>
      <div className="empty-state">
        <BarChart3 size={32} />
        <h3>No sales data yet</h3>
        <p>Sales data will appear here once tickets are sold.</p>
      </div>
    </OrganizerLayout>
  );
}

export function OrganizerHelpPage() {
  return (
    <OrganizerLayout>
      <div className="page-heading">
        <div>
          <span className="eyebrow">SUPPORT</span>
          <h1>Help & Support</h1>
          <p>Get help with your organiser account.</p>
        </div>
      </div>
      <div className="help-content">
        <section className="help-section">
          <h3>Getting Started</h3>
          <ul>
            <li><a href="/organizer/verification">Complete your verification</a></li>
            <li><a href="/organizer/create">Create your first event</a></li>
            <li><a href="/organizer/payments">Configure PayFast payments</a></li>
          </ul>
        </section>
        <section className="help-section">
          <h3>Common Questions</h3>
          <ul>
            <li>How do I get paid? Payouts are processed weekly.</li>
            <li>Can I refund tickets? Yes, from the event sales page.</li>
            <li>How do I scan tickets? Use the QR scanner in the app.</li>
          </ul>
        </section>
        <section className="help-section">
          <h3>Contact Support</h3>
          <p>Email: support@outthereza.com | Response within 24 hours.</p>
        </section>
      </div>
    </OrganizerLayout>
  );
}