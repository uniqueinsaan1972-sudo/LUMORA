import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
// Session tokens live in the platform secure store (Android Keystore-backed), never in plain AsyncStorage.
// NOTE: SecureStore values are limited in size on some devices; if sessions fail to persist, chunk the value.
const storage = { getItem: (k: string) => SecureStore.getItemAsync(k), setItem: (k: string, v: string) => SecureStore.setItemAsync(k, v), removeItem: (k: string) => SecureStore.deleteItemAsync(k) };
export const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!, { auth: { storage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } });
