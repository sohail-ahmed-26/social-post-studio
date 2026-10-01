// OWNER ki file. Contributors isay change na karen (issue mein comment karen).
import "dotenv/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const need = (k: string): string => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env var ${k}. agents/.env.example dekho.`);
  return v;
};

let cached: SupabaseClient | null = null;

/** Anon key + apne user ke login se connect. RLS lagu rehti hai, service_role ki zaroorat nahi. */
export async function getSupabase(): Promise<SupabaseClient> {
  if (cached) return cached;
  const client = createClient(need("SUPABASE_URL"), need("SUPABASE_ANON_KEY"));
  const { error } = await client.auth.signInWithPassword({
    email: need("AGENT_EMAIL"),
    password: need("AGENT_PASSWORD"),
  });
  if (error) throw new Error(`Agent login failed: ${error.message}`);
  cached = client;
  return client;
}
