import { createClient } from "@supabase/supabase-js";

// Fall back to placeholder values during static build so `createClient`
// doesn't throw when env vars are absent. All real calls happen client-side
// where NEXT_PUBLIC_SUPABASE_URL is always defined in production.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const supabase = createClient(url, key);
