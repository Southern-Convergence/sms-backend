import { google } from "googleapis";

export default ({CLIENT_ID, SECRET, REFRESH_TOKEN, REDIRECT_URL} : GoogleCFG)=>{
  const OAuthClient = new google.auth.OAuth2(CLIENT_ID, SECRET, REDIRECT_URL);
  OAuthClient.setCredentials({ refresh_token : REFRESH_TOKEN });

  return OAuthClient;
}

type GoogleCFG = {
  CLIENT_ID     : string;
  SECRET        : string;
  REFRESH_TOKEN : string;
  REDIRECT_URL  : string;
}