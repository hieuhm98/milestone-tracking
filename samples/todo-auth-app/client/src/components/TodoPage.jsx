// The logged-in screen: add, tick, delete and filter to-dos.

import { useEffect, useState } from 'react';
import { api } from '../api.js';

const FILTER_KEY = 'todo:filter';
const FILTERS = ['all', 'active', 'done'];

function readFilter() {
  try {
    const saved = localStorage.getItem(FILTER_KEY);

    return FILTERS.includes(saved) ? saved : 'all';
  } catch {
    return 'all';
  }
}

export default function TodoPage({ user, onLogout, onSessionExpired }) {
  const [todos, setTodos] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [filter, setFilter] = useState(readFilter);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // A 401 means the cookie is missing or expired: send the user back to login.
  function handleError(err) {
    if (err.status === 401) return onSessionExpired();

    setError(err.message);
  }

  useEffect(() => {
    api('GET', '/todos')
      .then((data) => setTodos(data.todos))
      .catch(handleError)
      .finally(() => setLoading(false));
  }, []);

  function changeFilter(next) {
    setFilter(next);
    // The filter is a harmless UI preference, so localStorage is a fine place for it.
    localStorage.setItem(FILTER_KEY, next);
  }

  async function addTodo(event) {
    event.preventDefault();
    setError('');

    try {
      const data = await api('POST', '/todos', { title: newTitle });
      setTodos([data.todo, ...todos]);
      setNewTitle('');
    } catch (err) {
      handleError(err);
    }
  }

  async function toggleTodo(todo) {
    try {
      const data = await api('PATCH', `/todos/${todo.id}`, { done: !todo.done });
      setTodos(todos.map((t) => (t.id === todo.id ? data.todo : t)));
    } catch (err) {
      handleError(err);
    }
  }

  async function deleteTodo(todo) {
    try {
      await api('DELETE', `/todos/${todo.id}`);
      setTodos(todos.filter((t) => t.id !== todo.id));
    } catch (err) {
      handleError(err);
    }
  }

  const visible = todos.filter((t) => {
    if (filter === 'active') return !t.done;
    if (filter === 'done') return t.done;

    return true;
  });
  const remaining = todos.filter((t) => !t.done).length;

  return (
    <section className="card">
      <header className="row">
        <h1>Hi, {user.name}</h1>
        <button type="button" className="secondary" onClick={onLogout}>
          Log out
        </button>
      </header>

      <form className="row" onSubmit={addTodo}>
        <input
          placeholder="What needs doing?"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          aria-label="New to-do"
        />
        <button type="submit">Add</button>
      </form>

      {error && <p className="error" role="alert">{error}</p>}

      <div className="row filters">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={f === filter ? 'chip active' : 'chip'}
            onClick={() => changeFilter(f)}
          >
            {f}
          </button>
        ))}
        <span className="muted">{remaining} left</span>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="muted">Nothing here yet.</p>
      ) : (
        <ul className="todos">
          {visible.map((todo) => (
            <li key={todo.id} className={todo.done ? 'done' : ''}>
              <label>
                <input type="checkbox" checked={todo.done} onChange={() => toggleTodo(todo)} />
                <span>{todo.title}</span>
              </label>
              <button type="button" className="link" onClick={() => deleteTodo(todo)} aria-label={`Delete ${todo.title}`}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
