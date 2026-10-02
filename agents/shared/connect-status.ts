import { getEnv, hasEnv } from "./env";
import { buildOAuth1Header } from "../publisher/src/oauth1";

async function checkX() {
  const vars = ["X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET"];
  const allSet = vars.every(v => hasEnv(v));
  
  console.log("Platform: X (Twitter)");
  vars.forEach(v => console.log(`  ${v}: ${hasEnv(v) ? "SET" : "MISSING"}`));
  
  if (!allSet) {
    console.log("  Status: NOT READY\n");
    return;
  }

  try {
    const creds = {
      consumerKey: getEnv("X_API_KEY")!,
      consumerSecret: getEnv("X_API_SECRET")!,
      token: getEnv("X_ACCESS_TOKEN")!,
      tokenSecret: getEnv("X_ACCESS_TOKEN_SECRET")!
    };
    const url = "https://api.x.com/2/users/me";
    const authHeader = buildOAuth1Header("GET", url, {}, creds);
    const res = await fetch(url, { headers: { Authorization: authHeader } });
    if (res.ok) {
      const json = await res.json();
      console.log(`  Account: @${json.data.username}`);
      console.log("  Status: READY\n");
    } else {
      let err = "";
      try { err = (await res.json()).detail || res.statusText; } catch { err = res.statusText; }
      console.log(`  Error: ${res.status} - ${err}`);
      console.log("  Status: NOT READY\n");
    }
  } catch (e: any) {
    console.log(`  Error: ${e.message}`);
    console.log("  Status: NOT READY\n");
  }
}

async function checkThreads() {
  const vars = ["THREADS_APP_ID", "THREADS_APP_SECRET", "THREADS_REDIRECT_URI", "THREADS_ACCESS_TOKEN", "THREADS_USER_ID"];
  const allSet = vars.every(v => hasEnv(v));
  
  console.log("Platform: Threads");
  vars.forEach(v => console.log(`  ${v}: ${hasEnv(v) ? "SET" : "MISSING"}`));
  
  if (!allSet) {
    console.log("  Status: NOT READY\n");
    return;
  }

  try {
    const res = await fetch(`https://graph.threads.net/v1.0/me?fields=id,username&access_token=${encodeURIComponent(getEnv("THREADS_ACCESS_TOKEN")!)}`);
    if (res.ok) {
      const json = await res.json();
      console.log(`  Account: @${json.username}`);
      console.log("  Status: READY\n");
    } else {
      let err = "";
      try { err = (await res.json()).error?.message || res.statusText; } catch { err = res.statusText; }
      console.log(`  Error: ${res.status} - ${err}`);
      console.log("  Status: NOT READY\n");
    }
  } catch (e: any) {
    console.log(`  Error: ${e.message}`);
    console.log("  Status: NOT READY\n");
  }
}

async function checkFacebook() {
  const vars = ["FB_PAGE_ID", "FB_PAGE_TOKEN", "META_GRAPH_VERSION"];
  const allSet = vars.every(v => hasEnv(v));
  
  console.log("Platform: Facebook");
  vars.forEach(v => console.log(`  ${v}: ${hasEnv(v) ? "SET" : "MISSING"}`));
  
  if (!allSet) {
    console.log("  Status: NOT READY\n");
    return;
  }

  try {
    const res = await fetch(`https://graph.facebook.com/${getEnv("META_GRAPH_VERSION")}/${getEnv("FB_PAGE_ID")}?fields=id,name&access_token=${encodeURIComponent(getEnv("FB_PAGE_TOKEN")!)}`);
    if (res.ok) {
      const json = await res.json();
      console.log(`  Account: ${json.name}`);
      console.log("  Status: READY\n");
    } else {
      let err = "";
      try { err = (await res.json()).error?.message || res.statusText; } catch { err = res.statusText; }
      console.log(`  Error: ${res.status} - ${err}`);
      console.log("  Status: NOT READY\n");
    }
  } catch (e: any) {
    console.log(`  Error: ${e.message}`);
    console.log("  Status: NOT READY\n");
  }
}

async function main() {
  await checkX();
  await checkThreads();
  await checkFacebook();
}

main().catch(console.error);
