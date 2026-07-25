// blocks/ai_receptionist/engine.ts
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; // Assumes @altaystudio/core or similar provides this

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function useAIReceptionist() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set up Realtime subscription whenever sessionId changes
  useEffect(() => {
    if (!sessionId) return;

    // Listen to updates on this specific chat_session row
    const channel = supabase
      .channel(`chat_session_${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: '*', table: 'chat_sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          const updatedTranscript = payload.new.transcript as ChatMessage[];
          setMessages(updatedTranscript);
          
          // If the last message is from the assistant, stop loading
          if (updatedTranscript.length > 0) {
            const lastMessage = updatedTranscript[updatedTranscript.length - 1];
            if (lastMessage.role === 'assistant') {
              setLoading(false);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const initSession = useCallback(async () => {
    try {
      const { data, error: insertError } = await supabase
        .from('chat_sessions')
        .insert([{ transcript: [] }])
        .select('id')
        .single();
        
      if (insertError) throw insertError;
      setSessionId(data.id);
    } catch (err: any) {
      console.error('Failed to initialize chat session:', err);
      setError('Could not connect to the receptionist.');
    }
  }, []);

  const sendMessage = async (content: string) => {
    if (!sessionId) {
      setError('Session not initialized');
      return;
    }

    const userMessage: ChatMessage = { role: 'user', content };
    const newMessages = [...messages, userMessage];
    
    // Optimistically update local state
    setMessages(newMessages);
    setLoading(true);
    setError(null);

    try {
      // Update the database with the user message.
      // This will trigger the agent via the pg_net webhook.
      // The agent will then update the row with the assistant's reply,
      // which we will receive via the Realtime subscription.
      const { error: updateError } = await supabase
        .from('chat_sessions')
        .update({ transcript: newMessages, updated_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (updateError) throw updateError;
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setError(err.message || 'An error occurred.');
      setLoading(false);
    }
  };

  return {
    sessionId,
    messages,
    loading,
    error,
    initSession,
    sendMessage,
    reset: () => {
      setSessionId(null);
      setMessages([]);
      setError(null);
    }
  };
}
