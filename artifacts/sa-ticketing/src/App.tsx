import { useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  useCreateCheckout, useCreateOrganiserEvent, useDecideEvent, useDecideEventReport,
  useDecideOrganiserApplication, useGetAdminDashboard, useGetCurrentAccount,
  useGetEvent, useGetLegalDocument, useGetMarketplaceSummary,
  useGetOnboardingFee, useGetOrganiserDashboard, useGetOrganiserEventSales,
  useGetOrganiserPaymentSetup, useHealthCheck, useListAdminEvents,
  useListAuditLogs, useListCustomerTickets, useListEventReports, useListEvents,
  useListOnboardingPayments, useListOrganiserApplications, useListOrganiserEvents,
  useReceivePayfastItn, useReportEvent, useSaveOrganiserPaymentSetup,
  useScanTicket, useSetOnboardingFee, useSubmitOrganiserApplication,
  useUpdateOrganiserEvent, useUploadOrganiserDocument,
  getGetAdminDashboardQueryKey, getGetCurrentAccountQueryKey, getGetEventQueryKey,
  getGetMarketplaceSummaryQueryKey, getGetOnboardingFeeQueryKey,
  getGetOrganiserDashboardQueryKey, getGetOrganiserEventSalesQueryKey,
  getGetOrganiserPaymentSetupQueryKey, getListAdminEventsQueryKey,
  getListAuditLogsQueryKey, getListCustomerTicketsQueryKey, getListEventReportsQueryKey,
  getListEventsQueryKey, getListOnboardingPaymentsQueryKey,
  getListOrganiserApplicationsQueryKey, getListOrganiserEventsQueryKey,
} from '@workspace/api-client-react';
import type { EventCard, EventInput, TicketCategoryInput } from '@workspace/api-client-react';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import {
  ArrowDownToLine, ArrowLeft, ArrowRight, BadgeCheck, CalendarDays, Check,
  CheckCircle2, ChevronDown, CircleAlert, ClipboardList, Clock3, Compass,
  CreditCard, FileText, Filter, Flag, LayoutDashboard, LifeBuoy, MapPin,
  Menu, Plus, QrCode, Search, ShieldCheck, Ticket, TicketCheck, Users,
  WalletCards, X,
} from 'lucide-react';
import { format } from 'date-fns';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 20_000 } } });
const clerkConfigured = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const money = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(amount);
const niceDate = (date: string) => {
  try { return format(new Date(date), 'EEE, d MMM yyyy · HH:mm'); } catch { return date; }
};
const slugLabel = (s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const eventArt = (category: string, id: number) => `art-${(id + category.length) % 5}`;

function Button({ children, onClick, variant = 'primary', type = 'button', disabled = false, className = '', testId }: {
  children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'outline' | 'quiet' | 'danger'; type?: 'button' | 'submit'; disabled?: boolean; className?: string; testId?: string;
}) {
  return <button type={type} onClick={onClick} disabled={disabled} data-testid={testId} className={`btn btn-${variant} ${className}`}>{children}</button>;
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="field"><span className="field-label">{label}</span>{children}{hint && <small className="field-hint">{hint}</small>}</label>;
}

function LoadingRows({ count = 3 }: { count?: number }) {
  return <div className="space-y-3" aria-label="Loading"><div className="skeleton h-3 w-28" />{Array.from({ length: count }, (_, i) => <div key={i} className="skeleton h-16 w-full" />)}</div>;
}

function QueryMessage({ loading, error, retry }: { loading?: boolean; error?: unknown; retry?: () => void }) {
  if (loading) return <LoadingRows />;
  if (error) return <div className="state-card"><CircleAlert size={22} /><div><b>We couldn’t load this just now.</b><p>Check your connection, then try again.</p></div>{retry && <Button variant="outline" onClick={retry}>Try again</Button>}</div>;
  return null;
}

function Brand() {
  return <Link href="/" className="brand" data-testid="link-home"><span className="brand-mark"><Ticket size={18} strokeWidth={2.4} /></span><span>ticket<span className="brand-light">hub</span><i>ZA</i></span></Link>;
}

function PublicHeader() {
  const [open, setOpen] = useState(false);
  return <header className="public-header"><div className="header-inner"><Brand /><nav className={`public-nav ${open ? 'nav-open' : ''}`}>
    <Link href="/" className="nav-link">Discover</Link><Link href="/account/tickets" className="nav-link">My tickets</Link><Link href="/organiser" className="nav-link">For organisers</Link>
    <Link href={clerkConfigured ? '/sign-in' : '/sign-in/setup'} className="header-account">{clerkConfigured ? 'Sign in' : 'Account'} <ArrowRight size={15} /></Link>
  </nav><button className="mobile-menu" aria-label="Toggle navigation" onClick={() => setOpen(!open)} data-testid="button-menu">{open ? <X /> : <Menu />}</button></div></header>;
}

function PublicFooter() {
  return <footer className="public-footer"><div className="footer-main"><Brand /><p>Good nights start with a ticket.<br />Find your next South African story.</p><div className="footer-links"><Link href="/legal/privacy">Privacy</Link><Link href="/legal/customer-terms">Terms</Link><Link href="/legal/refunds">Refunds</Link><Link href="/organiser">List an event</Link></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} TicketHub South Africa</span><span>Made for the moments that bring us together.</span></div></footer>;
}

function PublicFrame({ children }: { children: React.ReactNode }) {
  return <div className="app-shell grain"><PublicHeader /><main className="page-enter">{children}</main><PublicFooter /></div>;
}

function EventCardView({ event, featured = false }: { event: EventCard; featured?: boolean }) {
  return <Link href={`/events/${event.id}`} className={`event-card ${featured ? 'event-card-featured' : ''}`} data-testid={`card-event-${event.id}`}>
    <div className={`event-art ${eventArt(event.category, event.id)}`} style={event.imageUrl ? { backgroundImage: `linear-gradient(180deg, transparent 25%, rgba(16,30,48,.55)),url("${event.imageUrl}")` } : undefined}>
      <span className="art-category">{event.category}</span><span className="art-monogram">{event.category.slice(0, 2).toUpperCase()}</span>
      <span className="art-date"><b>{format(new Date(event.startsAt), 'dd')}</b><span>{format(new Date(event.startsAt), 'MMM')}</span></span>
    </div>
    <div className="event-card-copy"><div className="event-card-top"><span className="event-date-small">{niceDate(event.startsAt)}</span><span className="verified-dot"><ShieldCheck size={14} /> Verified</span></div>
      <h3>{event.title}</h3><p className="event-location"><MapPin size={14} />{event.venue}, {event.city}</p>
      <div className="event-card-bottom"><span>From <b>{money(event.minPrice)}</b></span><span className="card-arrow"><ArrowRight size={17} /></span></div>
    </div>
  </Link>;
}

function HomePage() {
  const summary = useGetMarketplaceSummary();
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const params = useMemo(() => ({ search: search || undefined, city: city || undefined, category: category || undefined, from: from || undefined, to: to || undefined }), [search, city, category, from, to]);
  const events = useListEvents(params);
  const cities = summary.data?.cities ?? ['Cape Town', 'Johannesburg', 'Durban', 'Pretoria'];
  const categories = summary.data?.categories ?? ['Music', 'Food & drink', 'Arts & culture', 'Sport', 'Nightlife'];
  return <PublicFrame><section className="hero"><div className="hero-inner"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line" /> SOUTH AFRICA, OUT THERE</div><h1>Make room for<br /><em>something good.</em></h1><p>Live music, long lunches, big ideas and all the little nights you’ll talk about later.</p><a href="#discover" className="hero-jump">Find your next event <ArrowDownToLine size={16} /></a></div><div className="hero-art"><div className="hero-sun" /><div className="hero-ring ring-one" /><div className="hero-ring ring-two" /><div className="hero-caption"><span className="caption-marker" />Your city is full of stories<span>SCROLL TO EXPLORE</span></div><div className="hero-stat"><span>01 / 04</span><b>Good things<br />happen live.</b></div></div></div></section>
    <section className="discover-section" id="discover"><div className="section-heading"><div><div className="eyebrow">THE GOOD STUFF</div><h2>Find your kind of <em>out.</em></h2></div><p>Curated across the country.<br />Made for getting together.</p></div>
      <div className="search-panel"><div className="search-input"><Search size={18} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Artist, event or venue" aria-label="Search events" data-testid="input-event-search" /></div>
        <Field label="City"><select value={city} onChange={e => setCity(e.target.value)} data-testid="select-city"><option value="">All cities</option>{cities.map(c => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Category"><select value={category} onChange={e => setCategory(e.target.value)} data-testid="select-category"><option value="">All types</option>{categories.map(c => <option key={c}>{c}</option>)}</select></Field>
        <Field label="From"><input type="date" value={from} onChange={e => setFrom(e.target.value)} data-testid="input-date-from" /></Field><Field label="To"><input type="date" value={to} onChange={e => setTo(e.target.value)} data-testid="input-date-to" /></Field>
        <Button variant="quiet" onClick={() => { setSearch(''); setCity(''); setCategory(''); setFrom(''); setTo(''); }}><Filter size={16} /> Reset</Button></div>
      <div className="results-line"><div><span className="results-mark" /> <b>{events.data?.length ?? '—'}</b> events worth leaving home for</div><span>Sorted by date</span></div>
      <QueryMessage loading={events.isLoading} error={events.error} retry={() => events.refetch()} />
      {!events.isLoading && !events.error && (!events.data?.length ? <div className="empty-state"><Compass size={27} /><h3>No events found. Yet.</h3><p>Try widening your search. There’s always something happening somewhere.</p><Button variant="outline" onClick={() => { setSearch(''); setCity(''); setCategory(''); setFrom(''); setTo(''); }}>Clear filters</Button></div> :
        <div className="event-grid">{events.data?.map((e, i) => <EventCardView key={e.id} event={e} featured={i === 0} />)}</div>)}
    </section>
    <section className="city-band"><div><div className="eyebrow">A LITTLE CLOSER TO HOME</div><h2>Pick a place.<br /><em>We’ll find the plans.</em></h2></div><div className="city-list">{cities.map((c, i) => <button key={c} onClick={() => { setCity(c); document.getElementById('discover')?.scrollIntoView({ behavior: 'smooth' }); }}><span>0{i + 1}</span>{c}<ArrowRight size={17} /></button>)}</div></section>
    <section className="organiser-callout"><div className="callout-symbol"><TicketCheck size={34} /></div><div><div className="eyebrow">GOT SOMETHING PLANNED?</div><h2>Your crowd is <em>out there.</em></h2><p>List your event, manage tickets and make check-in feel easy.</p></div><Link href="/organiser" className="btn btn-outline">Meet your organiser tools <ArrowRight size={16} /></Link></section>
  </PublicFrame>;
}

function EventPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const id = Number(eventId);
  const query = useGetEvent(id);
  const checkout = useCreateCheckout();
  const report = useReportEvent();
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('misleading');
  const [reportDetails, setReportDetails] = useState('');
  const [reportEmail, setReportEmail] = useState('');
  const event = query.data;
  const selected = event?.ticketCategories.find(t => t.id === (categoryId ?? event.ticketCategories[0]?.id));
  const price = (selected?.price ?? 0) * quantity;
  return <PublicFrame><div className="content-wrap event-page">
    <Link href="/" className="back-link"><ArrowLeft size={16} /> Back to events</Link>
    <QueryMessage loading={query.isLoading} error={query.error} retry={() => query.refetch()} />
    {event && <><div className={`detail-art event-art ${eventArt(event.category, event.id)}`} style={event.imageUrl ? { backgroundImage: `linear-gradient(180deg, transparent, rgba(16,30,48,.52)),url("${event.imageUrl}")` } : undefined}><span className="art-category">{event.category}</span><span className="detail-art-title">{event.title}</span><span className="detail-art-date">{format(new Date(event.startsAt), 'dd MMM yyyy')}<br />{format(new Date(event.startsAt), 'HH:mm')}</span></div>
      <div className="detail-layout"><article className="detail-main"><div className="eyebrow">THE PLAN</div><h1>{event.title}</h1><div className="detail-meta"><span><CalendarDays size={17} />{niceDate(event.startsAt)}</span><span><MapPin size={17} />{event.venue}, {event.city}</span></div><div className="detail-description">{event.description}</div>
        <div className="organiser-info"><span className="org-avatar">{event.organiserName.slice(0, 1)}</span><div><small>PUT TOGETHER BY</small><b>{event.organiserName}</b></div>{event.organiserVerified && <span className="verify-label"><BadgeCheck size={15} /> Verified organiser</span>}</div>
        <button className="text-action" onClick={() => setReportOpen(!reportOpen)}><Flag size={15} /> Report this event</button>
        {reportOpen && <form className="report-form" onSubmit={e => { e.preventDefault(); report.mutate({ data: { eventId: event.id, reason: reportReason as 'misleading', details: reportDetails, contactEmail: reportEmail } }, { onSuccess: () => { setReportOpen(false); setReportDetails(''); } }); }}>
          <h3>Tell us what’s concerning</h3><Field label="Reason"><select value={reportReason} onChange={e => setReportReason(e.target.value)}>{['misleading', 'suspicious-payment', 'unsafe', 'duplicate', 'other'].map(x => <option key={x} value={x}>{slugLabel(x)}</option>)}</select></Field><Field label="Details"><textarea required minLength={10} value={reportDetails} onChange={e => setReportDetails(e.target.value)} /></Field><Field label="Email for follow-up"><input required type="email" value={reportEmail} onChange={e => setReportEmail(e.target.value)} /></Field>{report.isSuccess && <p className="success-note">Report sent. Thank you for helping keep TicketHub trustworthy.</p>}{report.isError && <p className="error-note">We couldn’t send your report. Please try again.</p>}<Button type="submit" disabled={report.isPending}>{report.isPending ? 'Sending…' : 'Send report'}</Button></form>}
      </article><aside className="ticket-box"><div className="ticket-box-kicker"><Ticket size={17} /> TICKETS</div><h2>Be there.</h2><p className="ticket-price-intro">Choose your spot. All prices in ZAR.</p>{event.ticketCategories.map(t => <label key={t.id} className={`ticket-option ${(categoryId ?? event.ticketCategories[0]?.id) === t.id ? 'is-selected' : ''}`}><input type="radio" name="ticket-category" checked={(categoryId ?? event.ticketCategories[0]?.id) === t.id} onChange={() => setCategoryId(t.id)} /><span className="radio-mark" /><span className="ticket-opt-copy"><b>{t.name}</b><small>{t.description || `${t.quantityAvailable} available`}</small></span><strong>{money(t.price)}</strong></label>)}
        <Field label="Quantity"><select value={quantity} onChange={e => setQuantity(Number(e.target.value))}>{Array.from({ length: 10 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1} {i === 0 ? 'ticket' : 'tickets'}</option>)}</select></Field><div className="ticket-total"><span>Total</span><b>{money(price)}</b></div><Button className="w-full" disabled={!selected || checkout.isPending} onClick={() => checkout.mutate({ data: { eventId: event.id, ticketCategoryId: selected!.id, quantity } })}>{checkout.isPending ? 'Preparing sandbox checkout…' : 'Continue to checkout'} <ArrowRight size={16} /></Button>
        {checkout.isSuccess && <div className="sandbox-note"><ShieldCheck size={16} /><span><b>Sandbox checkout prepared.</b> Tickets are only issued after a verified PayFast ITN. This redirect alone is not a purchase confirmation.</span><a href={checkout.data.redirectUrl} target="_blank" rel="noreferrer">Continue securely <ArrowRight size={13} /></a></div>}{checkout.isError && <p className="error-note">Checkout couldn’t be prepared. Please try again.</p>}
        <p className="trust-note"><ShieldCheck size={14} /> Secure checkout · Protected by TicketHub</p></aside></div></>}
  </div></PublicFrame>;
}

function SignInSetup() {
  return <PublicFrame><div className="auth-page"><div className="auth-card"><span className="auth-icon"><ShieldCheck size={25} /></span><div className="eyebrow">YOUR TICKETHUB ACCOUNT</div><h1>{clerkConfigured ? 'Continue with Clerk' : 'Sign-in is being connected.'}</h1><p>{clerkConfigured ? 'Clerk is configured for this environment. Use the sign-in experience provided by your organisation.' : 'TicketHub uses your external Clerk account for sign-in. Add VITE_CLERK_PUBLISHABLE_KEY to connect it. Public event browsing remains open in the meantime.'}</p>{!clerkConfigured && <div className="auth-setup"><b>External authentication only</b><span>No demo credentials or local account are enabled.</span></div>}<Link href="/" className="btn btn-primary"><ArrowLeft size={16} /> Keep exploring</Link></div></div></PublicFrame>;
}

function TicketsPage() {
  const tickets = useListCustomerTickets();
  const [notice, setNotice] = useState('');
  return <PublicFrame><div className="content-wrap account-page"><div className="eyebrow">YOUR ACCOUNT</div><h1>Tickets for <em>the good stuff.</em></h1><p className="lead">Your upcoming plans, all in one place.</p><QueryMessage loading={tickets.isLoading} error={tickets.error} retry={() => tickets.refetch()} />
    {tickets.data?.length ? <div className="ticket-list">{tickets.data.map(ticket => <article className="owned-ticket" key={ticket.id} data-testid={`ticket-${ticket.id}`}><div className={`owned-ticket-side ${eventArt(ticket.category, ticket.eventId)}`}><span>{format(new Date(ticket.eventStartsAt), 'MMM')}</span><b>{format(new Date(ticket.eventStartsAt), 'dd')}</b></div><div className="owned-ticket-body"><div className="eyebrow">{ticket.category} · {ticket.status.replace('_', ' ')}</div><h2>{ticket.eventTitle}</h2><p><CalendarDays size={15} />{niceDate(ticket.eventStartsAt)}</p><p><MapPin size={15} />{ticket.venue}</p><div className="ticket-code">{ticket.qrToken}</div><small>Ticket code · Show this at the door</small></div><div className="owned-ticket-actions"><div className="qr-tile"><QrCode size={56} /><small>Ticket pass</small></div><Button variant="outline" onClick={() => { window.print(); setNotice('Print dialog opened. Choose “Save as PDF” to keep a copy.'); }}><ArrowDownToLine size={15} /> Save / print</Button></div></article>)}</div> : !tickets.isLoading && !tickets.error && <div className="empty-state"><TicketCheck size={29} /><h3>Your next night out starts here.</h3><p>Purchased tickets will appear here once your payment is verified.</p><Link href="/" className="btn btn-primary">Explore events <ArrowRight size={16} /></Link></div>}{notice && <p className="success-note">{notice}</p>}</div></PublicFrame>;
}

const workspaceLinks = [
  { href: '/organiser', label: 'Overview', icon: LayoutDashboard },
  { href: '/organiser/events', label: 'My events', icon: CalendarDays },
  { href: '/organiser/payment', label: 'Payments', icon: WalletCards },
];
function WorkspaceFrame({ title, subtitle, children, active = '' }: { title: string; subtitle: string; children: React.ReactNode; active?: string }) {
  const [location] = useLocation();
  const account = useGetCurrentAccount();
  return <div className="workspace"><aside className="workspace-side"><Brand /><div className="workspace-switch"><span className="avatar-initial">{account.data?.name?.slice(0, 1) ?? 'T'}</span><span><b>{account.data?.organisationName ?? 'Organiser workspace'}</b><small>{account.data?.role ?? 'Account'}</small></span><ChevronDown size={14} /></div><div className="side-label">WORKSPACE</div><nav>{workspaceLinks.map(item => { const Icon = item.icon; const selected = location === item.href || (item.href === '/organiser/events' && location.startsWith('/organiser/events')); return <Link href={item.href} key={item.href} className={`side-link ${selected ? 'side-link-active' : ''}`}><Icon size={17} />{item.label}</Link>; })}<Link href="/check-in" className={`side-link ${location === '/check-in' ? 'side-link-active' : ''}`}><QrCode size={17} />Check-in</Link><Link href="/admin" className={`side-link ${location === '/admin' ? 'side-link-active' : ''}`}><ShieldCheck size={17} />Platform admin</Link></nav><div className="side-bottom"><Link href="/" className="side-link"><Compass size={17} />Marketplace</Link><div className="side-help"><LifeBuoy size={18} /><span><b>Need a hand?</b><small>We’re here to help.</small></span></div></div></aside><div className="workspace-main"><header className="workspace-top"><span>TicketHub <b>/</b> {active || 'Workspace'}</span><div><span className="env-chip">SOUTH AFRICA</span><Link href="/account/tickets">My tickets</Link><Link href="/sign-in">Account</Link></div></header><main className="workspace-content page-enter"><div className="workspace-title"><div><div className="eyebrow">{subtitle}</div><h1>{title}</h1></div><span className="workspace-avatar">{account.data?.name?.slice(0, 1) ?? 'T'}</span></div>{account.error && <div className="auth-required"><ShieldCheck size={19} /><span><b>Sign in to continue.</b> Workspace access is checked by the server. {clerkConfigured ? 'Continue with your external Clerk account.' : 'Add the external Clerk publishable key to enable sign-in.'}</span><Link href="/sign-in">Account setup <ArrowRight size={14} /></Link></div>}{children}</main></div></div>;
}

function OrganiserHome() {
  const dashboard = useGetOrganiserDashboard();
  const submit = useSubmitOrganiserApplication();
  const upload = useUploadOrganiserDocument();
  const qc = useQueryClient();
  const [applyOpen, setApplyOpen] = useState(false);
  const [accountType, setAccountType] = useState<'individual' | 'business'>('business');
  const [legalName, setLegalName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [reg, setReg] = useState('');
  const [identityDocumentPath, setIdentityDocumentPath] = useState<string | null>(null);
  const [businessDocumentPath, setBusinessDocumentPath] = useState<string | null>(null);
  const status = dashboard.data?.status ?? 'not_started';
  const steps = ['Application', 'Verification', 'Payments', 'First event'];
  const activeStep = status === 'approved' ? 3 : status === 'pending' ? 1 : 0;
  return <WorkspaceFrame title="Make it happen." subtitle="ORGANISER STUDIO" active="Overview"><QueryMessage loading={dashboard.isLoading} error={dashboard.error} retry={() => dashboard.refetch()} />
    {dashboard.data && <><section className="welcome-panel"><div><span className={`status-pill status-${status}`}>{slugLabel(status)}</span><h2>{status === 'approved' ? 'You’re ready to bring people together.' : status === 'pending' ? 'Your application is with our team.' : 'Start with a little introduction.'}</h2><p>{status === 'approved' ? 'Your organiser profile is approved. Create an event and bring your next idea to life.' : status === 'pending' ? 'We’ll let you know once your organiser details have been reviewed.' : 'A verified organiser profile helps everyone buy with confidence.'}</p>{status === 'approved' ? <Link href="/organiser/events/new" className="btn btn-primary"><Plus size={16} /> Create an event</Link> : <Button onClick={() => setApplyOpen(true)} disabled={status === 'pending'}>{status === 'pending' ? 'Application under review' : 'Apply to become an organiser'} <ArrowRight size={16} /></Button>}</div><div className="progress-steps">{steps.map((step, i) => <div key={step} className={`progress-step ${i <= activeStep ? 'step-done' : ''}`}><span>{i < activeStep ? <Check size={14} /> : `0${i + 1}`}</span><b>{step}</b></div>)}</div></section>
      <div className="metric-grid"><Metric label="Live events" value={dashboard.data.eventCount} icon={<CalendarDays size={18} />} /><Metric label="Tickets sold" value={dashboard.data.ticketsSold} icon={<TicketCheck size={18} />} /><Metric label="Gross revenue" value={money(dashboard.data.revenue)} icon={<WalletCards size={18} />} /></div>
      <div className="panel-heading"><div><div className="eyebrow">YOUR LINE-UP</div><h2>Events</h2></div><Link href="/organiser/events" className="text-link">View all <ArrowRight size={15} /></Link></div>
      {dashboard.data.events.length ? <EventRows events={dashboard.data.events} /> : <div className="empty-inline"><CalendarDays size={21} /><div><b>Your first event will live here.</b><p>Once you’re approved, add the details and ticket types for your next event.</p></div><Link href="/organiser/events/new" className="btn btn-outline">Create event <ArrowRight size={15} /></Link></div>}</>}
    {applyOpen && <div className="modal-backdrop" role="presentation" onClick={() => setApplyOpen(false)}><form className="modal-card" onSubmit={e => { e.preventDefault(); submit.mutate({ data: { accountType, legalName, contactEmail: email, phone, organisationName: orgName, registrationNumber: reg || null, identityDocumentPath, businessDocumentPath, authenticityAccepted: true, agreementAccepted: true } }, { onSuccess: () => { setApplyOpen(false); qc.invalidateQueries({ queryKey: getGetOrganiserDashboardQueryKey() }); qc.invalidateQueries({ queryKey: getGetCurrentAccountQueryKey() }); } }); }} onClick={e => e.stopPropagation()}><button type="button" className="modal-close" onClick={() => setApplyOpen(false)} aria-label="Close"><X size={18} /></button><div className="eyebrow">ORGANISER VERIFICATION</div><h2>Tell us about your events.</h2><p>We review each application to keep the marketplace trustworthy.</p><Field label="Account type"><select value={accountType} onChange={e => setAccountType(e.target.value as 'business' | 'individual')}><option value="business">Registered business</option><option value="individual">Individual</option></select></Field><Field label="Legal name"><input required minLength={2} value={legalName} onChange={e => setLegalName(e.target.value)} /></Field><Field label="Organisation name"><input required minLength={2} value={orgName} onChange={e => setOrgName(e.target.value)} /></Field><div className="two-fields"><Field label="Contact email"><input required type="email" value={email} onChange={e => setEmail(e.target.value)} /></Field><Field label="Phone"><input required minLength={7} value={phone} onChange={e => setPhone(e.target.value)} /></Field></div><Field label="Company registration (if applicable)"><input value={reg} onChange={e => setReg(e.target.value)} /></Field><Field label={`Identity document${identityDocumentPath ? ' · uploaded' : ' (optional)'}`}><input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => { const file = e.target.files?.[0]; if (file) upload.mutate({ data: { file, kind: 'identity' } }, { onSuccess: r => setIdentityDocumentPath(r.documentId) }); }} /></Field>{accountType === 'business' && <Field label={`Business document${businessDocumentPath ? ' · uploaded' : ' (optional)'}`}><input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => { const file = e.target.files?.[0]; if (file) upload.mutate({ data: { file, kind: 'business' } }, { onSuccess: r => setBusinessDocumentPath(r.documentId) }); }} /></Field>}{upload.isPending && <p className="field-hint">Uploading securely…</p>}{upload.isError && <p className="error-note">Document upload failed. Please try another file.</p>}<p className="legal-small">By submitting, you confirm these details are authentic and agree to the <Link href="/legal/organiser-agreement">organiser agreement</Link>.</p>{submit.isError && <p className="error-note">Application not submitted. Check your details or sign in.</p>}<Button type="submit" disabled={submit.isPending || upload.isPending}>{submit.isPending ? 'Submitting…' : 'Submit application'} <ArrowRight size={15} /></Button></form></div>}
  </WorkspaceFrame>;
}

function Metric({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return <div className="metric-card"><span className="metric-icon">{icon}</span><span className="metric-label">{label}</span><b>{value}</b><small>Across your account</small></div>;
}

function EventRows({ events }: { events: EventCard[] }) {
  return <div className="event-rows">{events.map(e => <Link href={`/organiser/events/${e.id}`} className="event-row" key={e.id}><span className={`row-date ${eventArt(e.category, e.id)}`}><b>{format(new Date(e.startsAt), 'dd')}</b>{format(new Date(e.startsAt), 'MMM')}</span><span className="row-title"><b>{e.title}</b><small><MapPin size={13} />{e.venue}, {e.city}</small></span><span className="row-category">{e.category}</span><span className="row-price">{money(e.minPrice)} <small>from</small></span><ArrowRight size={16} /></Link>)}</div>;
}

function OrganiserEvents() {
  const events = useListOrganiserEvents();
  return <WorkspaceFrame title="Your events" subtitle="ORGANISER STUDIO" active="My events"><div className="toolbar"><div><p className="lead">All the things you’re bringing to life.</p></div><Link href="/organiser/events/new" className="btn btn-primary"><Plus size={16} /> New event</Link></div><QueryMessage loading={events.isLoading} error={events.error} retry={() => events.refetch()} />{events.data?.length ? <EventRows events={events.data} /> : !events.isLoading && !events.error && <div className="empty-state"><CalendarDays size={27} /><h3>No events on the calendar.</h3><p>Create your first event to start building your audience.</p><Link href="/organiser/events/new" className="btn btn-primary"><Plus size={16} /> Create an event</Link></div>}</WorkspaceFrame>;
}

function EventForm() {
  const create = useCreateOrganiserEvent();
  const update = useUpdateOrganiserEvent();
  const events = useListOrganiserEvents();
  const qc = useQueryClient();
  const [location, setLocation] = useLocation();
  const { eventId } = useParams<{ eventId: string }>();
  const editing = Boolean(eventId);
  const current = events.data?.find(e => e.id === Number(eventId));
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('Cape Town');
  const [venue, setVenue] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [category, setCategory] = useState('Music');
  const [imageUrl, setImageUrl] = useState('');
  const [ticketName, setTicketName] = useState('General admission');
  const [ticketDescription, setTicketDescription] = useState('');
  const [price, setPrice] = useState('250');
  const [capacity, setCapacity] = useState('100');
  const [salesStart, setSalesStart] = useState('');
  const [salesEnd, setSalesEnd] = useState('');
  const [submitForReview, setSubmitForReview] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const mutation = editing ? update : create;
  const submitEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const ticketCategories: TicketCategoryInput[] = [{ name: ticketName, description: ticketDescription, price: Number(price), quantityAvailable: Number(capacity), salesStart: salesStart ? new Date(salesStart).toISOString() : null, salesEnd: salesEnd ? new Date(salesEnd).toISOString() : null }];
    const data: EventInput = { title, description, city, venue, startsAt: new Date(startsAt).toISOString(), category, imageUrl: imageUrl || null, authenticityAccepted: true, submitForReview, ticketCategories };
    const onSuccess = (result: { id: number }) => { qc.invalidateQueries({ queryKey: getListOrganiserEventsQueryKey() }); qc.invalidateQueries({ queryKey: getGetOrganiserDashboardQueryKey() }); setLocation(`/organiser/events/${result.id}`); };
    if (editing) update.mutate({ eventId: Number(eventId), data }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListOrganiserEventsQueryKey() }); setLocation(`/organiser/events/${eventId}`); } });
    else create.mutate({ data }, { onSuccess });
  };
  if (editing && events.isLoading) return <WorkspaceFrame title="Edit event" subtitle="EVENT SETUP"><LoadingRows /></WorkspaceFrame>;
  useEffect(() => {
    if (!editing || !current || title) return;
    setTitle(current.title); setDescription(current.description); setCity(current.city); setVenue(current.venue);
    setStartsAt(current.startsAt.slice(0, 16)); setCategory(current.category); setImageUrl(current.imageUrl ?? '');
    const t = current.ticketCategories[0];
    if (t) { setTicketName(t.name); setTicketDescription(t.description); setPrice(String(t.price)); setCapacity(String(t.quantityAvailable)); setSalesStart(t.salesStart?.slice(0, 16) ?? ''); setSalesEnd(t.salesEnd?.slice(0, 16) ?? ''); }
  }, [editing, current, title]);
  return <WorkspaceFrame title={editing ? 'Shape the details.' : 'Make it a date.'} subtitle="EVENT SETUP" active="My events"><Link href={editing ? `/organiser/events/${eventId}` : '/organiser/events'} className="back-link"><ArrowLeft size={15} /> Back to events</Link><form className="event-editor" onSubmit={submitEvent}><div className="editor-main"><div className="editor-section"><div className="editor-number">01</div><div className="editor-fields"><h2>The essentials</h2><p>Start with the things guests need to know.</p><Field label="Event name"><input required minLength={4} maxLength={120} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Sunday on the Square" /></Field><Field label="Description"><textarea required minLength={20} maxLength={8000} value={description} onChange={e => setDescription(e.target.value)} rows={5} placeholder="Give people a reason to come along." /></Field><div className="two-fields"><Field label="Category"><select value={category} onChange={e => setCategory(e.target.value)}>{['Music', 'Food & drink', 'Arts & culture', 'Sport', 'Nightlife', 'Community', 'Business'].map(x => <option key={x}>{x}</option>)}</select></Field><Field label="Start date & time"><input required type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} /></Field></div><div className="two-fields"><Field label="City"><input required value={city} onChange={e => setCity(e.target.value)} /></Field><Field label="Venue"><input required value={venue} onChange={e => setVenue(e.target.value)} /></Field></div><Field label="Image URL (optional)"><input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://" /></Field></div></div>
      <div className="editor-section"><div className="editor-number">02</div><div className="editor-fields"><h2>Ticket categories</h2><p>Set your price, capacity and sales window.</p><div className="ticket-category-editor"><div className="two-fields"><Field label="Category name"><input required value={ticketName} onChange={e => setTicketName(e.target.value)} /></Field><Field label="Price (ZAR)"><input required min="0" type="number" value={price} onChange={e => setPrice(e.target.value)} /></Field></div><Field label="Description"><input value={ticketDescription} onChange={e => setTicketDescription(e.target.value)} placeholder="What’s included?" /></Field><div className="two-fields"><Field label="Quantity available"><input min="1" type="number" value={capacity} onChange={e => setCapacity(e.target.value)} /></Field><Field label="Sales start"><input type="datetime-local" value={salesStart} onChange={e => setSalesStart(e.target.value)} /></Field></div><Field label="Sales end"><input type="datetime-local" value={salesEnd} onChange={e => setSalesEnd(e.target.value)} /></Field></div></div></div>
      <div className="editor-section"><div className="editor-number">03</div><div className="editor-fields"><h2>Ready for review?</h2><p>Submitting sends your event to our team. It won’t appear publicly until approved.</p><label className="checkbox-row"><input type="checkbox" checked={submitForReview} onChange={e => setSubmitForReview(e.target.checked)} /><span><b>Submit for review</b><small>Save this event and request approval</small></span></label><label className="checkbox-row"><input type="checkbox" required checked={accepted} onChange={e => setAccepted(e.target.checked)} /><span><b>I confirm this event is authentic.</b><small>Event listings are reviewed before publication.</small></span></label></div></div>
      <div className="editor-submit">{mutation.isError && <p className="error-note">Couldn’t save this event. Check your access and try again.</p>}<Button type="submit" disabled={mutation.isPending || !accepted}>{mutation.isPending ? 'Saving event…' : submitForReview ? 'Save & submit for review' : 'Save draft'} <ArrowRight size={16} /></Button></div></div><aside className="editor-aside"><div className="aside-note"><ShieldCheck size={19} /><h3>Built on trust.</h3><p>Every listing is checked before it reaches the public marketplace.</p></div><div className="aside-note"><CreditCard size={19} /><h3>Sandbox payments</h3><p>Payments remain in PayFast sandbox until your setup and event are ready.</p></div></aside></form></WorkspaceFrame>;
}

function OrganiserEventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const id = Number(eventId);
  const sales = useGetOrganiserEventSales(id);
  const events = useListOrganiserEvents();
  const event = events.data?.find(e => e.id === id);
  const [tab, setTab] = useState<'attendees' | 'summary'>('attendees');
  return <WorkspaceFrame title={event?.title ?? 'Event overview'} subtitle="EVENT PERFORMANCE" active="My events"><Link href="/organiser/events" className="back-link"><ArrowLeft size={15} /> All events</Link><QueryMessage loading={sales.isLoading} error={sales.error} retry={() => sales.refetch()} />
    {sales.data && <><div className="metric-grid"><Metric label="Tickets sold" value={sales.data.ticketsSold} icon={<TicketCheck size={18} />} /><Metric label="Gross revenue" value={money(sales.data.grossRevenue)} icon={<WalletCards size={18} />} /><Metric label="Attendees" value={sales.data.attendees.length} icon={<Users size={18} />} /></div><div className="attendee-toolbar"><div className="tabs"><button className={tab === 'attendees' ? 'tab-active' : ''} onClick={() => setTab('attendees')}>Attendee list</button><button className={tab === 'summary' ? 'tab-active' : ''} onClick={() => setTab('summary')}>Sales summary</button></div><Button variant="outline" onClick={() => { const csv = ['Name,Email,Ticket,Purchase date,Checked in', ...sales.data!.attendees.map(a => [a.name, a.email, a.ticketCategory, a.purchasedAt, a.checkedIn].map(x => `"${String(x).replaceAll('"', '""')}"`).join(','))].join('\n'); const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `tickethub-event-${id}-attendees.csv`; a.click(); URL.revokeObjectURL(url); }}><ArrowDownToLine size={15} /> Download report</Button></div>
      {tab === 'attendees' ? <div className="data-table"><div className="table-head"><span>Attendee</span><span>Ticket type</span><span>Purchased</span><span>Check-in</span></div>{sales.data.attendees.length ? sales.data.attendees.map((a, i) => <div className="table-row" key={`${a.email}-${i}`}><span className="person-cell"><span className="person-avatar">{a.name.slice(0, 1)}</span><span><b>{a.name}</b><small>{a.email}</small></span></span><span>{a.ticketCategory}</span><span>{niceDate(a.purchasedAt)}</span><span className={a.checkedIn ? 'checkin-done' : 'checkin-wait'}>{a.checkedIn ? 'Checked in' : 'Not yet'}</span></div>) : <div className="table-empty">No ticket sales yet. This list updates when payments are verified.</div>}</div> : <div className="sales-summary"><div><span>Sales progress</span><b>{sales.data.ticketsSold} <small>tickets</small></b><div className="sales-line"><span style={{ width: `${Math.min(100, sales.data.ticketsSold * 2)}%` }} /></div></div><div><span>Gross revenue</span><b>{money(sales.data.grossRevenue)}</b></div><div><span>People coming</span><b>{sales.data.attendees.length}</b></div></div>}</>}</WorkspaceFrame>;
}

function OrganiserPayment() {
  const setup = useGetOrganiserPaymentSetup();
  const save = useSaveOrganiserPaymentSetup();
  const [merchantId, setMerchantId] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [show, setShow] = useState(false);
  const qc = useQueryClient();
  return <WorkspaceFrame title="Payment setup" subtitle="ORGANISER STUDIO" active="Payments"><p className="lead">Configure a PayFast sandbox account for test transactions.</p><QueryMessage loading={setup.isLoading} error={setup.error} retry={() => setup.refetch()} />{setup.data && <><div className="sandbox-banner"><span className="sandbox-icon"><ShieldCheck size={21} /></span><div><b>Sandbox only</b><p>Live payments are disabled. Use test credentials only.</p></div><span className="sandbox-chip">PAYFAST SANDBOX</span></div><div className="settings-card"><div className="settings-heading"><div><h2>Merchant details</h2><p>Credentials are sent to the server over a secure request. They are never shown again or stored in browser storage.</p></div><span className={`status-pill ${setup.data.configured ? 'status-approved' : 'status-not_started'}`}>{setup.data.configured ? 'Configured' : 'Not configured'}</span></div><form onSubmit={e => { e.preventDefault(); save.mutate({ data: { sandboxMerchantId: merchantId, sandboxPassphrase: passphrase } }, { onSuccess: () => { setMerchantId(''); setPassphrase(''); qc.invalidateQueries({ queryKey: getGetOrganiserPaymentSetupQueryKey() }); } }); }}><Field label="Sandbox merchant ID"><input required value={merchantId} onChange={e => setMerchantId(e.target.value)} autoComplete="off" /></Field><Field label="Sandbox passphrase"><div className="password-field"><input required type={show ? 'text' : 'password'} value={passphrase} onChange={e => setPassphrase(e.target.value)} autoComplete="new-password" /><button type="button" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button></div></Field>{save.isError && <p className="error-note">Could not save sandbox setup. Please try again.</p>}{save.isSuccess && <p className="success-note">Sandbox payment settings saved.</p>}<Button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving securely…' : 'Save sandbox setup'} <ArrowRight size={15} /></Button></form><p className="live-disabled"><CircleAlert size={15} /> {setup.data.livePaymentsEnabled ? 'Live payments require server-side enablement.' : 'Live payments are disabled.'}</p></div></>}</WorkspaceFrame>;
}

function CheckInPage() {
  const [eventId, setEventId] = useState('');
  const [token, setToken] = useState('');
  const [result, setResult] = useState<{ result: string; message: string; eventTitle: string | null; scannedAt: string | null } | null>(null);
  const scan = useScanTicket();
  return <WorkspaceFrame title="Door check-in" subtitle="EVENT STAFF" active="Check-in"><div className="checkin-wrap"><div className="checkin-intro"><span className="checkin-icon"><QrCode size={28} /></span><div className="eyebrow">QUICK, CALM, IN CONTROL</div><h2>Welcome them in.</h2><p>Enter the event ID and scan or paste the ticket code. The server verifies every scan.</p></div><form className="checkin-form" onSubmit={e => { e.preventDefault(); setResult(null); scan.mutate({ data: { eventId: Number(eventId), qrToken: token } }, { onSuccess: r => setResult(r) }); }}><Field label="Event ID"><input type="number" min="1" required value={eventId} onChange={e => setEventId(e.target.value)} placeholder="Event ID" /></Field><Field label="Ticket code"><input required minLength={16} value={token} onChange={e => setToken(e.target.value)} placeholder="Scan or paste the ticket code" autoCapitalize="off" /></Field><Button className="w-full" type="submit" disabled={scan.isPending}>{scan.isPending ? 'Checking ticket…' : 'Check ticket'} <ArrowRight size={16} /></Button>{scan.isError && <p className="error-note">We couldn’t verify this ticket. Check the code and try again.</p>}</form>{result && <div className={`scan-result scan-${result.result}`}><span>{result.result === 'valid' ? <CheckCircle2 size={25} /> : <CircleAlert size={25} />}</span><div><b>{result.message}</b><p>{result.eventTitle ?? 'Ticket status from server'}</p>{result.scannedAt && <small>{niceDate(result.scannedAt)}</small>}</div></div>}<div className="checkin-foot"><ShieldCheck size={15} /> Ticket status is verified live with TicketHub.</div></div></WorkspaceFrame>;
}

function AdminPage() {
  const dashboard = useGetAdminDashboard();
  const applications = useListOrganiserApplications();
  const events = useListAdminEvents();
  const reports = useListEventReports();
  const fee = useGetOnboardingFee();
  const payments = useListOnboardingPayments();
  const audit = useListAuditLogs();
  const decideApp = useDecideOrganiserApplication();
  const decideEvent = useDecideEvent();
  const decideReport = useDecideEventReport();
  const setFee = useSetOnboardingFee();
  const qc = useQueryClient();
  const [tab, setTab] = useState('Overview');
  const [feeValue, setFeeValue] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const tabs = ['Overview', 'Organisers', 'Event reviews', 'Reports', 'Onboarding', 'Audit trail'];
  const invalidate = () => { qc.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() }); qc.invalidateQueries({ queryKey: getListOrganiserApplicationsQueryKey() }); qc.invalidateQueries({ queryKey: getListAdminEventsQueryKey() }); qc.invalidateQueries({ queryKey: getListEventReportsQueryKey() }); qc.invalidateQueries({ queryKey: getListOnboardingPaymentsQueryKey() }); qc.invalidateQueries({ queryKey: getListAuditLogsQueryKey() }); };
  const review = (id: number, decision: 'approve' | 'reject' | 'suspend') => decideApp.mutate({ applicationId: id, data: { decision, reviewNote } }, { onSuccess: invalidate });
  const decide = (id: number, decision: 'approve' | 'reject' | 'suspend') => decideEvent.mutate({ eventId: id, data: { decision, reviewNote } }, { onSuccess: invalidate });
  const reportDecision = (id: number, decision: 'resolve' | 'dismiss') => decideReport.mutate({ reportId: id, data: { decision, reviewNote } }, { onSuccess: invalidate });
  return <WorkspaceFrame title="The platform, at a glance." subtitle="PLATFORM ADMIN" active="Platform admin"><div className="admin-tabs">{tabs.map(t => <button key={t} className={tab === t ? 'admin-tab-active' : ''} onClick={() => setTab(t)}>{t}</button>)}</div><QueryMessage loading={dashboard.isLoading || applications.isLoading || events.isLoading || reports.isLoading || fee.isLoading || payments.isLoading || audit.isLoading} error={dashboard.error || applications.error || events.error || reports.error || fee.error || payments.error || audit.error} retry={() => { dashboard.refetch(); applications.refetch(); events.refetch(); reports.refetch(); fee.refetch(); payments.refetch(); audit.refetch(); }} />
    {dashboard.data && tab === 'Overview' && <><div className="metric-grid admin-metrics"><Metric label="Organisers pending" value={dashboard.data.organisersPending} icon={<Users size={18} />} /><Metric label="Events to review" value={dashboard.data.eventsPending} icon={<CalendarDays size={18} />} /><Metric label="Open reports" value={dashboard.data.reportsOpen} icon={<Flag size={18} />} /><Metric label="Tickets sold" value={dashboard.data.ticketsSold} icon={<TicketCheck size={18} />} /></div><div className="admin-overview-grid"><div className="settings-card"><div className="eyebrow">ATTENTION NEEDED</div><h2>Keep things moving.</h2>{[[dashboard.data.organisersPending, 'organiser applications'], [dashboard.data.eventsPending, 'events awaiting review'], [dashboard.data.reportsOpen, 'open community reports']].map(([n, label]) => <button className="attention-row" key={String(label)} onClick={() => setTab(String(label).startsWith('organiser') ? 'Organisers' : String(label).startsWith('events') ? 'Event reviews' : 'Reports')}><b>{n}</b><span>{label}</span><ArrowRight size={16} /></button>)}</div><div className="settings-card"><div className="eyebrow">PLATFORM ACTIVITY</div><h2>Marketplace pulse</h2><div className="pulse-stat"><span>Approved organisers</span><b>{dashboard.data.organisersTotal}</b></div><div className="pulse-stat"><span>Events listed</span><b>{dashboard.data.eventsTotal}</b></div><div className="pulse-stat"><span>Tickets sold</span><b>{dashboard.data.ticketsSold}</b></div></div></div></>}
    {tab === 'Organisers' && <AdminRows title="Organiser applications" empty="No organiser applications need a decision." items={(applications.data ?? []).map(a => ({ id: a.id, title: a.organisationName, sub: `${a.legalName} · ${a.contactEmail}`, status: `${a.status} · fee ${a.paymentStatus}`, actions: <><Button variant="outline" onClick={() => review(a.id, 'approve')}>Approve</Button><Button variant="danger" onClick={() => review(a.id, 'reject')}>Reject</Button></> }))} note={reviewNote} setNote={setReviewNote} />}
    {tab === 'Event reviews' && <AdminRows title="Event review queue" empty="No events are awaiting a decision." items={(events.data ?? []).map(e => ({ id: e.id, title: e.title, sub: `${e.organiserName} · ${e.city} · ${niceDate(e.startsAt)}`, status: e.status, actions: <><Button variant="outline" onClick={() => decide(e.id, 'approve')}>Approve</Button><Button variant="danger" onClick={() => decide(e.id, 'reject')}>Reject</Button><Button variant="quiet" onClick={() => decide(e.id, 'suspend')}>Suspend</Button></> }))} note={reviewNote} setNote={setReviewNote} />}
    {tab === 'Reports' && <AdminRows title="Community reports" empty="No open event reports." items={(reports.data ?? []).map(r => ({ id: r.id, title: r.eventTitle, sub: `${r.reason} · ${r.contactEmail} · ${r.details}`, status: r.status, actions: <><Button variant="outline" onClick={() => reportDecision(r.id, 'resolve')}>Resolve</Button><Button variant="quiet" onClick={() => reportDecision(r.id, 'dismiss')}>Dismiss</Button></> }))} note={reviewNote} setNote={setReviewNote} />}
    {tab === 'Onboarding' && <div className="admin-overview-grid"><div className="settings-card"><div className="eyebrow">ORGANISER ONBOARDING FEE</div><h2>Set the fee</h2><p>Current fee: <b>{fee.data ? money(fee.data.amount) : '—'}</b></p><form className="fee-form" onSubmit={e => { e.preventDefault(); setFee.mutate({ data: { amount: Number(feeValue) } }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getGetOnboardingFeeQueryKey() }); qc.invalidateQueries({ queryKey: getListOnboardingPaymentsQueryKey() }); } }); }}><Field label="Amount (ZAR)"><input type="number" min="0" required value={feeValue} onChange={e => setFeeValue(e.target.value)} /></Field><Button type="submit" disabled={setFee.isPending}>{setFee.isPending ? 'Saving…' : 'Update fee'}</Button></form></div><div className="settings-card"><div className="eyebrow">FEE PAYMENTS</div><h2>Applications & payments</h2>{payments.data?.length ? payments.data.map((p, i) => <div className="pulse-stat" key={`${p.organiserId}-${i}`}><span>{p.organisationName}</span><b>{money(p.amount)} · {p.status}</b></div>) : <p className="table-empty">No onboarding payments to display.</p>}</div></div>}
    {tab === 'Audit trail' && <div className="settings-card"><div className="eyebrow">PLATFORM HISTORY</div><h2>Recent decisions</h2>{audit.data?.length ? audit.data.map(log => <div className="audit-row" key={log.id}><span className="audit-marker" /><div><b>{log.action}</b><p>{log.entityType} · {log.entityId} · actor {log.actorId}</p></div><small>{niceDate(log.createdAt)}</small></div>) : <div className="table-empty">No audit entries yet.</div>}</div>}
  </WorkspaceFrame>;
}

function AdminRows({ title, empty, items, note, setNote }: { title: string; empty: string; items: { id: number; title: string; sub: string; status: string; actions: React.ReactNode }[]; note: string; setNote: (s: string) => void }) {
  return <section className="settings-card admin-list"><div className="panel-heading"><div><div className="eyebrow">REVIEW DESK</div><h2>{title}</h2></div></div><Field label="Review note (optional)"><input value={note} onChange={e => setNote(e.target.value)} placeholder="Add context for the audit trail" /></Field>{items.length ? items.map(item => <div className="admin-row" key={item.id}><div className="admin-row-main"><b>{item.title}</b><p>{item.sub}</p></div><span className="status-pill">{item.status}</span><div className="admin-row-actions">{item.actions}</div></div>) : <div className="table-empty">{empty}</div>}</section>;
}

function ScanHookOnly() {
  // ITN callbacks are verified server-to-server. This hook is intentionally never
  // invoked from the browser, so a success redirect cannot issue a ticket.
  const itn = useReceivePayfastItn();
  return <span hidden aria-hidden="true">{itn.isPending ? 'pending' : 'idle'}</span>;
}

const legalSlugs = ['privacy', 'customer-terms', 'organiser-agreement', 'refunds', 'cancellations'] as const;
function LegalPage() {
  const { slug = 'privacy' } = useParams<{ slug: string }>();
  const validSlug = legalSlugs.includes(slug as typeof legalSlugs[number]) ? slug as typeof legalSlugs[number] : 'privacy';
  const legal = useGetLegalDocument(validSlug);
  return <PublicFrame><div className="legal-page content-wrap"><Link href="/" className="back-link"><ArrowLeft size={15} /> TicketHub</Link><div className="draft-banner"><FileText size={17} /><b>Draft — requires South African legal review.</b></div><QueryMessage loading={legal.isLoading} error={legal.error} retry={() => legal.refetch()} />{legal.data && <><div className="eyebrow">TICKETHUB SOUTH AFRICA · LEGAL</div><h1>{legal.data.title || slugLabel(validSlug)}</h1><p className="lead">Draft document · Requires South African legal review</p><article className="legal-content">{legal.data.content.split('\n').map((line, i) => line.trim() ? <p key={i}>{line}</p> : <br key={i} />)}</article></>}</div></PublicFrame>;
}

function NotFound() {
  return <PublicFrame><div className="not-found"><div className="eyebrow">404 · NOT ON THE LIST</div><h1>This page took<br /><em>a different turn.</em></h1><p>Let’s get you back to something good.</p><Link href="/" className="btn btn-primary"><ArrowLeft size={16} /> Back to discovery</Link></div></PublicFrame>;
}

function Router() {
  const [location] = useLocation();
  useHealthCheck();
  return <ErrorBoundary resetKey={location}><ScanHookOnly /><Switch>
    <Route path="/" component={HomePage} />
    <Route path="/events/:eventId" component={EventPage} />
    <Route path="/sign-in/*?" component={SignInSetup} />
    <Route path="/sign-up/*?" component={SignInSetup} />
    <Route path="/account/tickets" component={TicketsPage} />
    <Route path="/organiser" component={OrganiserHome} />
    <Route path="/organiser/events" component={OrganiserEvents} />
    <Route path="/organiser/events/new" component={EventForm} />
    <Route path="/organiser/events/:eventId/edit" component={EventForm} />
    <Route path="/organiser/events/:eventId" component={OrganiserEventDetail} />
    <Route path="/organiser/payment" component={OrganiserPayment} />
    <Route path="/admin" component={AdminPage} />
    <Route path="/check-in" component={CheckInPage} />
    <Route path="/legal/:slug" component={LegalPage} />
    <Route component={NotFound} />
  </Switch></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;
