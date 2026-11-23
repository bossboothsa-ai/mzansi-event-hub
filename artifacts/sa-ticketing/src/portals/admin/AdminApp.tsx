import { useLocation } from 'wouter';
import { useState, useEffect } from 'react';
import { AdminLayout, AdminDashboardPage, AdminApplicationsPage, AdminOrganisersPage, AdminEventsPage, AdminReportsPage, AdminCustomersPage, AdminSalesPage, AdminTransactionsPage, AdminPayoutsPage, AdminDisputesPage, AdminCommunicationsPage, AdminEmailsPage, AdminOnboardingPage, AdminAuditPage, AdminSettingsPage } from './AdminPortal';
import { AdminLoginPage } from './pages/AdminLoginPage';

export function AdminApp() {
  const [path, navigate] = useLocation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="portal-loading">Loading…</div>;

  // Login route
  if (path === '/admin/login') {
    return (
      <AdminLayout>
        <AdminLoginPage
          onLogin={(account) => {
            if (account.role === 'admin') {
              navigate('/admin');
            } else {
              // Wrong role - redirect to appropriate portal
              navigate(`/${account.role === 'organiser' ? 'organizer' : 'customer'}`);
            }
          }}
        />
      </AdminLayout>
    );
  }

  // Admin routes - all protected
  if (path === '/admin/applications') {
    return <AdminLayout><AdminApplicationsPage /></AdminLayout>;
  }

  if (path === '/admin/organisers') {
    return <AdminLayout><AdminOrganisersPage /></AdminLayout>;
  }

  if (path === '/admin/events' || path.startsWith('/admin/events/')) {
    return <AdminLayout><AdminEventsPage /></AdminLayout>;
  }

  if (path === '/admin/reports') {
    return <AdminLayout><AdminReportsPage /></AdminLayout>;
  }

  if (path === '/admin/customers') {
    return <AdminLayout><AdminCustomersPage /></AdminLayout>;
  }

  if (path === '/admin/sales') {
    return <AdminLayout><AdminSalesPage /></AdminLayout>;
  }

  if (path === '/admin/transactions') {
    return <AdminLayout><AdminTransactionsPage /></AdminLayout>;
  }

  if (path === '/admin/payouts') {
    return <AdminLayout><AdminPayoutsPage /></AdminLayout>;
  }

  if (path === '/admin/disputes') {
    return <AdminLayout><AdminDisputesPage /></AdminLayout>;
  }

  if (path === '/admin/reports') {
    return <AdminLayout><AdminReportsPage /></AdminLayout>;
  }

  if (path === '/admin/communications') {
    return <AdminLayout><AdminCommunicationsPage /></AdminLayout>;
  }

  if (path === '/admin/emails') {
    return <AdminLayout><AdminEmailsPage /></AdminLayout>;
  }

  if (path === '/admin/onboarding') {
    return <AdminLayout><AdminOnboardingPage /></AdminLayout>;
  }

  if (path === '/admin/audit') {
    return <AdminLayout><AdminAuditPage /></AdminLayout>;
  }

  if (path === '/admin/settings') {
    return <AdminLayout><AdminSettingsPage /></AdminLayout>;
  }

  // Default: dashboard
  return <AdminLayout><AdminDashboardPage /></AdminLayout>;
}