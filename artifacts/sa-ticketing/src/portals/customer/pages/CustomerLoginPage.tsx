import { useState } from 'react';
import { useLocation } from 'wouter';
import { Ticket, ArrowLeft, Mail, Lock, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { api } from '../../shared/api';
import type { SessionAccount } from '../../shared/types';
import { useAuth } from '../../shared/hooks/useAuth';

export function CustomerLoginPage({ onLogin }: { onLogin: (account: import('../../shared/types').SessionAccount) => void }) {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { login, register } = useAuth();

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    const form = new FormData(e.currentTarget);
    const name = form.get('name') as string;
    const email = form.get('email') as string;
    const password = form.get('password') as string;

    try {
      if (mode === 'login') {
        await login(email, password, 'customer');
      } else {
        if (!name || name.length < 2) throw new Error('Name must be at least 2 characters');
        await register(name, email, password, 'customer');
      }
      setSuccess(mode === 'login' ? 'Welcome back!' : 'Account created successfully!');
      setTimeout(async () => {
        const data = await api.me();
        onLogin(data);
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="portal-auth-page customer-auth">
      <div className="auth-art" style={{ backgroundImage: `url(https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=85)` }}>
        <div className="art-overlay">
          <span className="eyebrow">YOUR NEXT GOOD NIGHT</span>
          <h2>Out there<br /><em>starts here.</em></h2>
          <p>Discover events, buy tickets, make memories.</p>
        </div>
      </div>

      <div className="auth-form-container">
        <button className="back-crumb" type="button" onClick={() => navigate('/customer')}>
          <ArrowLeft size={15} /> Back to events
        </button>

        <div className="auth-header">
          <span className="eyebrow">OUT THERE ACCOUNT</span>
          <h1>{mode === 'login' ? 'Welcome back.' : 'Come on in.'}</h1>
          <p>{mode === 'login' ? 'Sign in to manage your tickets and discover events.' : 'Create an account to start booking.'}</p>
        </div>

        {error && <div className="form-error" role="alert"><AlertCircle size={16} /> {error}</div>}
        {success && <div className="form-success" role="status"><CheckCircle size={16} /> {success}</div>}

        <form className="auth-form" onSubmit={submit}>
          {mode === 'register' && (
            <label>
              Your name
              <input required name="name" placeholder="Your name" minLength={2} autoComplete="name" />
            </label>
          )}

          <label>
            Email address
            <Mail size={18} className="input-icon" />
            <input required name="email" type="email" autoComplete={mode === 'login' ? 'email' : 'email'} placeholder="you@example.com" />
          </label>

          <label>
            Password
            <Lock size={18} className="input-icon" />
            <input required name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="At least 8 characters" minLength={8} />
          </label>

          {mode === 'login' && (
            <button type="button" className="forgot-link" onClick={() => navigate('/customer/forgot-password')}>
              Forgot password?
            </button>
          )}

          <button className="btn-primary wide" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={16} />
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? 'New around here?' : 'Already have an account?'}
          <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setSuccess(''); }}>
            {mode === 'login' ? 'Create an account' : 'Sign in'}
          </button>
        </div>

        <div className="auth-footer-note">
          <p>By continuing, you agree to our <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>.</p>
        </div>
      </div>
    </main>
  );
}