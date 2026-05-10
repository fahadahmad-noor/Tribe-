import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import lobbyRoutes from './routes/lobby.routes.js';
import requestRoutes from './routes/request.routes.js';
import messageRoutes from './routes/message.routes.js';
import squadRoutes from './routes/squad.routes.js';
import venueRoutes from './routes/venue.routes.js';
import challengeRoutes from './routes/challenge.routes.js';
import adminRoutes from './routes/admin.routes.js';
import geoRoutes from './routes/geo.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const clientOrigin = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/lobbies', lobbyRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/squads', squadRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/geo', geoRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

export default app;
