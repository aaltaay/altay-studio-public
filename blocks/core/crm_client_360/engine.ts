import { supabase } from '@/lib/supabase';
export function useClient360() {
  const getClient = async (id: string) => {
    const { data } = await supabase.from('clients').select('*').eq('id', id).single();
    return data;
  };
  return { getClient };
}\n