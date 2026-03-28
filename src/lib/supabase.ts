import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://rguzkjesipcopdhwuadv.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJndXpramVzaXBjb3BkaHd1YWR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxOTUxODgsImV4cCI6MjA4OTc3MTE4OH0.049KXiibJ-J6ojBnCbJR01HSJlreFEiOjGf48XOSs_E";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
