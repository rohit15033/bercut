import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import 'dotenv/config';
import { addClient, removeClient } from './src/lib/sse.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(morgan('dev'));  // logs every request to terminal
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

// SSE endpoint — kiosk and barber app subscribe here
app.get('/api/events', (req, res) => {
  const { branch_id } = req.query;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  addClient(branch_id, res);
  const heartbeat = setInterval(() => res.write(':\n\n'), 30000);
  req.on('close', () => { clearInterval(heartbeat); removeClient(branch_id, res); });
});

// Routes (add as you build each module)
// import branchRoutes from './src/routes/branches.js';
// app.use('/api/branches', branchRoutes);

app.listen(PORT, () => console.log(`Bercut API running on port ${PORT}`));
