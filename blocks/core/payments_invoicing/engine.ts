import { supabase } from '@/lib/supabase';
export function useInvoicing() {
  const createInvoice = async (data: any) => {
    // Call edge function for Stripe generation
    return await supabase.functions.invoke('create-invoice', { body: data });
  };
  return { createInvoice };
}\n