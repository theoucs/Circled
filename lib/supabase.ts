import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://tidelwqgozluxvomjevc.supabase.co';
const supabaseAnonKey = 'sb_publishable_jN1DfIWvClJqSqskWNJ3MA_oIilpYqH';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Types pour les profils
export type Profile = {
  id: string;
  username: string;
  highscore: number;
};
