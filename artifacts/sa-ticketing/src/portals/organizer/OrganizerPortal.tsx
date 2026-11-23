import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { CalendarDays, Menu, X, TicketCheck, User, LogOut, ShieldCheck, Plus, Users, Ticket, BarChart3, Settings2, LifeBuoy, CreditCard, FileText, Bell, LogOut as LogOutIcon, ArrowLeft, ArrowRight, ShieldCheck as ShieldCheckIcon, CalendarDays as CalendarDaysIcon, Plus as PlusIcon, Ticket as TicketIcon, Users as UsersIcon, BarChart3 as BarChart3Icon, Settings2 as Settings2Icon, LifeBuoy as LifeBuoyIcon, CreditCard as CreditCardIcon, FileText as FileTextIcon, Bell as BellIcon, ShieldCheck as ShieldCheckIcon2, Clock3 } from 'lucide-react';
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
  return <div className="organizer-settings"><div className="page-heading"><h1>Settings</h1><p>Manage your organiser account settings.</p></div></div>;
}

export function OrganizerPaymentsPage() {
  return <div className="organizer-payments"><div className="page-heading"><h1>PayFast Settings</h1><p>Configure your payment settings.</p></div></div>;
}

export function OrganizerCommunicationsPage() {
  return <div className="organizer-communications"><div className="page-heading"><h1>Communications</h1><p>Send messages to your attendees.</p></div></div>;
}

export function OrganizerTicketsPage() {
  return <div className="organizer-tickets"><div className="page-heading"><h1>Tickets & Categories</h1><p>Manage ticket types and pricing.</p></div></div>;
}

export function OrganizerAttendeesPage() {
  return <div className="organizer-attendees"><div className="page-heading"><h1>Attendees</h1><p>View and manage attendees.</p></div></div>;
}

export function OrganizerSalesPage() {
  return <div className="organizer-sales"><div className="page-heading"><h1>Sales & Reports</h1><p>Track your ticket sales and revenue.</p></div></div>;
}

export function OrganizerHelpPage() {
  return <div className="organizer-help"><div className="page-heading"><h1>Support</h1><p>Get help with your organiser account.</p></div></div>;
}