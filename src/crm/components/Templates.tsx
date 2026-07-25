import React, { useState } from 'react';
import { Icon, Icons } from './Navigation';
import type { ProjectTemplate } from '../hooks/useCRM';

const AVAILABLE_PAGES = [
  'Home Page', 'About Us', 'Contact', 'Services', 'Portfolio', 'Gallery',
  'Menu', 'Reservations', 'Booking', 'Quote Form', 'Past Work', 'Team',
  'Testimonials', 'FAQ', 'Blog', 'Pricing', 'Calendar', 'Dashboard',
  'Analytics', 'CRM System'
];

interface TemplatesProps {
  templates: ProjectTemplate[];
  onAdd: (template: Partial<ProjectTemplate>) => Promise<any>;
  onUpdate: (id: string, updates: Partial<ProjectTemplate>) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
}

// ---- Field label style (shared) ----
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11.5px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--ink-3)',
  marginBottom: '6px',
};

// ===== Delete Confirmation Modal =====
interface DeleteModalProps {
  open: boolean;
  templateName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

function DeleteModal({ open, templateName, onCancel, onConfirm }: DeleteModalProps) {
  if (!open) return null;
  return (
    <>
      <div
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(26,22,18,0.45)',
          zIndex: 270,
          backdropFilter: 'blur(2px)',
        }}
        onClick={onCancel}
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
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--red)' }}>Delete template</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 1 }}>This cannot be undone.</div>
          </div>
        </div>

        <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: '12px 0 20px', lineHeight: 1.5 }}>
          Are you sure you want to delete <strong style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{templateName}</strong>? This will permanently remove the template.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button
            className="btn"
            style={{ background: 'var(--red)', color: '#fff', border: 'none' }}
            onClick={onConfirm}
          >
            Yes, delete it
          </button>
        </div>
      </div>
    </>
  );
}

// ===== Create / Edit Drawer =====
interface DrawerProps {
  open: boolean;
  editing: ProjectTemplate | null;
  onClose: () => void;
  onSave: (data: Partial<ProjectTemplate>) => void;
}

function TemplateDrawer({ open, editing, onClose, onSave }: DrawerProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pages, setPages] = useState<string[]>([]);
  const [customPage, setCustomPage] = useState('');

  // Sync form when editing changes
  React.useEffect(() => {
    if (editing) {
      setName(editing.name);
      setDescription(editing.description);
      setPages([...editing.pages]);
    } else {
      setName('');
      setDescription('');
      setPages([]);
    }
    setCustomPage('');
  }, [editing, open]);

  // Escape key to close
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const togglePage = (page: string) => {
    setPages(prev =>
      prev.includes(page) ? prev.filter(p => p !== page) : [...prev, page]
    );
  };

  const addCustomPage = () => {
    const trimmed = customPage.trim();
    if (!trimmed || pages.includes(trimmed)) return;
    setPages(prev => [...prev, trimmed]);
    setCustomPage('');
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim(), pages });
    onClose();
  };

  // All pages to display in the picker (AVAILABLE_PAGES + any custom pages already in the template)
  const allPickerPages = React.useMemo(() => {
    const extras = pages.filter(p => !AVAILABLE_PAGES.includes(p));
    return [...AVAILABLE_PAGES, ...extras];
  }, [pages]);

  return (
    <>
      <div
        className={'drawer-overlay' + (open ? ' open' : '')}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.3)',
          zIndex: 210,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.2s ease',
        }}
      />
      <aside
        className={'drawer' + (open ? ' open' : '')}
        role="dialog"
        aria-label={editing ? 'Edit template' : 'New template'}
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
          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div className="drawer-head" style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="drawer-title" style={{ fontSize: '18px', fontWeight: 600 }}>
            {editing ? 'Edit template' : 'New template'}
          </h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <Icon d={Icons.x} size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="drawer-body" style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <div className="form-section" style={{ display: 'grid', gap: '20px' }}>
            {/* Template name */}
            <div className="field">
              <label className="field-label" style={labelStyle}>Template name</label>
              <input
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Restaurant Starter"
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="field">
              <label className="field-label" style={labelStyle}>Description</label>
              <textarea
                className="textarea"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What is this template used for?"
                rows={3}
              />
            </div>

            {/* Pages section */}
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: '20px' }}>
              <label className="field-label" style={{ ...labelStyle, marginBottom: '12px' }}>
                Pages
                <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--ink-4)', marginLeft: 8 }}>
                  {pages.length} selected
                </span>
              </label>

              {/* Page picker grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                marginBottom: '16px',
              }}>
                {allPickerPages.map(page => {
                  const selected = pages.includes(page);
                  const isCustom = !AVAILABLE_PAGES.includes(page);
                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => togglePage(page)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 12px',
                        background: selected ? 'var(--accent)' : 'var(--surface)',
                        color: selected ? '#fff' : 'var(--ink)',
                        border: selected ? '1.5px solid var(--accent)' : '1px solid var(--line)',
                        borderRadius: 'var(--r-md)',
                        cursor: 'pointer',
                        fontSize: '12.5px',
                        fontWeight: selected ? 600 : 500,
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {/* Checkbox indicator */}
                      <span style={{
                        width: 16,
                        height: 16,
                        borderRadius: '4px',
                        border: selected ? '1.5px solid rgba(255,255,255,0.5)' : '1.5px solid var(--line)',
                        background: selected ? 'rgba(255,255,255,0.2)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: 10,
                      }}>
                        {selected && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </span>
                      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {page}
                        {isCustom && <span style={{ opacity: 0.6, marginLeft: 4, fontSize: 10 }}>✦</span>}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Custom page input */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  className="input"
                  value={customPage}
                  onChange={e => setCustomPage(e.target.value)}
                  placeholder="Custom page name…"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomPage(); } }}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn-secondary btn-sm"
                  type="button"
                  onClick={addCustomPage}
                  disabled={!customPage.trim()}
                  style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                >
                  <Icon d={Icons.plus} size={13} /> Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="drawer-foot" style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--line)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          background: 'var(--surface)',
        }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!name.trim()} onClick={handleSave}>
            {editing ? 'Save changes' : 'Create template'}
          </button>
        </div>
      </aside>
    </>
  );
}

// ===== Main Templates Component =====
export default function Templates({ templates, onAdd, onUpdate, onDelete }: TemplatesProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectTemplate | null>(null);

  const openNew = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (t: ProjectTemplate) => {
    setEditing(t);
    setDrawerOpen(true);
  };

  const handleSave = async (data: Partial<ProjectTemplate>) => {
    if (editing) {
      await onUpdate(editing.id, data);
    } else {
      await onAdd(data);
    }
    setDrawerOpen(false);
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await onDelete(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="page">
      {/* Page header */}
      <div className="page-header">
        <div>
          <div className="mono muted" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            Templates
          </div>
          <h1 className="page-title">Project Templates</h1>
          <div className="page-subtitle">Manage reusable page sets for new projects.</div>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-primary btn-lg" onClick={openNew}>
            <Icon d={Icons.plus} size={16} /> New template
          </button>
        </div>
      </div>

      {/* Template cards grid */}
      {templates.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 24px',
          textAlign: 'center',
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--surface-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ink-4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No templates yet</h3>
          <p className="muted" style={{ fontSize: 13, maxWidth: 340, lineHeight: 1.5, marginBottom: 20 }}>
            Create a template to define reusable page sets. Templates speed up project creation by pre-selecting the pages you need.
          </p>
          <button className="btn btn-primary" onClick={openNew}>
            <Icon d={Icons.plus} size={14} /> Create your first template
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '16px',
          marginTop: '8px',
        }}>
          {templates.map(t => (
            <div
              key={t.id}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-lg)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                cursor: 'default',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--line)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              {/* Card header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, lineHeight: 1.3 }}>{t.name}</h3>
                  {t.description && (
                    <p className="muted" style={{
                      fontSize: 12.5,
                      margin: '4px 0 0',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {t.description}
                    </p>
                  )}
                </div>
                <span className="chip" style={{ flexShrink: 0, fontSize: 11 }}>
                  {t.pages.length} {t.pages.length === 1 ? 'page' : 'pages'}
                </span>
              </div>

              {/* Page chips */}
              {t.pages.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                }}>
                  {t.pages.slice(0, 8).map(page => (
                    <span
                      key={page}
                      style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: 500,
                        background: 'var(--surface-2)',
                        border: '1px solid var(--line)',
                        borderRadius: 'var(--r-md)',
                        color: 'var(--ink-2)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {page}
                    </span>
                  ))}
                  {t.pages.length > 8 && (
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 8px',
                      fontSize: '11px',
                      fontWeight: 500,
                      color: 'var(--ink-4)',
                      whiteSpace: 'nowrap',
                    }}>
                      +{t.pages.length - 8} more
                    </span>
                  )}
                </div>
              )}

              {/* Card footer */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid var(--line)',
                paddingTop: '12px',
                marginTop: 'auto',
              }}>
                <span className="mono muted" style={{ fontSize: 11 }}>
                  {t.created_at ? new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => openEdit(t)}
                    aria-label="Edit template"
                    style={{ padding: '6px 8px' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setDeleteTarget(t)}
                    aria-label="Delete template"
                    style={{ padding: '6px 8px', color: 'var(--red)' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drawer */}
      <TemplateDrawer
        open={drawerOpen}
        editing={editing}
        onClose={() => { setDrawerOpen(false); setEditing(null); }}
        onSave={handleSave}
      />

      {/* Delete confirmation */}
      <DeleteModal
        open={!!deleteTarget}
        templateName={deleteTarget?.name || ''}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
