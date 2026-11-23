import { useLocation } from 'wouter';
import { useState, useEffect } from 'react';
import { CustomerLayout, CustomerMarketplace, CustomerEventDetailPage, CustomerCheckoutPage, CustomerMyTicketsPage, CustomerAccountPage, CustomerLoginPage } from './CustomerPortal';

export function CustomerApp() {
  const [path, navigate] = useLocation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="portal-loading">Loading…</div>;

  // Handle login/register routes
  if (path === '/customer/login' || path === '/customer/register') {
    return (
      <CustomerLayout>
        <CustomerLoginPage
          onLogin={(account) => {
            if (account.role === 'customer') {
              navigate('/customer/my-tickets');
            } else {
              // Wrong role - redirect to appropriate portal
              navigate(`/${account.role === 'admin' ? 'admin' : 'organizer'}`);
            }
          }}
        />
      </CustomerLayout>
    );
  }

  // Customer routes
  if (path.startsWith('/customer/events/') && !path.includes('/checkout')) {
    return <CustomerLayout><CustomerEventDetailPage /></CustomerLayout>;
  }

  if (path.startsWith('/customer/checkout')) {
    return <CustomerLayout><CustomerCheckoutPage /></CustomerLayout>;
  }

  if (path === '/customer/my-tickets') {
    return <CustomerLayout><CustomerMyTicketsPage /></CustomerLayout>;
  }

  if (path === '/customer/account') {
    return <CustomerLayout><CustomerAccountPage /></CustomerLayout>;
  }

  if (path.startsWith('/customer/events')) {
    return <CustomerLayout><CustomerMarketplace /></CustomerLayout>;
  }

  // Default: redirect to marketplace
  return <CustomerLayout><CustomerMarketplace /></CustomerLayout>;
}