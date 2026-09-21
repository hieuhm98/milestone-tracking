// One form that works for both "Log in" and "Sign up".

import { useState } from 'react';
import { api } from '../api.js';

const LAST_EMAIL_KEY = 'todo:lastEmail';

function readLastEmail() {
  try {
    return localStorage.getItem(LAST_EMAIL_KEY) ?? '';
  } catch {
    return '';
  }
}

export default function AuthForm({ onLoggedIn }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState(readLastEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isSignup = mode === 'signup';

  async function handleSubmit(event) {
    event.preventDefault(); // stop the browser's default full-page form submit
    setError('');

    // Quick checks in the browser give instant feedback.
    // The server checks again: this is for convenience, not security.
    if (isSignup && !name.trim()) return setError('Please enter your name.');
    if (isSignup && password.length < 8) return setError('Password must be at least 8 characters.');

    setSubmitting(true);

    try {
      const path = isSignup ? '/auth/signup' : '/auth/login';
      const body = isSignup ? { name, email, password } : { email, password };
      const data = await api('POST', path, body);

      // Remember the email (NOT the password) to pre-fill the form next time.
      localStorage.setItem(LAST_EMAIL_KEY, email);
      onLoggedIn(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode() {
    setMode(isSignup ? 'login' : 'signup');
    setError('');
  }

  return (
    <form className="card" onSubmit={handleSubmit} noValidate>
      <h1>{isSignup ? 'Create an account' : 'Log in'}</h1>

      {isSignup && (
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </label>
      )}

      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </label>

      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isSignup ? 'new-password' : 'current-password'}
        />
      </label>

      {error && <p className="error" role="alert">{error}</p>}

      <button type="submit" disabled={submitting}>
        {submitting ? 'Please wait…' : isSignup ? 'Sign up' : 'Log in'}
      </button>

      <p className="muted">
        {isSignup ? 'Already have an account?' : 'New here?'}{' '}
        <button type="button" className="link" onClick={switchMode}>
          {isSignup ? 'Log in' : 'Create an account'}
        </button>
      </p>
    </form>
  );
}
