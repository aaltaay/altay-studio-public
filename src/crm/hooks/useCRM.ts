import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

const SCHEMA = import.meta.env.VITE_DB_SCHEMA || 'schema_crm';

// Helper to get supabase client scoped to the schema
const db = () => supabase.schema(SCHEMA);

export interface Client {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  type: string;
  address: string;
  status: string;
  billing: {
    method?: string;
    rate?: number;
    terms?: string;
  };
  notes: string;
  since: string;
  created_at: string;

  // Lead-specific properties
  lead_status?: string;
  source?: string;
  value?: number;
  outcome?: string;
  reason?: string;
  hot?: boolean;
}

export type Lead = Client;

export interface Project {
  id: string;
  name: string;
  client: string; // Client ID
  template?: string; // Template ID
  progress: number;
  due: string;
  stage: string;
  updated: string;
  created_at: string;
  github_repo?: string;
  vercel_project_id?: string;
  schema_name?: string;
  subdomain?: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  pages: string[];
  created_at: string;
}

export interface Invoice {
  id: string;
  client_id: string;
  amount: number;
  status: string; // 'Paid', 'Pending', 'Draft'
  created_at: string;
}

export interface Task {
  id: string;
  text: string;
  linkedId?: string;
  linkedName?: string;
  linkedType?: 'client' | 'lead' | 'project';
  dueDate: string;
  done: boolean;
  created_at: string;
  stage?: string;
  priority?: string;
  page?: string;
}

export interface Activity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note';
  text: string;
  linkedId?: string;
  linkedName?: string;
  linkedType?: 'client' | 'lead';
  ts: string;
}

export interface Proposal {
  id: string;
  client_id: string;
  items: Array<{ description: string; qty: number; price: number }>;
  upgrades: Array<{ id: string; name: string; price: number; description?: string; selected: boolean }>;
  total_amount: number;
  status: 'Draft' | 'Sent' | 'Approved' | 'Declined';
  client_signature?: string;
  signed_at?: string;
  created_at: string;
}

export interface TargetAccount {
  id: string;
  name: string;
  segment: string;
  tier: 1 | 2 | 3;
  status: string;
  website?: string;
  location?: string;
  reasoning?: string;
  owner?: string;
  source?: string;
  external_id?: string;
  metadata?: Record<string, any>;
  last_touched_at?: string | null;
  created_at?: string;
}

export interface AccountContact {
  id: string;
  account_id: string;
  name: string;
  title?: string;
  role?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  source?: string;
  external_id?: string;
  last_touched_at?: string | null;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface AccountTouchpoint {
  id: string;
  account_id: string;
  contact_id?: string | null;
  channel: string;
  direction: 'in' | 'out';
  notes: string;
  outcome?: string;
  at: string;
  created_at?: string;
}

export interface AccountSignal {
  id: string;
  account_id?: string | null;
  kind: string;
  summary: string;
  source_url?: string;
  reviewed: boolean;
  reviewed_at?: string | null;
  action_taken?: string;
  confidence?: number;
  source?: string;
  external_id?: string;
  metadata?: Record<string, any>;
  at: string;
  created_at?: string;
}

export interface ResearchFeed {
  id: string;
  name: string;
  type: 'clay' | 'scraper' | 'apify' | 'n8n' | 'zapier' | 'webhook';
  status: 'active' | 'paused' | 'error';
  cadence: 'manual' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  search_brief?: string;
  segment?: string;
  tier_default?: 1 | 2 | 3;
  geography?: string;
  last_run?: string | null;
  next_run?: string | null;
  imported_count: number;
  error_message?: string | null;
  webhook_secret: string;
  created_at?: string;
  updated_at?: string;
}

export function useCRM() {
  const [contacts, setContacts] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [targetAccounts, setTargetAccounts] = useState<TargetAccount[]>([]);
  const [accountContacts, setAccountContacts] = useState<AccountContact[]>([]);
  const [accountTouchpoints, setAccountTouchpoints] = useState<AccountTouchpoint[]>([]);
  const [accountSignals, setAccountSignals] = useState<AccountSignal[]>([]);
  const [researchFeeds, setResearchFeeds] = useState<ResearchFeed[]>([]);
  const [loading, setLoading] = useState(true);

  // Derived state: Leads are contacts with 0 projects, Clients are contacts with >= 1 projects
  const clientIdsWithProjects = useMemo(() => {
    return new Set(projects.map(p => p.client));
  }, [projects]);

  const leads = useMemo(() => {
    return contacts
      .filter(c => !clientIdsWithProjects.has(c.id))
      .map(c => ({
        ...c,
        status: c.lead_status || 'New',
        source: c.source || 'Referral',
        type: c.type || 'Other',
        value: c.value || 0,
        hot: !!c.hot
      }));
  }, [contacts, clientIdsWithProjects]);

  const clients = useMemo(() => {
    return contacts.filter(c => clientIdsWithProjects.has(c.id));
  }, [contacts, clientIdsWithProjects]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        { data: clientsData },
        { data: projectsData },
        { data: invoicesData },
        { data: tasksData },
        { data: activitiesData },
        { data: proposalsData },
        { data: templatesData }
      ] = await Promise.all([
        db().from('clients').select('*').order('created_at', { ascending: false }),
        db().from('projects').select('*').order('created_at', { ascending: false }),
        db().from('invoices').select('*').order('created_at', { ascending: false }),
        db().from('tasks').select('*').order('created_at', { ascending: false }),
        db().from('activities').select('*').order('ts', { ascending: false }),
        db().from('proposals').select('*').order('created_at', { ascending: false }),
        db().from('project_templates').select('*').order('created_at', { ascending: false })
      ]);

      setContacts(clientsData || []);
      
      const formattedProjects = (projectsData || []).map((p: any) => ({
        ...p,
        client: p.client_id,
        template: p.template_id
      }));
      setProjects(formattedProjects);

      const formattedTemplates = (templatesData || []).map((t: any) => ({
        ...t,
        pages: Array.isArray(t.pages) ? t.pages : []
      }));
      setTemplates(formattedTemplates);

      setInvoices(invoicesData || []);

      const formattedTasks = (tasksData || []).map((t: any) => ({
        ...t,
        linkedId: t.linked_id,
        linkedName: t.linked_name,
        linkedType: t.linked_type,
        dueDate: t.due_date
      }));
      setTasks(formattedTasks);

      const formattedActivities = (activitiesData || []).map((a: any) => ({
        ...a,
        linkedId: a.linked_id,
        linkedName: a.linked_name,
        linkedType: a.linked_type
      }));
      setActivities(formattedActivities);
      setProposals(proposalsData || []);

      const [
        accountsResult,
        contactsResult,
        touchpointsResult,
        signalsResult,
        feedsResult
      ] = await Promise.allSettled([
        db().from('target_accounts').select('*').order('created_at', { ascending: false }),
        db().from('account_contacts').select('*').order('created_at', { ascending: false }),
        db().from('account_touchpoints').select('*').order('at', { ascending: false }),
        db().from('account_signals').select('*').order('at', { ascending: false }),
        db().from('research_feeds').select('*').order('created_at', { ascending: false })
      ]);

      if (accountsResult.status === 'fulfilled' && !accountsResult.value.error) setTargetAccounts(accountsResult.value.data || []);
      if (contactsResult.status === 'fulfilled' && !contactsResult.value.error) setAccountContacts(contactsResult.value.data || []);
      if (touchpointsResult.status === 'fulfilled' && !touchpointsResult.value.error) setAccountTouchpoints(touchpointsResult.value.data || []);
      if (signalsResult.status === 'fulfilled' && !signalsResult.value.error) setAccountSignals(signalsResult.value.data || []);
      if (feedsResult.status === 'fulfilled' && !feedsResult.value.error) setResearchFeeds(feedsResult.value.data || []);

      const abmResults = [accountsResult, contactsResult, touchpointsResult, signalsResult, feedsResult];
      if (abmResults.some(result => result.status === 'rejected' || (result.status === 'fulfilled' && result.value.error))) {
        console.warn('ABM account/signal tables are not available yet. Using local demo data.');
      }

    } catch (error) {
      console.error('Error fetching CRM data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Leads CRUD (all operations run on clients table)
  const addLead = async (lead: Partial<Lead>) => {
    const { data, error } = await db().from('clients').insert([{
      name: lead.name,
      contact: lead.contact || lead.name,
      email: lead.email || '',
      phone: lead.phone || '',
      address: lead.address || '',
      type: lead.type || 'Other',
      status: 'active',
      lead_status: lead.status || lead.lead_status || 'New',
      source: lead.source || 'Referral',
      value: lead.value || 0,
      hot: lead.hot || false,
      notes: lead.notes || '',
      billing: {},
      since: new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' })
    }]).select();

    if (!error && data) {
      setContacts(prev => [data[0], ...prev]);
      return {
        ...data[0],
        status: data[0].lead_status || 'New'
      };
    }
    return null;
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    const payload: any = { ...updates };
    if (updates.status) {
      payload.lead_status = updates.status;
      delete payload.status;
    }
    const res = await updateClient(id, payload);
    if (res) {
      return {
        ...res,
        status: res.lead_status || 'New'
      };
    }
    return null;
  };

  const deleteLead = async (id: string) => {
    await deleteClient(id);
  };

  // Clients CRUD
  const addClient = async (client: Partial<Client>) => {
    const { data, error } = await db().from('clients').insert([{
      name: client.name,
      contact: client.contact || client.name,
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      type: client.type || 'Other',
      status: client.status || 'active',
      billing: client.billing || {},
      notes: client.notes || '',
      since: client.since || new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' }),
      lead_status: 'Won'
    }]).select();

    if (!error && data) {
      setContacts(prev => [data[0], ...prev]);
      return data[0];
    }
    return null;
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    const { data, error } = await db().from('clients').update(updates).eq('id', id).select();
    if (!error && data) {
      setContacts(prev => prev.map(c => c.id === id ? data[0] : c));
      return data[0];
    }
    return null;
  };

  const deleteClient = async (id: string) => {
    const { error } = await db().from('clients').delete().eq('id', id);
    if (!error) {
      setContacts(prev => prev.filter(c => c.id !== id));
    }
  };

  // Projects CRUD
  const addProject = async (project: Partial<Project>) => {
    const { data, error } = await db().from('projects').insert([{
      name: project.name,
      client_id: project.client,
      template_id: project.template || null,
      progress: project.progress || 0,
      due: project.due,
      stage: project.stage || 'Kickoff',
      updated: 'just now',
      business_id: project.business_id || null,
      github_repo: project.github_repo || null,
      vercel_project_id: project.vercel_project_id || null,
      schema_name: project.schema_name || null,
      subdomain: project.subdomain || null
    }]).select();

    if (!error && data) {
      const formatted = {
        ...data[0],
        client: data[0].client_id,
        template: data[0].template_id
      };
      setProjects(prev => [formatted, ...prev]);
      return formatted;
    }
    return null;
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    const payload: any = { ...updates };
    if (updates.client) {
      payload.client_id = updates.client;
      delete payload.client;
    }

    const { data, error } = await db().from('projects').update(payload).eq('id', id).select();
    if (!error && data) {
      const formatted = {
        ...data[0],
        client: data[0].client_id,
        template: data[0].template_id
      };
      setProjects(prev => prev.map(p => p.id === id ? formatted : p));
      return formatted;
    }
    return null;
  };

  const deleteProject = async (id: string) => {
    const proj = projects.find(p => p.id === id);
    if (proj && (proj.vercel_project_id || proj.schema_name || proj.github_repo)) {
      console.log('Archiving and cleaning up project infrastructure first...');
      const { data, error } = await supabase.functions.invoke("admin-action", {
        body: { action: "cleanup", project_id: id }
      });
      if (error || data?.error) {
        console.error('Infrastructure cleanup failed:', error || data?.error);
        const proceed = window.confirm('Infrastructure cleanup failed. Do you want to force delete the CRM project record anyway?');
        if (!proceed) return;
      }
    }

    const { error } = await db().from('projects').delete().eq('id', id);
    if (!error) {
      setProjects(prev => prev.filter(p => p.id !== id));
    }
  };

  // Invoices CRUD
  const addInvoice = async (invoice: Partial<Invoice>) => {
    const { data, error } = await db().from('invoices').insert([{
      client_id: invoice.client_id,
      amount: invoice.amount,
      status: invoice.status || 'Pending'
    }]).select();

    if (!error && data) {
      setInvoices(prev => [data[0], ...prev]);
      return data[0];
    }
    return null;
  };

  const updateInvoice = async (id: string, updates: Partial<Invoice>) => {
    const { data, error } = await db().from('invoices').update(updates).eq('id', id).select();
    if (!error && data) {
      setInvoices(prev => prev.map(i => i.id === id ? data[0] : i));
      return data[0];
    }
    return null;
  };

  // Tasks CRUD
  const addTask = async (task: Partial<Task>) => {
    const { data, error } = await db().from('tasks').insert([{
      text: task.text,
      linked_id: task.linkedId,
      linked_name: task.linkedName,
      linked_type: task.linkedType,
      due_date: task.dueDate,
      done: task.done || false,
      stage: task.stage || 'To do',
      priority: task.priority || 'med',
      page: task.page || null
    }]).select();

    if (!error && data) {
      const formatted = {
        ...data[0],
        linkedId: data[0].linked_id,
        linkedName: data[0].linked_name,
        linkedType: data[0].linked_type,
        dueDate: data[0].due_date
      };
      setTasks(prev => [formatted, ...prev]);
      return formatted;
    }
    return null;
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const payload: any = { ...updates };
    if (updates.linkedId) {
      payload.linked_id = updates.linkedId;
      delete payload.linkedId;
    }
    if (updates.linkedName) {
      payload.linked_name = updates.linkedName;
      delete payload.linkedName;
    }
    if (updates.linkedType) {
      payload.linked_type = updates.linkedType;
      delete payload.linkedType;
    }
    if (updates.dueDate) {
      payload.due_date = updates.dueDate;
      delete payload.dueDate;
    }

    const { data, error } = await db().from('tasks').update(payload).eq('id', id).select();
    if (!error && data) {
      const formatted = {
        ...data[0],
        linkedId: data[0].linked_id,
        linkedName: data[0].linked_name,
        linkedType: data[0].linked_type,
        dueDate: data[0].due_date
      };
      setTasks(prev => prev.map(t => t.id === id ? formatted : t));
      return formatted;
    }
    return null;
  };

  // Activities CRUD
  const addActivity = async (activity: Partial<Activity>) => {
    const { data, error } = await db().from('activities').insert([{
      type: activity.type,
      text: activity.text,
      linked_id: activity.linkedId,
      linked_name: activity.linkedName,
      linked_type: activity.linkedType,
      ts: activity.ts || new Date().toISOString()
    }]).select();

    if (!error && data) {
      const formatted = {
        ...data[0],
        linkedId: data[0].linked_id,
        linkedName: data[0].linked_name,
        linkedType: data[0].linked_type
      };
      setActivities(prev => [formatted, ...prev]);
      return formatted;
    }
    return null;
  };

  // Proposals CRUD
  const addProposal = async (proposal: Partial<Proposal>) => {
    const { data, error } = await db().from('proposals').insert([{
      client_id: proposal.client_id,
      items: proposal.items || [],
      upgrades: proposal.upgrades || [],
      total_amount: proposal.total_amount || 0,
      status: proposal.status || 'Draft',
      client_signature: proposal.client_signature || null,
      signed_at: proposal.signed_at || null
    }]).select();

    if (!error && data) {
      setProposals(prev => [data[0], ...prev]);
      return data[0] as Proposal;
    }
    console.error('Error adding proposal:', error);
    return null;
  };

  const updateProposal = async (id: string, updates: Partial<Proposal>) => {
    const { data, error } = await db().from('proposals').update(updates).eq('id', id).select();
    if (!error && data) {
      setProposals(prev => prev.map(p => p.id === id ? data[0] : p));
      return data[0] as Proposal;
    }
    console.error('Error updating proposal:', error);
    return null;
  };

  const deleteProposal = async (id: string) => {
    const { error } = await db().from('proposals').delete().eq('id', id);
    if (!error) {
      setProposals(prev => prev.filter(p => p.id !== id));
      return true;
    }
    console.error('Error deleting proposal:', error);
    return false;
  };

  // Account-based lead radar CRUD
  const addTargetAccount = async (account: Partial<TargetAccount>) => {
    const payload = {
      name: account.name,
      segment: account.segment || 'restaurant',
      tier: account.tier || 2,
      status: account.status || 'untouched',
      website: account.website || '',
      location: account.location || '',
      reasoning: account.reasoning || '',
      owner: account.owner || 'Ahmi',
      source: account.source || 'manual',
      external_id: account.external_id || null,
      metadata: account.metadata || {},
      last_touched_at: account.last_touched_at || null
    };
    const { data, error } = await db().from('target_accounts').insert([payload]).select();
    if (!error && data) {
      setTargetAccounts(prev => [data[0], ...prev]);
      return data[0] as TargetAccount;
    }
    console.error('Error adding target account:', error);
    return null;
  };

  const updateTargetAccount = async (id: string, updates: Partial<TargetAccount>) => {
    const { data, error } = await db().from('target_accounts').update(updates).eq('id', id).select();
    if (!error && data) {
      setTargetAccounts(prev => prev.map(a => a.id === id ? data[0] : a));
      return data[0] as TargetAccount;
    }
    console.error('Error updating target account:', error);
    return null;
  };

  const addAccountTouchpoint = async (touchpoint: Partial<AccountTouchpoint>) => {
    const payload = {
      account_id: touchpoint.account_id,
      contact_id: touchpoint.contact_id || null,
      channel: touchpoint.channel || 'note',
      direction: touchpoint.direction || 'out',
      notes: touchpoint.notes,
      outcome: touchpoint.outcome || 'logged',
      at: touchpoint.at || new Date().toISOString()
    };
    const { data, error } = await db().from('account_touchpoints').insert([payload]).select();
    if (!error && data) {
      const inserted = data[0] as AccountTouchpoint;
      setAccountTouchpoints(prev => [inserted, ...prev]);
      if (inserted.account_id) {
        await updateTargetAccount(inserted.account_id, { last_touched_at: inserted.at, status: 'engaging' });
      }
      return inserted;
    }
    console.error('Error adding account touchpoint:', error);
    return null;
  };

  const addAccountSignal = async (signal: Partial<AccountSignal>) => {
    const payload = {
      account_id: signal.account_id || null,
      kind: signal.kind || 'news',
      summary: signal.summary,
      source_url: signal.source_url || '',
      reviewed: signal.reviewed || false,
      action_taken: signal.action_taken || null,
      confidence: signal.confidence || 70,
      source: signal.source || 'manual',
      external_id: signal.external_id || null,
      metadata: signal.metadata || {},
      at: signal.at || new Date().toISOString()
    };
    const { data, error } = await db().from('account_signals').insert([payload]).select();
    if (!error && data) {
      setAccountSignals(prev => [data[0], ...prev]);
      return data[0] as AccountSignal;
    }
    console.error('Error adding account signal:', error);
    return null;
  };

  const reviewAccountSignal = async (id: string, action_taken: string) => {
    const updates = {
      reviewed: true,
      reviewed_at: new Date().toISOString(),
      action_taken
    };
    const { data, error } = await db().from('account_signals').update(updates).eq('id', id).select();
    if (!error && data) {
      setAccountSignals(prev => prev.map(s => s.id === id ? data[0] : s));
      return data[0] as AccountSignal;
    }
    console.error('Error reviewing account signal:', error);
    return null;
  };

  const addResearchFeed = async (feed: Partial<ResearchFeed>) => {
    const payload = {
      name: feed.name,
      type: feed.type || 'clay',
      status: feed.status || 'active',
      cadence: feed.cadence || 'manual',
      search_brief: feed.search_brief || '',
      segment: feed.segment || 'restaurant',
      tier_default: feed.tier_default || 2,
      geography: feed.geography || '',
      last_run: feed.last_run || null,
      next_run: feed.next_run || null,
      imported_count: feed.imported_count || 0,
      error_message: feed.error_message || null,
    };
    const { data, error } = await db().from('research_feeds').insert([payload]).select();
    if (!error && data) {
      const inserted = data[0] as ResearchFeed;
      setResearchFeeds(prev => [inserted, ...prev]);
      return inserted;
    }
    console.error('Error adding research feed:', error);
    return null;
  };

  const updateResearchFeed = async (id: string, updates: Partial<ResearchFeed>) => {
    const { data, error } = await db().from('research_feeds').update(updates).eq('id', id).select();
    if (!error && data) {
      const updated = data[0] as ResearchFeed;
      setResearchFeeds(prev => prev.map(f => f.id === id ? updated : f));
      return updated;
    }
    console.error('Error updating research feed:', error);
    return null;
  };

  const deleteResearchFeed = async (id: string) => {
    const { error } = await db().from('research_feeds').delete().eq('id', id);
    if (!error) {
      setResearchFeeds(prev => prev.filter(f => f.id !== id));
      return true;
    }
    console.error('Error deleting research feed:', error);
    return false;
  };

  // Seeding initial data if empty
  const seedMockData = async () => {
    console.log('Seeding mock data to database...');
    // Seed all contacts (both clients and leads) into the clients table
    const contactData = [
      { name: 'Pizzeria Romano', contact: 'Marco Romano', email: 'marco@pizzeriaromano.com', phone: '+1 (555) 010-0201', address: '418 Mulberry St, New York, NY 10012', status: 'active', lead_status: 'Won', type: 'Restaurant', billing: { method: 'ACH', rate: 125, terms: 'Net 15' }, notes: 'Marco is hands-on, prefers SMS for quick checks.', since: 'Mar 2025' },
      { name: 'Ahmet Build Co.', contact: 'Ahmet Yilmaz', email: 'ahmet@ahmetbuild.com', phone: '+1 (555) 010-0202', address: '1108 Queens Blvd, Forest Hills, NY 11375', status: 'active', lead_status: 'Won', type: 'Contractor', billing: { method: 'Wire', rate: 150, terms: 'Net 30' }, notes: 'Big wins through site SEO last quarter.', since: 'Jan 2025' },
      { name: 'Cuts & Co.', contact: 'Devon Pierce', email: 'devon@cutsandco.com', phone: '+1 (555) 010-0203', address: '88 Bedford Ave, Brooklyn, NY 11211', status: 'active', lead_status: 'Won', type: 'Barber', billing: { method: 'Credit card', rate: 110, terms: 'Net 7' }, notes: 'Wants more booking conversions.', since: 'Feb 2025' },
      { name: 'Bella Trattoria', contact: 'Sofia Bellini', email: 'sofia@bellattoria.com', phone: '+1 (555) 010-0204', address: '212 W 14th St, New York, NY 10011', status: 'active', lead_status: 'Won', type: 'Restaurant', billing: { method: 'ACH', rate: 125, terms: 'Net 15' }, notes: 'Refresh project — wants modern minimal look.', since: 'Apr 2025' },
      { name: 'Northside Plumbing', contact: 'Jake Doyle', email: 'jake@northside.com', phone: '+1 (555) 010-0205', address: '730 Astor Ave, Bronx, NY 10467', status: 'active', lead_status: 'Won', type: 'Contractor', billing: { method: 'Check', rate: 150, terms: 'Net 30' }, notes: 'Site needs to load fast on mobile — most leads via phone.', since: 'Dec 2024' },
      
      { name: "Joe's Diner", contact: 'Joe Marchetti', email: 'joe@joesdiner.com', phone: '(555) 010-0206', address: 'Hoboken, NJ', status: 'active', lead_status: 'New', source: 'Referral', type: 'Restaurant', value: 4500, hot: false, notes: '', billing: {} },
      { name: 'Sharper Cuts', contact: 'Tariq Bell', email: 'tariq@sharpercuts.com', phone: '(555) 010-0207', address: 'Astoria, NY', status: 'active', lead_status: 'New', source: 'Ads', type: 'Barber', value: 2800, hot: false, notes: '', billing: {} },
      { name: 'Tony Brick & Co.', contact: 'Tony Vasquez', email: 'tony@tonybrick.com', phone: '(555) 010-0208', address: 'Long Island, NY', status: 'active', lead_status: 'Contacted', source: 'Warm call', type: 'Contractor', value: 6800, hot: false, notes: '', billing: {} },
      { name: 'La Bodega', contact: 'Rosa Mendez', email: 'rosa@labodega.com', phone: '(555) 010-0209', address: 'Bushwick, NY', status: 'active', lead_status: 'Contacted', source: 'Referral', type: 'Restaurant', value: 3900, hot: false, notes: '', billing: {} },
      { name: 'The Beard Lounge', contact: 'Marcus Hayes', email: 'marcus@beardlounge.com', phone: '(555) 010-0210', address: 'SoHo, NY', status: 'active', lead_status: 'Quoted', source: 'Referral', type: 'Barber', value: 3200, hot: true, notes: '', billing: {} },
      { name: 'Trattoria Verde', contact: 'Giulia Conte', email: 'giulia@trattoriaverde.com', phone: '(555) 010-0211', address: 'West Village, NY', status: 'active', lead_status: 'Quoted', source: 'Ads', type: 'Restaurant', value: 5400, hot: false, notes: '', billing: {} }
    ];

    const { data: insertedContacts } = await db().from('clients').insert(contactData).select();
    if (!insertedContacts) return;

    // Seed Projects
    const pizzeriaRomano = insertedContacts.find(c => c.name === 'Pizzeria Romano');
    const ahmetBuild = insertedContacts.find(c => c.name === 'Ahmet Build Co.');
    const cutsAndCo = insertedContacts.find(c => c.name === 'Cuts & Co.');
    const bellaTrattoria = insertedContacts.find(c => c.name === 'Bella Trattoria');
    const northsidePlumbing = insertedContacts.find(c => c.name === 'Northside Plumbing');

    const projectData = [];
    if (pizzeriaRomano) {
      projectData.push({ name: 'Pizzeria Romano — Site', client_id: pizzeriaRomano.id, progress: 64, due: '2026-07-12', stage: 'Build', updated: '2 hrs ago' });
      projectData.push({ name: 'Romano — Loyalty Microsite', client_id: pizzeriaRomano.id, progress: 8, due: '2026-09-01', stage: 'Kickoff', updated: 'today' });
    }
    if (ahmetBuild) {
      projectData.push({ name: 'Ahmet Build — Quote Funnel', client_id: ahmetBuild.id, progress: 32, due: '2026-07-28', stage: 'Design', updated: 'yesterday' });
    }
    if (cutsAndCo) {
      projectData.push({ name: 'Cuts & Co. — Booking', client_id: cutsAndCo.id, progress: 91, due: '2026-06-30', stage: 'Review', updated: '4 hrs ago' });
    }
    if (bellaTrattoria) {
      projectData.push({ name: 'Bella Trattoria — Refresh', client_id: bellaTrattoria.id, progress: 12, due: '2026-08-10', stage: 'Kickoff', updated: '3 days ago' });
    }
    if (northsidePlumbing) {
      projectData.push({ name: 'Northside Plumbing — Site', client_id: northsidePlumbing.id, progress: 78, due: '2026-07-05', stage: 'Build', updated: '1 hr ago' });
    }
    await db().from('projects').insert(projectData);

    // Seed Invoices
    if (pizzeriaRomano) await db().from('invoices').insert({ client_id: pizzeriaRomano.id, amount: 2500, status: 'Paid' });
    if (ahmetBuild) await db().from('invoices').insert({ client_id: ahmetBuild.id, amount: 4800, status: 'Pending' });

    // Seed Tasks
    const taskData = [
      { text: 'Send onboarding checklist', due_date: new Date().toISOString().split('T')[0], done: false },
      { text: 'Review design mockups', due_date: new Date().toISOString().split('T')[0], done: false }
    ];
    await db().from('tasks').insert(taskData);

    // Seed Activities
    const activityData = [
      { type: 'note', text: 'Giulia mentioned they may want multilingual support — add to scope.', ts: new Date().toISOString() },
      { type: 'call', text: 'Called Marco — confirmed menu section layout. Good to go.', ts: new Date().toISOString() }
    ];
    await db().from('activities').insert(activityData);

    fetchData();
  };

  // Templates CRUD
  const addTemplate = async (template: Partial<ProjectTemplate>) => {
    const { data, error } = await db().from('project_templates').insert([{
      name: template.name,
      description: template.description || '',
      pages: template.pages || []
    }]).select();

    if (!error && data) {
      const formatted = { ...data[0], pages: Array.isArray(data[0].pages) ? data[0].pages : [] };
      setTemplates(prev => [formatted, ...prev]);
      return formatted;
    }
    return null;
  };

  const updateTemplate = async (id: string, updates: Partial<ProjectTemplate>) => {
    const { data, error } = await db().from('project_templates').update(updates).eq('id', id).select();
    if (!error && data) {
      const formatted = { ...data[0], pages: Array.isArray(data[0].pages) ? data[0].pages : [] };
      setTemplates(prev => prev.map(t => t.id === id ? formatted : t));
      return formatted;
    }
    return null;
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await db().from('project_templates').delete().eq('id', id);
    if (!error) {
      setTemplates(prev => prev.filter(t => t.id !== id));
    }
  };

  return {
    leads,
    clients,
    contacts,
    projects,
    invoices,
    tasks,
    activities,
    proposals,
    templates,
    targetAccounts,
    accountContacts,
    accountTouchpoints,
    accountSignals,
    researchFeeds,
    loading,
    addLead,
    updateLead,
    deleteLead,
    addClient,
    updateClient,
    deleteClient,
    addProject,
    updateProject,
    deleteProject,
    addInvoice,
    updateInvoice,
    addTask,
    updateTask,
    addActivity,
    addProposal,
    updateProposal,
    deleteProposal,
    addTargetAccount,
    updateTargetAccount,
    addAccountTouchpoint,
    addAccountSignal,
    reviewAccountSignal,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    addResearchFeed,
    updateResearchFeed,
    deleteResearchFeed,
    seedMockData,
    refresh: fetchData
  };
}
