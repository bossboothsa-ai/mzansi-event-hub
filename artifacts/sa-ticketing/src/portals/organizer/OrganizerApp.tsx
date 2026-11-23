import { useLocation } from 'wouter';
import { useState, useEffect } from 'react';
import { OrganizerLayout, OrganizerDashboardPage, OrganizerEventsPage, OrganizerCreateEventPage, OrganizerVerificationPage, OrganizerSettingsPage, OrganizerPaymentsPage, OrganizerCommunicationsPage, OrganizerTicketsPage, OrganizerAttendeesPage, OrganizerSalesPage, OrganizerHelpPage } from './OrganizerPortal';
import { OrganizerLoginPage } from './pages/OrganizerLoginPage';
import { AuthProvider } from '../shared/hooks/useAuth';

export function OrganizerApp() {
  const [path, navigate] = useLocation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="portal-loading">Loading…</div>;

  return (
    <AuthProvider expectedRole="organiser">
      {(() => {
        // Login/register routes
        if (path === '/organizer/login' || path === '/organizer/register') {
          return (
            <OrganizerLayout>
              <OrganizerLoginPage
                onLogin={(account) => {
                  if (account.role === 'organiser') {
                    navigate('/organizer');
                  } else if (account.role === 'admin') {
                    navigate('/admin');
                  } else {
                    navigate('/organizer/verification');
                  }
                }}
              />
            </OrganizerLayout>
          );
        }

        // Protected routes - require organiser role
        if (path === '/organizer/create') {
          return <OrganizerLayout><OrganizerCreateEventPage /></OrganizerLayout>;
        }

        if (path.startsWith('/organizer/events/') && path !== '/organizer/events') {
          return <OrganizerLayout><OrganizerEventsPage /></OrganizerLayout>;
        }

        if (path === '/organizer/events') {
          return <OrganizerLayout><OrganizerEventsPage /></OrganizerLayout>;
        }

        if (path === '/organizer/verification') {
          return <OrganizerLayout><OrganizerVerificationPage /></OrganizerLayout>;
        }

        if (path === '/organizer/settings') {
          return <OrganizerLayout><OrganizerSettingsPage /></OrganizerLayout>;
        }

        if (path === '/organizer/payments') {
          return <OrganizerLayout><OrganizerPaymentsPage /></OrganizerLayout>;
        }

        if (path === '/organizer/communications') {
          return <OrganizerLayout><OrganizerCommunicationsPage /></OrganizerLayout>;
        }

        if (path === '/organizer/tickets') {
          return <OrganizerLayout><OrganizerTicketsPage /></OrganizerLayout>;
        }

        if (path === '/organizer/attendees') {
          return <OrganizerLayout><OrganizerAttendeesPage /></OrganizerLayout>;
        }

        if (path === '/organizer/sales') {
          return <OrganizerLayout><OrganizerSalesPage /></OrganizerLayout>;
        }

        if (path === '/organizer/help') {
          return <OrganizerLayout><OrganizerHelpPage /></OrganizerLayout>;
        }

        // Default: dashboard
        return <OrganizerLayout><OrganizerDashboardPage /></OrganizerLayout>;
      })()}
    </AuthProvider>
  );
}