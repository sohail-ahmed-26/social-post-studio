import { getEnv } from "../../shared/env";
import * as dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import * as fs from "node:fs";
import * as path from "node:path";

const codeRaw = process.argv[2];
if (!codeRaw) {
  console.error("Usage: npm run threads:token -- <code>");
  process.exit(1);
}

const code = codeRaw.split("#")[0].trim();

const appId = getEnv("THREADS_APP_ID");
const appSecret = getEnv("THREADS_APP_SECRET");
const redirectUri = getEnv("THREADS_REDIRECT_URI");

if (!appId || !appSecret || !redirectUri) {
  console.error("Missing THREADS_APP_ID, THREADS_APP_SECRET, or THREADS_REDIRECT_URI");
  process.exit(1);
}

async function main() {
  const tokenUrl = "https://graph.threads.net/oauth/access_token";
  const body = new URLSearchParams({
    client_id: appId!,
    client_secret: appSecret!,
    code: code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri!,
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Failed to exchange code:", text);
    process.exit(1);
  }

  const json = await res.json();
  const shortToken = json.access_token;

  if (!shortToken) {
    console.error("No access token in response:", json);
    process.exit(1);
  }

  const exchangeUrl = `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${encodeURIComponent(appSecret!)}&access_token=${encodeURIComponent(shortToken)}`;
  const exRes = await fetch(exchangeUrl);
  if (!exRes.ok) {
    const text = await exRes.text();
    console.error("Failed to get long-lived token:", text);
    process.exit(1);
  }

  const exJson = await exRes.json();
  const longToken = exJson.access_token;
  const userId = exJson.user_id || json.user_id; // Sometimes it's in the first request
  const expiresIn = exJson.expires_in;

  if (!longToken || !userId) {
    console.error("Failed to get long token or user ID:", exJson);
    process.exit(1);
  }

  const envPath = path.resolve(process.cwd(), ".env");
  let envContent = "";
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf-8");
  }

  const lines = envContent.split("\n");
  let foundToken = false;
  let foundUser = false;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("THREADS_ACCESS_TOKEN=")) {
      lines[i] = `THREADS_ACCESS_TOKEN=${longToken}`;
      foundToken = true;
    } else if (lines[i].startsWith("THREADS_USER_ID=")) {
      lines[i] = `THREADS_USER_ID=${userId}`;
      foundUser = true;
    }
  }

  if (!foundToken) lines.push(`THREADS_ACCESS_TOKEN=${longToken}`);
  if (!foundUser) lines.push(`THREADS_USER_ID=${userId}`);

  fs.writeFileSync(envPath, lines.join("\n"));

  console.log("Saved to agents/.env");
  console.log(`User ID: ${userId}`);
  if (expiresIn) {
    console.log(`Lifetime: ${Math.round(expiresIn / 86400)} days`);
  }
}

main().catch(console.error);
