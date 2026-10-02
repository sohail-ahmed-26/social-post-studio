import { getEnv, hasEnv } from "./env";
import { getSupabase } from "./supabase";
import crypto from "node:crypto";
import { buildOAuth1Header } from "../publisher/src/oauth1";

const encKey = getEnv("TOKEN_ENCRYPTION_KEY");
if (!encKey || encKey.length !== 64) {
  console.error("TOKEN_ENCRYPTION_KEY is missing or not 64 hex characters.");
  process.exit(1);
}
const keyBuffer = Buffer.from(encKey, "hex");

function encryptToken(text: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyBuffer, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

async function getFirstBrandId(sb: any) {
  const { data } = await sb.from("smm_brands").select("id").limit(1).single();
  return data?.id;
}

async function checkAndSaveX(sb: any, brandId: string) {
  const vars = ["X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET"];
  if (!vars.every(v => hasEnv(v))) {
    console.log("X (Twitter): Skipped (Environment variables missing)");
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
      const accountName = json.data.username;
      const externalId = json.data.id;
      
      const tokenData = JSON.stringify({ accessToken: creds.token, accessTokenSecret: creds.tokenSecret });
      const encrypted = encryptToken(tokenData);
      
      const { data: existing } = await sb.from("smm_social_accounts").select("id").eq("brand_id", brandId).eq("platform", "x").maybeSingle();
      let error;
      if (existing) {
        ({ error } = await sb.from("smm_social_accounts").update({
          account_name: accountName,
          external_id: externalId,
          access_token_encrypted: encrypted,
          status: "connected"
        }).eq("id", existing.id));
      } else {
        ({ error } = await sb.from("smm_social_accounts").insert({
          brand_id: brandId,
          platform: "x",
          account_name: accountName,
          external_id: externalId,
          access_token_encrypted: encrypted,
          status: "connected"
        }));
      }
      
      if (error) {
        console.log(`X (Twitter): Skipped (DB Error: ${error.message})`);
      } else {
        console.log("X (Twitter): Saved");
      }
    } else {
      console.log("X (Twitter): Skipped (Live check failed)");
    }
  } catch (e: any) {
    console.log(`X (Twitter): Skipped (${e.message})`);
  }
}

async function checkAndSaveThreads(sb: any, brandId: string) {
  const vars = ["THREADS_APP_ID", "THREADS_APP_SECRET", "THREADS_REDIRECT_URI", "THREADS_ACCESS_TOKEN", "THREADS_USER_ID"];
  if (!vars.every(v => hasEnv(v))) {
    console.log("Threads: Skipped (Environment variables missing)");
    return;
  }
  try {
    const token = getEnv("THREADS_ACCESS_TOKEN")!;
    const res = await fetch(`https://graph.threads.net/v1.0/me?fields=id,username&access_token=${encodeURIComponent(token)}`);
    if (res.ok) {
      const json = await res.json();
      const encrypted = encryptToken(token);
      const { data: existing } = await sb.from("smm_social_accounts").select("id").eq("brand_id", brandId).eq("platform", "threads").maybeSingle();
      let error;
      if (existing) {
        ({ error } = await sb.from("smm_social_accounts").update({
          account_name: json.username,
          external_id: json.id,
          access_token_encrypted: encrypted,
          status: "connected"
        }).eq("id", existing.id));
      } else {
        ({ error } = await sb.from("smm_social_accounts").insert({
          brand_id: brandId,
          platform: "threads",
          account_name: json.username,
          external_id: json.id,
          access_token_encrypted: encrypted,
          status: "connected"
        }));
      }
      
      if (error) {
        console.log(`Threads: Skipped (DB Error: ${error.message})`);
      } else {
        console.log("Threads: Saved");
      }
    } else {
      console.log("Threads: Skipped (Live check failed)");
    }
  } catch (e: any) {
    console.log(`Threads: Skipped (${e.message})`);
  }
}

async function checkAndSaveFacebook(sb: any, brandId: string) {
  const vars = ["FB_PAGE_ID", "FB_PAGE_TOKEN", "META_GRAPH_VERSION"];
  if (!vars.every(v => hasEnv(v))) {
    console.log("Facebook: Skipped (Environment variables missing)");
    return;
  }
  try {
    const token = getEnv("FB_PAGE_TOKEN")!;
    const res = await fetch(`https://graph.facebook.com/${getEnv("META_GRAPH_VERSION")}/${getEnv("FB_PAGE_ID")}?fields=id,name&access_token=${encodeURIComponent(token)}`);
    if (res.ok) {
      const json = await res.json();
      const encrypted = encryptToken(token);
      const { data: existing } = await sb.from("smm_social_accounts").select("id").eq("brand_id", brandId).eq("platform", "facebook").maybeSingle();
      let error;
      if (existing) {
        ({ error } = await sb.from("smm_social_accounts").update({
          account_name: json.name,
          external_id: json.id,
          access_token_encrypted: encrypted,
          status: "connected"
        }).eq("id", existing.id));
      } else {
        ({ error } = await sb.from("smm_social_accounts").insert({
          brand_id: brandId,
          platform: "facebook",
          account_name: json.name,
          external_id: json.id,
          access_token_encrypted: encrypted,
          status: "connected"
        }));
      }
      
      if (error) {
        console.log(`Facebook: Skipped (DB Error: ${error.message})`);
      } else {
        console.log("Facebook: Saved");
      }
    } else {
      console.log("Facebook: Skipped (Live check failed)");
    }
  } catch (e: any) {
    console.log(`Facebook: Skipped (${e.message})`);
  }
}

async function main() {
  const sb = await getSupabase();
  const brandId = await getFirstBrandId(sb);
  if (!brandId) {
    console.error("No brand found in smm_brands. Cannot save accounts.");
    process.exit(1);
  }
  
  await checkAndSaveX(sb, brandId);
  await checkAndSaveThreads(sb, brandId);
  await checkAndSaveFacebook(sb, brandId);
}

main().catch(console.error);
