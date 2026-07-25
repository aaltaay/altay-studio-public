import { useState } from 'react';
import { AdminAgent } from './AdminAgent';
import { AdminSEO } from './AdminSEO';
import { AdminLeads } from './AdminLeads';
import { AdminAnalytics } from './AdminAnalytics';
import { AdminCampaigns } from './AdminCampaigns';
import { AdminClients } from './AdminClients';
import { AdminReviews } from './AdminReviews';

type Tab = 'analytics' | 'leads' | 'clients' | 'campaigns' | 'reviews' | 'agent' | 'seo';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'analytics', label: 'Analytics', icon: '📊' },
  { key: 'leads', label: 'Lead Management', icon: '🎯' },
  { key: 'clients', label: 'Client Directory', icon: '👥' },
  { key: 'campaigns', label: 'Marketing', icon: '📧' },
  { key: 'reviews', label: 'Reviews', icon: '⭐' },
  { key: 'agent', label: 'AI Receptionist', icon: '🤖' },
  { key: 'seo', label: 'SEO Settings', icon: '🔍' },
];

export function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('analytics');
  const [message, setMessage] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin') {
      setIsAuthenticated(true);
    } else {
      setMessage('Invalid credentials');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-neutral-800 p-8 rounded-lg shadow-xl w-full max-w-md">
          <h1 className="text-2xl text-white font-bold mb-6">Admin Login</h1>
          {message && <div className="bg-red-500/20 text-red-300 p-3 rounded mb-4">{message}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-neutral-400 text-sm mb-1">Username</label>
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-neutral-700 text-white border border-neutral-600 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-neutral-400 text-sm mb-1">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-neutral-700 text-white border border-neutral-600 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded transition-colors">
              Login
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 flex">
      {/* Sidebar */}
      <div className="w-64 bg-neutral-950 border-r border-neutral-800 flex flex-col">
        <div className="p-6">
          <h2 className="text-xl font-bold text-white tracking-tight">Altay Studio</h2>
          <p className="text-neutral-500 text-sm mt-1">Tenant Dashboard</p>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          {TABS.map(tab => (
            <button 
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-3 ${activeTab === tab.key ? 'bg-blue-600/10 text-blue-400' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
            >
              <span className="text-base">{tab.icon}</span>
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-neutral-800">
          <a href="/" className="block w-full text-center px-4 py-2 rounded bg-neutral-800 text-white hover:bg-neutral-700 transition-colors text-sm font-medium">
            ← Back to Live Site
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        {activeTab === 'analytics' && <AdminAnalytics />}
        {activeTab === 'leads' && <AdminLeads />}
        {activeTab === 'clients' && <AdminClients />}
        {activeTab === 'campaigns' && <AdminCampaigns />}
        {activeTab === 'reviews' && <AdminReviews />}
        {activeTab === 'agent' && <AdminAgent />}
        {activeTab === 'seo' && <AdminSEO />}
      </div>
    </div>
  );
}
