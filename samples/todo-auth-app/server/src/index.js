// The Express server: the "backend" of the to-do app.
// Start it with:  npm run dev   → http://localhost:4000

import express from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';
import todoRoutes from './routes/todos.js';

const app = express();
const PORT = process.env.PORT ?? 4000;

// Middleware: small functions every request passes through, in order.
app.use(express.json()); // turns a JSON request body into req.body
app.use(cookieParser()); // turns the Cookie header into req.cookies

// Print one line per request, so you can watch the frontend talk to the backend.
app.use((req, res, next) => {
  const started = Date.now();

  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${Date.now() - started} ms)`);
  });

  next();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/todos', todoRoutes);

// Any /api URL we did not define.
app.use('/api', (req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
});

// Anything that throws ends up here. A 4xx (e.g. a body that is not valid JSON)
// is the caller's mistake; a 500 is ours, so log it and hide the details.
app.use((err, req, res, next) => {
  const status = err.status ?? 500;

  if (status >= 500) console.error(err);

  res.status(status).json({ error: err.expose ? err.message : 'Something went wrong on the server.' });
});

app.listen(PORT, (err) => {
  // Express 5 reports a failed start here instead of crashing, so check for it.
  if (err?.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the other server (Ctrl + C in its terminal) or set PORT in .env.`);
    process.exit(1);
  }

  if (err) throw err;

  console.log(`API running on http://localhost:${PORT}`);
});
