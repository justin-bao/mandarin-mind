import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let supabaseServer: SupabaseClient | null = null;

export function getSupabaseServer() {
  if (supabaseServer) return supabaseServer;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase server environment is not configured");
  }

  supabaseServer = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return supabaseServer;
}
