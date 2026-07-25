import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  created_at: string;
}

export function AdminClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = async () => {
    setLoading(true);
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
    if (data) setClients(data as Client[]);
    setLoading(false);
  };

  const createClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from('clients').insert(form);
    setForm({ name: '', email: '', phone: '', notes: '' });
    setShowForm(false);
    setSaving(false);
    fetchClients();
  };

  const deleteClient = async (id: string) => {
    setClients(clients.filter(c => c.id !== id));
    await supabase.from('clients').delete().eq('id', id);
  };

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search))
  );

  if (loading) {
    return <div className="text-neutral-400 p-8 flex justify-center items-center h-64"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Client Directory</h1>
          <p className="text-neutral-400 text-sm mt-1">{clients.length} total clients</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          Add Client
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, or phone..." className="w-full bg-neutral-800 text-white border border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none placeholder-neutral-500" />
      </div>

      {showForm && (
        <form onSubmit={createClient} className="bg-neutral-800 border border-neutral-700 rounded-lg p-6 mb-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-neutral-400 text-sm mb-1">Name</label>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-neutral-700 text-white border border-neutral-600 rounded p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" required />
            </div>
            <div>
              <label className="block text-neutral-400 text-sm mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-neutral-700 text-white border border-neutral-600 rounded p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-neutral-400 text-sm mb-1">Phone</label>
              <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-neutral-700 text-white border border-neutral-600 rounded p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-neutral-400 text-sm mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full bg-neutral-700 text-white border border-neutral-600 rounded p-2.5 focus:ring-2 focus:ring-blue-500 outline-none h-20" placeholder="Client preferences, special instructions..." />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2 px-5 rounded transition-colors">{saving ? 'Adding...' : 'Add Client'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-neutral-700 hover:bg-neutral-600 text-white py-2 px-5 rounded transition-colors">Cancel</button>
          </div>
        </form>
      )}

      {filtered.length === 0 ? (
        <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-12 text-center">
          <div className="text-neutral-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
          </div>
          <h3 className="text-xl text-white font-medium mb-2">{search ? 'No matching clients' : 'No clients yet'}</h3>
          <p className="text-neutral-400">{search ? 'Try a different search term.' : 'Add your first client to start building your CRM.'}</p>
        </div>
      ) : (
        <div className="bg-neutral-800 border border-neutral-700 rounded-lg overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-900 border-b border-neutral-700">
                <th className="p-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Client</th>
                <th className="p-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Contact</th>
                <th className="p-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Notes</th>
                <th className="p-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Added</th>
                <th className="p-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-700/50">
              {filtered.map(client => (
                <tr key={client.id} className="hover:bg-neutral-800/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-sm font-bold">{client.name.charAt(0).toUpperCase()}</div>
                      <span className="font-medium text-white">{client.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-neutral-400">
                    <div>{client.email}</div>
                    {client.phone && <div className="text-xs mt-0.5">{client.phone}</div>}
                  </td>
                  <td className="p-4 text-sm text-neutral-400 max-w-xs truncate">{client.notes || '—'}</td>
                  <td className="p-4 text-sm text-neutral-500">{new Date(client.created_at).toLocaleDateString()}</td>
                  <td className="p-4">
                    <button onClick={() => deleteClient(client.id)} className="text-neutral-500 hover:text-red-400 transition-colors" title="Delete">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
