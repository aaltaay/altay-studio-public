import { useState, useMemo, useRef, useEffect } from 'react';
import { Icon, Icons } from './Navigation';
import { InvoiceDrawer } from './Invoices';
import type { Invoice, Client } from '../hooks/useCRM';
import { supabase } from '@/lib/supabase';

const SCHEMA = import.meta.env.VITE_DB_SCHEMA || 'public';
const db = () => supabase.schema(SCHEMA);

// ── Helpers ────────────────────────────────────────────────────────────────────

const INVOICE_STATUSES = ['Draft', 'Sent', 'Paid', 'Overdue'];
const STATUS_TONES: Record<string, string> = { Draft: 'blue', Sent: 'amber', Paid: 'green', Overdue: 'red', Pending: 'amber' };

function formatAmount(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0 });
}

// ── Interfaces ─────────────────────────────────────────────────────────────────

interface InvoicesPageProps {
  invoices: Invoice[];
  clients: Client[];
  onAddInvoice: (inv: Partial<Invoice>) => Promise<any>;
  onUpdateInvoice: (id: string, updates: Partial<Invoice>) => Promise<any>;
}

// ── Client Picker Modal ────────────────────────────────────────────────────────

function ClientPickerModal({
  clients,
  open,
  onPick,
  onClose,
}: {
  clients: Client[];
  open: boolean;
  onPick: (clientId: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!q.trim()) return clients;
    const lower = q.toLowerCase();
    return clients.filter(
      c => c.name.toLowerCase().includes(lower) || c.contact.toLowerCase().includes(lower) || c.email.toLowerCase().includes(lower),
    );
  }, [clients, q]);

  if (!open) return null;

  return (
    <>
      {/* Scrim */}
      <div
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(26,22,18,0.45)',
          zIndex: 270,
          backdropFilter: 'blur(2px)',
        }}
        onClick={onClose}
      />
      {/* Dialog */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 280,
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-xl)',
        width: 440,
        maxHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 14px',
          borderBottom: '1px solid var(--line-soft)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Select a client</h3>
            <button
              className="btn btn-ghost btn-sm"
              onClick={onClose}
              aria-label="Close"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <Icon d={Icons.x} size={14} />
            </button>
          </div>
          <div className="search-input" style={{ position: 'relative' }}>
            <Icon d={Icons.search} size={14} />
            <input
              ref={inputRef}
              placeholder="Search clients…"
              value={q}
              onChange={e => setQ(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Client list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
              No clients found.
            </div>
          ) : (
            filtered.map(c => (
              <button
                key={c.id}
                onClick={() => onPick(c.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: '10px 24px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <div
                  style={{
                    width: 34, height: 34,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {getInitials(c.name)}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink)' }}>{c.name}</div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{c.contact || c.email}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function getInitials(name: string) {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Main Page Component ────────────────────────────────────────────────────────

export default function InvoicesPage({
  invoices,
  clients,
  onAddInvoice,
  onUpdateInvoice,
}: InvoicesPageProps) {

  const [filterStatus, setFilterStatus] = useState('All');
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [editInvoice, setEditInvoice]   = useState<Invoice | null>(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [pickerOpen, setPickerOpen]     = useState(false);

  // ── Summaries ──────────────────────────────────────────────────────────────

  const totalInvoiced = useMemo(() => invoices.reduce((s, i) => s + (i.amount || 0), 0), [invoices]);
  const totalPaid = useMemo(() => invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + (i.amount || 0), 0), [invoices]);
  const totalOutstanding = useMemo(() => invoices.filter(i => i.status !== 'Paid').reduce((s, i) => s + (i.amount || 0), 0), [invoices]);

  // ── Client lookup map ──────────────────────────────────────────────────────

  const clientMap = useMemo(() => {
    const m: Record<string, Client> = {};
    clients.forEach(c => { m[c.id] = c; });
    return m;
  }, [clients]);

  // ── Filtered invoices ──────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return filterStatus === 'All' ? invoices : invoices.filter(i => i.status === filterStatus);
  }, [invoices, filterStatus]);

  // ── Actions ────────────────────────────────────────────────────────────────

  function openCreate() {
    setEditInvoice(null);
    setSelectedClientId('');
    setPickerOpen(true);
  }

  function handleClientPick(clientId: string) {
    setSelectedClientId(clientId);
    setPickerOpen(false);
    setEditInvoice(null);
    setDrawerOpen(true);
  }

  function openEdit(inv: Invoice) {
    setEditInvoice(inv);
    setSelectedClientId(inv.client_id);
    setDrawerOpen(true);
  }

  async function handleSave(invPayload: any) {
    if (invPayload.id) {
      await onUpdateInvoice(invPayload.id, {
        client_id: invPayload.client_id,
        amount: invPayload.amount,
        status: invPayload.status,
      });
    } else {
      await onAddInvoice({
        client_id: invPayload.client_id,
        amount: invPayload.amount,
        status: invPayload.status,
      });
    }
    setDrawerOpen(false);
  }

  async function markPaid(invId: string) {
    await onUpdateInvoice(invId, { status: 'Paid' });
  }

  async function deleteInvoice(invId: string) {
    await db().from('invoices').delete().eq('id', invId);
    window.location.reload();
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="page">
      {/* Page header */}
      <div className="page-header">
        <div>
          <div className="mono muted" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            Invoices
          </div>
          <h1 className="page-title">Invoices</h1>
          <div className="page-subtitle">Create and manage invoices across all clients.</div>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-primary btn-lg" onClick={openCreate}>
            <Icon d={Icons.plus} size={16} /> New invoice
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--line)',
        background: 'var(--surface-2)',
        flexShrink: 0,
      }}>
        {[
          { label: 'Total Invoiced', val: formatAmount(totalInvoiced), color: 'var(--ink)' },
          { label: 'Paid',           val: formatAmount(totalPaid),     color: 'var(--green)' },
          { label: 'Outstanding',    val: formatAmount(totalOutstanding), color: totalOutstanding > 0 ? 'var(--amber)' : 'var(--ink-3)' },
          { label: 'Count',          val: String(invoices.length),     color: 'var(--ink)' },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1,
            padding: '12px 20px',
            borderRight: i < 3 ? '1px solid var(--line)' : 'none',
          }}>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>{s.label}</div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex', gap: 6, padding: '10px 20px',
        borderBottom: '1px solid var(--line-soft)',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        {['All', ...INVOICE_STATUSES].map(s => (
          <button
            key={s}
            className={'btn btn-sm' + (filterStatus === s ? ' btn-primary' : ' btn-ghost')}
            style={{ minHeight: 28, padding: '3px 10px' }}
            onClick={() => setFilterStatus(s)}
          >
            {s}
            {s !== 'All' && (
              <span style={{
                marginLeft: 4,
                fontFamily: 'var(--mono)',
                fontSize: 10,
                opacity: 0.7,
              }}>
                {invoices.filter(i => i.status === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Invoice table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', gap: 12 }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--ink-4)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <div style={{ color: 'var(--ink-3)', fontSize: 14 }}>
              {filterStatus === 'All' ? 'No invoices yet — create your first one.' : `No ${filterStatus.toLowerCase()} invoices.`}
            </div>
            {filterStatus === 'All' && (
              <button className="btn btn-primary btn-sm" onClick={openCreate}>
                <Icon d={Icons.plus} size={12} /> Create invoice
              </button>
            )}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                {[
                  { h: 'ID',      align: 'left' },
                  { h: 'Client',  align: 'left' },
                  { h: 'Amount',  align: 'center' },
                  { h: 'Status',  align: 'center' },
                  { h: 'Created', align: 'center' },
                  { h: '',        align: 'right' },
                ].map((col, i) => (
                  <th key={i} style={{
                    textAlign: col.align as any,
                    padding: '8px 16px',
                    fontFamily: 'var(--mono)',
                    fontSize: 10,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--ink-4)',
                    fontWeight: 500,
                    borderBottom: '1px solid var(--line)',
                    whiteSpace: 'nowrap',
                  }}>{col.h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => {
                const tone = STATUS_TONES[inv.status] || 'blue';
                const client = clientMap[inv.client_id];
                return (
                  <tr
                    key={inv.id}
                    style={{ borderBottom: '1px solid var(--line-soft)', transition: 'background 0.12s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    {/* ID */}
                    <td style={{ padding: '10px 16px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>
                      INV-{inv.id.substring(0, 4).toUpperCase()}
                    </td>
                    {/* Client */}
                    <td style={{ padding: '10px 16px', fontSize: 13, maxWidth: 260 }}>
                      <div style={{ fontWeight: 500 }}>{client ? client.name : 'Unknown client'}</div>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 2 }}>
                        {client ? (client.contact || client.email) : '—'}
                      </div>
                    </td>
                    {/* Amount */}
                    <td style={{ padding: '10px 16px', fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {formatAmount(inv.amount || 0)}
                    </td>
                    {/* Status */}
                    <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                      <span className={'chip chip-dot tone-' + tone} style={{ fontSize: 11 }}>{inv.status}</span>
                    </td>
                    {/* Created */}
                    <td style={{ padding: '10px 16px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {new Date(inv.created_at).toLocaleDateString()}
                    </td>
                    {/* Actions */}
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', alignItems: 'center' }}>
                        {inv.status !== 'Paid' && (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 11, color: 'var(--green)' }}
                            onClick={() => markPaid(inv.id)}
                          >
                            Mark paid
                          </button>
                        )}
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 11 }}
                          onClick={() => openEdit(inv)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 11, color: 'var(--red)' }}
                          onClick={() => deleteInvoice(inv.id)}
                        >
                          <Icon d={['M6 6l8 8M14 6l-8 8']} size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Client picker modal */}
      <ClientPickerModal
        clients={clients}
        open={pickerOpen}
        onPick={handleClientPick}
        onClose={() => setPickerOpen(false)}
      />

      {/* Invoice drawer */}
      <InvoiceDrawer
        isOpen={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditInvoice(null); }}
        onSave={handleSave}
        invoice={editInvoice}
        projectName={undefined}
        clientId={selectedClientId}
        prefillTasks={null}
      />
    </div>
  );
}
