import { getEnv } from "../../shared/env";

const text = process.argv[2];
const imageUrl = process.argv[3];

if (!text) {
  console.error("Usage: npm run threads:test -- <text> [imageUrl]");
  process.exit(1);
}

if (text.length > 500) {
  console.error("Text exceeds 500 characters.");
  process.exit(1);
}

const appId = getEnv("THREADS_APP_ID");
const redirectUri = getEnv("THREADS_REDIRECT_URI");
const accessToken = getEnv("THREADS_ACCESS_TOKEN");
let userId = getEnv("THREADS_USER_ID");

if (!accessToken) {
  if (!appId || !redirectUri) {
    console.error("Missing THREADS_APP_ID or THREADS_REDIRECT_URI. Cannot generate auth URL.");
    process.exit(1);
  }
  const authUrl = `https://threads.net/oauth/authorize?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent("threads_basic,threads_content_publish")}&response_type=code`;
  console.error(`Missing THREADS_ACCESS_TOKEN.`);
  console.error(`Please open this URL in your browser:\n${authUrl}`);
  console.error(`Click Allow, copy the code from the address bar, and run:`);
  console.error(`npm run threads:token -- <code>`);
  process.exit(1);
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  if (!userId) {
    const meRes = await fetch(`https://graph.threads.net/v1.0/me?fields=id,username&access_token=${encodeURIComponent(accessToken!)}`);
    if (!meRes.ok) {
      console.error("Failed to fetch user info.", await meRes.text());
      process.exit(1);
    }
    const meJson = await meRes.json();
    userId = meJson.id;
    console.log(`Posting as @${meJson.username}`);
  } else {
    console.log("Posting to Threads...");
  }

  // Create Container
  const containerUrl = new URL(`https://graph.threads.net/v1.0/${userId}/threads`);
  containerUrl.searchParams.append("access_token", accessToken!);
  containerUrl.searchParams.append("text", text);
  if (imageUrl) {
    containerUrl.searchParams.append("media_type", "IMAGE");
    containerUrl.searchParams.append("image_url", imageUrl);
  } else {
    containerUrl.searchParams.append("media_type", "TEXT");
  }

  const cRes = await fetch(containerUrl.toString(), { method: "POST" });
  if (!cRes.ok) {
    await handleError(cRes, "Create Container");
  }

  const cJson = await cRes.json();
  const containerId = cJson.id;

  if (imageUrl) {
    let status = "";
    let attempts = 0;
    while (status !== "FINISHED" && attempts < 20) {
      await sleep(3000);
      const statusRes = await fetch(`https://graph.threads.net/v1.0/${containerId}?fields=status&access_token=${encodeURIComponent(accessToken!)}`);
      if (statusRes.ok) {
        const statusJson = await statusRes.json();
        status = statusJson.status;
        if (status === "ERROR") {
          console.error(`Container ${containerId} failed with status ERROR.`);
          console.error("Post did NOT go out.");
          process.exit(1);
        }
      }
      attempts++;
    }
    if (status !== "FINISHED") {
      console.error(`Container ${containerId} did not finish in time.`);
      console.error("Post did NOT go out.");
      process.exit(1);
    }
  } else {
    await sleep(3000); // Wait 3s for TEXT
  }

  // Publish Container
  const pubUrl = new URL(`https://graph.threads.net/v1.0/${userId}/threads_publish`);
  pubUrl.searchParams.append("access_token", accessToken!);
  pubUrl.searchParams.append("creation_id", containerId);

  const pRes = await fetch(pubUrl.toString(), { method: "POST" });
  if (!pRes.ok) {
    console.error(`Failed to publish container ${containerId}.`);
    console.error("Post did NOT go out.");
    await handleError(pRes, "Publish Container");
  }

  const pJson = await pRes.json();
  const id = pJson.id;

  // Get permalink
  const permRes = await fetch(`https://graph.threads.net/v1.0/${id}?fields=permalink&access_token=${encodeURIComponent(accessToken!)}`);
  if (permRes.ok) {
    const permJson = await permRes.json();
    console.log(`Success! Post ID: ${id}`);
    console.log(permJson.permalink);
  } else {
    console.log(`Success! Post ID: ${id}`);
  }
}

async function handleError(res: Response, context: string) {
  let detail = "";
  try {
    const json = await res.json();
    detail = json.error?.message || JSON.stringify(json);
    const code = json.error?.code;
    const subcode = json.error?.error_subcode;
    
    console.error(`Error in ${context}: ${detail} (Code: ${code}, Subcode: ${subcode})`);
    if (code === 190) {
      console.error("Hint: Token expired or invalid.");
    } else if (code === 10 || code === 200) {
      console.error("Hint: Permission missing or Threads Tester invite not accepted.");
    }
  } catch (e) {
    detail = await res.text();
    console.error(`Error in ${context}: ${res.statusText} - ${detail} (Status: ${res.status})`);
  }
  process.exit(1);
}

main().catch(console.error);
