/**
 * supabase.js — shared Supabase client for frontend
 * Used by: ForgotPassword, ResetPassword, useRealtimeAppointments
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnon) {
  console.error(
    "Missing Supabase env vars. Create frontend/.env with:\n" +
    "VITE_SUPABASE_URL=https://your-project.supabase.co\n" +
    "VITE_SUPABASE_ANON_KEY=your-anon-key"
  );
}

export const supabase = createClient(
  supabaseUrl  || "",
  supabaseAnon || ""
);
