import { useState } from 'react';
import { useLocation } from 'wouter';
import { Shield, ArrowLeft, Mail, Lock, AlertCircle, CheckCircle, Users, BarChart3, Settings, Shield as ShieldIcon, FileText, Wallet, Flag, Mail as MailIcon, Activity, LogOut, ArrowLeft as ArrowLeftIcon, ArrowRight } from 'lucide-react';
import { api } from '../../shared/api';
import type { SessionAccount } from '../../shared/types';
import { useAuth } from '../../shared/hooks/useAuth';

export function AdminLoginPage({ onLogin }: { onLogin: (account: import('../../shared/types').SessionAccount) => void }) {
  const [, navigate] = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(e.currentTarget);
    const email = form.get('email') as string;
    const password = form.get('password') as string;

    try {
      await login(email, password, 'admin');
      setTimeout(() => navigate('/admin'), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="portal-auth-page admin-auth">
      <div className="auth-art" style={{ backgroundImage: `url(https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=85)` }}>
        <div className="art-overlay">
          <span className="eyebrow">PLATFORM ADMINISTRATION</span>
          <h2>Control centre.<br /><em>Secure access.</em></h2>
          <p>Authorised administrators only.</p>
        </div>
      </div>

      <div className="auth-form-container">
        <button className="back-crumb" type="button" onClick={() => navigate('/admin')}>
          <ArrowLeft size={15} /> Back
        </button>

        <div className="auth-header">
          <span className="eyebrow">ADMINISTRATOR ACCESS</span>
          <h1>Sign in to continue</h1>
          <p>Enter your administrator credentials to access the platform control centre.</p>
        </div>

        {error && <div className="form-error" role="alert"><AlertCircle size={16} /> {error}</div>}

        <form className="auth-form" onSubmit={submit}>
          <label>
            Email address
            <Mail size={18} className="input-icon" />
            <input required name="email" type="email" autoComplete="email" placeholder="admin@example.com" />
          </label>

          <label>
            Password
            <Lock size={18} className="input-icon" />
            <input required name="password" type="password" autoComplete="current-password" placeholder="Password" minLength={12} />
          </label>

          <button className="btn-primary wide" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : 'Sign in'} <ArrowRight size={16} />
          </button>
        </form>

        <div className="auth-footer-note">
          <p>Administrator accounts cannot be self-registered. Contact the platform owner for access.</p>
        </div>
      </div>
    </main>
  );
}