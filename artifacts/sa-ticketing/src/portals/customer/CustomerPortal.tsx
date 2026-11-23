import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Ticket, Menu, X, TicketCheck, User, LogOut, Search, MapPin, ArrowRight, ArrowLeft, CalendarDays, MapPin as MapPinIcon, CalendarDays as CalendarDaysIcon, MapPin as MapPinIcon2, ArrowLeft as ArrowLeftIcon, ArrowRight as ArrowRightIcon, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/portals/shared/hooks/useAuth';
import { api } from '@/portals/shared/api';
import type { EventItem, CustomerTicket, EventDetail } from '@/portals/shared/types';

interface CustomerLayoutProps {
  children: React.ReactNode;
}

export function CustomerLayout({ children }: CustomerLayoutProps) {
  const [path, navigate] = useLocation();
  const { account, loading, isAuthorized, logout, refresh } = useAuth();
  const [events, setEvents] = useState<import('@/portals/shared/types').EventItem[]>([]);
  const [tickets, setTickets] = useState<CustomerTicket[]>([]);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('All cities');
  const [category, setCategory] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const data = await api.getEvents({ category: category || undefined, city: city !== 'All cities' ? city : undefined, search: search || undefined });
        setEvents(data);
      } catch {
        setEvents([]);
      }
    };
    loadEvents();
  }, [category, city, search]);

  useEffect(() => {
    if (isAuthorized) {
      api.getMyTickets().then(setTickets).catch(() => setTickets([]));
    }
  }, [isAuthorized]);

  const signOut = async () => {
    await logout();
    navigate('/customer');
  };

  const isAuthPage = path.startsWith('/customer/login') || path.startsWith('/customer/register') || path.startsWith('/customer/forgot-password') || path.startsWith('/customer/reset-password');

  if (loading) {
    return <div className="portal-loading">Loading…</div>;
  }

  return (
    <div className={`customer-portal ${mobileMenuOpen ? 'mobile-open' : ''}`}>
      <header className="customer-header">
        <button className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <button className="wordmark" onClick={() => navigate('/customer')}>
          <span className="brand-icon"><Ticket size={20} /></span>
          <span>out<span>there</span><i>ZA</i></span>
        </button>

        <nav className="customer-nav">
          <button onClick={() => navigate('/customer')}>Discover</button>
          <button onClick={() => navigate('/customer/events?category=Music')}>Music</button>
          <button onClick={() => navigate('/customer/events?category=Food & drink')}>Food & drink</button>
          <button onClick={() => navigate('/customer/events?category=Arts & culture')}>Arts & culture</button>
        </nav>

        <div className="customer-actions">
          <button className="icon-button" onClick={() => navigate('/customer/my-tickets')} aria-label="My tickets">
            <TicketCheck size={20} />
          </button>

          {isAuthorized ? (
            <>
              <button className="btn-secondary slim" onClick={() => navigate('/customer/account')}>
                <User size={16} /> {account?.name?.split(' ')[0] || 'Account'} <ArrowRight size={14} />
              </button>
              <button className="icon-button" onClick={signOut} aria-label="Sign out">
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <button className="btn-primary slim" onClick={() => navigate('/customer/login')}>
              Sign in <ArrowRight size={14} />
            </button>
          )}

          <button className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menu">
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      <aside className={`customer-mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        <nav>
          <button onClick={() => { navigate('/customer'); setMobileMenuOpen(false); }}>Discover</button>
          <button onClick={() => { navigate('/customer/events?category=Music'); setMobileMenuOpen(false); }}>Music</button>
          <button onClick={() => { navigate('/customer/events?category=Food & drink'); setMobileMenuOpen(false); }}>Food & drink</button>
          <button onClick={() => { navigate('/customer/events?category=Arts & culture'); setMobileMenuOpen(false); }}>Arts & culture</button>
          <hr />
          <button onClick={() => { navigate('/customer/my-tickets'); setMobileMenuOpen(false); }}><TicketCheck size={18} /> My Tickets</button>
          {isAuthorized && <button onClick={() => { navigate('/customer/account'); setMobileMenuOpen(false); }}><User size={18} /> Account</button>}
          {!isAuthorized && <button onClick={() => { navigate('/customer/login'); setMobileMenuOpen(false); }} className="btn-primary">Sign in</button>}
          {isAuthorized && <button onClick={signOut} className="btn-secondary"><LogOut size={18} /> Sign out</button>}
        </nav>
      </aside>

      <main className="customer-main">
        {children}
      </main>

      <footer className="customer-footer">
        <div>
          <button className="wordmark footmark" onClick={() => navigate('/customer')}>
            <span className="brand-icon"><Ticket size={18} /></span>out<span>there</span><i>ZA</i>
          </button>
          <p>Good nights start with a plan.<br />Find your next South African story.</p>
        </div>
        <div className="foot-links">
          <button onClick={() => navigate('/customer/events')}>Browse events</button>
          <button onClick={() => navigate('/customer/help')}>Help centre</button>
          <button onClick={() => navigate('/terms')}>Terms</button>
          <button onClick={() => navigate('/privacy')}>Privacy</button>
        </div>
      </footer>
    </div>
  );
}

export function CustomerMarketplace() {
  const [path, navigate] = useLocation();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('All cities');
  const [category, setCategory] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(path.split('?')[1] || '');
    if (params.get('category')) setCategory(params.get('category')!);
    if (params.get('city')) setCity(params.get('city')!);
    if (params.get('search')) setSearch(params.get('search')!);
  }, [path]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getEvents({ category: category || undefined, city: city !== 'All cities' ? city : undefined, search: search || undefined });
        setEvents(data);
      } catch {
        setEvents([]);
      }
    };
    load();
  }, [category, city, search]);

  const filtered = events.filter(e => {
    if (category && !e.category.toLowerCase().includes(category.toLowerCase())) return false;
    if (city !== 'All cities' && e.city !== city) return false;
    if (search && !`${e.title} ${e.city} ${e.category} ${e.venue}`.toLowerCase().includes(search.toLowerCase())) return false;
    return e.status === 'Published';
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    if (city !== 'All cities') params.set('city', city);
    navigate(`/customer/events?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSearch} className="marketplace-page">
      <section className="hero-market">
        <div className="hero-image" style={{ backgroundImage: `linear-gradient(90deg,rgba(10,17,32,.82),rgba(10,17,32,.1)),url(https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1800&q=85)` }} />
        <div className="hero-inner">
          <span className="hero-kicker"><i /> SOUTH AFRICA, OUT THERE</span>
          <h1>Make room for<br /><em>something good.</em></h1>
          <p>Live music, long lunches, big ideas and the little nights you'll talk about later.</p>
          <button className="hero-cta" onClick={() => document.getElementById('discover')?.scrollIntoView({ behavior: 'smooth' })}>Find your next event <ArrowRight size={17} /></button>
        </div>
      </section>

      <main id="discover" className="market-content">
        <div className="market-intro">
          <div><span className="eyebrow">THE GOOD STUFF</span><h2>Find your kind of <em>out.</em></h2></div>
          <p>Curated across the country.<br />Made for getting together.</p>
        </div>

        <form onSubmit={handleSearch} className="market-search-form">
          <div className="search-input-group">
            <Search size={18} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Artist, event, venue or feeling…" />
          </div>
          <div className="search-filters">
            <div className="filter-group">
              <MapPinIcon size={17} />
              <select value={city} onChange={e => setCity(e.target.value)}>
                <option>All cities</option>
                <option>Cape Town</option>
                <option>Johannesburg</option>
                <option>Durban</option>
                <option>Pretoria</option>
              </select>
            </div>
            <button type="submit" className="btn-primary"><ArrowRight size={18} /></button>
          </div>
        </form>

        <div className="category-strip">
          {[
            ['Music', '♫', 'Music'],
            ['Food & drink', '✳', 'Food & drink'],
            ['Arts & culture', '◈', 'Arts & culture'],
            ['Sport & outdoors', '↗', 'Sport & outdoors'],
            ['Markets', '✳', 'Markets'],
          ].map(([name, icon, cat]) => (
            <button key={name} className={category === cat ? 'selected' : ''} onClick={() => { setCategory(cat); navigate(`/customer/events?category=${cat}`); }}>
              <span>{icon}</span>{name}
            </button>
          ))}
        </div>

        <div className="section-row" id="market-results">
          <div><span className="eyebrow">FEATURED THIS WEEK</span><h2>{category || 'Plans worth making'}</h2></div>
          <button className="link-arrow" onClick={() => navigate('/customer/events')}>Browse all events <ArrowRight size={16} /></button>
        </div>

        {filtered.length ? (
          <div className="event-grid">
            {filtered.slice(0, 6).map((e, i) => <EventCard key={e.id} item={e} go={navigate} feature={i === 0} />)}
          </div>
        ) : (
          <div className="empty-state">No events match yet. Try another city or search.</div>
        )}
      </main>
    </form>
  );
}

function EventCard({ item, go, feature }: { item: EventItem; go: (s: string) => void; feature?: boolean }) {
  const money = (n: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);
  const shortDate = (s: string) => new Date(`${s}T12:00:00`).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' });

  return (
    <button className={`event-card ${feature ? 'feature' : ''}`} onClick={() => go(`/customer/events/${item.id}`)}>
      <span className="event-photo" style={{ backgroundImage: `url(${item.image})` }}>
        <i className="photo-tag">{item.category}</i>
        <span className="date-stamp"><b>{shortDate(item.date).split(' ')[0]}</b><small>{shortDate(item.date).split(' ')[1]}</small></span>
      </span>
      <span className="event-copy">
        <span className="event-meta">{item.city} · {item.time}</span>
        <b>{item.title}</b>
        <span className="venue-line"><MapPinIcon size={14} />{item.venue}</span>
        <span className="event-price">{item.price ? `From ${money(item.price)}` : 'Free'} <ArrowRight size={16} /></span>
      </span>
    </button>
  );
}

export function CustomerEventDetailPage() {
  const [path, navigate] = useLocation();
  const eventId = Number(path.match(/\/events\/(\d+)/)?.[1]);
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<import('@/portals/shared/types').TicketCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!eventId) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.getEvent(eventId);
        setEvent(data);
        setCategories(data.ticketCategories || []);
        if (data.ticketCategories?.length) setSelectedCategory(String(data.ticketCategories[0].id));
      } catch {
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [eventId]);

  const money = (n: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);
  const shortDate = (s: string) => new Date(`${s}T12:00:00`).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  if (loading) return <div className="loading">Loading event…</div>;
  if (!event) return <div className="not-found">Event not found.</div>;

  const selected = categories.find(c => String(c.id) === selectedCategory) || categories[0];

  return (
    <main className="event-detail-page">
      <button className="back-crumb" onClick={() => navigate('/customer/events')}><ArrowLeft size={15} /> Back to events</button>

      <div className="detail-hero" style={{ backgroundImage: `linear-gradient(0deg,rgba(11,17,31,.82),transparent 65%),url(${event.image})` }}>
        <span className="photo-tag">{event.category}</span>
        <div>
          <span className="hero-kicker">{event.city} · {shortDate(event.date)} · {event.time}</span>
          <h1>{event.title}</h1>
        </div>
      </div>

      <div className="detail-columns">
        <article>
          <span className="eyebrow">THE PLAN</span>
          <h2>Good things happen <em>live.</em></h2>
          <p className="detail-description">{event.description}</p>
          <div className="detail-facts">
            <span><CalendarDays size={16} /> <b>{new Date(`${event.date}T12:00:00`).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</b></span>
            <span><MapPinIcon size={16} /><b>{event.venue}, {event.city}</b></span>
          </div>
          <div className="host-block">
            <div className="host-avatar">{event.organiser[0]}</div>
            <div><small>PUT TOGETHER BY</small><b>{event.organiser}</b><span><ShieldCheck size={14} /> Verified organiser</span></div>
          </div>
        </article>

        <aside className="booking-card">
          <span className="eyebrow">MAKE A NIGHT OF IT</span>
          <h3>Get your tickets</h3>
          {categories.length ? (
            <>
              <label>Ticket type
                <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                  {categories.map(c => <option key={c.id} value={String(c.id)}>{c.name} · {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(c.price)}</option>)}
                </select>
              </label>
              <label>Quantity
                <select value={quantity} onChange={e => setQuantity(Number(e.target.value))}>
                  {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <div className="booking-total">
                <span>Total</span>
                <b>{money((selected?.price || 0) * quantity)}</b>
              </div>
              <button className="btn-primary wide" onClick={() => navigate(`/customer/checkout?event=${event.id}&category=${selected?.id}&quantity=${quantity}`)}>
                Continue to PayFast <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <p className="no-tickets">Tickets not yet available.</p>
          )}
        </aside>
      </div>
    </main>
  );
}

export function CustomerCheckoutPage() {
  const [path, navigate] = useLocation();
  const params = new URLSearchParams(path.split('?')[1] || '');
  const eventId = Number(params.get('event'));
  const categoryId = Number(params.get('category'));
  const quantity = Number(params.get('quantity')) || 1;
  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { account } = useAuth();

  useEffect(() => {
    const load = async () => {
      if (!eventId) return;
      try {
        const data = await api.getEvent(eventId);
        setEvent(data as unknown as EventItem);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [eventId]);

  const startPayment = async () => {
    if (!categoryId) { setError('Choose a ticket category'); return; }
    setBusy(true); setError('');
    try {
      const result = await api.checkout({ eventId: eventId!, ticketCategoryId: categoryId, quantity });
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = result.action;
      for (const [name, value] of Object.entries(result.fields)) {
        const input = document.createElement('input');
        input.type = 'hidden'; input.name = name; input.value = value;
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="loading">Loading checkout…</div>;
  if (!event) return <div className="not-found">Event not found.</div>;

  const category = event.ticketCategories?.find(c => c.id === categoryId);
  const amount = (category?.price || 0) * quantity;
  const money = (n: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);

  return (
    <main className="checkout-page">
      <button className="back-crumb" onClick={() => navigate(`/customer/events/${eventId}`)}><ArrowLeft size={15} /> Back to event</button>
      <span className="eyebrow">SECURE CHECKOUT</span>
      <h1>One last thing<br /><em>before the good stuff.</em></h1>

      <div className="checkout-layout">
        <section className="checkout-form">
          <h3>Your account</h3>
          <p>{account?.name} · {account?.email}</p>
          <div className="demo-payment"><ShieldCheck size={18} /><span><b>PayFast secure payment</b><small>Payment is confirmed by the provider before tickets are issued.</small></span></div>
          {error && <p className="error-note">{error}</p>}
          <button className="btn-primary wide" disabled={busy || !categoryId} onClick={startPayment}>
            {busy ? 'Connecting to PayFast…' : 'Continue to PayFast'} <ArrowRight size={16} />
          </button>
        </section>

        <aside className="order-summary">
          <span className="eyebrow">YOUR ORDER</span>
          <div className="order-event">
            <img src={event.image} alt="" width={80} height={80} />
            <div><b>{event.title}</b><small>{new Date(event.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })} · {event.city}</small></div>
          </div>
          <div className="summary-row"><span>{category?.name || 'Ticket'} × {quantity}</span><b>{money(amount)}</b></div>
          <div className="summary-row total"><span>Total</span><b>{money(amount)}</b></div>
        </aside>
      </div>
    </main>
  );
}

export function CustomerMyTicketsPage() {
  const { account, isAuthorized } = useAuth();
  const [tickets, setTickets] = useState<CustomerTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthorized) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.getMyTickets();
        setTickets(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load tickets');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthorized]);

  const money = (n: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);
  const shortDate = (s: string) => new Date(s).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' });

  if (!isAuthorized) return <div className="auth-required">Please sign in to view your tickets.</div>;
  if (loading) return <div className="loading">Loading tickets…</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <main className="tickets-page">
      <span className="eyebrow">MY TICKETS</span>
      <h1>Tickets for<br /><em>the good stuff.</em></h1>
      <p className="lead">Your upcoming plans, all in one place.</p>

      {tickets.length ? (
        <div className="ticket-list">
          {tickets.map(ticket => (
            <div className="ticket-pass" key={ticket.id}>
              <div className="pass-photo" style={{ backgroundImage: `url(${ticket.imageUrl || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=700&q=85'})` }}>
                <span>OUT THERE <i>ZA</i></span>
                <div className="qr-placeholder">QR CODE</div>
              </div>
              <div className="pass-info">
                <span className="eyebrow">{ticket.ticketCategory} · {ticket.status}</span>
                <h2>{ticket.eventTitle}</h2>
                <p><CalendarDays size={15} /> {shortDate(ticket.startsAt)}</p>
                <p><MapPinIcon size={15} /> {ticket.venue}, {ticket.city}</p>
                <div className="ticket-code">{ticket.reference}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-tickets">
          <TicketCheck size={32} />
          <h3>No tickets yet</h3>
          <p>Your purchased tickets will appear here.</p>
        </div>
      )}
    </main>
  );
}

export function CustomerAccountPage() {
  const [, navigate] = useLocation();
  const { account, isAuthorized, logout } = useAuth();

  if (!isAuthorized) return <div className="auth-required">Please sign in to view your account.</div>;

  const handleSignOut = async () => {
    await logout();
    navigate('/customer');
  };

  return (
    <main className="account-page">
      <span className="eyebrow">YOUR ACCOUNT</span>
      <h1>Your plans,<br /><em>all together.</em></h1>

      <div className="account-profile">
        <div className="avatar">{account?.name?.slice(0,2).toUpperCase() || 'OT'}</div>
        <div><b>{account?.name}</b><small>{account?.email}</small></div>
      </div>

      <div className="account-cards">
        <button className="account-card" onClick={() => navigate('/customer/my-tickets')}>
          <TicketCheck size={20} />
          <b>My tickets</b>
          <span>View your bookings and entry details.</span>
          <ArrowRight size={15} />
        </button>

        <button className="account-card" onClick={() => navigate('/customer/events')}>
          <CalendarDays size={20} />
          <b>Discover events</b>
          <span>Find your next night out.</span>
          <ArrowRight size={15} />
        </button>

        <button className="account-card danger" onClick={handleSignOut}>
          <LogOut size={20} />
          <b>Sign out</b>
          <span>End your session.</span>
        </button>
      </div>
    </main>
  );
}

export { CustomerLoginPage } from './pages/CustomerLoginPage';