import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Campaign {
  id: string;
  name: string;
  trigger_type: string;
  content: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  created_at: string;
}

export function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', trigger_type: 'manual', content: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchCampaigns(); }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    const { data } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
    if (data) setCampaigns(data as Campaign[]);
    setLoading(false);
  };

  const createCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from('campaigns').insert({ name: form.name, trigger_type: form.trigger_type, content: form.content, status: 'draft' });
    setForm({ name: '', trigger_type: 'manual', content: '' });
    setShowForm(false);
    setSaving(false);
    fetchCampaigns();
  };

  const updateStatus = async (id: string, status: string) => {
    setCampaigns(campaigns.map(c => c.id === id ? { ...c, status: status as any } : c));
    await supabase.from('campaigns').update({ status }).eq('id', id);
  };

  const deleteCampaign = async (id: string) => {
    setCampaigns(campaigns.filter(c => c.id !== id));
    await supabase.from('campaigns').delete().eq('id', id);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'draft': return 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30';
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'paused': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'completed': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30';
    }
  };

  const getTriggerLabel = (t: string) => {
    switch(t) {
      case 'new_lead': return '🎯 New Lead';
      case 'missed_call': return '📞 Missed Call';
      case 'review_received': return '⭐ Review Received';
      case 'manual': return '✋ Manual';
      case 'scheduled': return '🕐 Scheduled';
      default: return t;
    }
  };

  if (loading) {
    return <div className="text-neutral-400 p-8 flex justify-center items-center h-64"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Marketing Campaigns</h1>
          <p className="text-neutral-400 text-sm mt-1">Automated email & SMS sequences triggered by events</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          New Campaign
        </button>
      </div>

      {showForm && (
        <form onSubmit={createCampaign} className="bg-neutral-800 border border-neutral-700 rounded-lg p-6 mb-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-neutral-400 text-sm mb-1">Campaign Name</label>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-neutral-700 text-white border border-neutral-600 rounded p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Welcome Sequence" required />
            </div>
            <div>
              <label className="block text-neutral-400 text-sm mb-1">Trigger</label>
              <select value={form.trigger_type} onChange={e => setForm({...form, trigger_type: e.target.value})} className="w-full bg-neutral-700 text-white border border-neutral-600 rounded p-2.5 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="new_lead">🎯 New Lead Submitted</option>
                <option value="missed_call">📞 Missed Call</option>
                <option value="review_received">⭐ Review Received</option>
                <option value="scheduled">🕐 Scheduled (CRON)</option>
                <option value="manual">✋ Manual</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-neutral-400 text-sm mb-1">Message Content</label>
            <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} className="w-full bg-neutral-700 text-white border border-neutral-600 rounded p-2.5 focus:ring-2 focus:ring-blue-500 outline-none h-24" placeholder="Hi {{name}}, thanks for reaching out..." required />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2 px-5 rounded transition-colors">{saving ? 'Creating...' : 'Create Campaign'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-neutral-700 hover:bg-neutral-600 text-white py-2 px-5 rounded transition-colors">Cancel</button>
          </div>
        </form>
      )}

      {campaigns.length === 0 ? (
        <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-12 text-center">
          <div className="text-neutral-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
          </div>
          <h3 className="text-xl text-white font-medium mb-2">No campaigns yet</h3>
          <p className="text-neutral-400">Create your first automated campaign to start engaging leads and clients.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map(campaign => (
            <div key={campaign.id} className="bg-neutral-800 border border-neutral-700 rounded-lg p-5 hover:border-neutral-600 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{campaign.name}</h3>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded border ${getStatusColor(campaign.status)}`}>{campaign.status}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-neutral-400 mb-3">
                    <span>{getTriggerLabel(campaign.trigger_type)}</span>
                    <span>•</span>
                    <span>{new Date(campaign.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-neutral-300 text-sm bg-neutral-900/50 p-3 rounded border border-neutral-700/50">{campaign.content}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <select value={campaign.status} onChange={(e) => updateStatus(campaign.id, e.target.value)} className="text-xs bg-neutral-700 text-white border border-neutral-600 rounded px-2 py-1.5 outline-none cursor-pointer">
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                  </select>
                  <button onClick={() => deleteCampaign(campaign.id)} className="text-neutral-500 hover:text-red-400 transition-colors p-1" title="Delete">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
