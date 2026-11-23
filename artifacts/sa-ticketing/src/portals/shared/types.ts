export type UserRole = 'customer' | 'organiser' | 'admin';

export interface SessionAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organiserStatus?: string;
  organisationName?: string | null;
  phone?: string;
  marketingConsent?: boolean;
}

export interface EventItem {
  id: number;
  title: string;
  category: string;
  city: string;
  venue: string;
  date: string;
  time: string;
  price: number;
  sold: number;
  capacity: number;
  revenue?: number;
  ticketCategories?: {
    id?: number;
    name: string;
    description: string;
    price: number;
    quantityAvailable: number;
    salesStart: string | null;
    salesEnd: string | null;
  }[];
  status: string;
  image: string;
  organiser: string;
  description: string;
  rejectionReason?: string;
  materialChange?: boolean;
}

export interface TicketCategory {
  id: number;
  name: string;
  description: string;
  price: number;
  quantityAvailable: number;
  salesStart: string | null;
  salesEnd: string | null;
}

export interface CustomerTicket {
  id: number;
  eventId: number;
  eventTitle: string;
  venue: string;
  city: string;
  imageUrl: string;
  startsAt: string;
  ticketCategory: string;
  reference: string;
  status: string;
  deliveryStatus: string;
  purchaseDate: string;
}

export interface OrganiserEvent {
  id: number;
  title: string;
  category: string;
  city: string;
  venue: string;
  date: string;
  time: string;
  price: number;
  sold: number;
  capacity: number;
  revenue?: number;
  status: string;
  image: string;
  description: string;
  organiser: string;
}

export interface OrganiserApplication {
  id?: number;
  organiserId?: string;
  name: string;
  org: string;
  type: string;
  city: string;
  date: string;
  status: string;
  email: string;
  phone: string;
  verificationStatus: string;
  onboardingPaymentStatus: string;
  docs: string[];
  identityDocumentId?: string;
  businessDocumentId?: string;
  history: string;
  decisionReason?: string;
  messages?: string[];
}

export interface AdminApplication {
  id: number;
  organiserId: string;
  name: string;
  org: string;
  type: string;
  city: string;
  date: string;
  status: string;
  email: string;
  phone: string;
  verificationStatus: string;
  onboardingPaymentStatus: string;
  docs: string[];
  identityDocumentId?: string;
  businessDocumentId?: string;
  history: string;
  decisionReason?: string;
  messages?: string[];
}

export interface AdminDashboardStats {
  events: number;
  pendingEventApplications: number;
  pendingOrganiserApplications: number;
  verifiedOrganisers: number;
  ticketsSold: number;
  grossRevenue: number;
}

export interface OrganiserDashboardData {
  status: string;
  paymentStatus: string;
  eventCount: number;
  ticketsSold: number;
  revenue: number;
  events: OrganiserEvent[];
}

export interface EventDetail {
  id: number;
  title: string;
  description: string;
  category: string;
  city: string;
  venue: string;
  date: string;
  time: string;
  price: number;
  sold: number;
  capacity: number;
  revenue?: number;
  status: string;
  image: string;
  organiser: string;
  ticketCategories: TicketCategory[];
}

export interface CheckoutInput {
  eventId: number;
  ticketCategoryId: number;
  quantity: number;
}

export interface CheckoutResponse {
  action: string;
  fields: Record<string, string>;
  orderReference: string;
}