const env = process.env;
export const NODE_ENV = env.NODE_ENV || 'development';
export const CONNECTION_STRING = env.CONNECTION_STRING || 'mongodb://localhost:27017';
export const DATABASE = env.DATABASE || 'primary';
export const HOSTNAME = env.HOSTNAME || 'default';
export const ALLOWED_ORIGIN = env.ALLOWED_ORIGIN || 'http://localhost:3000';

/* Transport Variables (For MailMan) */
export const ETHEREAL_EMAIL = env.ETHEREAL_EMAIL|| '';
export const ETHEREAL_PASSWORD = env.ETHEREAL_PASSWORD|| '';

export const G_API_REDIRECT = env.GOOGLE_API_REDIRECT|| '';