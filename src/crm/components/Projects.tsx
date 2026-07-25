import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Icon, Icons } from './Navigation';
import type { Project, Client, Task, Invoice, ProjectTemplate } from '../hooks/useCRM';
import { NewClientDrawer } from './Clients';
import { InvoicesTab } from './Invoices';
import { InfrastructurePanel } from './InfrastructurePanel';
import { ProjectStatsTab } from './ProjectStatsTab';
import { supabase } from '@/lib/supabase';

const SCHEMA = import.meta.env.VITE_DB_SCHEMA || 'public';
const db = () => supabase.schema(SCHEMA);

const STAGE_TONES: Record<string, string> = {
  'Kickoff':  'blue',
  'Design':   'violet',
  'Build':    'amber',
  'Review':   'green',
  'Live':     'green',
  'Finished': 'green',
  'On hold':  'red',
};

function formatDue(iso: string) {
  if (!iso) return { label: '—', sub: '', tone: 'default' };
  const d = new Date(iso + 'T00:00:00');
  const now = new Date();
  now.setHours(0,0,0,0);
  const diff = Math.round((d.getTime() - now.getTime()) / (1000*60*60*24));
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const dateStr = d.toLocaleDateString('en-US', opts);
  if (diff < 0) return { label: dateStr, sub: `${-diff}d overdue`, tone: 'red' };
  if (diff === 0) return { label: dateStr, sub: 'today', tone: 'amber' };
  if (diff <= 7) return { label: dateStr, sub: `${diff}d left`, tone: 'amber' };
  return { label: dateStr, sub: `${diff}d`, tone: 'default' };
}

// ===== Client Picker (used in CreateProject) =====
interface ClientPickerProps {
  value: string;
  onChange: (id: string) => void;
  onAddNew: () => void;
  onQuickCreate: (name: string) => Promise<any>;
  clients: Client[];
}

function ClientPicker({ value, onChange, onAddNew, onQuickCreate, clients }: ClientPickerProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const selected = useMemo(() => clients.find(c => c.id === value), [clients, value]);
  const filtered = useMemo(() => {
    return clients.filter(c => 
      c.name.toLowerCase().includes(q.toLowerCase()) || 
      c.contact.toLowerCase().includes(q.toLowerCase())
    );
  }, [clients, q]);

  const getInitials = (name: string) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleQuickCreate = async () => {
    if (!q.trim() || creating) return;
    setCreating(true);
    try {
      const newClient = await onQuickCreate(q.trim());
      if (newClient) {
        onChange(newClient.id);
        setQ('');
        setOpen(false);
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="client-picker" ref={ref}>
      <button type="button" className={'client-picker-trigger' + (selected ? '' : ' empty')} onClick={() => setOpen(o => !o)}>
        {selected ? (
          <>
            <div className="avatar" style={{ width: 24, height: 24, fontSize: 10 }}>{getInitials(selected.name)}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 500 }}>{selected.name}</div>
              <div className="mono muted" style={{ fontSize: 10.5 }}>{selected.contact}</div>
            </div>
          </>
        ) : (
          <span>Pick a client or add new…</span>
        )}
        <Icon d={['M6 9l6 6 6-6']} size={14} />
      </button>
      {open && (
        <div className="client-picker-popover">
          <div className="client-picker-search">
            <input autoFocus placeholder="Search clients…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="client-picker-list">
            {filtered.map(c => (
              <div key={c.id} className="client-picker-item" onClick={() => { onChange(c.id); setOpen(false); setQ(''); }}>
                <div className="avatar" style={{ width: 26, height: 26, fontSize: 10 }}>{getInitials(c.name)}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{c.name}</div>
                  <div className="mono muted" style={{ fontSize: 10.5 }}>{c.contact}</div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && q.trim() && (
              <div style={{ padding: '8px 12px' }}>
                <div style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 8 }}>No matches.</div>
                <button
                  type="button"
                  onClick={handleQuickCreate}
                  disabled={creating}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 12px',
                    background: 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--r-md)',
                    cursor: creating ? 'wait' : 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    opacity: creating ? 0.7 : 1,
                    transition: 'opacity 0.15s ease',
                  }}
                >
                  <Icon d={Icons.plus} size={14} />
                  {creating ? 'Creating…' : <>Create "<span style={{ fontStyle: 'italic' }}>{q.trim()}</span>"</>}
                </button>
              </div>
            )}
            {filtered.length === 0 && !q.trim() && (
              <div style={{ padding: 12, color: 'var(--ink-3)', fontSize: 12 }}>Type a name to search or create.</div>
            )}
          </div>
          <div className="client-picker-add" onClick={() => { setOpen(false); onAddNew(); }}>
            <Icon d={Icons.plus} size={14} /> Add new client with details
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Create Project Component =====
interface CreateProjectProps {
  onCancel: () => void;
  onSave: (form: { 
    name: string; 
    clientId: string; 
    templateId: string; 
    due: string; 
    notes: string;
    provisionSite: boolean;
    slug?: string;
    businessType?: string;
    primaryColor?: string;
    ownerName?: string;
    ownerEmail?: string;
  }) => void;
  clients: Client[];
  onAddClient: (c: Partial<Client>) => Promise<any>;
  templates: ProjectTemplate[];
}

export function CreateProject({ onCancel, onSave, clients, onAddClient, templates }: CreateProjectProps) {
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [due, setDue] = useState('');
  const [notes, setNotes] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Website provisioning options
  const [provisionSite, setProvisionSite] = useState(true);
  const [slug, setSlug] = useState('');
  const [businessType, setBusinessType] = useState('bespoke');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');

  const selectedTemplate = useMemo(() => templates.find(t => t.id === templateId), [templates, templateId]);
  const canSave = name && clientId && (!provisionSite || (slug.trim() !== '' && ownerEmail.trim() !== ''));

  useEffect(() => {
    if (clientId) {
      const client = clients.find(c => c.id === clientId);
      if (client) {
        // Auto slugify name
        const cleanSlug = client.name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        setSlug(cleanSlug);
        
        // Auto fill owner name and email
        setOwnerName(client.contact || client.name);
        setOwnerEmail(client.email || '');
        
        // Auto map client type to business type if possible
        const typeLower = client.type?.toLowerCase() || '';
        if (typeLower.includes('barber')) {
          setBusinessType('barber');
        } else if (typeLower.includes('clinic')) {
          setBusinessType('clinic');
        } else if (typeLower.includes('restaurant')) {
          setBusinessType('restaurant');
        } else {
          setBusinessType('bespoke');
        }
      }
    }
  }, [clientId, clients]);

  const handleNewClientSave = async (c: Partial<Client>) => {
    const newClient = await onAddClient(c);
    if (newClient) {
      setClientId(newClient.id);
    }
    setDrawerOpen(false);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="mono muted" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            Projects · New
          </div>
          <h1 className="page-title">Create project</h1>
          <div className="page-subtitle">Attach a client and set launch dates.</div>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button 
            className="btn btn-primary btn-lg" 
            disabled={!canSave} 
            onClick={() => onSave({ 
              name, 
              clientId, 
              templateId, 
              due, 
              notes,
              provisionSite,
              slug,
              businessType,
              primaryColor,
              ownerName,
              ownerEmail
            })}
          >
            Create project
          </button>
        </div>
      </div>

      <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div className="form-card" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="form-section" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3 className="section-title" style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>Project basics</h3>
              <p className="section-desc" style={{ fontSize: '12.5px', color: 'var(--ink-3)' }}>Name it after the client + the deliverable so it's findable later.</p>
            </div>
            <div className="field">
              <label className="field-label" style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-3)', marginBottom: '6px' }}>Project name</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Romano — Loyalty Microsite" />
            </div>
            <div className="field">
              <label className="field-label" style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-3)', marginBottom: '6px' }}>Client</label>
              <ClientPicker
                value={clientId}
                onChange={setClientId}
                onAddNew={() => setDrawerOpen(true)}
                onQuickCreate={async (name) => {
                  const newClient = await onAddClient({ name });
                  return newClient;
                }}
                clients={clients}
              />
            </div>
          </div>

          <div className="form-section" style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid var(--line)', paddingTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 className="section-title" style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>Website Provisioning</h3>
                <p className="section-desc" style={{ fontSize: '12.5px', color: 'var(--ink-3)' }}>Automatically provision a private repository and deploy the site.</p>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                <input 
                  type="checkbox" 
                  checked={provisionSite} 
                  onChange={e => setProvisionSite(e.target.checked)} 
                  style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }}
                />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Enable</span>
              </label>
            </div>

            {provisionSite && (
              <div style={{ display: 'grid', gap: '16px', marginTop: '8px' }}>
                <div className="field-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="field">
                    <label className="field-label" style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-3)', marginBottom: '6px' }}>Subdomain Slug</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input 
                        className="input" 
                        value={slug} 
                        onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} 
                        placeholder="e.g. romano-barber" 
                        required
                      />
                      <span className="mono muted" style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}>.altaystudio.com</span>
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label" style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-3)', marginBottom: '6px' }}>Business Template Type</label>
                    <select 
                      className="select" 
                      value={businessType} 
                      onChange={e => setBusinessType(e.target.value)}
                    >
                      <option value="barber">Barber Shop</option>
                      <option value="clinic">Clinic</option>
                      <option value="restaurant">Restaurant</option>
                      <option value="bespoke">Bespoke (Custom)</option>
                    </select>
                  </div>
                </div>

                <div className="field-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="field">
                    <label className="field-label" style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-3)', marginBottom: '6px' }}>Primary Theme Color</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="color" 
                        value={primaryColor} 
                        onChange={e => setPrimaryColor(e.target.value)} 
                        style={{ width: '38px', height: '38px', padding: '0', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', cursor: 'pointer', background: 'transparent' }}
                      />
                      <input 
                        className="input" 
                        value={primaryColor} 
                        onChange={e => setPrimaryColor(e.target.value)} 
                        style={{ fontFamily: 'var(--mono)' }}
                      />
                    </div>
                  </div>
                </div>

                <div className="field-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="field">
                    <label className="field-label" style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-3)', marginBottom: '6px' }}>Owner Name</label>
                    <input 
                      className="input" 
                      value={ownerName} 
                      onChange={e => setOwnerName(e.target.value)} 
                      placeholder="Client contact name"
                    />
                  </div>
                  <div className="field">
                    <label className="field-label" style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-3)', marginBottom: '6px' }}>Owner Email</label>
                    <input 
                      type="email" 
                      className="input" 
                      value={ownerEmail} 
                      onChange={e => setOwnerEmail(e.target.value)} 
                      placeholder="client@email.com"
                      required
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="form-section" style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid var(--line)', paddingTop: '24px' }}>
            <div>
              <h3 className="section-title" style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>Template</h3>
              <p className="section-desc" style={{ fontSize: '12.5px', color: 'var(--ink-3)' }}>Pick a template to auto-create page tasks, or start blank.</p>
            </div>
            <div className="field">
              <div style={{ display: 'grid', gap: 8 }}>
                <label
                  className="form-card"
                  style={{
                    padding: '14px 16px',
                    cursor: 'pointer',
                    borderColor: !templateId ? 'var(--ink)' : 'var(--line)',
                    background: !templateId ? 'var(--surface-2)' : 'var(--surface)',
                    display: 'flex', alignItems: 'center', gap: 12,
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--r-md)'
                  }}
                >
                  <input
                    type="radio"
                    name="tmpl"
                    checked={!templateId}
                    onChange={() => setTemplateId('')}
                    style={{ accentColor: 'var(--accent)', width: 16, height: 16, marginRight: 4 }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>Blank project</div>
                    <div className="mono muted" style={{ fontSize: 10.5, marginTop: 2 }}>Start from scratch — add pages later</div>
                  </div>
                </label>
                {templates.map(t => (
                  <label
                    key={t.id}
                    className="form-card"
                    style={{
                      padding: '14px 16px',
                      cursor: 'pointer',
                      borderColor: templateId === t.id ? 'var(--ink)' : 'var(--line)',
                      background: templateId === t.id ? 'var(--surface-2)' : 'var(--surface)',
                      display: 'flex', alignItems: 'center', gap: 12,
                      border: '1px solid var(--line)',
                      borderRadius: 'var(--r-md)'
                    }}
                  >
                    <input
                      type="radio"
                      name="tmpl"
                      checked={templateId === t.id}
                      onChange={() => setTemplateId(t.id)}
                      style={{ accentColor: 'var(--accent)', width: 16, height: 16, marginRight: 4 }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
                      <div className="mono muted" style={{ fontSize: 10.5, marginTop: 2 }}>
                        {t.pages.length ? t.pages.join(' · ') : 'No pages defined'}
                      </div>
                    </div>
                    <span className="mono muted" style={{ fontSize: 11 }}>{t.pages.length} {t.pages.length === 1 ? 'page' : 'pages'}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="form-section" style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid var(--line)', paddingTop: '24px' }}>
            <div>
              <h3 className="section-title" style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>Schedule & notes</h3>
              <p className="section-desc" style={{ fontSize: '12.5px', color: 'var(--ink-3)' }}>Optional. You can fill these in later.</p>
            </div>
            <div className="field-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="field">
                <label className="field-label" style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-3)', marginBottom: '6px' }}>Target launch</label>
                <input className="input" type="date" value={due} onChange={e => setDue(e.target.value)} />
              </div>
              <div className="field">
                <label className="field-label" style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-3)', marginBottom: '6px' }}>Owner</label>
                <select className="select" defaultValue="me">
                  <option value="me">Altaay Y. (me)</option>
                  <option>Unassigned</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label className="field-label" style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-3)', marginBottom: '6px' }}>Internal notes</label>
              <textarea className="textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything the team should know before kickoff…" />
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 16, position: 'sticky', top: 20, height: 'fit-content' }}>
          {selectedTemplate && selectedTemplate.pages.length > 0 && (
            <div className="side-card" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '20px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-3)' }}>Pages from template</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedTemplate.pages.map((p, i) => (
                  <li key={p} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="step-num" style={{ background: 'var(--bg-2)', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600 }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: '13px' }}>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="side-card" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '20px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-3)' }}>What happens next</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li style={{ display: 'flex', gap: '8px', fontSize: '13px' }}><span className="step-num" style={{ background: 'var(--bg-2)', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, flexShrink: 0 }}>1</span><span>Project lands in <strong>Kickoff</strong>.</span></li>
              <li style={{ display: 'flex', gap: '8px', fontSize: '13px' }}><span className="step-num" style={{ background: 'var(--bg-2)', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, flexShrink: 0 }}>2</span><span>Project details and basic tasks are initialized.</span></li>
              <li style={{ display: 'flex', gap: '8px', fontSize: '13px' }}><span className="step-num" style={{ background: 'var(--bg-2)', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, flexShrink: 0 }}>3</span><span>Client gets an email invite to comment.</span></li>
              <li style={{ display: 'flex', gap: '8px', fontSize: '13px' }}><span className="step-num" style={{ background: 'var(--bg-2)', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, flexShrink: 0 }}>4</span><span>You can move it to <strong>Design</strong> when ready.</span></li>
            </ul>
          </div>
        </div>
      </div>

      <NewClientDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSave={handleNewClientSave}
      />
    </div>
  );
}

// ===== Create Task Panel =====
interface CreateTaskPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (form: { title: string; priority: string }) => void;
}

function CreateTaskPanel({ isOpen, onClose, onSubmit }: CreateTaskPanelProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('med');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    
    onSubmit({
      title: title.trim(),
      priority,
    });
    
    setTitle('');
    setPriority('med');
  }

  return (
    <>
      <div className={'create-task-scrim' + (isOpen ? ' open' : '')} onClick={onClose} style={{ zIndex: 250 }} />
      <div className={'create-task-panel' + (isOpen ? ' open' : '')} style={{ zIndex: 260 }}>
        <div className="ctp-head">
          <h2 className="ctp-title">Create task</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <Icon d={['M6 6l8 8M14 6l-8 8']} size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="ctp-body">
          <div className="ctp-field">
            <label className="ctp-label">Task title</label>
            <input
              type="text"
              className="ctp-input"
              placeholder="Wire up reservations form"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="ctp-field">
            <label className="ctp-label">Priority</label>
            <div className="ctp-priority-row">
              {[
                { val: 'low', label: 'Low', tone: 'blue' },
                { val: 'med', label: 'Medium', tone: 'amber' },
                { val: 'high', label: 'High', tone: 'red' },
              ].map(p => (
                <button
                  key={p.val}
                  type="button"
                  className={'ctp-priority-btn' + (priority === p.val ? ' is-active' : '') + ' tone-' + p.tone}
                  onClick={() => setPriority(p.val)}
                >
                  <span className="ctp-priority-dot" />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="ctp-foot">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!title.trim()}>
              Create task
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ===== Settings Tab (Inside ProjectDetail) =====
interface SettingsTabProps {
  project: Project;
  client: Client | null;
  onDelete: (id: string) => Promise<any>;
  onBack: () => void;
}

function SettingsTab({ project, client, onDelete, onBack }: SettingsTabProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const confirmed = confirmText.trim().toLowerCase() === project.name.trim().toLowerCase();

  return (
    <div style={{ maxWidth: 600, padding: '28px 0' }}>
      <div className="form-card" style={{ marginBottom: 20, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: '20px' }}>
        <h3 className="section-title" style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>General</h3>
        <p className="section-desc" style={{ fontSize: '12.5px', color: 'var(--ink-3)', marginBottom: '18px' }}>Basic project metadata.</p>
        <div className="form-section" style={{ display: 'grid', gap: '16px' }}>
          <div className="field">
            <label className="field-label" style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-3)', marginBottom: '6px' }}>Project name</label>
            <input className="input" defaultValue={project.name} />
          </div>
          <div className="field">
            <label className="field-label" style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-3)', marginBottom: '6px' }}>Client</label>
            <input className="input" defaultValue={client?.name || ''} disabled style={{ opacity: 0.6 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary">Save changes</button>
          </div>
        </div>
      </div>

      <div className="form-card" style={{ borderColor: 'var(--red)', background: 'var(--red-soft)', border: '1px solid var(--red)', borderRadius: 'var(--r-md)', padding: '20px' }}>
        <h3 className="section-title" style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px', color: 'var(--red)' }}>Danger zone</h3>
        <p className="section-desc" style={{ fontSize: '12.5px', color: 'var(--ink-3)', marginBottom: '18px' }}>These actions are permanent and cannot be undone.</p>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: '14px 16px',
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-md)',
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Delete this project</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
              Permanently removes <strong>{project.name}</strong> and all its tasks, files, and invoices.
            </div>
          </div>
          <button
            className="btn btn-sm"
            style={{ background: 'var(--red)', color: '#fff', border: 'none', flexShrink: 0 }}
            onClick={() => setConfirmOpen(true)}
          >
            Delete project
          </button>
        </div>
      </div>

      {confirmOpen && (
        <>
          <div
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(26,22,18,0.45)',
              zIndex: 270,
              backdropFilter: 'blur(2px)',
            }}
            onClick={() => { setConfirmOpen(false); setConfirmText(''); }}
          />
          <div style={{
            position: 'fixed',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 280,
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-xl)',
            padding: '28px 28px 22px',
            width: 420,
            maxWidth: 'calc(100vw - 32px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.16)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--red-soft)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--red)' }}>Delete project</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 1 }}>This cannot be undone.</div>
              </div>
            </div>

            <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: '12px 0 16px', lineHeight: 1.5 }}>
              Type <strong style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{project.name}</strong> to confirm deletion.
            </p>

            <input
              className="input"
              autoFocus
              placeholder={project.name}
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              style={{ marginBottom: 16 }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                className="btn btn-secondary"
                onClick={() => { setConfirmOpen(false); setConfirmText(''); }}
              >
                Cancel
              </button>
              <button
                className="btn"
                disabled={!confirmed}
                style={{
                  background: confirmed ? 'var(--red)' : 'var(--red-soft)',
                  color: confirmed ? '#fff' : 'var(--red)',
                  border: 'none',
                  opacity: confirmed ? 1 : 0.6,
                  cursor: confirmed ? 'pointer' : 'not-allowed',
                }}
                onClick={async () => {
                  if (!confirmed) return;
                  setConfirmOpen(false);
                  setConfirmText('');
                  await onDelete(project.id);
                  onBack();
                }}
              >
                Yes, delete it
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ===== Project Detail Component =====
interface ProjectDetailProps {
  projectId: string;
  onBack: () => void;
  onDelete: (id: string) => Promise<any>;
  clients: Client[];
  projects: Project[];
  invoices: Invoice[];
  tasks: Task[];
  onAddTask: (tk: Partial<Task>) => Promise<any>;
  onCompleteTask: (id: string, updates: Partial<Task>) => Promise<any>;
  onUpdateProject: (id: string, updates: Partial<Project>) => Promise<any>;
  onAddInvoice: (inv: Partial<Invoice>) => Promise<any>;
  onUpdateInvoice: (id: string, updates: Partial<Invoice>) => Promise<any>;
}

export function ProjectDetail({ 
  projectId, 
  onBack, 
  onDelete,
  clients,
  projects,
  invoices,
  tasks,
  onAddTask,
  onCompleteTask,
  onAddInvoice,
  onUpdateInvoice
}: ProjectDetailProps) {
  const project = useMemo(() => projects.find(p => p.id === projectId) || projects[0], [projects, projectId]);
  const client = useMemo(() => clients.find(c => c.id === project?.client), [clients, project]);

  const [activeTab, setActiveTab] = useState('Board');
  const [dragging, setDragging] = useState<{ taskId: string } | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [dragOverTrash, setDragOverTrash] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [createTaskCol, setCreateTaskCol] = useState('To do');
  const [invoicePrefillTasks, setInvoicePrefillTasks] = useState<any[] | null>(null);

  const [longPressDragging, setLongPressDragging] = useState(false);
  const longPressTimer = useRef<any>(null);

  const cols = ['To do', 'In progress', 'Review', 'Add to Invoice'];

  // Map tasks dynamically from hook props
  const groupedTasks = useMemo(() => {
    const grouped: Record<string, Task[]> = {
      'To do': [],
      'In progress': [],
      'Review': [],
      'Add to Invoice': [],
    };
    
    if (!project) return grouped;
    const projectTasks = tasks.filter(t => t.linkedId === project.id && t.linkedType === 'project');
    
    projectTasks.forEach(t => {
      const stage = t.stage || 'To do';
      if (grouped[stage]) {
        grouped[stage].push(t);
      } else {
        grouped['To do'].push(t);
      }
    });
    
    return grouped;
  }, [tasks, project]);

  function onDragStart(e: React.DragEvent, taskId: string) {
    setDragging({ taskId });
    setLongPressDragging(true);
    e.dataTransfer.effectAllowed = 'move';
  }
  function onDragEnd() {
    setDragging(null);
    setDragOverCol(null);
    setDragOverTrash(false);
    setLongPressDragging(false);
  }
  function onDragOver(e: React.DragEvent, col: string) {
    e.preventDefault();
    setDragOverCol(col);
    setDragOverTrash(false);
  }
  async function onDrop(e: React.DragEvent, toCol: string) {
    e.preventDefault();
    if (!dragging) return;
    const { taskId } = dragging;
    await onCompleteTask(taskId, { stage: toCol });
    setDragging(null);
    setDragOverCol(null);
  }

  function onTrashDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOverTrash(true);
    setDragOverCol(null);
  }
  function onTrashDragLeave() {
    setDragOverTrash(false);
  }
  async function onTrashDrop(e: React.DragEvent) {
    e.preventDefault();
    if (!dragging) return;
    const { taskId } = dragging;
    // Hard delete task
    await db().from('tasks').delete().eq('id', taskId);
    window.location.reload(); // Quick refresh to update state or let parent handle
    setDragging(null);
    setDragOverCol(null);
    setDragOverTrash(false);
    setLongPressDragging(false);
  }

  function onCardMouseDown(_e: React.MouseEvent, taskId: string) {
    longPressTimer.current = setTimeout(() => {
      setDragging({ taskId });
      setLongPressDragging(true);
    }, 500);
  }
  function onCardMouseUp() {
    clearTimeout(longPressTimer.current);
  }

  async function handleCreateTask(taskData: { title: string; priority: string }) {
    if (!project) return;
    await onAddTask({
      text: taskData.title,
      linkedId: project.id,
      linkedName: project.name,
      linkedType: 'project',
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      stage: createTaskCol,
      priority: taskData.priority,
      done: false
    });
    setIsCreateTaskOpen(false);
  }

  function openCreateTaskPanel(col: string) {
    if (col === 'Add to Invoice') {
      const colTasks = groupedTasks['Add to Invoice'] || [];
      setInvoicePrefillTasks(colTasks.length > 0 ? colTasks : []);
      setActiveTab('Invoices');
      return;
    }
    setCreateTaskCol(col);
    setIsCreateTaskOpen(true);
  }

  const due = project ? formatDue(project.due) : { label: '—', sub: '', tone: 'default' };

  const totalTasks = useMemo(() => {
    return cols.reduce((acc, c) => acc + (groupedTasks[c]?.length || 0), 0);
  }, [groupedTasks]);

  const doneTasks = groupedTasks['Add to Invoice']?.length || 0;

  if (!project) {
    return <div className="page">Project not found.</div>;
  }

  const getInitials = (name: string) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="page page-project" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* HEADER */}
      <div className="proj-detail-head">
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 10 }}>
          <Icon d={['M15 18l-6-6 6-6']} size={14} /> All projects
        </button>
        <div className="proj-detail-title-row" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="proj-icon" style={{ width: 48, height: 48, fontSize: 20, borderRadius: 10, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
            {client ? getInitials(client.name) : '·'}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 className="page-title" style={{ fontSize: 30, margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
              {project.name}
              {project.github_repo && (
                <a href={`https://github.com/${project.github_repo}`} target="_blank" rel="noreferrer" title="GitHub Repository" style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 8px', borderRadius: '4px', background: 'var(--surface-2)', border: '1px solid var(--line)', fontSize: '11px', color: 'var(--ink-2)', textDecoration: 'none', gap: '4px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                  {project.github_repo.split('/')[1] || project.github_repo}
                </a>
              )}
              {project.vercel_project_id && (
                <a href={project.subdomain ? `https://${project.subdomain}` : '#'} target="_blank" rel="noreferrer" title="Vercel Deployment" style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 8px', borderRadius: '4px', background: 'var(--surface-2)', border: '1px solid var(--line)', fontSize: '11px', color: 'var(--ink-2)', textDecoration: 'none', gap: '4px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M24 22.525H0l12-21.05 12 21.05z"/></svg>
                  {project.vercel_project_id}
                </a>
              )}
              {project.schema_name && (
                <span title="Database Schema" style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 8px', borderRadius: '4px', background: 'var(--surface-2)', border: '1px solid var(--line)', fontSize: '11px', color: 'var(--ink-2)', gap: '4px' }}>
                  <Icon d={['M4 4h16v16H4z', 'M4 12h16', 'M12 4v16']} size={12} />
                  DB: {project.schema_name}
                </span>
              )}
            </h1>
            <div className="proj-detail-meta" style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12.5px', color: 'var(--ink-3)', marginTop: '8px' }}>
              <span className="mono">{project.id.substring(0, 8).toUpperCase()}</span>
              <span className="dot-sep">·</span>
              <span>{client?.name}</span>
            </div>
          </div>
        </div>

        {/* status strip */}
        <div className="proj-detail-strip" style={{ display: 'flex', gap: '24px', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', padding: '16px 0', marginTop: '20px' }}>
          <div className="strip-cell">
            <div className="strip-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-4)', marginBottom: '4px' }}>Stage</div>
            <span className={'chip chip-dot tone-' + (STAGE_TONES[project.stage] || 'blue')}>{project.stage}</span>
          </div>
          <div className="strip-cell">
            <div className="strip-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-4)', marginBottom: '4px' }}>Progress</div>
            <div className="progress-row" style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="progress-track" style={{ minWidth: 60, maxWidth: 120, height: '6px', background: 'var(--line)', borderRadius: '3px', position: 'relative' }}>
                <div className="progress-fill" style={{ width: project.progress + '%', height: '100%', background: 'var(--accent)', borderRadius: '3px' }} />
              </div>
              <span className="progress-num" style={{ fontSize: '12px', fontWeight: 600 }}>{project.progress}%</span>
            </div>
          </div>
          <div className="strip-cell">
            <div className="strip-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-4)', marginBottom: '4px' }}>Due</div>
            <div className="mono" style={{ fontSize: 13 }}>
              {due.label}
              <span style={{
                marginLeft: 6, fontSize: 11,
                color: due.tone === 'red' ? 'var(--red)' : due.tone === 'amber' ? 'var(--amber)' : 'var(--ink-3)'
              }}>{due.sub}</span>
            </div>
          </div>
          <div className="strip-cell">
            <div className="strip-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-4)', marginBottom: '4px' }}>Tasks</div>
            <div className="mono" style={{ fontSize: 13 }}>
              <strong>{doneTasks}</strong>
              <span className="muted"> / {totalTasks} invoiceable</span>
            </div>
          </div>
        </div>

        {/* tab strip */}
        <div className="proj-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--line)', gap: '20px', marginTop: '16px' }}>
          {['Board', 'Invoices', 'Infrastructure', 'Settings', 'Website Stats'].map(tab => (
            <div
              key={tab}
              className={'proj-tab' + (activeTab === tab ? ' active' : '')}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: activeTab === tab ? 600 : 500,
                color: activeTab === tab ? 'var(--ink)' : 'var(--ink-3)',
                borderBottom: activeTab === tab ? '2px solid var(--ink)' : '2px solid transparent',
                marginBottom: '-1px'
              }}
            >
              {tab}
            </div>
          ))}
        </div>
      </div>

      {/* BODY */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {activeTab === 'Invoices' && client && (
          <InvoicesTab
            projectId={project.id}
            projectName={project.name}
            clientId={client.id}
            invoices={invoices}
            prefillTasks={invoicePrefillTasks}
            onClearPrefill={() => setInvoicePrefillTasks(null)}
            onTasksArchived={async (ts) => {
              // Archive tasks by setting stage = 'Archived' or update done=true
              for (const t of ts) {
                await onCompleteTask(t.id, { done: true });
              }
            }}
            onAddInvoice={onAddInvoice}
            onUpdateInvoice={onUpdateInvoice}
          />
        )}

        {/* INFRASTRUCTURE TAB */}
        {activeTab === 'Infrastructure' && (
          <div className="tab-pane" style={{ animation: 'fadeIn 0.2s ease-out' }}>
            <InfrastructurePanel project={project} />
          </div>
        )}

        {/* BOARD TAB */}
        {activeTab === 'Board' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

            <div className="kanban leads-board" style={{ flex: 1, margin: '16px 0', paddingBottom: '16px' }}>
              {cols.map(col => {
                const colTasks = groupedTasks[col] || [];
                const isOver = dragOverCol === col;
                const isInvoiceCol = col === 'Add to Invoice';
                
                return (
                  <div
                    key={col}
                    className={'kanban-col leads-col' + (isOver ? ' is-over' : '')}
                    onDragOver={(e) => onDragOver(e, col)}
                    onDragLeave={() => setDragOverCol(null)}
                    onDrop={(e) => onDrop(e, col)}
                    style={{
                      padding: '12px',
                      height: '100%',
                      minHeight: '400px'
                    }}
                  >
                    <div className="kanban-col-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', color: isInvoiceCol ? 'var(--accent)' : 'var(--ink)' }}>
                      <span className="kanban-col-title" style={{ fontWeight: 600, fontSize: '13.5px' }}>{col}</span>
                      <span className="kanban-col-count mono" style={{ fontSize: '11px', background: 'var(--line)', padding: '2px 6px', borderRadius: '10px' }}>{colTasks.length}</span>
                    </div>
                    <div className="kanban-col-body" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {colTasks.map(task => (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => onDragStart(e, task.id)}
                          onDragEnd={onDragEnd}
                          onMouseDown={(e) => onCardMouseDown(e, task.id)}
                          onMouseUp={onCardMouseUp}
                          onMouseLeave={onCardMouseUp}
                          className="task-card"
                          style={{ 
                            opacity: dragging?.taskId === task.id ? 0.4 : 1,
                            background: 'var(--surface)',
                            border: '1px solid var(--line)',
                            borderRadius: 'var(--r-md)',
                            padding: '10px',
                            cursor: 'grab'
                          }}
                        >
                          <div className="task-card-title" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>{task.text}</div>
                          <div className="task-card-foot" style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                            {task.page && <span className="chip" style={{ fontSize: '9px', background: 'var(--bg-2)' }}>{task.page}</span>}
                            <span className={'chip chip-dot tone-' + (task.priority ? (task.priority === 'high' ? 'red' : task.priority === 'med' ? 'amber' : 'blue') : 'blue')} style={{ fontSize: '9px' }}>
                              {task.priority || 'med'}
                            </span>
                          </div>
                        </div>
                      ))}
                      <button 
                        className="kanban-add" 
                        onClick={() => openCreateTaskPanel(col)} 
                        style={{ 
                          width: '100%', 
                          background: 'transparent', 
                          border: '1px dashed var(--line)', 
                          borderRadius: 'var(--r-md)', 
                          padding: '8px', 
                          color: isInvoiceCol ? 'var(--accent)' : 'var(--ink-3)', 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          fontWeight: isInvoiceCol ? 600 : 500
                        }}
                      >
                        <Icon d={Icons.plus} size={13} /> {isInvoiceCol ? 'Create Invoice' : 'Add task'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'Settings' && (
          <SettingsTab project={project} client={client || null} onDelete={onDelete} onBack={onBack} />
        )}

        {/* WEBSITE STATS TAB */}
        {activeTab === 'Website Stats' && (
          <div className="tab-pane" style={{ animation: 'fadeIn 0.2s ease-out', padding: '0 24px 24px', overflowY: 'auto', flex: 1 }}>
            <ProjectStatsTab project={project} />
          </div>
        )}
      </div>

      {/* TRASH ZONE */}
      <div
        className={'trash-zone' + (longPressDragging ? ' visible' : '') + (dragOverTrash ? ' over' : '')}
        onDragOver={onTrashDragOver}
        onDragLeave={onTrashDragLeave}
        onDrop={onTrashDrop}
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: dragOverTrash ? 'var(--red)' : 'var(--surface)',
          color: dragOverTrash ? '#fff' : 'var(--red)',
          border: '1px solid var(--red)',
          borderRadius: 'var(--r-xl)',
          padding: '16px 32px',
          display: longPressDragging ? 'flex' : 'none',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          zIndex: 1000
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
        <span style={{ fontWeight: 600 }}>{dragOverTrash ? 'Release to delete' : 'Drop here to delete'}</span>
      </div>

      <CreateTaskPanel
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        onSubmit={handleCreateTask}
      />
    </div>
  );
}

// ===== Projects List (Main view) =====
interface ProjectsListProps {
  projects: Project[];
  clients: Client[];
  onOpen: (id: string) => void;
  onCreate: () => void;
}

export function ProjectsList({ projects, clients, onOpen, onCreate }: ProjectsListProps) {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [sort, setSort] = useState({ key: 'updated', dir: 'desc' });

  const stages = ['all', 'Kickoff', 'Design', 'Build', 'Review', 'Live', 'Finished', 'On hold'];
  const clientById = (id: string) => clients.find(c => c.id === id) || null;

  const rows = useMemo(() => {
    let list = projects.filter(p => {
      if (stageFilter !== 'all' && (p.stage || '').toLowerCase() !== stageFilter.toLowerCase()) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      const c = clientById(p.client);
      return p.name.toLowerCase().includes(q) || (c && c.name.toLowerCase().includes(q));
    });

    list = [...list].sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1;
      if (sort.key === 'name')     return a.name.localeCompare(b.name) * dir;
      if (sort.key === 'client')   return (clientById(a.client)?.name || '').localeCompare(clientById(b.client)?.name || '') * dir;
      if (sort.key === 'progress') return (a.progress - b.progress) * dir;
      if (sort.key === 'due')      return (new Date(a.due).getTime() - new Date(b.due).getTime()) * dir;
      return 0;
    });

    return list;
  }, [projects, clients, stageFilter, search, sort]);

  const toggleSort = (key: string) => {
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  };

  const SortHeader = ({ k, children }: { k: string; children: React.ReactNode }) => (
    <th className={sort.key === k ? 'active' : ''} onClick={() => toggleSort(k)} style={{ cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {children}
        <span className="sort-arrow" style={{ fontSize: 9, opacity: sort.key === k ? 1 : 0.4 }}>
          {sort.key === k ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </div>
    </th>
  );

  const getInitials = (name: string) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <div className="page-subtitle">{rows.length} project{rows.length !== 1 ? 's' : ''}{stageFilter !== 'all' ? ` · ${stageFilter}` : ''}</div>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-primary btn-lg" onClick={onCreate}>
            <Icon d={Icons.plus} size={16} /> New project
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-input">
          <Icon d={Icons.search} size={14} />
          <input
            placeholder="Search projects, clients…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-8" style={{ overflowX: 'auto', paddingBottom: 2 }}>
          {stages.map(s => (
            <button
              key={s}
              onClick={() => setStageFilter(s)}
              className={'chip ' + (stageFilter === s ? 'tone-' + (STAGE_TONES[s] || 'amber') : '')}
              style={{
                cursor: 'pointer',
                background: stageFilter === s && s === 'all' ? 'var(--ink)' : undefined,
                color:      stageFilter === s && s === 'all' ? 'var(--bg)' : undefined,
                borderColor: stageFilter === s && s === 'all' ? 'var(--ink)' : undefined,
              }}
            >
              {s === 'all' ? 'All stages' : s}
            </button>
          ))}
        </div>
      </div>

      {/* DESKTOP TABLE */}
      <div className="table-card hide-mobile">
        <table className="tbl">
          <thead>
            <tr>
              <SortHeader k="name">Project</SortHeader>
              <SortHeader k="client">Client</SortHeader>
              <th>GitHub</th>
              <SortHeader k="progress">Progress</SortHeader>
              <SortHeader k="due">Due date</SortHeader>
              <th>Stage</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(p => {
              const c = clientById(p.client);
              const dueInfo = formatDue(p.due);
              return (
                <tr key={p.id} onClick={() => onOpen(p.id)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div className="proj-name">
                      <div className="proj-icon" style={{ width: 32, height: 32, fontSize: 11, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', fontWeight: 600 }}>{c ? getInitials(c.name) : '·'}</div>
                      <div>
                        <div className="proj-title">{p.name}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="client-cell" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="avatar" style={{ width: 24, height: 24, fontSize: 10 }}>{c ? getInitials(c.name) : ''}</div>
                      <span>{c?.name}</span>
                    </div>
                  </td>
                  <td>
                    {p.github_repo ? (
                      <a
                        href={`https://github.com/${p.github_repo}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                        {p.github_repo.split('/')[1]}
                      </a>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--ink-4)' }}>—</span>
                    )}
                  </td>
                  <td>
                    <div className="progress-row" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="progress-track" style={{ width: 80, height: '4px', background: 'var(--line)', borderRadius: '2px', position: 'relative' }}>
                        <div className="progress-fill" style={{ width: p.progress + '%', height: '100%', background: 'var(--accent)', borderRadius: '2px' }} />
                      </div>
                      <span className="progress-num mono" style={{ fontSize: '11px', fontWeight: 600 }}>{p.progress}%</span>
                    </div>
                  </td>
                  <td className="mono" style={{ fontSize: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>{dueInfo.label}</span>
                      {dueInfo.sub && <span style={{ fontSize: '10px', color: dueInfo.tone === 'red' ? 'var(--red)' : dueInfo.tone === 'amber' ? 'var(--amber)' : 'var(--ink-4)' }}>{dueInfo.sub}</span>}
                    </div>
                  </td>
                  <td>
                    <span className={'chip chip-dot tone-' + (STAGE_TONES[p.stage] || 'blue')}>{p.stage}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARDS */}
      <div className="proj-card-grid hide-desktop" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {rows.map(p => {
          const c = clientById(p.client);
          return (
            <div key={p.id} className="proj-card" onClick={() => onOpen(p.id)} style={{ cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: '12px' }}>
              <div className="proj-card-head" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="proj-icon" style={{ width: 36, height: 36, fontSize: 13, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', fontWeight: 600 }}>{c ? getInitials(c.name) : ''}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="proj-title" style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                  <div className="proj-meta" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{c?.name}</div>
                </div>
                <span className={'chip chip-dot tone-' + (STAGE_TONES[p.stage] || 'blue')}>{p.stage}</span>
              </div>
            </div>
          );
        })}
      </div>

      {rows.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-3)' }}>
          No projects match your filters.
        </div>
      )}
    </div>
  );
}

// ===== Main Combined Export (Wrapper) =====
interface ProjectsProps {
  projects: Project[];
  clients: Client[];
  invoices: Invoice[];
  tasks: Task[];
  templates: ProjectTemplate[];
  onAddProject: (project: Partial<Project>) => Promise<any>;
  onUpdateProject: (id: string, updates: Partial<Project>) => Promise<any>;
  onDeleteProject: (id: string) => Promise<any>;
  onAddClient: (client: Partial<Client>) => Promise<any>;
  onAddTask: (task: Partial<Task>) => Promise<any>;
  onCompleteTask: (id: string, updates: Partial<Task>) => Promise<any>;
  onAddInvoice: (invoice: Partial<Invoice>) => Promise<any>;
  onUpdateInvoice: (id: string, updates: Partial<Invoice>) => Promise<any>;
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  showCreateView: boolean;
  setShowCreateView: (show: boolean) => void;
}

export default function Projects({
  projects,
  clients,
  invoices,
  tasks,
  templates,
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  onAddClient,
  onAddTask,
  onCompleteTask,
  onAddInvoice,
  onUpdateInvoice,
  activeProjectId,
  setActiveProjectId,
  showCreateView,
  setShowCreateView
}: ProjectsProps) {

  const handleSaveProject = async (form: { name: string; clientId: string; templateId: string; due: string; notes: string }) => {
    const newProj = await onAddProject({
      name: form.name,
      client: form.clientId,
      template: form.templateId || undefined,
      due: form.due || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      progress: 0,
      stage: 'Kickoff'
    });
    if (newProj) {
      // Create page tasks from template
      if (form.templateId) {
        const tmpl = templates.find(t => t.id === form.templateId);
        if (tmpl && tmpl.pages.length > 0) {
          for (const page of tmpl.pages) {
            await onAddTask({
              text: page,
              linkedId: newProj.id,
              linkedName: newProj.name,
              linkedType: 'project',
              dueDate: form.due || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
              stage: 'To do',
              priority: 'med',
              page: page,
              done: false
            });
          }
        }
      }
      setActiveProjectId(newProj.id);
    }
    setShowCreateView(false);
  };

  if (activeProjectId) {
    return (
      <ProjectDetail
        projectId={activeProjectId}
        onBack={() => setActiveProjectId(null)}
        onDelete={onDeleteProject}
        clients={clients}
        projects={projects}
        invoices={invoices}
        tasks={tasks}
        onAddTask={onAddTask}
        onCompleteTask={onCompleteTask}
        onUpdateProject={onUpdateProject}
        onAddInvoice={onAddInvoice}
        onUpdateInvoice={onUpdateInvoice}
      />
    );
  }

  if (showCreateView) {
    return (
      <CreateProject
        onCancel={() => setShowCreateView(false)}
        onSave={handleSaveProject}
        clients={clients}
        onAddClient={onAddClient}
        templates={templates}
      />
    );
  }

  return (
    <ProjectsList
      projects={projects}
      clients={clients}
      onOpen={(id) => setActiveProjectId(id)}
      onCreate={() => setShowCreateView(true)}
    />
  );
}
