const env = process.env;
export const NODE_ENV = env.NODE_ENV || 'development';
export const CONNECTION_STRING = env.CONNECTION_STRING || 'mongodb://localhost:27017';
export const DATABASE = env.DATABASE || 'auac';
export const HOSTNAME = env.HOSTNAME || 'default';
export const ALLOWED_ORIGIN = env.ALLOWED_ORIGIN || 'http://localhost:3000';

/* Transport Variables (For MailMan) */
export const ETHEREAL_EMAIL = env.ETHEREAL_EMAIL|| '';
export const ETHEREAL_PASSWORD = env.ETHEREAL_PASSWORD|| '';

export const GOOGLE_API_EMAIL = env.GOOGLE_API_EMAIL|| '';
export const GOOGLE_API_CLIENT_ID = env.GOOGLE_API_CLIENT_ID|| '';
export const GOOGLE_API_SECRET = env.GOOGLE_API_SECRET|| '';
export const GOOGLE_API_GMAIL_REFRESH_TOKEN = env.GOOGLE_API_GMAIL_REFRESH_TOKEN|| '';
export const GOOGLE_API_DRIVE_REFRESH_TOKEN = env.GOOGLE_API_DRIVE_REFRESH_TOKEN|| '';
export const GOOGLE_API_REDIRECT = env.GOOGLE_API_REDIRECT|| '';

/* Log Variables */
export const DEVELOPMENT_LOG_LEVEL = env.DEVELOPMENT_LOG_LEVEL || "verbose"
export const PRODUCTION_LOG_LEVEL = env.PRODUCTION_LOG_LEVEL || "warn"