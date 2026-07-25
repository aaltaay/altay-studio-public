// blocks/lead_generator/engine.ts
import { useState } from 'react';
import { supabase } from '@/lib/supabase'; // Assumes @altaystudio/core or similar provides this

export interface LeadData {
  name: string;
  email: string;
  phone?: string;
  message?: string;
}

export function useLeadGenerator() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submitLead = async (data: LeadData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: submitError } = await supabase
        .from('leads')
        .insert([{
          name: data.name,
          email: data.email,
          phone: data.phone,
          message: data.message,
          status: 'new'
        }]);

      if (submitError) throw submitError;

      setSuccess(true);
    } catch (err: any) {
      console.error('Failed to submit lead:', err);
      setError(err.message || 'An error occurred while submitting the form.');
    } finally {
      setLoading(false);
    }
  };

  return {
    submitLead,
    loading,
    error,
    success,
    reset: () => {
      setError(null);
      setSuccess(false);
    }
  };
}
