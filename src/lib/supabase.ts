import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const calculateRiskScore = async (clientId: string, loanId?: string) => {
  const apiUrl = `${supabaseUrl}/functions/v1/calculate-risk-score`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ clientId, loanId }),
  });

  if (!response.ok) {
    throw new Error('Failed to calculate risk score');
  }

  return response.json();
};
