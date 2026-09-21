// Creating and checking the login token (a JWT) that lives in a cookie.

import jwt from 'jsonwebtoken';

export const COOKIE_NAME = 'token';
const SECRET = process.env.JWT_SECRET ?? 'dev-only-secret-change-me';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const COOKIE_OPTIONS = {
  httpOnly: true, // page JavaScript cannot read it, so an XSS bug cannot steal it
  sameSite: 'lax', // not sent on cross-site POSTs: basic CSRF protection
  secure: process.env.NODE_ENV === 'production', // HTTPS-only once deployed
  maxAge: SEVEN_DAYS_MS,
};

export const signToken = (user) =>
  jwt.sign({ sub: user.id, email: user.email }, SECRET, { expiresIn: '7d' });

export const verifyToken = (token) => jwt.verify(token, SECRET);
