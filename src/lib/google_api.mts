import { google } from "googleapis";
import {
  GOOGLE_API_CLIENT_ID,
  GOOGLE_API_SECRET,
  GOOGLE_API_GMAIL_REFRESH_TOKEN,
  GOOGLE_API_REDIRECT
} from "../config.mjs";

const OAuthClient = new google.auth.OAuth2(GOOGLE_API_CLIENT_ID, GOOGLE_API_SECRET, GOOGLE_API_REDIRECT);
OAuthClient.setCredentials({ refresh_token : GOOGLE_API_GMAIL_REFRESH_TOKEN });

export default OAuthClient;