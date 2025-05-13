import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

export const config = {
  databaseUrl: process.env.DATABASE_URL,
  serverHost: process.env.SERVER_HOST || '0.0.0.0',
  serverPort: parseInt(process.env.SERVER_PORT || '2567', 10),
  jwtSecret: process.env.JWT_SECRET || 'default_secret_key',
};