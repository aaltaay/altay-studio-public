import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function AdminSEO() {
  const [seoData, setSeoData] = useState({
    meta_title: '',
    meta_description: '',
    keywords: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSEO();
  }, []);

  const fetchSEO = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('seo_settings')
      .select('*')
      .eq('page_route', '/')
      .single();

    if (data) {
      setSeoData({
        meta_title: data.meta_title || '',
        meta_description: data.meta_description || '',
        keywords: (data.keywords || []).join(', '),
      });
    }
    setLoading(false);
  };

  const handleSaveSEO = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    const { error } = await supabase
      .from('seo_settings')
      .update({
        meta_title: seoData.meta_title,
        meta_description: seoData.meta_description,
        keywords: seoData.keywords.split(',').map(k => k.trim()).filter(Boolean),
        updated_at: new Date().toISOString()
      })
      .eq('page_route', '/');

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage('SEO settings updated successfully!');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold text-white mb-8">SEO Configuration</h1>
      <form onSubmit={handleSaveSEO} className="bg-neutral-800 p-6 rounded-lg shadow-xl space-y-6">
        {message && (
          <div className={`p-4 rounded ${message.includes('Error') ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
            {message}
          </div>
        )}
        
        <div>
          <label className="block text-neutral-400 text-sm mb-2">Meta Title</label>
          <input 
            type="text" 
            value={seoData.meta_title}
            onChange={e => setSeoData({...seoData, meta_title: e.target.value})}
            className="w-full bg-neutral-700 text-white border border-neutral-600 rounded p-3 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g. My Business | Best Services"
            required
          />
          <p className="text-neutral-500 text-xs mt-1">Recommended length: 50-60 characters.</p>
        </div>

        <div>
          <label className="block text-neutral-400 text-sm mb-2">Meta Description</label>
          <textarea 
            value={seoData.meta_description}
            onChange={e => setSeoData({...seoData, meta_description: e.target.value})}
            className="w-full bg-neutral-700 text-white border border-neutral-600 rounded p-3 focus:ring-2 focus:ring-blue-500 outline-none h-24"
            placeholder="A brief summary of your page."
            required
          />
          <p className="text-neutral-500 text-xs mt-1">Recommended length: 150-160 characters.</p>
        </div>

        <div>
          <label className="block text-neutral-400 text-sm mb-2">Keywords (Comma separated)</label>
          <input 
            type="text" 
            value={seoData.keywords}
            onChange={e => setSeoData({...seoData, keywords: e.target.value})}
            className="w-full bg-neutral-700 text-white border border-neutral-600 rounded p-3 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="service, location, best provider"
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded transition-colors"
        >
          {loading ? 'Saving...' : 'Save SEO Settings'}
        </button>
      </form>
    </div>
  );
}
