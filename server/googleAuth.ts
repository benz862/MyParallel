import { google } from "googleapis";
import fs from "fs";
import path from "path";

const SCOPES = ["https://www.googleapis.com/auth/calendar"];

export function getOAuthClient() {
  const credentialsPath = path.join(process.cwd(), "server/google/credentials.json");
  
  if (!fs.existsSync(credentialsPath)) {
    throw new Error(`Google credentials not found at ${credentialsPath}. Please run google-auth-setup.sh first.`);
  }

  const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
  const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web || {};
  
  if (!client_id || !client_secret) {
    throw new Error("Invalid credentials file. Missing client_id or client_secret.");
  }

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris?.[0] || "http://localhost:8080/oauth2callback"
  );

  return oAuth2Client;
}

export async function getAccessToken(oAuth2Client: any) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });

  console.log("Authorize this app by visiting: ", authUrl);
  return authUrl;
}

export async function getAuthenticatedClient(tokenPath?: string): Promise<any> {
  const oAuth2Client = getOAuthClient();
  const tokenFilePath = tokenPath || path.join(process.cwd(), "server/google/token.json");

  // Check if we have a stored token
  if (fs.existsSync(tokenFilePath)) {
    const token = JSON.parse(fs.readFileSync(tokenFilePath, "utf8"));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  }

  // If no token, generate auth URL
  const authUrl = await getAccessToken(oAuth2Client);
  throw new Error(`No access token found. Please authorize the app: ${authUrl}`);
}


