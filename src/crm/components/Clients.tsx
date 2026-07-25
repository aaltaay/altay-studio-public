import React, { useState, useEffect, useMemo } from 'react';
import { Icon, Icons } from './Navigation';
import { ActivityTaskPanel } from './ActivityTaskPanel';
import type { Client, Project, Activity, Task } from '../hooks/useCRM';

const BILLING_METHODS = ['ACH', 'Wire', 'Credit card', 'Check'];
const TERMS = ['Net 7', 'Net 15', 'Net 30', 'Due on receipt'];

const STATUS_META: Record<string, { label: string; tone: string; dot: string }> = {
  active:   { label: 'Active',   tone: 'green', dot: 'var(--green)' },
  archived: { label: 'Archived', tone: '',      dot: 'var(--ink-4)' },
  churned:  { label: 'Churned',  tone: 'red',   dot: 'var(--red)' },
};

export const getInitials = (name: string): string => {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// ---- Confirm modal ----
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function ConfirmDialog({ open, title, body, confirmLabel, danger, onCancel, onConfirm }: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="ec-confirm-scrim" onClick={onCancel}>
      <div className="ec-confirm" onClick={(e) => e.stopPropagation()} role="dialog">
        <h3 className="ec-confirm-title">{title}</h3>
        <p className="ec-confirm-body">{body}</p>
        <div className="ec-confirm-foot">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className={'btn ' + (danger ? 'btn-danger' : 'btn-primary')} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ===== Shared field components =====
interface EcFieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

function EcField({ label, hint, children }: EcFieldProps) {
  return (
    <div className="ec-field">
      <label className="ec-label">{label}{hint && <span className="ec-hint">{hint}</span>}</label>
      {children}
    </div>
  );
}

interface StatusPickerProps {
  value: string;
  onChange: (val: string) => void;
}

function StatusPicker({ value, onChange }: StatusPickerProps) {
  return (
    <div className="ec-status-row">
      {Object.entries(STATUS_META).map(([key, meta]) => (
        <button
          key={key}
          type="button"
          className={'ec-status-btn' + (value === key ? ' is-active' : '')}
          onClick={() => onChange(key)}
        >
          <span className="ec-status-dot" style={{ background: meta.dot }} />
          {meta.label}
        </button>
      ))}
    </div>
  );
}

interface LinkedProjectsProps {
  clientId: string;
  projects: Project[];
}

function LinkedProjects({ clientId, projects }: LinkedProjectsProps) {
  const projs = useMemo(() => projects.filter(p => p.client === clientId), [projects, clientId]);
  
  if (projs.length === 0) {
    return <div className="ec-empty">No projects yet.</div>;
  }

  const formatDue = (dueStr: string) => {
    if (!dueStr) return null;
    const date = new Date(dueStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diff = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diff < 0) return { label: 'Overdue', tone: 'red' };
    if (diff === 0) return { label: 'Due today', tone: 'amber' };
    if (diff === 1) return { label: 'Due tomorrow', tone: 'default' };
    return { label: `In ${diff} days`, tone: 'default' };
  };

  return (
    <div className="ec-linked-projects">
      {projs.map(p => {
        const due = formatDue(p.due);
        return (
          <div key={p.id} className="ec-linked-row">
            <div className="ec-linked-meta">
              <div className="ec-linked-name">{p.name}</div>
              <div className="ec-linked-sub mono">{p.stage} · {p.progress}% · updated {p.updated}</div>
            </div>
            {due && <span className={'chip tone-' + (due.tone === 'default' ? '' : due.tone)} style={{ fontSize: 10.5 }}>{due.label}</span>}
          </div>
        );
      })}
    </div>
  );
}

// ===== Editable form sections (used by all variants) =====
interface FormProps {
  form: any;
  update: (path: string, val: any) => void;
}

function DetailsForm({ form, update }: FormProps) {
  return (
    <div className="ec-section-body">
      <EcField label="Business name">
        <input className="ec-input" value={form.name || ''} onChange={(e) => update('name', e.target.value)} />
      </EcField>
      <EcField label="Contact name">
        <input className="ec-input" value={form.contact || ''} onChange={(e) => update('contact', e.target.value)} />
      </EcField>
      <div className="ec-row-2">
        <EcField label="Email">
          <input className="ec-input" type="email" value={form.email || ''} onChange={(e) => update('email', e.target.value)} />
        </EcField>
        <EcField label="Phone">
          <input className="ec-input mono" type="tel" value={form.phone || ''} onChange={(e) => update('phone', e.target.value)} />
        </EcField>
      </div>
      <EcField label="Address" hint="Where they're based">
        <input className="ec-input" value={form.address || ''} onChange={(e) => update('address', e.target.value)} />
      </EcField>
      <EcField label="Notes">
        <textarea className="ec-input ec-textarea" rows={3} value={form.notes || ''} onChange={(e) => update('notes', e.target.value)} />
      </EcField>
    </div>
  );
}

function BillingForm({ form, update }: FormProps) {
  const billing = form.billing || {};
  return (
    <div className="ec-section-body">
      <div className="ec-row-2">
        <EcField label="Preferred method">
          <select className="ec-input" value={billing.method || 'ACH'} onChange={(e) => update('billing.method', e.target.value)}>
            {BILLING_METHODS.map(m => <option key={m}>{m}</option>)}
          </select>
        </EcField>
        <EcField label="Hourly rate" hint="USD">
          <div className="ec-input-prefix">
            <span>$</span>
            <input
              className="ec-input mono"
              value={billing.rate !== undefined ? billing.rate : ''}
              onChange={(e) => update('billing.rate', parseInt(e.target.value, 10) || 0)}
              inputMode="numeric"
            />
            <span className="ec-input-suffix mono">/ hr</span>
          </div>
        </EcField>
      </div>
      <EcField label="Payment terms">
        <div className="ec-chip-row">
          {TERMS.map(t => (
            <button
              key={t}
              type="button"
              className={'ec-chip-btn' + (billing.terms === t ? ' is-active' : '')}
              onClick={() => update('billing.terms', t)}
            >
              {t}
            </button>
          ))}
        </div>
      </EcField>
    </div>
  );
}

function StatusSection({ form, update }: FormProps) {
  return (
    <div className="ec-section-body">
      <EcField label="Relationship status">
        <StatusPicker value={form.status || 'active'} onChange={(v) => update('status', v)} />
      </EcField>
    </div>
  );
}

// ===== Header (avatar + name + status pill, shared by variants) =====
interface PanelHeaderProps {
  form: any;
  onClose: () => void;
}

function PanelHeader({ form, onClose }: PanelHeaderProps) {
  const meta = STATUS_META[form.status] || STATUS_META.active;
  return (
    <div className="ec-head">
      <div className="ec-head-main">
        <div className="avatar ec-avatar">{getInitials(form.name)}</div>
        <div className="ec-head-meta">
          <div className="ec-head-eyebrow mono">Edit client</div>
          <h2 className="ec-head-title">{form.name || 'Untitled client'}</h2>
          <div className="ec-head-sub">
            <span className={'chip chip-dot tone-' + meta.tone} style={{ fontSize: 10.5 }}>
              <span className="chip-dot-pip" style={{ background: meta.dot }} />
              {meta.label}
            </span>
            <span className="mono ec-head-since">since {form.since || 'Now'}</span>
          </div>
        </div>
      </div>
      <button className="icon-btn" onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
        <Icon d={Icons.x} size={18} />
      </button>
    </div>
  );
}

// ===== VARIANT A — stacked sections =====
interface VariantBodyProps {
  form: any;
  update: (path: string, val: any) => void;
  clientId: string;
  projects: Project[];
  activities: Activity[];
  onAddActivity: (act: Partial<Activity>) => Promise<any>;
  tasks: Task[];
  onAddTask: (tk: Partial<Task>) => Promise<any>;
  onCompleteTask: (id: string, updates?: Partial<Task>) => any;
}

function StackedBody({ form, update, clientId, projects, activities, onAddActivity, tasks, onAddTask, onCompleteTask }: VariantBodyProps) {
  return (
    <div className="ec-body">
      <section className="ec-section">
        <div className="ec-section-head">
          <h3 className="ec-section-title">Details</h3>
        </div>
        <DetailsForm form={form} update={update} />
      </section>

      <section className="ec-section">
        <div className="ec-section-head">
          <h3 className="ec-section-title">Status</h3>
        </div>
        <StatusSection form={form} update={update} />
      </section>

      <section className="ec-section">
        <div className="ec-section-head">
          <h3 className="ec-section-title">Billing</h3>
        </div>
        <BillingForm form={form} update={update} />
      </section>

      <section className="ec-section">
        <div className="ec-section-head">
          <h3 className="ec-section-title">Linked projects</h3>
          <span className="ec-section-meta mono">read only</span>
        </div>
        <div className="ec-section-body"><LinkedProjects clientId={clientId} projects={projects} /></div>
      </section>

      <section className="ec-section">
        <div className="ec-section-head">
          <h3 className="ec-section-title">Activity & Tasks</h3>
        </div>
        <div className="ec-section-body">
          <ActivityTaskPanel 
            entityId={clientId} 
            entityName={form.name} 
            entityType="client"
            activities={activities} 
            onAddActivity={onAddActivity}
            tasks={tasks} 
            onAddTask={onAddTask} 
            onCompleteTask={onCompleteTask} 
          />
        </div>
      </section>
    </div>
  );
}

// ===== VARIANT B — tabbed =====
function TabbedBody({ form, update, clientId, projects, activities, onAddActivity, tasks, onAddTask, onCompleteTask }: VariantBodyProps) {
  const [tab, setTab] = useState('details');
  const actCount = useMemo(() => {
    return activities.filter(a => a.linkedId === clientId).length
         + tasks.filter(t => t.linkedId === clientId && !t.done).length;
  }, [activities, tasks, clientId]);
  
  const tabs = [
    { id: 'details',  label: 'Details' },
    { id: 'billing',  label: 'Billing' },
    { id: 'projects', label: 'Projects', count: projects.filter(p => p.client === clientId).length },
    { id: 'activity', label: 'Activity', count: actCount },
  ];
  
  return (
    <div className="ec-body ec-body-tabs">
      <div className="ec-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--line)', gap: '16px', padding: '0 24px', background: 'var(--surface-2)' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            className={'ec-tab' + (tab === t.id ? ' is-active' : '')}
            onClick={() => setTab(t.id)}
            style={{
              padding: '12px 4px',
              fontSize: '13px',
              fontWeight: tab === t.id ? 600 : 500,
              color: tab === t.id ? 'var(--ink)' : 'var(--ink-3)',
              borderBottom: tab === t.id ? '2px solid var(--ink)' : '2px solid transparent',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && <span className="ec-tab-count mono" style={{ fontSize: '10px', background: 'var(--line-soft)', padding: '2px 6px', borderRadius: '10px' }}>{t.count}</span>}
          </button>
        ))}
      </div>
      <div className="ec-tab-panel" style={{ padding: '24px' }}>
        {tab === 'details' && (
          <>
            <DetailsForm form={form} update={update} />
            <div className="ec-section ec-section-bordered" style={{ borderTop: '1px solid var(--line)', marginTop: '24px', paddingTop: '24px' }}>
              <div className="ec-section-head"><h3 className="ec-section-title">Status</h3></div>
              <StatusSection form={form} update={update} />
            </div>
          </>
        )}
        {tab === 'billing'  && <BillingForm  form={form} update={update} />}
        {tab === 'projects' && <div className="ec-section-body"><LinkedProjects clientId={clientId} projects={projects} /></div>}
        {tab === 'activity' && (
          <div className="ec-section-body">
            <ActivityTaskPanel 
              entityId={clientId} 
              entityName={form.name} 
              entityType="client"
              activities={activities} 
              onAddActivity={onAddActivity}
              tasks={tasks} 
              onAddTask={onAddTask} 
              onCompleteTask={onCompleteTask} 
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ===== VARIANT C — two-column rail =====
function RailBody({ form, update, clientId, projects, activities, onAddActivity, tasks, onAddTask, onCompleteTask }: VariantBodyProps) {
  return (
    <div className="ec-body ec-body-rail" style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '24px', height: '100%', overflow: 'hidden' }}>
      <div className="ec-rail-form" style={{ overflowY: 'auto', padding: '24px' }}>
        <section className="ec-section" style={{ marginBottom: '24px' }}>
          <div className="ec-section-head" style={{ marginBottom: '12px' }}><h3 className="ec-section-title">Details</h3></div>
          <DetailsForm form={form} update={update} />
        </section>
        <section className="ec-section" style={{ marginBottom: '24px', borderTop: '1px solid var(--line)', paddingTop: '24px' }}>
          <div className="ec-section-head" style={{ marginBottom: '12px' }}><h3 className="ec-section-title">Billing</h3></div>
          <BillingForm form={form} update={update} />
        </section>
        <section className="ec-section" style={{ borderTop: '1px solid var(--line)', paddingTop: '24px' }}>
          <div className="ec-section-head" style={{ marginBottom: '12px' }}><h3 className="ec-section-title">Status</h3></div>
          <StatusSection form={form} update={update} />
        </section>
      </div>
      <aside className="ec-rail-side" style={{ overflowY: 'auto', borderLeft: '1px solid var(--line)', padding: '24px', background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="ec-rail-card" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: '16px' }}>
          <div className="ec-rail-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 className="ec-rail-card-title" style={{ fontSize: '13px', fontWeight: 600 }}>Linked projects</h4>
            <span className="mono ec-section-meta" style={{ fontSize: '11px', background: 'var(--line-soft)', padding: '2px 6px', borderRadius: '10px' }}>
              {projects.filter(p => p.client === clientId).length}
            </span>
          </div>
          <LinkedProjects clientId={clientId} projects={projects} />
        </div>
        <div className="ec-rail-card" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: '16px' }}>
          <div className="ec-rail-card-head" style={{ marginBottom: '12px' }}>
            <h4 className="ec-rail-card-title" style={{ fontSize: '13px', fontWeight: 600 }}>Activity & Tasks</h4>
          </div>
          <ActivityTaskPanel 
            entityId={clientId} 
            entityName={form.name} 
            entityType="client"
            activities={activities} 
            onAddActivity={onAddActivity}
            tasks={tasks} 
            onAddTask={onAddTask} 
            onCompleteTask={onCompleteTask} 
          />
        </div>
      </aside>
    </div>
  );
}

// ===== Edit Client Slide-Over Panel =====
interface EditClientPanelProps {
  open: boolean;
  client: Client | null;
  onClose: () => void;
  onSave: (form: Client) => Promise<any>;
  onArchive?: (form: Client) => Promise<any>;
  onDelete?: (form: Client) => Promise<any>;
  variant?: 'stacked' | 'tabbed' | 'rail';
  projects: Project[];
  activities: Activity[];
  onAddActivity: (act: Partial<Activity>) => Promise<any>;
  tasks: Task[];
  onAddTask: (tk: Partial<Task>) => Promise<any>;
  onCompleteTask: (id: string, updates?: Partial<Task>) => any;
}

export function EditClientPanel({ 
  open, 
  client, 
  onClose, 
  onSave, 
  onArchive, 
  onDelete, 
  variant = 'stacked', 
  projects,
  activities, 
  onAddActivity, 
  tasks, 
  onAddTask, 
  onCompleteTask 
}: EditClientPanelProps) {
  const [form, setForm] = useState<any>(null);
  const [confirm, setConfirm] = useState<'archive' | 'delete' | null>(null);

  useEffect(() => {
    if (client) {
      setForm({
        ...client,
        billing: { ...(client.billing || { method: 'ACH', rate: 100, terms: 'Net 15' }) },
      });
    } else {
      setForm(null);
    }
  }, [client]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!form) {
    return (
      <>
        <div className={'lead-panel-scrim' + (open ? ' is-open' : '')} onClick={onClose} />
        <div className={'edit-client-panel ec-variant-' + variant + (open ? ' is-open' : '')} />
      </>
    );
  }

  const update = (path: string, val: any) => {
    setForm((f: any) => {
      if (path.includes('.')) {
        const [a, b] = path.split('.');
        return { ...f, [a]: { ...f[a], [b]: val } };
      }
      return { ...f, [path]: val };
    });
  };

  const actProps = { 
    clientId: client?.id || '', 
    projects,
    activities, 
    onAddActivity, 
    tasks, 
    onAddTask, 
    onCompleteTask 
  };
  
  let body;
  if (variant === 'tabbed')      body = <TabbedBody form={form} update={update} {...actProps} />;
  else if (variant === 'rail')   body = <RailBody  form={form} update={update} {...actProps} />;
  else                            body = <StackedBody form={form} update={update} {...actProps} />;

  return (
    <>
      <div
        className={'lead-panel-scrim' + (open ? ' is-open' : '')}
        onClick={onClose}
        style={{ zIndex: 190 }}
      />
      <div 
        className={'edit-client-panel ec-variant-' + variant + (open ? ' is-open' : '')} 
        role="dialog"
        style={{ zIndex: 200 }}
      >
        <PanelHeader form={form} onClose={onClose} />
        <div style={{ flex: 1, overflowY: variant === 'rail' ? 'hidden' : 'auto' }}>
          {body}
        </div>
        <div className="ec-foot" style={{ borderTop: '1px solid var(--line)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)' }}>
          <div className="ec-foot-left" style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setConfirm('archive')}>
              <Icon d={['M21 8v13H3V8 M1 3h22v5H1z M10 12h4']} size={13} />
              {form.status === 'archived' ? 'Unarchive' : 'Archive'}
            </button>
            {onDelete && (
              <button className="btn btn-ghost btn-sm ec-btn-danger" type="button" onClick={() => setConfirm('delete')} style={{ color: 'var(--red)' }}>
                <Icon d={['M3 6h18 M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6 M10 11v6 M14 11v6 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2']} size={13} />
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-8" style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" type="button" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-lg" type="button" onClick={() => onSave(form)}>
              Save changes
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirm === 'archive'}
        title={form.status === 'archived' ? 'Unarchive this client?' : 'Archive this client?'}
        body={form.status === 'archived'
          ? "They'll be marked active again and show up in default views."
          : "They'll be hidden from the default view but kept in records. You can unarchive any time."}
        confirmLabel={form.status === 'archived' ? 'Unarchive' : 'Archive'}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const next = form.status === 'archived' ? 'active' : 'archived';
          update('status', next);
          if (onArchive) {
            onArchive({ ...form, status: next });
          } else {
            onSave({ ...form, status: next });
          }
          setConfirm(null);
        }}
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        title={'Delete ' + form.name + '?'}
        body="This will remove the client and unlink all their projects. This can't be undone."
        confirmLabel="Yes, delete"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => { onDelete && onDelete(form); setConfirm(null); }}
      />
    </>
  );
}

// ===== New Client Slide-Over Drawer =====
interface NewClientDrawerProps {
  open: boolean;
  onClose: () => void;
  onSave: (client: Partial<Client>) => Promise<any>;
}

export function NewClientDrawer({ open, onClose, onSave }: NewClientDrawerProps) {
  const [form, setForm] = useState({ 
    name: '', 
    contact: '', 
    email: '', 
    phone: '', 
    address: '',
    notes: '',
    billing: { method: 'ACH', rate: 100, terms: 'Net 15' }
  });

  const update = (k: string, v: any) => {
    setForm(f => {
      if (k.startsWith('billing.')) {
        const key = k.split('.')[1];
        return { ...f, billing: { ...f.billing, [key]: v } };
      }
      return { ...f, [k]: v };
    });
  };
  
  const reset = () => setForm({ 
    name: '', 
    contact: '', 
    email: '', 
    phone: '', 
    address: '',
    notes: '',
    billing: { method: 'ACH', rate: 100, terms: 'Net 15' }
  });

  return (
    <>
      <div 
        className={'drawer-overlay' + (open ? ' open' : '')} 
        onClick={onClose} 
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 210, opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity 0.2s ease' }}
      />
      <aside 
        className={'drawer' + (open ? ' open' : '')} 
        role="dialog" 
        aria-label="New client"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '460px',
          maxWidth: '100vw',
          background: 'var(--surface)',
          borderLeft: '1px solid var(--line)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.1)',
          zIndex: 220,
          display: 'flex',
          flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div className="drawer-head" style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="drawer-title" style={{ fontSize: '18px', fontWeight: 600 }}>New client</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <Icon d={Icons.x} size={16} />
          </button>
        </div>
        <div className="drawer-body" style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <div className="form-section" style={{ display: 'grid', gap: '16px' }}>
            <div className="field">
              <label className="field-label" style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-3)', marginBottom: '6px' }}>Business name</label>
              <input className="input" value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Pizzeria Romano" />
            </div>
            <div className="field">
              <label className="field-label" style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-3)', marginBottom: '6px' }}>Contact name</label>
              <input className="input" value={form.contact} onChange={e => update('contact', e.target.value)} placeholder="Marco Romano" />
            </div>
            <div className="field-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="field">
                <label className="field-label" style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-3)', marginBottom: '6px' }}>Email</label>
                <input className="input" type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="marco@…" />
              </div>
              <div className="field">
                <label className="field-label" style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-3)', marginBottom: '6px' }}>Phone</label>
                <input className="input" type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+1 (212) 555-…" />
              </div>
            </div>
            <div className="field">
              <label className="field-label" style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-3)', marginBottom: '6px' }}>Address</label>
              <input className="input" value={form.address} onChange={e => update('address', e.target.value)} placeholder="Where they're based" />
            </div>
            
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px', marginTop: '8px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Billing Settings</h4>
              <div className="field-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="field">
                  <label className="field-label" style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-3)', marginBottom: '6px' }}>Method</label>
                  <select className="select" value={form.billing.method} onChange={e => update('billing.method', e.target.value)}>
                    {BILLING_METHODS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label" style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-3)', marginBottom: '6px' }}>Rate ($ / hr)</label>
                  <input className="input" type="number" value={form.billing.rate} onChange={e => update('billing.rate', parseInt(e.target.value, 10) || 0)} placeholder="100" />
                </div>
              </div>
              <div className="field">
                <label className="field-label" style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-3)', marginBottom: '6px' }}>Payment Terms</label>
                <select className="select" value={form.billing.terms} onChange={e => update('billing.terms', e.target.value)}>
                  {TERMS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="field">
              <label className="field-label" style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-3)', marginBottom: '6px' }}>Notes</label>
              <textarea className="textarea" value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="How they found us, what they need…" rows={3} />
            </div>
          </div>
        </div>
        <div className="drawer-foot" style={{ padding: '16px 24px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'var(--surface)' }}>
          <button className="btn btn-secondary" onClick={() => { reset(); onClose(); }}>Cancel</button>
          <button className="btn btn-primary" disabled={!form.name} onClick={() => { onSave(form); reset(); }}>
            Save client
          </button>
        </div>
      </aside>
    </>
  );
}

// ===== Clients List Component =====
interface ClientsListProps {
  clients: Client[];
  projects: Project[];
  onOpen: (id: string) => void;
  onCreate: () => void;
}

export function ClientsList({ clients, projects, onOpen, onCreate }: ClientsListProps) {
  console.log('ClientsList projects:', projects);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' });

  const projectCount = (id: string) => {
    const count = projects.filter(p => p.client === id).length;
    console.log(`projectCount for client ${id}:`, count, 'matching from:', projects);
    return count;
  };
  
  const lastActivity = (id: string) => {
    const projs = projects.filter(p => p.client === id);
    if (!projs.length) return '—';
    return projs[0].updated;
  };

  const rows = useMemo(() => {
    let list = clients.filter(c => {
      if (!search) return true;
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.contact.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
    });

    list = [...list].sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1;
      if (sort.key === 'name')     return a.name.localeCompare(b.name) * dir;
      if (sort.key === 'contact')  return a.contact.localeCompare(b.contact) * dir;
      if (sort.key === 'projects') return (projectCount(a.id) - projectCount(b.id)) * dir;
      return 0;
    });
    
    return list;
  }, [clients, search, sort, projects]);

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

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clients</h1>
          <div className="page-subtitle">{rows.length} of {clients.length} · {clients.reduce((a, c) => a + projectCount(c.id), 0)} projects total</div>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-primary btn-lg" onClick={onCreate}>
            <Icon d={Icons.plus} size={16} /> New client
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-input">
          <Icon d={Icons.search} size={14} />
          <input placeholder="Search clients, contacts, emails…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* DESKTOP TABLE */}
      <div className="table-card hide-mobile">
        <table className="tbl">
          <thead>
            <tr>
              <SortHeader k="name">Client</SortHeader>
              <SortHeader k="contact">Contact</SortHeader>
              <SortHeader k="projects">Projects</SortHeader>
              <th>Last activity</th>
              <th>Phone</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(c => {
              const pc = projectCount(c.id);
              return (
                <tr key={c.id} onClick={() => onOpen(c.id)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div className="proj-name">
                      <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{getInitials(c.name)}</div>
                      <div>
                        <div className="proj-title">{c.name}</div>
                        <div className="proj-meta">{c.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{c.contact}</td>
                  <td>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{pc}</span>
                    <span className="mono muted" style={{ fontSize: 11, marginLeft: 4 }}>{pc === 1 ? 'project' : 'projects'}</span>
                  </td>
                  <td className="muted mono" style={{ fontSize: 11.5 }}>{lastActivity(c.id)}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{c.phone}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARDS */}
      <div className="proj-card-grid hide-desktop">
        {rows.map(c => {
          const pc = projectCount(c.id);
          return (
            <div key={c.id} className="proj-card" onClick={() => onOpen(c.id)} style={{ cursor: 'pointer' }}>
              <div className="proj-card-head" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div className="avatar" style={{ width: 36, height: 36, fontSize: 13 }}>{getInitials(c.name)}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="proj-title" style={{ fontSize: 14 }}>{c.name}</div>
                  <div className="proj-meta">{c.contact}</div>
                </div>
              </div>
              <div className="proj-card-foot" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--line-soft)' }}>
                <span className="mono" style={{ fontSize: 11.5 }}>{pc} {pc === 1 ? 'project' : 'projects'}</span>
                <span className="mono muted" style={{ fontSize: 11 }}>{lastActivity(c.id)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {rows.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-3)' }}>
          No clients match your filters.
        </div>
      )}
    </div>
  );
}

// ===== Default Export Component (Wrapper) =====
interface ClientsWrapperProps {
  clients: Client[];
  projects: Project[];
  activities: Activity[];
  tasks: Task[];
  onAddClient: (client: Partial<Client>) => Promise<any>;
  onUpdateClient: (id: string, updates: Partial<Client>) => Promise<any>;
  onDeleteClient?: (id: string) => Promise<any>;
  onAddActivity: (act: Partial<Activity>) => Promise<any>;
  onAddTask: (tk: Partial<Task>) => Promise<any>;
  onCompleteTask: (id: string, updates?: Partial<Task>) => any;
  editClientVariant?: 'stacked' | 'tabbed' | 'rail';
}

export default function Clients({
  clients,
  projects,
  activities,
  tasks,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  onAddActivity,
  onAddTask,
  onCompleteTask,
  editClientVariant = 'stacked'
}: ClientsWrapperProps) {
  const [editClientId, setEditClientId] = useState<string | null>(null);
  const [newClientOpen, setNewClientOpen] = useState(false);

  const selectedClient = useMemo(() => {
    return clients.find(c => c.id === editClientId) || null;
  }, [clients, editClientId]);

  const handleSaveClient = async (form: Client) => {
    await onUpdateClient(form.id, form);
    setEditClientId(null);
  };

  const handleAddClient = async (form: Partial<Client>) => {
    await onAddClient(form);
    setNewClientOpen(false);
  };

  const handleDeleteClient = async (form: Client) => {
    if (onDeleteClient) {
      await onDeleteClient(form.id);
    }
    setEditClientId(null);
  };

  return (
    <>
      <ClientsList
        clients={clients}
        projects={projects}
        onOpen={(id) => setEditClientId(id)}
        onCreate={() => setNewClientOpen(true)}
      />

      <EditClientPanel
        open={!!selectedClient}
        client={selectedClient}
        variant={editClientVariant}
        onClose={() => setEditClientId(null)}
        onSave={handleSaveClient}
        onDelete={onDeleteClient ? handleDeleteClient : undefined}
        projects={projects}
        activities={activities}
        onAddActivity={onAddActivity}
        tasks={tasks}
        onAddTask={onAddTask}
        onCompleteTask={onCompleteTask}
      />

      <NewClientDrawer
        open={newClientOpen}
        onClose={() => setNewClientOpen(false)}
        onSave={handleAddClient}
      />
    </>
  );
}
