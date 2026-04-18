// frontend/src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Grab the hidden keys from the .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create the connection and export it so our other React files can use it
export const supabase = createClient(supabaseUrl, supabaseAnonKey);