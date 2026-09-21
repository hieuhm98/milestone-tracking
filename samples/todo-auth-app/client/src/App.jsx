// Decides which screen to show: the login/sign-up form, or the to-do list.

import { useEffect, useState } from 'react';
import { api } from './api.js';
import AuthForm from './components/AuthForm.jsx';
import TodoPage from './components/TodoPage.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  // On first load, ask the server "is my cookie still valid?".
  // That is what keeps you logged in after a page refresh.
  useEffect(() => {
    api('GET', '/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  async function handleLogout() {
    await api('POST', '/auth/logout');
    setUser(null);
  }

  if (checking) return <p className="center">Loading…</p>;

  return (
    <main className="container">
      {user ? (
        <TodoPage user={user} onLogout={handleLogout} onSessionExpired={() => setUser(null)} />
      ) : (
        <AuthForm onLoggedIn={setUser} />
      )}
    </main>
  );
}
