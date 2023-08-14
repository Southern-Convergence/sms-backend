const env = process.env;
export const PORT = env.PORT || 3001;
export const NODE_ENV = env.NODE_ENV || 'development';
export const CONNECTION_STRING = env.CONNECTION_STRING || 'mongodb://localhost:27017';
export const DATABASE = env.DATABASE || 'auac';
export const HOSTNAME = env.HOSTNAME || 'default';
export const ALLOWED_ORIGIN = env.ALLOWED_ORIGIN || 'http://localhost:3000';

/* Transport Variables (For MailMan) */
export const ETHEREAL_EMAIL = env.ETHEREAL_EMAIL|| '';
export const ETHEREAL_PASSWORD = env.ETHEREAL_PASSWORD|| '';

export const GMAIL_EMAIL = env.GMAIL_EMAIL || ""
export const GMAIL_ID = env.GMAIL_ID || "";
export const GMAIL_REFRESH_TOKEN = env.GMAIL_REFRESH_TOKEN || "";
export const GMAIL_SECRET = env.GMAIL_SECRET || "";

export const EMAIL_TRANSPORT = env.NODE_ENV === "development" ? "ethereal" : "default";

export const GOOGLE_API_EMAIL = env.GOOGLE_API_EMAIL|| '';
export const GOOGLE_API_CLIENT_ID = env.GOOGLE_API_CLIENT_ID|| '';
export const GOOGLE_API_SECRET = env.GOOGLE_API_SECRET|| '';
export const GOOGLE_API_GMAIL_REFRESH_TOKEN = env.GOOGLE_API_GMAIL_REFRESH_TOKEN|| '';
export const GOOGLE_API_DRIVE_REFRESH_TOKEN = env.GOOGLE_API_DRIVE_REFRESH_TOKEN|| '';
export const GOOGLE_API_REDIRECT = env.GOOGLE_API_REDIRECT|| '';

/* VAPID Keys */
export const PUBLIC_VAPID_KEY  = env.PUBLIC_VAPID_KEY || "";
export const PRIVATE_VAPID_KEY = env.PRIVATE_VAPID_KEY || "";


/* FCM Keys */
export const PUBLIC_FCM_KEY = env.PUBLIC_FCM_KEY || "";
export const PRIVATE_FCM_KEY = env.PUBLIC_FCM_KEY || "";

/* Log Variables */
export const DEVELOPMENT_LOG_LEVEL = env.DEVELOPMENT_LOG_LEVEL || "verbose"
export const PRODUCTION_LOG_LEVEL = env.PRODUCTION_LOG_LEVEL || "warn"