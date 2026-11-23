const API_BASE = '/api';

class ApiError extends Error {
  constructor(public status: number, message: string, public data?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(response.status, data.error || `Request failed with status ${response.status}`, data);
  }

  return data as T;
}

export const api = {
  // Customer auth
  customerLogin: (email: string, password: string) =>
    fetchApi<{ id: string; name: string; email: string; role: 'customer' }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  customerRegister: (name: string, email: string, password: string) =>
    fetchApi<{ id: string; name: string; email: string; role: 'customer' }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  // Organizer auth
  organizerLogin: (email: string, password: string) =>
    fetchApi<{ id: string; name: string; email: string; role: 'organiser' }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  organizerRegister: (name: string, email: string, password: string) =>
    fetchApi<{ id: string; name: string; email: string; role: 'customer' }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  // Admin auth
  adminLogin: (email: string, password: string) =>
    fetchApi<{ id: string; name: string; email: string; role: 'admin' }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  // Shared auth
  logout: () => fetchApi<void>('/auth/logout', { method: 'POST' }),
  me: () => fetchApi<{
    id: string;
    name: string;
    email: string;
    role: 'customer' | 'organiser' | 'admin';
    organiserStatus?: string;
    organisationName?: string | null;
    phone?: string;
    marketingConsent?: boolean;
  }>('/account/me'),

  // Customer endpoints
  getEvents: (params?: { category?: string; city?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.city) searchParams.set('city', params.city);
    if (params?.search) searchParams.set('search', params.search);
    const query = searchParams.toString();
    return fetchApi<import('@/portals/shared/types').EventItem[]>(`/events${query ? `?${query}` : ''}`);
  },

  getEvent: (id: number) =>
    fetchApi<import('@/portals/shared/types').EventDetail>(`/events/${id}`),

  getCategories: () => fetchApi<string[]>('/events/categories'),
  getCities: () => fetchApi<string[]>('/events/cities'),

  checkout: (input: import('@/portals/shared/types').CheckoutInput) =>
    fetchApi<import('@/portals/shared/types').CheckoutResponse>('/checkout', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  getMyTickets: () => fetchApi<import('@/portals/shared/types').CustomerTicket[]>('/tickets'),

  resendTicket: (ticketId: number) =>
    fetchApi<{ status: string; recipient: string; createdAt: string }>(`/tickets/${ticketId}/resend`, {
      method: 'POST',
    }),

  // Organizer endpoints
  getOrganiserDashboard: () => fetchApi<import('@/portals/shared/types').OrganiserDashboardData>('/organiser/dashboard'),
  getOrganiserEvents: () => fetchApi<import('@/portals/shared/types').OrganiserEvent[]>('/organiser/events'),
  getOrganiserEvent: (id: number) => fetchApi<import('@/portals/shared/types').EventDetail>(`/organiser/events/${id}`),
  createEvent: (input: unknown) => fetchApi<import('@/portals/shared/types').EventDetail>('/organiser/events', {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  updateEvent: (id: number, input: unknown) => fetchApi<import('@/portals/shared/types').EventDetail>(`/organiser/events/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  }),
  getEventSales: (eventId: number) => fetchApi<{
    eventId: number;
    ticketsSold: number;
    grossRevenue: number;
    attendees: Array<{
      id: number;
      customerId: string;
      name: string;
      email: string;
      phone: string;
      marketingConsent: boolean;
      ticketCategory: string;
      purchasedAt: string;
      ticketReference: string;
      paymentStatus: string;
      deliveryStatus: string;
      checkedIn: boolean;
      checkedInAt: string | null;
      ticketStatus: string;
    }>;
  }>(`/organiser/events/${eventId}/sales`),
  getEventCheckIns: (eventId: number) => fetchApi<Array<{
    ticketReference: string;
    attendeeName: string;
    category: string;
    scannedAt: string;
    staffName: string;
  }>>(`/organiser/events/${eventId}/check-ins`),
  getOrganiserApplication: () => fetchApi<import('@/portals/shared/types').OrganiserApplication>('/organiser/application'),
  submitOrganiserApplication: (input: unknown) => fetchApi<import('@/portals/shared/types').OrganiserApplication>('/organiser/application', {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  uploadDocument: (kind: 'identity' | 'business', file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetchApi<{ id: string; kind: string; fileName: string; status: string }>(`/organiser/documents?kind=${kind}`, {
      method: 'POST',
      body: formData,
      headers: {},
    });
  },
  getPayfastConfig: () => fetchApi<{
    configured: boolean;
    environment: string;
    livePaymentsEnabled: boolean;
    merchantId: string | null;
  }>('/organiser/payfast'),
  savePayfastConfig: (input: { sandboxMerchantId: string; sandboxMerchantKey: string; sandboxPassphrase: string }) =>
    fetchApi<{
      configured: boolean;
      environment: string;
      livePaymentsEnabled: boolean;
      merchantId: string;
    }>('/organiser/payfast', {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  // Admin endpoints
  getAdminDashboard: () => fetchApi<import('@/portals/shared/types').AdminDashboardStats>('/admin/dashboard'),
  getAdminApplications: () => fetchApi<import('@/portals/shared/types').AdminApplication[]>('/admin/applications'),
  getAdminApplicationMessages: (applicationId: number) => fetchApi<Array<{
    id: number;
    content: string;
    senderId: string;
    senderName: string;
    senderRole: string;
    createdAt: string;
  }>>(`/admin/applications/${applicationId}/messages`),
  postAdminApplicationMessage: (applicationId: number, content: string) => fetchApi<{
    id: number;
    content: string;
    senderId: string;
    senderName: string;
    senderRole: string;
    createdAt: string;
  }>(`/admin/applications/${applicationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  }),
  decideApplication: (applicationId: number, decision: 'approve' | 'reject' | 'request_information', reviewNote: string) =>
    fetchApi<unknown>(`/admin/applications/${applicationId}/decision`, {
      method: 'PATCH',
      body: JSON.stringify({ decision, reviewNote }),
    }),
  getAdminEvents: () => fetchApi<import('@/portals/shared/types').EventItem[]>('/admin/events'),
  decideEvent: (eventId: number, decision: 'approve' | 'publish' | 'reject' | 'request_information' | 'suspend' | 'restore', reviewNote: string) =>
    fetchApi<unknown>(`/admin/events/${eventId}/decision`, {
      method: 'PATCH',
      body: JSON.stringify({ decision, reviewNote }),
    }),
  getAdminReports: () => fetchApi<Array<{
    id: number;
    eventId: number;
    eventTitle: string;
    reporter: string;
    reason: string;
    severity: string;
    date: string;
    status: string;
  }>>('/admin/reports'),
  getAdminEmails: () => fetchApi<Array<{
    id: number;
    recipient: string;
    subject: string;
    status: string;
    createdAt: string;
  }>>('/admin/emails'),
  getAdminOrganisers: () => fetchApi<Array<{
    id: number;
    name: string;
    email: string;
    phone: string;
    role: string;
    marketingConsent: boolean;
    createdAt: string;
    organisationName: string | null;
    organiserStatus: string;
    onboardingPaymentStatus: string;
  }>>('/admin/organisers'),
  getAdminOnboarding: () => fetchApi<Array<{
    id: number;
    organiserId: string;
    name: string;
    email: string;
    status: string;
    paymentStatus: string;
    amount: number;
    currency: string;
    reconciliationReference: string | null;
    createdAt: string;
  }>>('/admin/onboarding'),
  updateOnboardingPayment: (organiserId: string, status: 'paid' | 'waived', reconciliationReference: string, note?: string) =>
    fetchApi<unknown>(`/admin/onboarding/${organiserId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reconciliationReference, note }),
    }),
};

export { ApiError };
export type { } from './types';