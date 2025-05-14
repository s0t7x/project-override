import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

export const config = {
  databaseUrl: process.env.DATABASE_URL,
  serverHost: process.env.SERVER_HOST || '0.0.0.0',
  serverPort: parseInt(process.env.SERVER_PORT || '2567', 10),
  jwt: {
    secret: process.env.JWT_SECRET || 'default-jwt-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-jwt-refresh-secret',
    accessTokenExpiration: process.env.JWT_ACCESS_TOKEN_EXPIRATION || '15m',
    refreshTokenExpiration: process.env.JWT_REFRESH_TOKEN_EXPIRATION || '7d',
  },
  userRegistrationAllowed: process.env.USER_REGISTRATION_ALLOWED === 'true',
  userPasswordMinLength: parseInt(process.env.USER_PASSWORD_MIN_LENGTH || '8'),
  userPasswordSaltRounds: parseInt(process.env.USER_PASSWORD_SALT_ROUNDS || '10'),
};
