import { prisma } from './db/client';

import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';

import { config } from './config';
import { constants } from '@project-override/shared';
import { AuthRoom } from './colyseus/rooms/AuthRoom';

let gameServer: Server;
let httpServer: any;

async function bootstrap() {
  const app = express();
  app.use(cors()); // Basic CORS setup
  app.use(express.json());

  // Simple health check / info endpoint
  app.get('/', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  httpServer = createServer(app);

  // --- Colyseus Game Server ---
  gameServer = new Server({
    transport: new WebSocketTransport({
      pingInterval: 6000,
      pingMaxRetries: 4,
      server: httpServer,
      maxPayload: 1024 * 1024 * 10, // 10 MB
    }),
  });

  // Register rooms
  gameServer.define('auth', AuthRoom);

  const originalConsoleLog = console.log;
  console.log = (...args: any[]) => {};

  gameServer.listen(config.serverPort, config.serverHost).then(() => {
    console.log = originalConsoleLog;
    console.log(`[GameServer] Version ${constants.PO_VERSION}`);
    console.log(`[GameServer] Listening on ${config.serverHost}:${config.serverPort}`);
  });

  console.log('[GameServer] Server bootstrap complete.');
  try {
    const userCount = await prisma.user.count();
    console.log(`[GameServer] DB connected. ${userCount} users.`);
  } catch (e: any) {
    console.error('[GameServer] DB connection test failed:', e.message);
  }
}

bootstrap().catch((error) => {
  console.error('[GameServer] Failed to bootstrap the server:', error);
  gracefulShutdown('bootstrap error');
});

async function gracefulShutdown(signal: string) {
  console.log(`[GameServer] Received ${signal}.`);
  console.log(`[GameServer] Closing server...`);
  const server = httpServer;
  if (server) {
    server.close(() => {
      console.log('[GameServer] Server closed.');
    });
  } else {
    console.log('[GameServer] No server to close.');
  }
  console.log(`[GameServer] Shutting down DB Client...`);
  await prisma.$disconnect();

  process.exit(signal == 'SIGINT' ? 0 : 1);
}
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
