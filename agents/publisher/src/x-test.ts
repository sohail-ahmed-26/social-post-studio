import { getEnv } from "../../shared/env";
import { buildOAuth1Header } from "./oauth1";

const text = process.argv.slice(2).join(" ");
if (!text) {
  console.error("Usage: npm run x:test -- <text>");
  process.exit(1);
}

if (text.length > 280) {
  console.error("Text exceeds 280 characters.");
  process.exit(1);
}

const consumerKey = getEnv("X_API_KEY");
const consumerSecret = getEnv("X_API_SECRET");
const token = getEnv("X_ACCESS_TOKEN");
const tokenSecret = getEnv("X_ACCESS_TOKEN_SECRET");

if (!consumerKey || !consumerSecret || !token || !tokenSecret) {
  console.error("Missing X API keys or tokens in environment variables.");
  process.exit(1);
}

const creds = { consumerKey, consumerSecret, token, tokenSecret };

async function verifyCredentials() {
  const url = "https://api.x.com/2/users/me";
  const authHeader = buildOAuth1Header("GET", url, {}, creds);
  
  const res = await fetch(url, {
    headers: { Authorization: authHeader }
  });
  
  if (!res.ok) {
    await handleError(res, "Verify Credentials");
  }
  const json = await res.json();
  console.log(`Posting as @${json.data.username}`);
}

async function postTweet() {
  const url = "https://api.x.com/2/tweets";
  const authHeader = buildOAuth1Header("POST", url, {}, creds);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!res.ok) {
      await handleError(res, "Post Tweet");
    }
    
    const json = await res.json();
    const id = json.data.id;
    console.log(`Success! Post ID: ${id}`);
    console.log(`https://x.com/i/web/status/${id}`);
  } catch (err: any) {
    console.error(err.name === "AbortError" ? "Request timed out after 30s" : err.message);
    process.exit(1);
  }
}

async function handleError(res: Response, context: string) {
  let detail = "";
  let title = "";
  try {
    const json = await res.json();
    detail = json.detail || json.error_description || JSON.stringify(json);
    title = json.title || res.statusText;
  } catch (e) {
    detail = await res.text();
    title = res.statusText;
  }
  
  console.error(`Error in ${context}: ${title} - ${detail} (Status: ${res.status})`);
  if (res.status === 401) {
    console.error("Hint: Keys or tokens are wrong.");
  } else if (res.status === 403) {
    console.error("Hint: App permissions are not 'Read and write', or duplicate content, or plan/credits exhausted.");
  } else if (res.status === 402 || detail.toLowerCase().includes("credits")) {
    console.error("Hint: Pay-per-use credits empty.");
  } else if (res.status === 429) {
    console.error("Hint: Rate limit exceeded.");
  }
  process.exit(1);
}

async function main() {
  await verifyCredentials();
  await postTweet();
}

main().catch(console.error);
