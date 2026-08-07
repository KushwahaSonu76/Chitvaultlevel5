import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export async function submitFeedback(address: string, message: string) {
  if (supabase) {
    const { data, error } = await supabase
      .from('feedback')
      .insert([{ address, message, created_at: new Date().toISOString() }]);
    
    if (error) {
      console.error('Error submitting feedback to Supabase:', error);
      throw error;
    }
    return data;
  } else {
    // Fallback: Save to localStorage for demo/testing without credentials
    const localFeedback = JSON.parse(localStorage.getItem('chitvault_feedback') || '[]');
    localFeedback.push({ address, message, created_at: new Date().toISOString() });
    localStorage.setItem('chitvault_feedback', JSON.stringify(localFeedback));
    console.warn('Supabase URL or Anon Key not configured. Saved feedback to localStorage instead.');
    return { local: true };
  }
}
