import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: 'new' | 'contacted' | 'resolved' | 'archived';
  created_at: string;
}

export function AdminLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setLeads(data as Lead[]);
    }
    setLoading(false);
  };

  const updateLeadStatus = async (id: string, newStatus: string) => {
    // Optimistic update
    setLeads(leads.map(lead => lead.id === id ? { ...lead, status: newStatus as any } : lead));
    
    await supabase
      .from('leads')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'new': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'contacted': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'resolved': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'archived': return 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30';
      default: return 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30';
    }
  };

  if (loading) {
    return <div className="text-neutral-400 p-8 flex justify-center items-center h-64"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Lead Management</h1>
        <button 
          onClick={fetchLeads}
          className="text-sm bg-neutral-800 hover:bg-neutral-700 text-white py-2 px-4 rounded border border-neutral-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          Refresh
        </button>
      </div>

      {leads.length === 0 ? (
        <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-12 text-center">
          <div className="text-neutral-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
          </div>
          <h3 className="text-xl text-white font-medium mb-2">No leads yet</h3>
          <p className="text-neutral-400">When potential customers submit the contact form, they will appear here.</p>
        </div>
      ) : (
        <div className="bg-neutral-800 border border-neutral-700 rounded-lg overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-900 border-b border-neutral-700">
                  <th className="p-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Contact Details</th>
                  <th className="p-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Message</th>
                  <th className="p-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Date</th>
                  <th className="p-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-700/50">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-neutral-800/50 transition-colors">
                    <td className="p-4 align-top">
                      <div className="font-medium text-white mb-1">{lead.name}</div>
                      <div className="text-sm text-neutral-400">{lead.email}</div>
                      {lead.phone && <div className="text-sm text-neutral-400">{lead.phone}</div>}
                    </td>
                    <td className="p-4 align-top">
                      <div className="text-sm text-neutral-300 max-w-md whitespace-pre-wrap">{lead.message || <span className="text-neutral-600 italic">No message provided</span>}</div>
                    </td>
                    <td className="p-4 align-top text-sm text-neutral-400">
                      {new Date(lead.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      <div className="text-xs text-neutral-500 mt-1">
                        {new Date(lead.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="p-4 align-top">
                      <select
                        value={lead.status}
                        onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                        className={`text-xs font-medium px-2.5 py-1.5 rounded border appearance-none outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/50 ${getStatusColor(lead.status)}`}
                      >
                        <option value="new" className="bg-neutral-800 text-white">New</option>
                        <option value="contacted" className="bg-neutral-800 text-white">Contacted</option>
                        <option value="resolved" className="bg-neutral-800 text-white">Resolved</option>
                        <option value="archived" className="bg-neutral-800 text-white">Archived</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
