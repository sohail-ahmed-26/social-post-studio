import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

async function run() {
  const appId = process.env.THREADS_APP_ID;
  const appSecret = process.env.THREADS_APP_SECRET;
  const redirectUri = process.env.THREADS_REDIRECT_URI;

  if (!appId || !appSecret || !redirectUri) {
    console.error("Error: THREADS_APP_ID, THREADS_APP_SECRET, and THREADS_REDIRECT_URI must be set in the environment variables.");
    process.exit(1);
  }

  let rawCode = process.argv[2];
  if (!rawCode) {
    console.error("Usage: npm run threads:token -- <code>");
    process.exit(1);
  }

  const code = rawCode.split('#')[0].trim();

  const getAbortSignal = () => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 30000);
    return controller.signal;
  };

  const sanitizeError = (data: any) => {
    let msg = data?.error?.message || data?.error_message || "Unknown error";
    const code = data?.error?.code || data?.error_code;
    return `Meta Error: ${msg}\nCode: ${code} (Hint: an authorization code works only once and expires quickly, so generate a new one if it fails)`;
  };

  try {
    // 1) Get short-lived token
    const formData = new FormData();
    formData.append("client_id", appId);
    formData.append("client_secret", appSecret);
    formData.append("code", code);
    formData.append("grant_type", "authorization_code");
    formData.append("redirect_uri", redirectUri);

    const shortRes = await fetch("https://graph.threads.net/oauth/access_token", {
      method: "POST",
      body: formData,
      signal: getAbortSignal(),
    });

    const shortData = await shortRes.json();
    if (!shortRes.ok || shortData.error || shortData.error_message) {
      console.error("Failed to get short-lived token:");
      console.error(sanitizeError(shortData));
      process.exit(1);
    }

    const shortToken = shortData.access_token;
    const userId = shortData.user_id;

    if (!shortToken || !userId) {
      console.error("Error: Response did not contain access_token or user_id.");
      process.exit(1);
    }

    // 2) Exchange for long-lived token
    const longUrl = new URL("https://graph.threads.net/access_token");
    longUrl.searchParams.append("grant_type", "th_exchange_token");
    longUrl.searchParams.append("client_secret", appSecret);
    longUrl.searchParams.append("access_token", shortToken);

    const longRes = await fetch(longUrl.toString(), {
      signal: getAbortSignal(),
    });
    const longData = await longRes.json();

    if (!longRes.ok || longData.error) {
      console.error("Failed to exchange for long-lived token:");
      console.error(sanitizeError(longData));
      process.exit(1);
    }

    const longToken = longData.access_token;
    const expiresInSeconds = longData.expires_in;

    if (!longToken) {
      console.error("Error: Response did not contain long-lived access_token.");
      process.exit(1);
    }

    const lifetimeDays = expiresInSeconds ? Math.round(expiresInSeconds / 86400) : "unknown";

    // 3) Write to .env
    const envPath = path.resolve(process.cwd(), '.env');
    let envContent = "";
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    const updateOrAppend = (key: string, value: string) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent += `\n${key}=${value}\n`;
      }
    };

    updateOrAppend("THREADS_ACCESS_TOKEN", longToken);
    updateOrAppend("THREADS_USER_ID", userId.toString());

    fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');

    console.log("Saved to agents/.env");
    console.log(`User ID: ${userId}`);
    console.log(`Token Lifetime: ${lifetimeDays} days`);

  } catch (error: any) {
    if (error.name === "AbortError") {
      console.error("Error: Request timed out after 30 seconds.");
    } else {
      console.error("Error:", error.message);
    }
    process.exit(1);
  }
}

run();
