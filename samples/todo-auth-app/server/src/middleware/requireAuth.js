// Runs BEFORE a protected route. No valid cookie → 401, and the route never runs.

import { COOKIE_NAME, verifyToken } from '../auth-token.js';

export function requireAuth(req, res, next) {
  const token = req.cookies[COOKIE_NAME];

  if (!token) return res.status(401).json({ error: 'Please log in first.' });

  try {
    const payload = verifyToken(token);
    req.userId = payload.sub;
  } catch {
    return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }

  next();
}
