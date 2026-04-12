import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { connectDb } from './config/db.js';
import { attachSocketIO } from './socket/handlers.js';
import { ensureUploadsDir } from './controllers/user.controller.js';

ensureUploadsDir();

const PORT = Number(process.env.PORT) || 5000;
const clientOrigin = process.env.CLIENT_URL || 'http://localhost:5173';

async function main() {
  await connectDb();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: clientOrigin, credentials: true },
  });
  app.set('io', io);
  attachSocketIO(io);
  server.listen(PORT, () => {
    console.log(`TRIBE API + Socket listening on http://localhost:${PORT}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
