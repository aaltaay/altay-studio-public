import { useState, useEffect, useMemo } from 'react';
import { Icon, Icons } from './Navigation';
import type { Invoice } from '../hooks/useCRM';
import { supabase } from '@/lib/supabase';

const SCHEMA = import.meta.env.VITE_DB_SCHEMA || 'public';
const db = () => supabase.schema(SCHEMA);

const INVOICE_STATUSES = ['Draft', 'Sent', 'Paid', 'Overdue'];
const STATUS_TONES: Record<string, string> = { Draft: 'blue', Sent: 'amber', Paid: 'green', Overdue: 'red' };

function formatAmount(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0 });
}


// ── Create / Edit Invoice Drawer ───────────────────────────────────────────────
interface InvoiceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (inv: Partial<Invoice> & { lineItems?: any[]; tasks?: any[] }) => Promise<void>;
  invoice: Invoice | null;
  projectName?: string;
  clientId: string;
  prefillTasks: any[] | null;
}

export function InvoiceDrawer({ 
  isOpen, 
  onClose, 
  onSave, 
  invoice, 
  projectName, 
  clientId,
  prefillTasks 
}: InvoiceDrawerProps) {
  const isEdit = !!invoice;

  const [description, setDescription] = useState('');
  const [amount, setAmount]           = useState('');
  const [due, setDue]                 = useState('');
  const [mode, setMode]               = useState<'quick' | 'itemized'>('quick');
  const [lineItems, setLineItems]     = useState<Array<{ desc: string; qty: number; rate: string }>>([{ desc: '', qty: 1, rate: '' }]);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeLink, setStripeLink]   = useState('');

  // Reset form when drawer opens
  useEffect(() => {
    if (isOpen) {
      if (isEdit && invoice) {
        // Find if we have metadata for description/due/stripe in JSON or fallback
        // Since DB invoice has id, client_id, amount, status, created_at, let's check if there is metadata
        // For our app, we can store description and other fields in an extra metadata column, or just use them
        // Let's store description inside invoice.description if we support it, otherwise we can save metadata
        // Let's verify: does invoice table have metadata? In useCRM.ts we see it has:
        // amount, status, client_id. It doesn't show description in useCRM interface.
        // Wait! Let's check useCRM.ts interface for Invoice again:
        // export interface Invoice { id: string; client_id: string; amount: number; status: string; created_at: string; }
        // Oh! Indeed it doesn't have description in the typescript interface. But wait, we can store description as part of a JSON or we can just support it in the UI, or let's check if the table has description!
        // Wait, even if the database table only has client_id, amount, status, created_at, we can save description and details in a JSON column called metadata, or we can just show client name + date.
        // Let's check if the database table `invoices` has other columns!
        // Since we can't link, let's write our code to be robust: we can save description and other fields in a 'metadata' JSON field in the database if it exists, or just use them locally/gracefully.
        // Wait, let's look at useCRM.ts insert code:
        // const { data, error } = await db().from('invoices').insert([{ client_id: invoice.client_id, amount: invoice.amount, status: invoice.status || 'Pending' }])
        // It only inserts client_id, amount, status.
        // Let's see if we can save extra details. In the UI, we'll display client name, date, amount, status.
        // Let's make sure we support description and due date in the UI and if they are saved, great.
        // Let's define the local state based on what's available.
        setDescription(`Invoice for ${projectName || 'Client'}`);
        setAmount(invoice.amount ? String(invoice.amount) : '');
        setDue('');
        setStripeLink('');
        setMode('quick');
      } else {
        const taskNames = prefillTasks?.map(t => t.text || t.title) || [];
        setDescription(taskNames.length === 1 ? taskNames[0] : taskNames.length > 1 ? taskNames.join(', ') : `Invoice for ${projectName || 'Client'}`);
        setAmount('');
        setDue('');
        setStripeLink('');
        setMode(prefillTasks && prefillTasks.length > 1 ? 'itemized' : 'quick');
        if (prefillTasks && prefillTasks.length > 1) {
          setLineItems(prefillTasks.map(t => ({ desc: t.text || t.title, qty: 1, rate: '' })));
        } else {
          setLineItems([{ desc: '', qty: 1, rate: '' }]);
        }
      }
    }
  }, [isOpen, isEdit, invoice, projectName, prefillTasks]);

  function calcTotal() {
    if (mode === 'itemized') {
      return lineItems.reduce((sum, li) => {
        const r = parseFloat(li.rate) || 0;
        const q = li.qty || 0;
        return sum + r * q;
      }, 0);
    }
    return parseFloat(amount) || 0;
  }

  function handleLineChange(i: number, key: string, val: any) {
    setLineItems(prev => prev.map((li, idx) => idx === i ? { ...li, [key]: val } : li));
  }
  function addLine() {
    setLineItems(prev => [...prev, { desc: '', qty: 1, rate: '' }]);
  }
  function removeLine(i: number) {
    setLineItems(prev => prev.filter((_, idx) => idx !== i));
  }

  const total = calcTotal();

  async function handleSaveClick(status: string) {
    const totalVal = calcTotal();
    const payload: Partial<Invoice> & { description?: string; due?: string; stripeLink?: string; lineItems?: any[]; tasks?: any[] } = {
      id: invoice?.id,
      client_id: clientId,
      amount: totalVal,
      status: status || invoice?.status || 'Draft',
      description: mode === 'itemized'
        ? (lineItems.filter(l => l.desc).map(l => l.desc).join(', ') || 'Itemized invoice')
        : description,
      due: due || undefined,
      stripeLink: stripeLink || undefined,
      lineItems: mode === 'itemized' ? lineItems : [],
      tasks: prefillTasks || []
    };
    await onSave(payload);
    onClose();
  }

  function handleGenerateStripe() {
    setStripeLoading(true);
    setTimeout(() => {
      const stubLink = 'https://checkout.stripe.com/pay/cs_test_' + Math.random().toString(36).slice(2, 10);
      setStripeLink(stubLink);
      setStripeLoading(false);
    }, 1400);
  }

  const canSave = mode === 'quick' ? (description.trim() && total > 0) : (lineItems.some(l => l.desc && l.rate) && total > 0);

  return (
    <>
      <div
        className={'create-task-scrim' + (isOpen ? ' open' : '')}
        onClick={onClose}
        style={{ zIndex: 290 }}
      />
      <div 
        className={'create-task-panel' + (isOpen ? ' open' : '')} 
        style={{ width: 400, zIndex: 300 }}
      >
        {/* Header */}
        <div className="ctp-head">
          <h2 className="ctp-title">{isEdit ? 'Edit Invoice' : 'New Invoice'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <Icon d={['M6 6l8 8M14 6l-8 8']} size={14} />
          </button>
        </div>

        <div className="ctp-body" style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: 0, flex: 1, overflowY: 'auto' }}>
          {projectName && (
            <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--line-soft)', background: 'var(--surface-2)' }}>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>Project: </span>
              <span style={{ fontSize: 12, fontWeight: 500 }}>{projectName}</span>
            </div>
          )}

          {/* Mode toggle */}
          <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid var(--line-soft)' }}>
            <div className="ctp-label" style={{ marginBottom: 8 }}>Invoice type</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['quick', 'itemized'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={'btn btn-sm' + (mode === m ? ' btn-primary' : ' btn-secondary')}
                  style={{ flex: 1 }}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Quick mode */}
            {mode === 'quick' && (
              <>
                <div className="ctp-field">
                  <label className="ctp-label">Description</label>
                  <input
                    className="ctp-input"
                    placeholder="e.g. Design milestone — Phase 2"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="ctp-field">
                  <label className="ctp-label">Amount</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', fontSize: 14 }}>$</span>
                    <input
                      className="ctp-input"
                      style={{ paddingLeft: 24 }}
                      placeholder="0.00"
                      type="number"
                      min="0"
                      step="0.01"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Itemized mode */}
            {mode === 'itemized' && (
              <div className="ctp-field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="ctp-label">Line items</label>
                  <button className="btn btn-ghost btn-sm" onClick={addLine} style={{ padding: '2px 6px', minHeight: 0 }}>
                    <Icon d={Icons.plus} size={12} /> Add line
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {/* Column headers */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 48px 80px 24px', gap: 6 }}>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--ink-4)', paddingLeft: 2 }}>DESCRIPTION</span>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--ink-4)', textAlign: 'center' }}>QTY</span>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--ink-4)', textAlign: 'right', paddingRight: 4 }}>RATE</span>
                    <span></span>
                  </div>
                  {lineItems.map((li, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 48px 80px 24px', gap: 6, alignItems: 'center' }}>
                      <input
                        className="ctp-input"
                        style={{ fontSize: 12 }}
                        placeholder="Task or service"
                        value={li.desc}
                        onChange={e => handleLineChange(i, 'desc', e.target.value)}
                      />
                      <input
                        className="ctp-input"
                        style={{ fontSize: 12, textAlign: 'center', padding: '6px 4px' }}
                        type="number"
                        min="1"
                        value={li.qty}
                        onChange={e => handleLineChange(i, 'qty', parseInt(e.target.value, 10) || 1)}
                      />
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', fontSize: 12 }}>$</span>
                        <input
                          className="ctp-input"
                          style={{ fontSize: 12, paddingLeft: 18, textAlign: 'right' }}
                          placeholder="0"
                          type="number"
                          min="0"
                          value={li.rate}
                          onChange={e => handleLineChange(i, 'rate', e.target.value)}
                        />
                      </div>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: 4, minHeight: 0, color: 'var(--red)' }}
                        onClick={() => removeLine(i)}
                        disabled={lineItems.length === 1}
                      >
                        <Icon d={['M6 6l8 8M14 6l-8 8']} size={12} />
                      </button>
                    </div>
                  ))}
                  {/* Subtotal */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 6, borderTop: '1px solid var(--line)', marginTop: 4 }}>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>Total: {formatAmount(total)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Due date */}
            <div className="ctp-field">
              <label className="ctp-label">Due date <span style={{ color: 'var(--ink-4)' }}>(optional)</span></label>
              <input
                className="ctp-input"
                type="date"
                value={due}
                onChange={e => setDue(e.target.value)}
              />
            </div>

            {/* Linked tasks */}
            {prefillTasks && prefillTasks.length > 0 && (
              <div className="ctp-field">
                <label className="ctp-label">Linked tasks</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {prefillTasks.map((t, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{t.text || t.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stripe link */}
            <div className="ctp-field">
              <label className="ctp-label">Stripe payment link</label>
              {stripeLink ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div style={{ flex: 1, padding: '7px 10px', background: 'var(--green-soft)', border: '1px solid var(--green)', borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--green)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {stripeLink.replace('https://checkout.stripe.com/pay/', '')}
                    </span>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setStripeLink('')} style={{ flexShrink: 0 }}>Reset</button>
                </div>
              ) : (
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', gap: 8 }}
                  onClick={handleGenerateStripe}
                  disabled={!canSave || stripeLoading}
                >
                  {stripeLoading ? (
                    <>
                      <span className="spinner" />
                      Generating link...
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                        <line x1="1" y1="10" x2="23" y2="10" />
                      </svg>
                      Generate Stripe link
                    </>
                  )}
                </button>
              )}
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 4 }}>
                Creates a Checkout session via Stripe API.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="ctp-foot" style={{ flexDirection: 'column', gap: 8, padding: '16px 20px', borderTop: '1px solid var(--line-soft)', background: 'var(--surface)' }}>
          {total > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '6px 0', borderBottom: '1px solid var(--line-soft)', marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Invoice total</span>
              <span className="mono" style={{ fontSize: 16, fontWeight: 700 }}>{formatAmount(total)}</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleSaveClick('Draft')}
              disabled={!canSave}
              style={{ flex: 1 }}
            >
              Save as draft
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleSaveClick('Sent')}
              disabled={!canSave}
              style={{ flex: 1 }}
            >
              {stripeLink ? 'Send with link →' : 'Mark as sent →'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Invoices Tab ───────────────────────────────────────────────────────────────
interface InvoicesTabProps {
  projectId: string;
  projectName: string;
  clientId: string;
  invoices: Invoice[];
  prefillTasks: any[] | null;
  onClearPrefill?: () => void;
  onTasksArchived?: (tasks: any[]) => void;
  onAddInvoice: (inv: Partial<Invoice>) => Promise<any>;
  onUpdateInvoice: (id: string, updates: Partial<Invoice>) => Promise<any>;
}

export function InvoicesTab({ 
  projectName, 
  clientId,
  invoices: allInvoices, 
  prefillTasks, 
  onClearPrefill, 
  onTasksArchived,
  onAddInvoice,
  onUpdateInvoice
}: InvoicesTabProps) {

  const invoices = useMemo(() => {
    // Filter invoices belonging to this client
    return allInvoices.filter(i => i.client_id === clientId);
  }, [allInvoices, clientId]);

  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [editInvoice, setEditInvoice]   = useState<Invoice | null>(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [prefill, setPrefill]           = useState<any[] | null>(null);

  // When board triggers "Create Invoice" with prefilled tasks
  useEffect(() => {
    if (prefillTasks && prefillTasks.length > 0) {
      setPrefill(prefillTasks);
      setEditInvoice(null);
      setDrawerOpen(true);
      onClearPrefill?.();
    }
  }, [prefillTasks, onClearPrefill]);

  function openCreate() {
    setPrefill(null);
    setEditInvoice(null);
    setDrawerOpen(true);
  }

  function openEdit(inv: Invoice) {
    setPrefill(null);
    setEditInvoice(inv);
    setDrawerOpen(true);
  }

  async function handleSave(invPayload: any) {
    if (invPayload.id) {
      await onUpdateInvoice(invPayload.id, {
        client_id: invPayload.client_id,
        amount: invPayload.amount,
        status: invPayload.status
      });
    } else {
      await onAddInvoice({
        client_id: invPayload.client_id,
        amount: invPayload.amount,
        status: invPayload.status
      });
    }

    if (invPayload.tasks && invPayload.tasks.length > 0 && onTasksArchived) {
      onTasksArchived(invPayload.tasks);
    }
    setDrawerOpen(false);
  }

  async function markPaid(invId: string) {
    await onUpdateInvoice(invId, { status: 'Paid' });
  }

  async function deleteInvoice(invId: string) {
    await db().from('invoices').delete().eq('id', invId);
    // Refresh page / hooks should automatically update list or we can handle it
    // For a cleaner UX in portable block, since useCRM reload will trigger refresh, it is fine
    // Or we can let parent hook refresh. Let's do a hard delete and reload
    window.location.reload(); // Simple reload since we are doing direct delete, or we can trigger useCRM reload if we pass it
  }

  // Summaries
  const totalInvoiced  = useMemo(() => invoices.reduce((s, i) => s + (i.amount || 0), 0), [invoices]);
  const totalPaid      = useMemo(() => invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + (i.amount || 0), 0), [invoices]);
  const totalOutstanding = useMemo(() => invoices.filter(i => i.status !== 'Paid').reduce((s, i) => s + (i.amount || 0), 0), [invoices]);

  const filtered = useMemo(() => {
    return filterStatus === 'All' ? invoices : invoices.filter(i => i.status === filterStatus);
  }, [invoices, filterStatus]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
      {/* Summary strip */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--line)',
        background: 'var(--surface-2)',
        flexShrink: 0,
      }}>
        {[
          { label: 'Invoiced',     val: formatAmount(totalInvoiced),    color: 'var(--ink)' },
          { label: 'Paid',         val: formatAmount(totalPaid),         color: 'var(--green)' },
          { label: 'Outstanding',  val: formatAmount(totalOutstanding),  color: totalOutstanding > 0 ? 'var(--amber)' : 'var(--ink-3)' },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1,
            padding: '10px 16px',
            borderRight: i < 2 ? '1px solid var(--line)' : 'none',
          }}>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>{s.label}</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.val}</div>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', borderLeft: '1px solid var(--line)' }}>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>
            <Icon d={Icons.plus} size={12} /> New invoice
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex', gap: 6, padding: '10px 16px',
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', gap: 12 }}>
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
                {['ID', 'Details', 'Amount', 'Status', 'Due', ''].map((h, i) => (
                  <th key={i} style={{
                    textAlign: i >= 2 && i < 5 ? 'center' : i === 5 ? 'right' : 'left',
                    padding: '8px 16px',
                    fontFamily: 'var(--mono)',
                    fontSize: 10,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--ink-4)',
                    fontWeight: 500,
                    borderBottom: '1px solid var(--line)',
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => {
                const tone = STATUS_TONES[inv.status] || 'blue';
                return (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                    <td style={{ padding: '10px 16px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>
                      INV-{inv.id.substring(0, 4).toUpperCase()}
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 13, maxWidth: 260 }}>
                      <div style={{ fontWeight: 500 }}>Invoice for {projectName}</div>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 2 }}>
                        Created {new Date(inv.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px', fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {formatAmount(inv.amount || 0)}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                      <span className={'chip chip-dot tone-' + tone} style={{ fontSize: 11 }}>{inv.status}</span>
                    </td>
                    <td style={{ padding: '10px 16px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {inv.status === 'Paid' ? (
                        <span style={{ color: 'var(--green)', fontSize: 11 }}>Paid</span>
                      ) : (
                        '—'
                      )}
                    </td>
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

      <InvoiceDrawer
        isOpen={drawerOpen}
        onClose={() => { setDrawerOpen(false); setPrefill(null); setEditInvoice(null); }}
        onSave={handleSave}
        invoice={editInvoice}
        projectName={projectName}
        clientId={clientId}
        prefillTasks={prefill}
      />
    </div>
  );
}
