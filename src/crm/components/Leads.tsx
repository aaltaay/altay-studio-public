import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Icon, Icons } from './Navigation';
import { ActivityTaskPanel } from './ActivityTaskPanel';
import { supabase } from '@/lib/supabase';

const STAGE_COLORS: Record<string, { tone: string; accent: string }> = {
  'New':       { tone: 'blue',   accent: 'var(--blue)' },
  'Contacted': { tone: 'violet', accent: 'var(--violet)' },
  'Quoted':    { tone: 'amber',  accent: 'var(--amber)' },
};

const TYPE_TONES_LEADS: Record<string, string> = { Restaurant: 'amber', Contractor: 'blue', Barber: 'violet', Other: 'blue' };

export function formatPhone(raw: string) {
  const d = (raw || '').replace(/\D/g, '').slice(0, 10);
  if (d.length === 0) return '';
  if (d.length < 4) return '(' + d;
  if (d.length < 7) return '(' + d.slice(0, 3) + ') ' + d.slice(3);
  return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
}


// ── Context Menu ───────────────────────────────────────────────────────────────
interface LeadContextMenuProps {
  x: number;
  y: number;
  lead: any;
  onClose: () => void;
  onMarkWon: () => void;
  onMarkLost: () => void;
  onDelete: () => void;
}

function LeadContextMenu({ x, y, lead, onClose, onMarkWon, onMarkLost, onDelete }: LeadContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Clamp to viewport
  const [pos, setPos] = useState({ top: y, left: x });
  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    setPos({
      top:  rect.bottom > vh ? y - rect.height : y,
      left: rect.right  > vw ? x - rect.width  : x,
    });
  }, [x, y]);

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        zIndex: 300,
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-md)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        minWidth: 190,
        padding: '4px',
        fontSize: 13,
      }}
    >
      <div style={{ padding: '6px 10px 8px', borderBottom: '1px solid var(--line-soft)', marginBottom: 4 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{lead.name}</div>
        <div className="mono muted" style={{ fontSize: '10.5px' }}>{lead.contact}</div>
      </div>
      <button className="ctx-item ctx-won" onClick={() => { onMarkWon(); onClose(); }} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '8px', padding: '6px 10px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: '4px' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        Mark as Won
      </button>
      <button className="ctx-item ctx-lost" onClick={() => { onMarkLost(); onClose(); }} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '8px', padding: '6px 10px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: '4px' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        Mark as Lost
      </button>
      <div style={{ height: 1, background: 'var(--line-soft)', margin: '4px 0' }} />
      <button className="ctx-item ctx-delete" onClick={() => { onDelete(); onClose(); }} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '8px', padding: '6px 10px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: '4px', color: 'var(--red)' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
        Delete lead
      </button>
    </div>
  );
}

// ── Lead Card ───────────────────────────────────────────────────────────────────
interface LeadCardProps {
  lead: any;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isJustAdded: boolean;
  onContextMenu: (e: React.MouseEvent) => void;
  onClick: () => void;
}

function LeadCard({ lead, onDragStart, onDragEnd, isDragging, isJustAdded, onContextMenu, onClick }: LeadCardProps) {
  function formatAge(createdStr: string) {
    if (!createdStr) return '';
    const diff = Math.round((new Date().getTime() - new Date(createdStr).getTime()) / 60000);
    if (diff < 60) return diff + 'm';
    const h = Math.round(diff / 60);
    if (h < 24) return h + 'h';
    const d = Math.round(diff / 1440);
    return d + 'd';
  }

  return (
    <div
      className={'lead-card' + (isJustAdded ? ' is-just-added' : '')}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onContextMenu={onContextMenu}
      onClick={onClick}
      style={{ opacity: isDragging ? 0.4 : 1, cursor: 'pointer' }}
    >
      <div className="lead-card-head">
        <div className="lead-card-title">{lead.name}</div>
        {lead.hot && <span className="lead-flame" title="Hot lead">🔥</span>}
      </div>
      <div className="lead-card-contact">
        <span className="mono">{lead.contact}</span>
      </div>
      <div className="lead-card-row" onClick={(e) => e.stopPropagation()}>
        <a
          href={lead.phone ? `tel:${lead.phone.replace(/\D/g, '')}` : '#'}
          style={{ color: 'inherit', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', pointerEvents: lead.phone ? 'auto' : 'none' }}
          title="Click to dial"
          className="hover-accent"
        >
          <Icon d={['M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z']} size={11} />
          <span className="mono">{lead.phone || '—'}</span>
        </a>
      </div>
      {lead.email && (
        <div className="lead-card-row" onClick={(e) => e.stopPropagation()}>
          <a
            href={`mailto:${lead.email}`}
            style={{ color: 'inherit', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            title="Click to email"
            className="hover-accent"
          >
            <Icon d={['M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z', 'M22 6l-10 7-10-7']} size={11} />
            <span style={{ fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.email}</span>
          </a>
        </div>
      )}
      <div className="lead-card-row">
        <Icon d={['M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z', 'M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z']} size={11} />
        <span>{lead.address}</span>
      </div>
      <div className="lead-card-foot">
        <div className="flex gap-6 center" style={{ flexWrap: 'wrap', display: 'flex', alignItems: 'center' }}>
          <span className={'chip chip-dot tone-' + (TYPE_TONES_LEADS[lead.type] || 'blue')} style={{ fontSize: 10 }}>{lead.type}</span>
          <span className="chip" style={{ fontSize: 10 }}>{lead.source}</span>
        </div>
        <span className="mono lead-age">{formatAge(lead.created_at)}</span>
      </div>
      {lead.value > 0 && (
        <div className="lead-card-value">${lead.value.toLocaleString()}</div>
      )}
    </div>
  );
}

// ── History Tab ─────────────────────────────────────────────────────────────────
function LeadsHistory({ history }: { history: any[] }) {
  const won  = history.filter(l => l.outcome === 'Won');
  const lost = history.filter(l => l.outcome === 'Lost');
  const wonValue  = won.reduce((a, l) => a + l.value, 0);
  const lostValue = lost.reduce((a, l) => a + l.value, 0);

  function formatAge(createdStr: string) {
    if (!createdStr) return '';
    const diff = Math.round((new Date().getTime() - new Date(createdStr).getTime()) / 60000);
    if (diff < 60) return diff + 'm';
    const h = Math.round(diff / 60);
    if (h < 24) return h + 'h';
    const d = Math.round(diff / 1440);
    return d + 'd';
  }

  const Row = ({ lead }: { lead: any }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px',
      borderBottom: '1px solid var(--line-soft)',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: lead.outcome === 'Won' ? 'var(--green-soft)' : 'var(--red-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {lead.outcome === 'Won'
          ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{lead.name}</div>
        <div className="mono muted" style={{ fontSize: 11 }}>{lead.contact} · {lead.type} · {lead.source}</div>
        {lead.reason && <div className="muted" style={{ fontSize: '11.5px', fontStyle: 'italic', marginTop: 2 }}>"{lead.reason}"</div>}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        {lead.value > 0 && (
          <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: lead.outcome === 'Won' ? 'var(--green)' : 'var(--ink-3)' }}>
            ${lead.value.toLocaleString()}
          </div>
        )}
        <div className="mono muted" style={{ fontSize: '10.5px' }}>{formatAge(lead.created_at)} ago</div>
      </div>
    </div>
  );

  if (history.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-3)' }}>
        No history yet — mark leads as Won or Lost via right-click.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Summary */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden', background: 'var(--surface)' }}>
        <div style={{ flex: 1, padding: '14px 20px', borderRight: '1px solid var(--line)' }}>
          <div className="mono muted" style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Won</div>
          <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--green)' }}>${wonValue.toLocaleString()}</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{won.length} deal{won.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ flex: 1, padding: '14px 20px' }}>
          <div className="mono muted" style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Lost</div>
          <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--red)' }}>{lost.length > 0 ? '$' + lostValue.toLocaleString() : '—'}</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{lost.length} deal{lost.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* List */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
        {history.map(l => <Row key={l.id} lead={l} />)}
      </div>
    </div>
  );
}

// ── Sources / Inbox: mock data + meta ───────────────────────────────────────────
// Frontend-only mock. When backend ingestion lands, swap for fetches against
// `lead_sources` and `lead_inbox` tables; the component contract stays the same.

const SOURCE_TYPE_META: Record<string, { label: string; icon: string[]; tone: string }> = {
  scraper: { label: 'Scraper', tone: 'blue',
    icon: ['M6 4h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z', 'M9 9h.01', 'M15 9h.01', 'M9 14h6', 'M9 2v2', 'M15 2v2'] },
  apify:   { label: 'Apify',   tone: 'amber',
    icon: ['M12 2L2 7l10 5 10-5-10-5z', 'M2 17l10 5 10-5', 'M2 12l10 5 10-5'] },
  n8n:     { label: 'n8n',     tone: 'violet',
    icon: ['M5 12a3 3 0 1 1 6 0 3 3 0 0 1-6 0z', 'M13 12a3 3 0 1 1 6 0 3 3 0 0 1-6 0z', 'M11 12h2'] },
  zapier:  { label: 'Zapier',  tone: 'amber',
    icon: ['M13 2L3 14h7l-1 8 10-12h-7l1-8z'] },
  webhook: { label: 'Webhook', tone: 'green',
    icon: ['M18 16a3 3 0 1 0 3 3 3 3 0 0 0-3-3z', 'M6 13a3 3 0 1 0 3 3 3 3 0 0 0-3-3z', 'M18 4a3 3 0 1 0 3 3 3 3 0 0 0-3-3z', 'M8.6 14.5l4.8-8.3', 'M15.4 19l-4.8-8.3'] },
  form:    { label: 'Quote Form', tone: 'blue',
    icon: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M8 13h8', 'M8 17h8'] },
};

const MOCK_SOURCES: any[] = [
  // metrics: day/week = recent activity (drives the 24h / 7d tiles)
  //          brought/qualified/won = lifetime totals (drive the funnel + Conv%)
  { id: 'src_gmaps', name: 'Google Maps · Restaurants', type: 'scraper', status: 'active', cadence: 'Every hour', target: 'Restaurants near Brooklyn, NY',
    last_run: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    next_run: new Date(Date.now() + 1000 * 60 * 46).toISOString(),
    webhook_path: '/api/leads/ingest', api_key: '[STRIPE_SECRET_KEY]••••e74c',
    metrics: { day: 47, week: 312, brought: 4080, qualified: 612, won: 47 } },
  { id: 'src_yelp', name: 'Yelp · Barbershops NYC', type: 'scraper', status: 'active', cadence: 'Every 6 hours', target: 'Barbershops · NYC borough sweep',
    last_run: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    next_run: new Date(Date.now() + 1000 * 60 * 60 * 5).toISOString(),
    webhook_path: '/api/leads/ingest', api_key: '[STRIPE_SECRET_KEY]••••91az',
    metrics: { day: 12, week: 73, brought: 540, qualified: 88, won: 11 } },
  { id: 'src_apify', name: 'Apify · Contractor Crawler', type: 'apify', status: 'error', cadence: 'Daily 04:00', target: 'General contractors · Long Island',
    last_run: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(),
    next_run: new Date(Date.now() + 1000 * 60 * 60 * 15).toISOString(),
    error_message: '429 rate limited — quota refreshes in ~2h',
    webhook_path: '/api/leads/ingest', api_key: '[STRIPE_SECRET_KEY]••••44dt',
    metrics: { day: 0, week: 41, brought: 220, qualified: 38, won: 5 } },
  { id: 'src_n8n', name: 'n8n · Quote Form Pipeline', type: 'n8n', status: 'active', cadence: 'On webhook', target: 'Public quote form → enrich → CRM',
    last_run: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    next_run: null,
    webhook_path: '/api/leads/ingest', api_key: '[STRIPE_SECRET_KEY]••••6ttq',
    metrics: { day: 4, week: 28, brought: 142, qualified: 86, won: 24 } },
  { id: 'src_zap', name: 'Zapier · Facebook Lead Ads', type: 'zapier', status: 'paused', cadence: 'On trigger', target: 'FB lead form submissions',
    last_run: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    next_run: null,
    webhook_path: '/api/leads/ingest', api_key: '[STRIPE_SECRET_KEY]••••0ke8',
    metrics: { day: 0, week: 0, brought: 134, qualified: 31, won: 4 } },
];

const MOCK_INBOX: any[] = [
  { id: 'inb_1', source_id: 'src_gmaps', name: 'Brooklyn Pies & Co.', contact: 'Listing',
    phone: '(555) 010-0101', email: 'info@brooklynpies.com', address: '212 Bedford Ave, Brooklyn NY', type: 'Restaurant',
    received_at: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    quality: 87, phone_valid: true, email_valid: true, dup_of: null },
  { id: 'inb_2', source_id: 'src_gmaps', name: 'Brick Oven Joe', contact: 'Listing',
    phone: '(555) 010-0102', email: '', address: '88 Court St, Brooklyn NY', type: 'Restaurant',
    received_at: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
    quality: 58, phone_valid: true, email_valid: false, dup_of: null },
  { id: 'inb_3', source_id: 'src_yelp', name: 'Sharp Lines Barber Co.', contact: 'Listing',
    phone: '(555) 010-0103', email: 'hello@sharplines.com', address: 'Greenpoint, NY', type: 'Barber',
    received_at: new Date(Date.now() - 1000 * 60 * 41).toISOString(),
    quality: 92, phone_valid: true, email_valid: true, dup_of: null },
  { id: 'inb_4', source_id: 'src_yelp', name: 'Sharper Cuts', contact: 'Listing',
    phone: '(555) 010-0104', email: 'tariq@sharpercuts.com', address: 'Astoria, NY', type: 'Barber',
    received_at: new Date(Date.now() - 1000 * 60 * 70).toISOString(),
    quality: 71, phone_valid: true, email_valid: true, dup_of: 'Sharper Cuts (existing lead)' },
  { id: 'inb_5', source_id: 'src_n8n', name: 'Vega Construction LLC', contact: 'Quote form',
    phone: '(555) 010-0105', email: 'vega@vegaconstruction.io', address: 'Queens, NY', type: 'Contractor',
    received_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    quality: 95, phone_valid: true, email_valid: true, dup_of: null },
  { id: 'inb_6', source_id: 'src_gmaps', name: 'Untitled Restaurant', contact: 'Listing',
    phone: '', email: '', address: 'Brooklyn NY', type: 'Restaurant',
    received_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    quality: 22, phone_valid: false, email_valid: false, dup_of: null },
  { id: 'inb_7', source_id: 'src_apify', name: 'Hammer & Nail Builders', contact: 'Listing',
    phone: '(555) 010-0106', email: 'office@hammernail.com', address: 'Long Island, NY', type: 'Contractor',
    received_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    quality: 80, phone_valid: true, email_valid: true, dup_of: null },
];

// ── ABM: Accounts / Contacts / Touchpoints / Signals (mocked) ───────────────────
// This is the high-ticket / named-account model. Unlike Sources+Inbox (volume
// scraping), an Account is a hand-picked target company you've decided to pursue.
// Coverage of the named list is the KPI, not lead volume.

const SEGMENT_META: Record<string, { label: string; tone: string }> = {
  restaurant: { label: 'Restaurant',     tone: 'amber'  },
  barber:     { label: 'Barber Shop',    tone: 'blue'   },
  clinic:     { label: 'Clinic / Spa',   tone: 'green'  },
  bespoke:    { label: 'Bespoke / Creative', tone: 'violet' },
  retail:     { label: 'Retail',         tone: 'amber'  },
};

const TIER_META: Record<number, { label: string; color: string }> = {
  1: { label: 'T1', color: 'var(--green)' },
  2: { label: 'T2', color: 'var(--amber)' },
  3: { label: 'T3', color: 'var(--ink-3)' },
};

const ACCOUNT_STATUS_META: Record<string, { label: string; tone: string }> = {
  untouched:   { label: 'Untouched',   tone: 'gray'   },
  engaging:    { label: 'Engaging',    tone: 'blue'   },
  active:      { label: 'Active',      tone: 'amber'  },
  opportunity: { label: 'Opportunity', tone: 'violet' },
  cold:        { label: 'Cold',        tone: 'red'    },
  won:         { label: 'Won',         tone: 'green'  },
};

const ROLE_META: Record<string, { label: string; tone: string }> = {
  champion: { label: 'Champion',       tone: 'green'  },
  dm:       { label: 'Decision Maker', tone: 'violet' },
  user:     { label: 'User',           tone: 'blue'   },
  blocker:  { label: 'Blocker',        tone: 'red'    },
};

const SIGNAL_META: Record<string, { label: string; tone: string; icon: string[] }> = {
  job_post:   { label: 'Job Post',   tone: 'blue',
    icon: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M22 11l-3-3-3 3', 'M19 8v8'] },
  news:       { label: 'News',       tone: 'amber',
    icon: ['M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2', 'M18 14h-8', 'M15 18h-5', 'M10 6h8v4h-8z'] },
  funding:    { label: 'Funding',    tone: 'green',
    icon: ['M12 1v22', 'M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'] },
  conference: { label: 'Conference', tone: 'violet',
    icon: ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'] },
  referral:   { label: 'Referral',   tone: 'green',
    icon: ['M22 11.08V12a10 10 0 1 1-5.93-9.14', 'M22 4L12 14.01l-3-3'] },
};

const TOUCH_META: Record<string, { label: string; tone: string }> = {
  email:    { label: 'Email',    tone: 'blue'   },
  call:     { label: 'Call',     tone: 'green'  },
  linkedin: { label: 'LinkedIn', tone: 'blue'   },
  event:    { label: 'Event',    tone: 'violet' },
  demo:     { label: 'Demo',     tone: 'amber'  },
  note:     { label: 'Note',     tone: 'gray'   },
};

const DAY = 1000 * 60 * 60 * 24;
const HOUR = 1000 * 60 * 60;

const MOCK_ACCOUNTS: any[] = [
  // Tier 1 — local businesses ready for a modern website
  { id: 'acc_maple', name: 'Maple Street Barbers',      segment: 'barber',     tier: 1, status: 'active',      website: 'maplestreetbarbers.com', location: 'Charlotte, NC',
    reasoning: 'Two-chair shop outgrowing Instagram DMs — wants booking + gallery.',
    last_touched_at: new Date(Date.now() - DAY * 3).toISOString(),  owner: 'Ahmi' },
  { id: 'acc_sunrise', name: 'Sunrise Dental Clinic',   segment: 'clinic',     tier: 1, status: 'opportunity', website: 'sunrisedentalclinic.com', location: 'Raleigh, NC',
    reasoning: 'Demo went well; discussing staff profiles and intake form.',
    last_touched_at: new Date(Date.now() - DAY * 14).toISOString(), owner: 'Ahmi' },
  { id: 'acc_harbor', name: 'Harbor & Vine Kitchen',     segment: 'restaurant', tier: 1, status: 'engaging',    website: 'harborandvine.com',      location: 'Charleston, SC',
    reasoning: 'Rebrand + menu site before summer season. LinkedIn intro in flight.',
    last_touched_at: new Date(Date.now() - DAY * 7).toISOString(),  owner: 'Ahmi' },
  { id: 'acc_bloom', name: 'Bloom Photography Studio',  segment: 'bespoke',    tier: 1, status: 'active',      website: 'bloomphotostudio.com',   location: 'Asheville, NC',
    reasoning: 'Needs client galleries, pricing pages, and lead capture.',
    last_touched_at: new Date(Date.now() - DAY * 2).toISOString(),  owner: 'Ahmi' },
  { id: 'acc_sweet', name: 'Sweet Crumb Bakery',        segment: 'restaurant', tier: 1, status: 'engaging',    website: 'sweetcrumbbakery.com',   location: 'Durham, NC',
    reasoning: 'Met at a local makers fair. Engaged on email, scheduling demo.',
    last_touched_at: new Date(Date.now() - DAY * 9).toISOString(),  owner: 'Ahmi' },

  // Tier 2 — second wave prospects
  { id: 'acc_riverside', name: 'The Riverside Collective', segment: 'bespoke', tier: 2, status: 'untouched', website: 'riversidecollective.com', location: 'Nashville, TN',
    reasoning: 'Touring band — music, shows, and booking inquiry flow.',
    last_touched_at: null,                                          owner: 'Ahmi' },
  { id: 'acc_elm', name: 'Elm City Med Spa',              segment: 'clinic',     tier: 2, status: 'engaging',    website: 'elmcitymedspa.com',      location: 'Greensboro, NC',
    reasoning: 'Med spa launch. Sent intro, awaiting reply.',
    last_touched_at: new Date(Date.now() - DAY * 8).toISOString(),  owner: 'Ahmi' },
  { id: 'acc_copper', name: 'Copper & Blade Grooming',    segment: 'barber',     tier: 2, status: 'untouched',   website: 'copperandblade.com',     location: 'Atlanta, GA',
    reasoning: 'Premium barber brand — strong fit for booking module.',
    last_touched_at: null,                                          owner: 'Ahmi' },
  { id: 'acc_patio', name: 'Patio Verde Taqueria',         segment: 'restaurant', tier: 2, status: 'cold',        website: 'patioverde.com',         location: 'Austin, TX',
    reasoning: 'Referred by Harbor & Vine owner. Initial call done, no followup.',
    last_touched_at: new Date(Date.now() - DAY * 60).toISOString(), owner: 'Ahmi' },
  { id: 'acc_frame', name: 'Frame & Form Interiors',     segment: 'retail',     tier: 2, status: 'untouched',   website: 'frameandform.co',        location: 'Savannah, GA',
    reasoning: 'Showroom portfolio + contact funnel for design studio.',
    last_touched_at: null,                                          owner: 'Ahmi' },
  { id: 'acc_north', name: 'Northside Yoga Collective',  segment: 'clinic',     tier: 2, status: 'engaging',    website: 'northsideyoga.co',       location: 'Charlotte, NC',
    reasoning: 'Class schedule + lead form. Reply received, scheduling demo.',
    last_touched_at: new Date(Date.now() - DAY * 21).toISOString(), owner: 'Ahmi' },

  // Tier 3 — wider net
  { id: 'acc_coast', name: 'Coastline Pet Grooming',     segment: 'retail',     tier: 3, status: 'untouched',   website: 'coastlinepetgroom.com',  location: 'Wilmington, NC',
    reasoning: 'Single-location groomer. Lower priority until T1/T2 saturated.',
    last_touched_at: null,                                          owner: 'Ahmi' },
];

const MOCK_CONTACTS: any[] = [
  { id: 'con_1', account_id: 'acc_maple', name: 'Marcus Chen',  title: 'Owner', role: 'champion',
    email: 'marcus@maplestreetbarbers.com', linkedin: 'linkedin.com/in/marcuschen-barber',
    last_touched_at: new Date(Date.now() - DAY * 3).toISOString() },
  { id: 'con_2', account_id: 'acc_maple', name: 'Priya Sharma', title: 'Front Desk Lead', role: 'user',
    email: 'priya@maplestreetbarbers.com', linkedin: 'linkedin.com/in/priyasharma',
    last_touched_at: new Date(Date.now() - DAY * 12).toISOString() },

  { id: 'con_3', account_id: 'acc_sunrise', name: 'David Reilly', title: 'Practice Manager', role: 'dm',
    email: 'dreilly@sunrisedentalclinic.com', linkedin: 'linkedin.com/in/davidreilly-dental',
    last_touched_at: new Date(Date.now() - DAY * 14).toISOString() },

  { id: 'con_4', account_id: 'acc_bloom', name: 'Sarah Park', title: 'Studio Owner', role: 'champion',
    email: 'sarah@bloomphotostudio.com', linkedin: 'linkedin.com/in/sarahpark-photo',
    last_touched_at: new Date(Date.now() - DAY * 2).toISOString() },
  { id: 'con_5', account_id: 'acc_bloom', name: 'Tom O’Brien', title: 'Lead Photographer', role: 'user',
    email: 'tom@bloomphotostudio.com', linkedin: '',
    last_touched_at: new Date(Date.now() - DAY * 18).toISOString() },

  { id: 'con_6', account_id: 'acc_harbor', name: 'Jay Patel', title: 'General Manager', role: 'champion',
    email: 'jay@harborandvine.com', linkedin: 'linkedin.com/in/jay-patel-restaurant',
    last_touched_at: new Date(Date.now() - DAY * 7).toISOString() },

  { id: 'con_7', account_id: 'acc_sweet', name: 'Anand Iyer', title: 'Owner / Baker', role: 'user',
    email: 'anand@sweetcrumbbakery.com', linkedin: '',
    last_touched_at: new Date(Date.now() - DAY * 9).toISOString() },

  { id: 'con_8', account_id: 'acc_elm', name: 'Rachel Wong', title: 'Marketing Coordinator', role: 'user',
    email: 'rachel@elmcitymedspa.com', linkedin: '',
    last_touched_at: new Date(Date.now() - DAY * 8).toISOString() },

  { id: 'con_9', account_id: 'acc_patio', name: 'John Tavares', title: 'Owner', role: 'dm',
    email: 'john@patioverde.com', linkedin: 'linkedin.com/in/johntavares',
    last_touched_at: new Date(Date.now() - DAY * 45).toISOString() },

  { id: 'con_10', account_id: 'acc_north', name: 'Maria Gomez', title: 'Studio Director', role: 'champion',
    email: 'maria@northsideyoga.co', linkedin: '',
    last_touched_at: new Date(Date.now() - DAY * 5).toISOString() },

  { id: 'con_11', account_id: 'acc_north', name: 'Brian Walsh', title: 'Operations Lead', role: 'dm',
    email: 'brian@northsideyoga.co', linkedin: '',
    last_touched_at: new Date(Date.now() - DAY * 21).toISOString() },

  { id: 'con_12', account_id: 'acc_patio', name: 'Erin Vasquez', title: 'Front-of-House Manager', role: 'user',
    email: 'erin@patioverde.com', linkedin: '',
    last_touched_at: new Date(Date.now() - DAY * 60).toISOString() },
];

const MOCK_TOUCHPOINTS: any[] = [
  { id: 'tp_1',  account_id: 'acc_maple', contact_id: 'con_1', channel: 'email', direction: 'out',
    notes: 'Sent barber template demo deck after intro call', outcome: 'delivered',
    at: new Date(Date.now() - DAY * 3).toISOString() },
  { id: 'tp_2',  account_id: 'acc_maple', contact_id: 'con_1', channel: 'call', direction: 'out',
    notes: '30min intro — Marcus wants booking calendar + gallery', outcome: 'positive',
    at: new Date(Date.now() - DAY * 9).toISOString() },
  { id: 'tp_3',  account_id: 'acc_sunrise', contact_id: 'con_3', channel: 'call', direction: 'out',
    notes: 'Demo done. David asked about staff profiles for three hygienists.', outcome: 'positive',
    at: new Date(Date.now() - DAY * 14).toISOString() },
  { id: 'tp_4',  account_id: 'acc_bloom', contact_id: 'con_4', channel: 'demo', direction: 'out',
    notes: 'Live demo to Sarah’s team — gallery unlock + pricing pages', outcome: 'positive',
    at: new Date(Date.now() - DAY * 2).toISOString() },
  { id: 'tp_5',  account_id: 'acc_bloom', contact_id: 'con_4', channel: 'email', direction: 'in',
    notes: '"Loved the demo, scheduling internal review next week"', outcome: 'positive',
    at: new Date(Date.now() - HOUR * 36).toISOString() },
  { id: 'tp_6',  account_id: 'acc_harbor', contact_id: 'con_6', channel: 'linkedin', direction: 'out',
    notes: 'Connection request + intro DM referencing menu refresh timeline', outcome: 'pending',
    at: new Date(Date.now() - DAY * 7).toISOString() },
  { id: 'tp_7',  account_id: 'acc_sweet', contact_id: 'con_7', channel: 'event', direction: 'out',
    notes: 'Met at local makers fair. Gave 5min walkthrough of bakery template.', outcome: 'positive',
    at: new Date(Date.now() - DAY * 9).toISOString() },
  { id: 'tp_8',  account_id: 'acc_elm', contact_id: 'con_8', channel: 'email', direction: 'out',
    notes: 'Followup after no-reply to cold intro', outcome: 'pending',
    at: new Date(Date.now() - DAY * 8).toISOString() },
  { id: 'tp_9',  account_id: 'acc_patio', contact_id: 'con_9', channel: 'email', direction: 'out',
    notes: 'Sent restaurant template deck. No reply.', outcome: 'no_reply',
    at: new Date(Date.now() - DAY * 45).toISOString() },
  { id: 'tp_10', account_id: 'acc_north', contact_id: 'con_10', channel: 'call', direction: 'out',
    notes: 'Discovery call — class schedule module resonated most', outcome: 'positive',
    at: new Date(Date.now() - DAY * 5).toISOString() },
];

const MOCK_SIGNALS: any[] = [
  { id: 'sig_1', kind: 'job_post', account_id: 'acc_maple', reviewed: false,
    summary: 'Maple Street Barbers posted "Front Desk / Social Media" — growth signal',
    source_url: 'linkedin.com/jobs/4882910',
    at: new Date(Date.now() - DAY * 1).toISOString() },
  { id: 'sig_2', kind: 'news', account_id: 'acc_sunrise', reviewed: false,
    summary: 'Sunrise Dental opening second location — needs updated site + intake flow',
    source_url: 'localnews.com/sunrise-dental-expansion',
    at: new Date(Date.now() - DAY * 2).toISOString() },
  { id: 'sig_3', kind: 'conference', account_id: 'acc_patio', reviewed: false,
    summary: 'Patio Verde listed as vendor at Austin Food & Wine Festival — reason to re-engage',
    source_url: 'austinfoodwine.com/vendors',
    at: new Date(Date.now() - DAY * 4).toISOString() },
  { id: 'sig_4', kind: 'news', account_id: null, reviewed: false,
    summary: 'New studio "Lens & Light Co." launched — competitor site went live last week',
    source_url: 'instagram.com/lensandlightco',
    at: new Date(Date.now() - DAY * 5).toISOString() },
  { id: 'sig_5', kind: 'job_post', account_id: 'acc_copper', reviewed: false,
    summary: 'Copper & Blade hiring "Brand Manager" — prime cold reach moment',
    source_url: 'copperandblade.com/careers',
    at: new Date(Date.now() - DAY * 6).toISOString() },
  { id: 'sig_6', kind: 'news', account_id: 'acc_harbor', reviewed: true,
    summary: 'Harbor & Vine featured in local "Best New Menus" roundup',
    source_url: 'charlestonfood.com/harbor-and-vine',
    at: new Date(Date.now() - DAY * 8).toISOString() },
  { id: 'sig_7', kind: 'conference', account_id: 'acc_bloom', reviewed: false,
    summary: 'Bloom Photography team listed as attending regional wedding expo',
    source_url: 'carolinaweddingexpo.com/exhibitors',
    at: new Date(Date.now() - DAY * 10).toISOString() },
  { id: 'sig_8', kind: 'referral', account_id: 'acc_patio', reviewed: false,
    summary: '"Jay at Harbor & Vine said you should talk to John about their outdated Squarespace site"',
    source_url: '',
    at: new Date(Date.now() - DAY * 12).toISOString() },
  { id: 'sig_9', kind: 'funding', account_id: 'acc_sweet', reviewed: true,
    summary: 'Sweet Crumb Bakery secured small-business grant — budget unlock for new site',
    source_url: 'durhambusiness.org/grant-recipients',
    at: new Date(Date.now() - DAY * 14).toISOString() },
  { id: 'sig_10', kind: 'news', account_id: 'acc_copper', reviewed: false,
    summary: 'Copper & Blade featured in local magazine "Best Grooming Experiences"',
    source_url: 'atlantastyle.com/copper-and-blade',
    at: new Date(Date.now() - DAY * 16).toISOString() },
];

function relPast(iso: string) {
  if (!iso) return '—';
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return diff + 'm ago';
  const h = Math.round(diff / 60);
  if (h < 24) return h + 'h ago';
  return Math.round(diff / 1440) + 'd ago';
}

function relFuture(iso: string | null) {
  if (!iso) return '—';
  const diff = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (diff < 1) return 'now';
  if (diff < 60) return 'in ' + diff + 'm';
  const h = Math.round(diff / 60);
  if (h < 24) return 'in ' + h + 'h';
  return 'in ' + Math.round(diff / 1440) + 'd';
}

// ── Leads Sources ───────────────────────────────────────────────────────────────
interface LeadsSourcesProps {
  sources: any[];
  onAdd: () => void;
  onToggle: (id: string) => void;
  onCopy: (text: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (feed: any) => void;
  abmAccounts: any[];
  usingBackend: boolean;
}

function LeadsSources({ sources, onAdd, onToggle, onCopy, onDelete, onEdit, abmAccounts, usingBackend }: LeadsSourcesProps) {
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const active = sources.filter(s => s.status === 'active').length;
  
  const day24 = useMemo(() => {
    if (!usingBackend) {
      return sources.reduce((a, s) => a + (s.metrics?.day || 0), 0);
    }
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return abmAccounts.filter(a => a.feed_id && new Date(a.created_at).getTime() > oneDayAgo).length;
  }, [sources, abmAccounts, usingBackend]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div className="mono muted" style={{ fontSize: 12 }}>
          <strong style={{ color: 'var(--ink)' }}>{active}</strong> active source{active !== 1 ? 's' : ''}
          {' · '}
          <strong style={{ color: 'var(--ink)' }}>{day24}</strong> leads ingested in last 24h
        </div>
        <button className="btn btn-primary btn-sm" onClick={onAdd}>
          <Icon d={Icons.plus} size={13} /> Connect source
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
        {sources.map(s => {
          const meta = SOURCE_TYPE_META[s.type] || SOURCE_TYPE_META.scraper;
          const statusColor = s.status === 'active' ? 'var(--green)' : s.status === 'paused' ? 'var(--ink-3)' : 'var(--red)';
          const statusBg    = s.status === 'active' ? 'var(--green-soft)' : s.status === 'paused' ? 'var(--surface-2)' : 'var(--red-soft)';
          
          const brought = usingBackend ? (s.imported_count || 0) : (s.metrics?.brought || 0);
          const qualified = usingBackend 
            ? abmAccounts.filter(a => a.feed_id === s.id && ['engaging', 'active', 'opportunity', 'won'].includes(a.status)).length 
            : (s.metrics?.qualified || 0);
          const won = usingBackend 
            ? abmAccounts.filter(a => a.feed_id === s.id && a.status === 'won').length 
            : (s.metrics?.won || 0);

          const qualPct = brought ? (qualified / brought) * 100 : 0;
          const wonPct  = brought ? (won       / brought) * 100 : 0;
          const convPct = brought ? Math.round((won / brought) * 1000) / 10 : 0;
          const isRevealed = revealedKey === s.id;

          const webhookUrl = s.webhook_secret 
            ? `${import.meta.env.VITE_SUPABASE_URL || 'https://[YOUR_SUPABASE_PROJECT_REF].supabase.co'}/functions/v1/clay-ingest?feed_id=${s.id}` 
            : s.webhook_path;
          const secretKey = s.webhook_secret || s.api_key || '';

          return (
            <div key={s.id} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: `var(--${meta.tone})` }}>
                  <Icon d={meta.icon} size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                  <div className="muted" style={{ fontSize: 11.5, marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className={'chip chip-dot tone-' + meta.tone} style={{ fontSize: 9 }}>{meta.label}</span>
                    <span>{s.cadence}</span>
                  </div>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: statusBg, color: statusColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
                  {s.status}
                </span>
              </div>

              {s.error_message && (
                <div style={{ background: 'var(--red-soft)', border: '1px solid var(--red)', borderRadius: 'var(--r-sm)', padding: '6px 10px', fontSize: 11.5, color: 'var(--red)' }}>
                  ⚠ {s.error_message}
                </div>
              )}

              <div style={{ fontSize: 12, color: 'var(--ink-2)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <Icon d={['M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z', 'M21 21l-4.5-4.5']} size={11} style={{ marginTop: 2, flexShrink: 0 }} />
                <span style={{ wordBreak: 'break-word', fontSize: 11.5 }}>
                  {s.search_brief || s.target || 'No target brief specified'}
                  {s.geography && <span className="muted"> · {s.geography}</span>}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', padding: '8px 10px' }}>
                  <div className="mono muted" style={{ fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Ingested</div>
                  <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>{brought}</div>
                </div>
                <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', padding: '8px 10px' }}>
                  <div className="mono muted" style={{ fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Qualified</div>
                  <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>{qualified}</div>
                </div>
                <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', padding: '8px 10px' }} title="Lifetime won / brought">
                  <div className="mono muted" style={{ fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Conv</div>
                  <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: convPct >= 5 ? 'var(--green)' : 'var(--ink)' }}>{convPct}%</div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }}>
                  <span>Brought</span><span>Qualified</span><span>Won</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ flex: 1, height: 6, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: brought > 0 ? '100%' : '0%', background: `var(--${meta.tone})`, opacity: 0.9 }} />
                  </div>
                  <div style={{ flex: 1, height: 6, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${qualPct}%`, background: `var(--${meta.tone})`, opacity: 0.6 }} />
                  </div>
                  <div style={{ flex: 1, height: 6, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${wonPct}%`, background: 'var(--green)' }} />
                  </div>
                </div>
                <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4, color: 'var(--ink-2)' }}>
                  <span>{brought.toLocaleString()}</span>
                  <span>{qualified.toLocaleString()}</span>
                  <span style={{ color: 'var(--green)' }}>{won.toLocaleString()}</span>
                </div>
              </div>

              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: '8px 10px' }}>
                <div className="mono muted" style={{ fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3 }}>
                  {s.webhook_secret ? 'POST endpoint URL' : 'POST endpoint'}
                </div>
                <div className="mono" style={{ fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={webhookUrl}>{webhookUrl}</span>
                  <button onClick={() => onCopy(webhookUrl)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 2 }} title="Copy">
                    <Icon d={['M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71', 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71']} size={10} />
                  </button>
                </div>
                <div className="mono muted" style={{ fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 7, marginBottom: 3 }}>
                  {s.webhook_secret ? 'x-clay-secret header' : 'API key'}
                </div>
                <div className="mono" style={{ fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {isRevealed ? secretKey : secretKey.replace(/[a-z0-9]/gi, '•')}
                  </span>
                  <button onClick={() => setRevealedKey(r => r === s.id ? null : s.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 2 }} title={isRevealed ? 'Hide' : 'Reveal'}>
                    {isRevealed ? (
                      <Icon d={['M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94', 'M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19', 'M14.12 14.12a3 3 0 1 1-4.24-4.24', 'M1 1l22 22']} size={11} />
                    ) : (
                      <Icon d={['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z']} size={11} />
                    )}
                  </button>
                  <button onClick={() => onCopy(secretKey)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 2 }} title="Copy">
                    <Icon d={['M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71', 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71']} size={10} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--line-soft)', paddingTop: 10, marginTop: 2 }}>
                <div className="mono muted" style={{ fontSize: 10.5 }}>
                  {s.last_run ? `Last run ${relPast(s.last_run)}` : 'Never run'}
                  {s.next_run && <> · next {relFuture(s.next_run)}</>}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => onToggle(s.id)}>
                    {s.status === 'paused' ? '▶ Resume' : '❚❚ Pause'}
                  </button>
                  {onEdit && (
                    <button className="btn btn-ghost btn-sm" onClick={() => onEdit(s)}>Edit</button>
                  )}
                  {onDelete && (
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => onDelete(s.id)}>Delete</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <button
          onClick={onAdd}
          style={{
            background: 'transparent', border: '1.5px dashed var(--line)', borderRadius: 'var(--r-lg)',
            minHeight: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 8, color: 'var(--ink-3)', cursor: 'pointer', padding: 16, fontFamily: 'inherit'
          }}
        >
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon d={Icons.plus} size={16} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Connect a source</div>
          <div style={{ fontSize: 11.5, textAlign: 'center', maxWidth: 220, lineHeight: 1.4 }}>
            Clay briefs, Scrapers, n8n, Zapier, or any service that can POST JSON
          </div>
        </button>
      </div>
    </div>
  );
}

// ── Leads Accounts (ABM) ────────────────────────────────────────────────────────
// Replaces the volume-scraping model with named-account tracking. The header
// "coverage strip" is the real KPI: of your target list, how many are warm vs cold?
interface LeadsAccountsProps {
  accounts: any[];
  contacts: any[];
  touchpoints: any[];
  signals: any[];
  onAdd: () => void;
  onImportApollo: () => void;
  onLogTouchpoint: (accountId: string) => void;
}

function LeadsAccounts({ accounts, contacts, touchpoints, signals, onAdd, onImportApollo, onLogTouchpoint }: LeadsAccountsProps) {
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [tierFilter, setTier]     = useState<'all' | 1 | 2 | 3>('all');
  const [statusFilter, setStatus] = useState<string>('all');

  const now = Date.now();
  const COLD_THRESHOLD_DAYS = 30;

  const enriched = useMemo(() => accounts.map(a => {
    const accountContacts   = contacts.filter(c => c.account_id === a.id);
    const accountTouches    = touchpoints.filter(t => t.account_id === a.id).sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime());
    const accountSignals    = signals.filter(s => s.account_id === a.id && !s.reviewed);
    const daysSinceTouch    = a.last_touched_at ? Math.floor((now - new Date(a.last_touched_at).getTime()) / DAY) : null;
    const isCold            = daysSinceTouch !== null && daysSinceTouch > COLD_THRESHOLD_DAYS;
    const isUntouched       = a.last_touched_at === null;
    return { ...a, contacts: accountContacts, touchpoints: accountTouches, signals: accountSignals, daysSinceTouch, isCold, isUntouched };
  }), [accounts, contacts, touchpoints, signals, now]);

  const filtered = enriched.filter(a => {
    if (tierFilter !== 'all' && a.tier !== tierFilter) return false;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'untouched') return a.isUntouched;
    if (statusFilter === 'cold')      return a.isCold;
    return a.status === statusFilter;
  });

  // Coverage = the ABM KPI. Of your target list, how warm is it?
  const total       = enriched.length;
  const untouched   = enriched.filter(a => a.isUntouched).length;
  const cold        = enriched.filter(a => a.isCold).length;
  const active      = enriched.filter(a => a.status === 'active' || a.status === 'engaging').length;
  const opportunity = enriched.filter(a => a.status === 'opportunity').length;
  const won         = enriched.filter(a => a.status === 'won').length;

  // Pipeline value mock — assume $35k median per opportunity, $50k per won
  const pipelineValue = opportunity * 35000;
  const wonValue      = won * 50000;

  const GRID = '1fr 130px 70px 130px 110px 90px 120px';

  return (
    <div>
      {/* Coverage strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 18 }}>
        <CoverageTile label="Target accounts"  value={total.toString()}                 tone="ink" />
        <CoverageTile label="Untouched"        value={untouched.toString()}             tone={untouched > 0 ? 'amber' : 'ink-3'} />
        <CoverageTile label="Cold (>30d)"      value={cold.toString()}                  tone={cold > 0 ? 'red' : 'ink-3'} />
        <CoverageTile label="Active convos"    value={active.toString()}                tone="blue" />
        <CoverageTile label="Open opps"        value={opportunity.toString()}           tone="violet" sub={`$${(pipelineValue / 1000).toFixed(0)}k pipeline`} />
        <CoverageTile label="Won"              value={won.toString()}                   tone="green"  sub={`$${(wonValue / 1000).toFixed(0)}k closed`} />
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="mono muted" style={{ fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', marginRight: 4 }}>Tier</span>
          {(['all', 1, 2, 3] as const).map(t => (
            <button key={String(t)} onClick={() => setTier(t)}
              className={'btn btn-sm ' + (tierFilter === t ? 'btn-primary' : 'btn-ghost')}
              style={{ minWidth: 36 }}>
              {t === 'all' ? 'All' : `T${t}`}
            </button>
          ))}
          <span className="mono muted" style={{ fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 4px 0 12px' }}>Status</span>
          <select value={statusFilter} onChange={e => setStatus(e.target.value)}
            style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '5px 10px', fontSize: 12, color: 'var(--ink)' }}>
            <option value="all">All</option>
            <option value="untouched">Untouched</option>
            <option value="engaging">Engaging</option>
            <option value="active">Active</option>
            <option value="opportunity">Opportunity</option>
            <option value="cold">Cold</option>
          </select>
          <span className="mono muted" style={{ fontSize: 11, marginLeft: 8 }}>
            {filtered.length} of {total}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={onImportApollo}>
            Import from Apollo
          </button>
          <button className="btn btn-primary btn-sm" onClick={onAdd}>
            <Icon d={Icons.plus} size={13} /> Add target account
          </button>
        </div>
      </div>

      {/* Table header */}
      <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 12, padding: '8px 14px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
        <div>Company</div>
        <div>Segment</div>
        <div style={{ textAlign: 'center' }}>Tier</div>
        <div>Status</div>
        <div>Last touch</div>
        <div style={{ textAlign: 'center' }}>Signals</div>
        <div style={{ textAlign: 'right' }}>Actions</div>
      </div>

      {/* Account rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
        {filtered.map(a => {
          const segMeta    = SEGMENT_META[a.segment]    || SEGMENT_META.restaurant;
          const tierMeta   = TIER_META[a.tier as 1 | 2 | 3];
          const statusMeta = ACCOUNT_STATUS_META[a.status] || ACCOUNT_STATUS_META.untouched;
          const isOpen = expanded === a.id;
          const lastTouch = a.last_touched_at
            ? relPast(a.last_touched_at)
            : <span style={{ color: 'var(--amber)' }}>Never</span>;
          const touchColor = a.isCold ? 'var(--red)' : a.isUntouched ? 'var(--amber)' : 'var(--ink-2)';

          return (
            <div key={a.id} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
              <div
                onClick={() => setExpanded(isOpen ? null : a.id)}
                style={{ display: 'grid', gridTemplateColumns: GRID, gap: 12, padding: '12px 14px', alignItems: 'center', cursor: 'pointer', fontSize: 13 }}
              >
                <div>
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon d={[isOpen ? 'M6 9l6 6 6-6' : 'M9 6l6 6-6 6']} size={11} />
                    {a.name}
                  </div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                    {a.location} · {a.contacts.length} contact{a.contacts.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div>
                  <span className={'chip chip-dot tone-' + segMeta.tone} style={{ fontSize: 10 }}>{segMeta.label}</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: tierMeta.color, border: '1px solid ' + tierMeta.color, borderRadius: 4, padding: '1px 6px' }}>
                    {tierMeta.label}
                  </span>
                </div>
                <div>
                  <span className={'chip chip-dot tone-' + statusMeta.tone} style={{ fontSize: 10 }}>{statusMeta.label}</span>
                </div>
                <div className="mono" style={{ fontSize: 11.5, color: touchColor }}>
                  {lastTouch}
                  {a.daysSinceTouch !== null && a.daysSinceTouch > 0 && (
                    <span className="muted" style={{ fontSize: 10, marginLeft: 4 }}>
                      ({a.daysSinceTouch}d)
                    </span>
                  )}
                </div>
                <div style={{ textAlign: 'center' }}>
                  {a.signals.length > 0 ? (
                    <span className="mono" style={{ fontSize: 11, fontWeight: 700, background: 'var(--accent)', color: 'var(--surface)', borderRadius: 999, padding: '2px 8px' }}>
                      {a.signals.length}
                    </span>
                  ) : (
                    <span className="muted mono" style={{ fontSize: 11 }}>—</span>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={(e) => { e.stopPropagation(); onLogTouchpoint(a.id); }}
                  >
                    + Log touch
                  </button>
                </div>
              </div>

              {isOpen && (
                <div style={{ borderTop: '1px solid var(--line-soft)', padding: '14px 18px', background: 'var(--surface-2)' }}>
                  {/* Reasoning */}
                  <div style={{ marginBottom: 14, fontSize: 12, fontStyle: 'italic', color: 'var(--ink-2)' }}>
                    "{a.reasoning}"
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                    {/* Contacts */}
                    <div>
                      <div className="mono muted" style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                        Contacts
                      </div>
                      {a.contacts.length === 0 && (
                        <div className="muted" style={{ fontSize: 12, fontStyle: 'italic' }}>
                          No contacts yet — research and add buyers at this firm
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {a.contacts.map((c: any) => {
                          const roleMeta = ROLE_META[c.role] || ROLE_META.user;
                          return (
                            <div key={c.id} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '8px 10px', fontSize: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ fontWeight: 600 }}>{c.name}</div>
                                <span className={'chip chip-dot tone-' + roleMeta.tone} style={{ fontSize: 9 }}>{roleMeta.label}</span>
                              </div>
                              <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{c.title}</div>
                              <div className="mono muted" style={{ fontSize: 10.5, marginTop: 4 }}>
                                {c.email}{c.linkedin && <> · {c.linkedin}</>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Timeline */}
                    <div>
                      <div className="mono muted" style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                        Touchpoint timeline
                      </div>
                      {a.touchpoints.length === 0 && (
                        <div className="muted" style={{ fontSize: 12, fontStyle: 'italic' }}>
                          No touchpoints logged yet
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {a.touchpoints.slice(0, 4).map((t: any) => {
                          const touchMeta = TOUCH_META[t.channel] || TOUCH_META.note;
                          const arrow = t.direction === 'out' ? '↗' : '↙';
                          return (
                            <div key={t.id} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '8px 10px', fontSize: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span className={'chip chip-dot tone-' + touchMeta.tone} style={{ fontSize: 9 }}>{touchMeta.label}</span>
                                  <span className="mono muted" style={{ fontSize: 10 }}>{arrow}</span>
                                </div>
                                <span className="mono muted" style={{ fontSize: 10.5 }}>{relPast(t.at)}</span>
                              </div>
                              <div style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{t.notes}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Signals */}
                  {a.signals.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div className="mono muted" style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                        Fresh signals
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {a.signals.map((s: any) => {
                          const sigMeta = SIGNAL_META[s.kind] || SIGNAL_META.news;
                          return (
                            <div key={s.id} style={{ background: 'var(--accent-soft, var(--surface))', border: '1px solid var(--accent)', borderRadius: 'var(--r-sm)', padding: '8px 10px', fontSize: 12, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                              <span className={'chip chip-dot tone-' + sigMeta.tone} style={{ fontSize: 9, flexShrink: 0 }}>{sigMeta.label}</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{s.summary}</div>
                                {s.source_url && <div className="mono muted" style={{ fontSize: 10.5, marginTop: 2 }}>{s.source_url}</div>}
                              </div>
                              <span className="mono muted" style={{ fontSize: 10.5, flexShrink: 0 }}>{relPast(s.at)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)', fontSize: 13 }}>
            No accounts match these filters
          </div>
        )}
      </div>
    </div>
  );
}

function CoverageTile({ label, value, tone, sub }: { label: string; value: string; tone: string; sub?: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: '10px 12px' }}>
      <div className="mono muted" style={{ fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: `var(--${tone})`, lineHeight: 1.1, marginTop: 2 }}>
        {value}
      </div>
      {sub && <div className="mono muted" style={{ fontSize: 10, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function AddAccountModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (form: any) => void }) {
  const [form, setForm] = useState({
    name: '',
    website: '',
    location: 'Charlotte, NC',
    segment: 'restaurant',
    tier: 1,
    reasoning: ''
  });

  useEffect(() => {
    if (open) {
      setForm({ name: '', website: '', location: 'Charlotte, NC', segment: 'restaurant', tier: 1, reasoning: '' });
    }
  }, [open]);

  if (!open) return null;

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="drawer-overlay open" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseDown={onClose}>
      <div className="elm-modal" style={{ maxWidth: 560 }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="elm-head">
          <div>
            <h3 className="elm-title">Add target account</h3>
            <div className="elm-eyebrow">Company you want work from</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
        <div className="elm-body">
          <div className="elm-field">
            <label className="elm-label">Company</label>
            <input className="elm-input" value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
          </div>
          <div className="elm-row-2">
            <div className="elm-field">
              <label className="elm-label">Website</label>
              <input className="elm-input mono" value={form.website} onChange={e => set('website', e.target.value)} placeholder="company.com" />
            </div>
            <div className="elm-field">
              <label className="elm-label">Location</label>
              <input className="elm-input" value={form.location} onChange={e => set('location', e.target.value)} />
            </div>
          </div>
          <div className="elm-row-2">
            <div className="elm-field">
              <label className="elm-label">Segment</label>
              <select className="elm-input" value={form.segment} onChange={e => set('segment', e.target.value)}>
                {Object.entries(SEGMENT_META).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
              </select>
            </div>
            <div className="elm-field">
              <label className="elm-label">Tier</label>
              <select className="elm-input" value={form.tier} onChange={e => set('tier', Number(e.target.value))}>
                <option value={1}>T1 - must win</option>
                <option value={2}>T2 - strong fit</option>
                <option value={3}>T3 - wider net</option>
              </select>
            </div>
          </div>
          <div className="elm-field">
            <label className="elm-label">Why this account matters</label>
            <textarea className="elm-input elm-textarea" value={form.reasoning} onChange={e => set('reasoning', e.target.value)} />
          </div>
        </div>
        <div className="elm-foot">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!form.name.trim()} onClick={() => onSave(form)}>Add account</button>
        </div>
      </div>
    </div>
  );
}

function AddSourceModal({
  open,
  feed,
  onClose,
  onSave
}: {
  open: boolean;
  feed?: any;
  onClose: () => void;
  onSave: (form: any) => void;
}) {
  const [form, setForm] = useState({
    name: '',
    type: 'clay',
    cadence: 'manual',
    search_brief: '',
    segment: 'restaurant',
    tier_default: 2,
    geography: ''
  });

  useEffect(() => {
    if (open) {
      if (feed) {
        setForm({
          name: feed.name || '',
          type: feed.type || 'clay',
          cadence: feed.cadence || 'manual',
          search_brief: feed.search_brief || '',
          segment: feed.segment || 'restaurant',
          tier_default: feed.tier_default || 2,
          geography: feed.geography || ''
        });
      } else {
        setForm({
          name: '',
          type: 'clay',
          cadence: 'manual',
          search_brief: '',
          segment: 'restaurant',
          tier_default: 2,
          geography: 'Charlotte, NC'
        });
      }
    }
  }, [open, feed]);

  if (!open) return null;

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="drawer-overlay open" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onMouseDown={onClose}>
      <div className="elm-modal" style={{ maxWidth: 560 }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="elm-head">
          <div>
            <h3 className="elm-title">{feed ? 'Edit Lead Source' : 'Connect Lead Source'}</h3>
            <div className="elm-eyebrow">Define a source to automatically ingest companies into your target accounts</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
        <div className="elm-body">
          <div className="elm-row-2">
            <div className="elm-field">
              <label className="elm-label">Source Name</label>
              <input className="elm-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g., Charlotte Restaurants (Clay)" autoFocus />
            </div>
            <div className="elm-field">
              <label className="elm-label">Source Type</label>
              <select className="elm-input" value={form.type} onChange={e => set('type', e.target.value)}>
                <option value="clay">Clay.com Ingest</option>
                <option value="scraper">Local Scraper/Crawler</option>
                <option value="apify">Apify Integration</option>
                <option value="webhook">Generic Webhook</option>
              </select>
            </div>
          </div>

          <div className="elm-row-2">
            <div className="elm-field">
              <label className="elm-label">Ingestion Cadence</label>
              <select className="elm-input" value={form.cadence} onChange={e => set('cadence', e.target.value)}>
                <option value="manual">Manual Trigger / On Demand</option>
                <option value="hourly">Hourly Sync</option>
                <option value="daily">Daily Sweep</option>
                <option value="weekly">Weekly Cadence</option>
                <option value="monthly">Monthly Audit</option>
              </select>
            </div>
            <div className="elm-field">
              <label className="elm-label">Target Geography</label>
              <input className="elm-input" value={form.geography} onChange={e => set('geography', e.target.value)} placeholder="e.g. NYC, Long Island, NJ" />
            </div>
          </div>

          <div className="elm-row-2">
            <div className="elm-field">
              <label className="elm-label">Default Segment</label>
              <select className="elm-input" value={form.segment} onChange={e => set('segment', e.target.value)}>
                {Object.entries(SEGMENT_META).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
              </select>
            </div>
            <div className="elm-field">
              <label className="elm-label">Default Account Tier</label>
              <select className="elm-input" value={form.tier_default} onChange={e => set('tier_default', Number(e.target.value))}>
                <option value={1}>T1 - Key Account</option>
                <option value={2}>T2 - Good Match</option>
                <option value={3}>T3 - Wide Net</option>
              </select>
            </div>
          </div>

          <div className="elm-field">
            <label className="elm-label">Search Brief / Ingestion Targets</label>
            <textarea 
              className="elm-input elm-textarea" 
              style={{ minHeight: 80 }} 
              value={form.search_brief} 
              onChange={e => set('search_brief', e.target.value)} 
              placeholder="Define criteria (e.g. Find independent restaurants and cafés in the Charlotte metro area with outdated websites and 5–50 employees)"
            />
          </div>
        </div>
        <div className="elm-foot">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!form.name.trim()} onClick={() => onSave(form)}>{feed ? 'Save Changes' : 'Connect Source'}</button>
        </div>
      </div>
    </div>
  );
}

function LogTouchpointModal({ account, open, onClose, onSave }: { account: any; open: boolean; onClose: () => void; onSave: (form: any) => void }) {
  const [form, setForm] = useState({ channel: 'email', direction: 'out', outcome: 'logged', notes: '' });

  useEffect(() => {
    if (open) setForm({ channel: 'email', direction: 'out', outcome: 'logged', notes: '' });
  }, [open]);

  if (!open || !account) return null;

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="drawer-overlay open" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseDown={onClose}>
      <div className="elm-modal" style={{ maxWidth: 520 }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="elm-head">
          <div>
            <h3 className="elm-title">Log touch</h3>
            <div className="elm-eyebrow">{account.name}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
        <div className="elm-body">
          <div className="elm-row-2">
            <div className="elm-field">
              <label className="elm-label">Channel</label>
              <select className="elm-input" value={form.channel} onChange={e => set('channel', e.target.value)}>
                {Object.entries(TOUCH_META).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
              </select>
            </div>
            <div className="elm-field">
              <label className="elm-label">Direction</label>
              <select className="elm-input" value={form.direction} onChange={e => set('direction', e.target.value)}>
                <option value="out">Outbound</option>
                <option value="in">Inbound</option>
              </select>
            </div>
          </div>
          <div className="elm-field">
            <label className="elm-label">Outcome</label>
            <input className="elm-input" value={form.outcome} onChange={e => set('outcome', e.target.value)} placeholder="positive, pending, no reply..." />
          </div>
          <div className="elm-field">
            <label className="elm-label">Notes</label>
            <textarea className="elm-input elm-textarea" value={form.notes} onChange={e => set('notes', e.target.value)} autoFocus />
          </div>
        </div>
        <div className="elm-foot">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!form.notes.trim()} onClick={() => onSave(form)}>Log touch</button>
        </div>
      </div>
    </div>
  );
}

function ApolloImportModal({
  open,
  onClose,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (candidate: any, tier: number) => Promise<void>;
}) {
  const [query, setQuery] = useState('Independent restaurants');
  const [location, setLocation] = useState('Charlotte, NC');
  const [segment, setSegment] = useState('restaurant');
  const [tier, setTier] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [candidates, setCandidates] = useState<any[]>([]);
  const [imported, setImported] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setError('');
      setCandidates([]);
      setImported(new Set());
    }
  }, [open]);

  if (!open) return null;

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('apollo-research', {
        body: {
          action: 'search_companies',
          query: query.trim(),
          location: location.trim(),
          segment,
          per_page: 12,
        },
      });

      if (invokeError) throw new Error(invokeError.message);
      if (data?.success === false) throw new Error(data.error || 'Apollo search failed');
      setCandidates(data?.candidates || []);
    } catch (err: any) {
      setError(err.message || 'Apollo search failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleImport(candidate: any) {
    await onImport(candidate, tier);
    const key = candidate.external_id || candidate.website || candidate.name;
    setImported(prev => new Set([...prev, key]));
  }

  return (
    <div className="drawer-overlay open" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseDown={onClose}>
      <div className="elm-modal" style={{ maxWidth: 760 }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="elm-head">
          <div>
            <h3 className="elm-title">Import from Apollo</h3>
            <div className="elm-eyebrow">Find companies, review, then add target accounts</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
        <div className="elm-body">
          <div className="elm-row-2">
            <div className="elm-field">
              <label className="elm-label">Search</label>
              <input className="elm-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Independent restaurants" autoFocus />
            </div>
            <div className="elm-field">
              <label className="elm-label">Location</label>
              <input className="elm-input" value={location} onChange={e => setLocation(e.target.value)} placeholder="Charlotte, NC" />
            </div>
          </div>
          <div className="elm-row-2">
            <div className="elm-field">
              <label className="elm-label">Default segment</label>
              <select className="elm-input" value={segment} onChange={e => setSegment(e.target.value)}>
                {Object.entries(SEGMENT_META).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
              </select>
            </div>
            <div className="elm-field">
              <label className="elm-label">Default tier</label>
              <select className="elm-input" value={tier} onChange={e => setTier(Number(e.target.value))}>
                <option value={1}>T1 - must win</option>
                <option value={2}>T2 - strong fit</option>
                <option value={3}>T3 - wider net</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-primary" disabled={loading || !query.trim()} onClick={handleSearch}>
              {loading ? 'Searching...' : 'Search Apollo'}
            </button>
            {error && <span style={{ color: 'var(--red)', fontSize: 12 }}>{error}</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {candidates.map(candidate => {
              const key = candidate.external_id || candidate.website || candidate.name;
              const isImported = imported.has(key);
              const segMeta = SEGMENT_META[candidate.segment] || SEGMENT_META[segment] || SEGMENT_META.restaurant;
              return (
                <div key={key} style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: '10px 12px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <strong>{candidate.name}</strong>
                      <span className={'chip chip-dot tone-' + segMeta.tone} style={{ fontSize: 9 }}>{segMeta.label}</span>
                    </div>
                    <div className="mono muted" style={{ fontSize: 10.5, marginTop: 2 }}>
                      {candidate.website || 'No website'} · {candidate.location || 'No location'}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 4, lineHeight: 1.4 }}>
                      {candidate.reasoning}
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-sm" disabled={isImported} onClick={() => handleImport(candidate)}>
                    {isImported ? 'Imported' : '+ Add account'}
                  </button>
                </div>
              );
            })}
            {!loading && candidates.length === 0 && (
              <div className="muted" style={{ textAlign: 'center', padding: 24, fontSize: 13 }}>
                Search Apollo to review candidate target accounts.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Leads Signals (ABM intent triage) ───────────────────────────────────────────
// The Signals tab replaces the Inbox in the ABM model. Instead of triaging
// scraped leads, you triage *events* that say "this named account is ready."
interface LeadsSignalsProps {
  signals: any[];
  accounts: any[];
  onReview: (id: string) => void;
  onCreateTask: (id: string) => void;
  onDismiss: (id: string) => void;
}

function LeadsSignals({ signals, accounts, onReview, onCreateTask, onDismiss }: LeadsSignalsProps) {
  const [kindFilter, setKindFilter] = useState<string>('all');
  const accountMap = useMemo(() => {
    const m: Record<string, any> = {};
    accounts.forEach(a => { m[a.id] = a; });
    return m;
  }, [accounts]);

  const unreviewed = signals.filter(s => !s.reviewed);
  const filtered = kindFilter === 'all'
    ? unreviewed
    : unreviewed.filter(s => s.kind === kindFilter);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div className="mono muted" style={{ fontSize: 12 }}>
          <strong style={{ color: 'var(--ink)' }}>{unreviewed.length}</strong> unreviewed signal{unreviewed.length !== 1 ? 's' : ''}
          {' · '}automated intent feeds populate this list
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'job_post', 'news', 'conference', 'funding', 'referral'] as const).map(k => (
            <button key={k} onClick={() => setKindFilter(k)}
              className={'btn btn-sm ' + (kindFilter === k ? 'btn-primary' : 'btn-ghost')}>
              {k === 'all' ? 'All' : (SIGNAL_META[k]?.label || k)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(s => {
          const meta = SIGNAL_META[s.kind] || SIGNAL_META.news;
          const account = s.account_id ? accountMap[s.account_id] : null;
          return (
            <div key={s.id} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: `var(--${meta.tone})` }}>
                <Icon d={meta.icon} size={14} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span className={'chip chip-dot tone-' + meta.tone} style={{ fontSize: 9 }}>{meta.label}</span>
                  {account ? (
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{account.name}</span>
                  ) : (
                    <span className="chip chip-dot tone-amber" style={{ fontSize: 9 }}>NEW ACCOUNT</span>
                  )}
                  <span className="mono muted" style={{ fontSize: 11 }}>· {relPast(s.at)}</span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.45 }}>{s.summary}</div>
                {s.source_url && (
                  <div className="mono muted" style={{ fontSize: 10.5, marginTop: 4 }}>{s.source_url}</div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => onReview(s.id)}>
                  {account ? 'Log touch' : 'Review'}
                </button>
                {account && (
                  <button className="btn btn-ghost btn-sm" onClick={() => onCreateTask(s.id)}>
                    + Follow-up
                  </button>
                )}
                {!account && (
                  <button className="btn btn-ghost btn-sm" onClick={() => onCreateTask(s.id)}>
                    + Research task
                  </button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => onDismiss(s.id)} style={{ color: 'var(--ink-3)' }}>
                  Dismiss
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)', fontSize: 13 }}>
            No signals to triage. New intent events will land here.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Leads Inbox ─────────────────────────────────────────────────────────────────
interface LeadsInboxProps {
  items: any[];
  sources: any[];
  onApprove: (item: any) => void;
  onReject: (id: string) => void;
  onMerge: (item: any) => void;
}

function LeadsInbox({ items, sources, onApprove, onReject, onMerge }: LeadsInboxProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const sourceMap = useMemo(() => {
    const m: Record<string, any> = {};
    sources.forEach(s => { m[s.id] = s; });
    return m;
  }, [sources]);

  const filtered = sourceFilter === 'all' ? items : items.filter(i => i.source_id === sourceFilter);
  const allChecked  = selected.size > 0 && selected.size === filtered.length;
  const someChecked = selected.size > 0 && !allChecked;

  function toggle(id: string) {
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function qualityColor(q: number) {
    if (q >= 80) return 'var(--green)';
    if (q >= 50) return 'var(--amber)';
    return 'var(--red)';
  }

  const GRID = '32px 1fr 160px 120px 90px 100px 130px';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div className="mono muted" style={{ fontSize: 12 }}>
          <strong style={{ color: 'var(--ink)' }}>{items.length}</strong> awaiting review · auto-scored & deduped
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="muted" style={{ fontSize: 11.5 }}>Source</span>
          <select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '5px 10px', fontSize: 12, color: 'var(--ink)' }}
          >
            <option value="all">All sources</option>
            {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="lt-bulkbar">
          <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{selected.size} selected</span>
          <div className="lt-bulkbar-actions">
            <button className="btn btn-primary btn-sm" onClick={() => {
              filtered.forEach(i => { if (selected.has(i.id)) onApprove(i); });
              setSelected(new Set());
            }}>Approve → Pipeline</button>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => {
              selected.forEach(id => onReject(id));
              setSelected(new Set());
            }}>Reject</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        </div>
      )}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: GRID, padding: '10px 14px', borderBottom: '1px solid var(--line)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 600, background: 'var(--surface-2)', alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={allChecked}
            ref={el => { if (el) el.indeterminate = someChecked; }}
            onChange={() => setSelected(allChecked ? new Set() : new Set(filtered.map(i => i.id)))}
          />
          <span>Lead</span>
          <span>Source</span>
          <span>Quality</span>
          <span>Dedup</span>
          <span>Received</span>
          <span style={{ textAlign: 'right' }}>Action</span>
        </div>

        {filtered.length === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
            Inbox empty — nothing waiting from your bots right now.
          </div>
        )}

        {filtered.map(item => {
          const src = sourceMap[item.source_id];
          const meta = src ? (SOURCE_TYPE_META[src.type] || SOURCE_TYPE_META.scraper) : SOURCE_TYPE_META.scraper;
          const isSel = selected.has(item.id);
          return (
            <div key={item.id} style={{ display: 'grid', gridTemplateColumns: GRID, padding: '12px 14px', borderBottom: '1px solid var(--line-soft)', alignItems: 'center', background: isSel ? 'var(--surface-2)' : 'transparent' }}>
              <input type="checkbox" checked={isSel} onChange={() => toggle(item.id)} />

              <div style={{ minWidth: 0, paddingRight: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                <div className="mono muted" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
                  {item.phone ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: item.phone_valid ? 'var(--green)' : 'var(--red)' }} />
                      {item.phone}
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--red)' }} />
                      no phone
                    </span>
                  )}
                  {item.email && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: item.email_valid ? 'var(--green)' : 'var(--red)' }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>{item.email}</span>
                    </span>
                  )}
                  {item.address && <span>· {item.address}</span>}
                </div>
              </div>

              <div style={{ overflow: 'hidden' }}>
                <span className={'chip chip-dot tone-' + meta.tone} style={{ fontSize: 10, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>
                  {src ? src.name : 'Unknown'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingRight: 12 }}>
                <div style={{ flex: 1, height: 5, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${item.quality}%`, background: qualityColor(item.quality) }} />
                </div>
                <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: qualityColor(item.quality), minWidth: 24, textAlign: 'right' }}>{item.quality}</span>
              </div>

              <div>
                {item.dup_of ? (
                  <span className="chip tone-amber" style={{ fontSize: 10 }} title={item.dup_of}>⚠ dup?</span>
                ) : (
                  <span className="mono muted" style={{ fontSize: 11 }}>—</span>
                )}
              </div>

              <div className="mono muted" style={{ fontSize: 11.5 }}>{relPast(item.received_at)}</div>

              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                {item.dup_of && (
                  <button className="btn btn-ghost btn-sm" onClick={() => onMerge(item)} title="Merge into existing lead">Merge</button>
                )}
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onApprove(item)}
                  title="Approve → Pipeline / New"
                  style={{ padding: '4px 8px' }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => onReject(item.id)}
                  title="Reject"
                  style={{ padding: '4px 8px', color: 'var(--red)' }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Leads Table ─────────────────────────────────────────────────────────────────
interface LeadsTableProps {
  leads: any;
  cols: string[];
  search: string;
  onRowClick: (lead: any, stage: string) => void;
  onContextMenu: (e: React.MouseEvent, stage: string, lead: any) => void;
  onStageChange: (fromCol: string, toCol: string, leadId: string) => void;
  onArchive: (fromCol: string, id: string, outcome: string) => void;
  onDelete: (fromCol: string, id: string) => void;
  justAddedId: string | null;
}

function LeadsTable({ leads, cols, search, onRowClick, onContextMenu, onStageChange, onArchive, onDelete, justAddedId }: LeadsTableProps) {
  const [sortKey, setSortKey] = useState('age');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Flatten
  const flat = useMemo(() => {
    const arr: any[] = [];
    cols.forEach(c => (leads[c] || []).forEach((l: any) => arr.push({ ...l, stage: c })));
    return arr;
  }, [leads, cols]);

  const filtered = useMemo(() => {
    if (!search) return flat;
    const q = search.toLowerCase();
    return flat.filter(l =>
      l.name.toLowerCase().includes(q) ||
      l.contact.toLowerCase().includes(q) ||
      l.phone.includes(q) ||
      l.address.toLowerCase().includes(q) ||
      l.type.toLowerCase().includes(q) ||
      l.source.toLowerCase().includes(q)
    );
  }, [flat, search]);

  function ageScore(createdStr: string) {
    if (!createdStr) return 9999;
    return new Date(createdStr).getTime();
  }

  const stageOrder: Record<string, number> = { New: 0, Contacted: 1, Quoted: 2 };

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let av: any, bv: any;
      switch (sortKey) {
        case 'name':    av = a.name.toLowerCase();    bv = b.name.toLowerCase();    break;
        case 'contact': av = a.contact.toLowerCase(); bv = b.contact.toLowerCase(); break;
        case 'stage':   av = stageOrder[a.stage];     bv = stageOrder[b.stage];     break;
        case 'type':    av = a.type;                  bv = b.type;                  break;
        case 'source':  av = a.source;                bv = b.source;                break;
        case 'value':   av = a.value;                 bv = b.value;                 break;
        case 'age':     av = ageScore(a.created_at);  bv = ageScore(b.created_at);  break;
        default:        av = 0; bv = 0;
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(k: string) {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir(k === 'value' ? 'desc' : 'asc'); }
  }

  function toggleRow(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(prev => prev.size === sorted.length ? new Set() : new Set(sorted.map(l => l.id)));
  }

  const allChecked  = selected.size > 0 && selected.size === sorted.length;
  const someChecked = selected.size > 0 && !allChecked;

  const SortHead = ({ k, label, align }: { k: string; label: string; align?: 'right' }) => (
    <th onClick={() => toggleSort(k)} className={'lt-sort' + (align === 'right' ? ' lt-right' : '')} style={{ cursor: 'pointer' }}>
      <span>{label}</span>
      <svg className={'lt-sort-icon' + (sortKey === k ? ' is-active' : '')}
        width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
        style={{ transform: sortKey === k && sortDir === 'desc' ? 'rotate(180deg)' : 'none', marginLeft: '4px', display: 'inline-block' }}>
        <polyline points="6 15 12 9 18 15" />
      </svg>
    </th>
  );

  const STAGE_TONE: Record<string, string> = { New: 'blue', Contacted: 'violet', Quoted: 'amber' };
  const totalVal = sorted.reduce((a, l) => a + l.value, 0);

  function formatAge(createdStr: string) {
    if (!createdStr) return '';
    const diff = Math.round((new Date().getTime() - new Date(createdStr).getTime()) / 60000);
    if (diff < 60) return diff + 'm';
    const h = Math.round(diff / 60);
    if (h < 24) return h + 'h';
    return Math.round(diff / 1440) + 'd';
  }

  return (
    <div className="lt-wrap">
      {selected.size > 0 && (
        <div className="lt-bulkbar">
          <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>
            {selected.size} selected
          </span>
          <div className="lt-bulkbar-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => {
              selected.forEach(id => {
                const lead = sorted.find(l => l.id === id);
                if (lead) onArchive(lead.stage, id, 'Won');
              });
              setSelected(new Set());
            }}>Mark Won</button>
            <button className="btn btn-secondary btn-sm" onClick={() => {
              selected.forEach(id => {
                const lead = sorted.find(l => l.id === id);
                if (lead) onArchive(lead.stage, id, 'Lost');
              });
              setSelected(new Set());
            }}>Mark Lost</button>
            <button className="btn btn-ghost btn-sm" onClick={() => {
              selected.forEach(id => {
                const lead = sorted.find(l => l.id === id);
                if (lead) onDelete(lead.stage, id);
              });
              setSelected(new Set());
            }} style={{ color: 'var(--red)' }}>Delete</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        </div>
      )}

      <div className="lt-scroll">
        <table className="lt-table">
          <thead>
            <tr>
              <th className="lt-check-col">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={el => { if (el) el.indeterminate = someChecked; }}
                  onChange={toggleAll}
                />
              </th>
              <SortHead k="name"    label="Name" />
              <SortHead k="contact" label="Contact" />
              <th>Phone</th>
              <th>Email</th>
              <th>Address</th>
              <SortHead k="stage"   label="Stage" />
              <SortHead k="type"    label="Type" />
              <SortHead k="source"  label="Source" />
              <SortHead k="value"   label="Value" align="right" />
              <SortHead k="age"     label="Age" align="right" />
            </tr>
          </thead>
          <tbody>
            {sorted.map(l => (
              <tr
                key={l.id}
                className={
                  (selected.has(l.id) ? 'is-selected ' : '') +
                  (justAddedId === l.id ? 'is-just-added' : '')
                }
                onClick={() => onRowClick(l, l.stage)}
                onContextMenu={(e) => onContextMenu(e, l.stage, l)}
              >
                <td className="lt-check-col" onClick={e => { e.stopPropagation(); toggleRow(l.id); }}>
                  <input type="checkbox" checked={selected.has(l.id)} onChange={() => {}} />
                </td>
                <td className="lt-name">
                  <div className="lt-name-row" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {l.name}
                    {l.hot && <span className="lt-flame" title="Hot lead">🔥</span>}
                  </div>
                </td>
                <td>{l.contact}</td>
                <td className="mono lt-phone">
                  {l.phone ? (
                    <a
                      href={`tel:${l.phone.replace(/\D/g, '')}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: 'inherit', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      title="Click to dial"
                      className="hover-accent"
                    >
                      <Icon d={['M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z']} size={11} />
                      {l.phone}
                    </a>
                  ) : '—'}
                </td>
                <td className="mono lt-email">
                  {l.email ? (
                    <a
                      href={`mailto:${l.email}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: 'inherit', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      title="Click to email"
                      className="hover-accent"
                    >
                      <Icon d={['M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z', 'M22 6l-10 7-10-7']} size={11} />
                      {l.email}
                    </a>
                  ) : '—'}
                </td>
                <td className="lt-address">{l.address}</td>
                <td onClick={e => e.stopPropagation()}>
                  <select
                    className={'lt-stage-pill tone-' + STAGE_TONE[l.stage]}
                    value={l.stage}
                    onChange={e => onStageChange(l.stage, e.target.value, l.id)}
                  >
                    {cols.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                <td>
                  <span className="chip" style={{ fontSize: 10 }}>{l.type}</span>
                </td>
                <td className="muted" style={{ fontSize: 12 }}>{l.source}</td>
                <td className="mono lt-right lt-value">
                  {l.value > 0 ? '$' + l.value.toLocaleString() : '—'}
                </td>
                <td className="mono lt-right muted" style={{ fontSize: '11.5px' }}>{formatAge(l.created_at)}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={11} className="lt-empty">No leads match your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="lt-foot mono">
        <span>{sorted.length} of {flat.length} lead{flat.length !== 1 ? 's' : ''}</span>
        <span>·</span>
        <span>Total value: <strong style={{ color: 'var(--ink)' }}>${totalVal.toLocaleString()}</strong></span>
      </div>
    </div>
  );
}

// ── New Lead Panel ───────────────────────────────────────────────────────────────
const SOURCES = [
  { id: 'referral',  label: 'Referral',  icon: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M20 8v6 M23 11h-6' },
  { id: 'ads',       label: 'Ads',       icon: 'M3 11l18-7v16l-18-7v-2z M11 16v3a2 2 0 1 1-4 0v-2' },
  { id: 'warm',      label: 'Warm call', icon: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81 M16 4l3 3 M19 4l-3 3' },
  { id: 'cold',      label: 'Cold call', icon: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81' },
  { id: 'walkin',    label: 'Walk-in',   icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10' },
  { id: 'event',     label: 'Event',     icon: 'M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z M16 2v4 M8 2v4 M3 10h18' },
];

const TYPES = [
  { id: 'healthcare',    label: 'Healthcare',           tone: 'green'  },
  { id: 'service',       label: 'Service booking',      tone: 'blue'   },
  { id: 'quote',         label: 'Quote',                tone: 'amber'  },
  { id: 'restaurant',    label: 'Restaurant',           tone: 'amber'  },
  { id: 'retail',        label: 'Retail',               tone: 'violet' },
  { id: 'professional',  label: 'Professional services',tone: 'blue'   },
  { id: 'membership',    label: 'Membership',           tone: 'violet' },
  { id: 'barber',        label: 'Barber',               tone: 'violet' },
  { id: 'events',        label: 'Events',               tone: 'amber'  },
  { id: 'realestate',    label: 'Real estate',          tone: 'green'  },
  { id: 'custom',        label: 'Custom',               tone: ''       },
];

const VALUE_PRESETS = [1000, 3000, 5000, 10000];

const STAGES = ['New', 'Contacted', 'Qualified', 'Quoted'];

interface NewLeadPanelProps {
  open: boolean;
  onClose: () => void;
  onSave: (stage: string, lead: any) => void;
  defaultStage?: string;
}

function NewLeadPanel({ open, onClose, onSave, defaultStage = 'New' }: NewLeadPanelProps) {
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [address, setAddress] = useState('');
  const [source, setSource] = useState('referral');
  const [type, setType] = useState('');
  const [value, setValue] = useState('');
  const [hot, setHot] = useState(false);
  const [stage, setStage] = useState(defaultStage);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [notes, setNotes] = useState('');
  const [rapidMode, setRapidMode] = useState(false);

  const phoneRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && phoneRef.current) {
      const t = setTimeout(() => phoneRef.current?.focus(), 220);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => { setStage(defaultStage); }, [defaultStage, open]);

  function reset() {
    setPhone(''); setEmail(''); setName(''); setContact(''); setAddress('');
    setSource('referral'); setType('');
    setValue(''); setHot(false); setStage(defaultStage);
    setShowAdvanced(false); setNotes('');
  }

  const valid = name.trim().length > 0 && phone.replace(/\D/g, '').length >= 10;

  function handleSave() {
    if (!valid) return;
    const lead = {
      name: name.trim(),
      contact: contact.trim() || name.trim(),
      phone,
      email: email.trim(),
      address: address.trim() || '—',
      source: SOURCES.find(s => s.id === source)?.label || 'Referral',
      type: TYPES.find(t => t.id === type)?.label || 'Custom',
      value: parseInt(value, 10) || 0,
      hot,
      notes: notes.trim() || undefined,
    };
    onSave(stage, lead);
    if (rapidMode) {
      reset();
      setTimeout(() => phoneRef.current?.focus(), 50);
    } else {
      reset();
      onClose();
    }
  }

  return (
    <React.Fragment>
      <div
        className={'lead-panel-scrim' + (open ? ' is-open' : '')}
        onClick={onClose}
      />
      <div className={'lead-panel' + (open ? ' is-open' : '')} role="dialog" aria-label="New lead">
        <div className="lead-panel-head">
          <div>
            <div className="lead-panel-eyebrow mono">New lead</div>
            <h2 className="lead-panel-title">Capture a lead</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <Icon d={Icons.x} size={18} />
          </button>
        </div>

        <div className="lead-panel-body">
          {/* Source chips */}
          <div className="lp-field">
            <label className="lp-label">Source</label>
            <div className="lp-source-grid">
              {SOURCES.map(s => (
                <button
                  key={s.id}
                  type="button"
                  className={'lp-source-btn' + (source === s.id ? ' is-active' : '')}
                  onClick={() => setSource(s.id)}
                >
                  <Icon d={typeof s.icon === 'string' ? [s.icon] : s.icon} size={16} />
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Phone and Email row */}
          <div className="lp-row-2">
            <div className="lp-phone-block">
              <label className="lp-label">Phone <span className="lp-req">required</span></label>
              <input
                ref={phoneRef}
                className="lp-phone-input mono"
                placeholder="(___) ___-____"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                inputMode="tel"
              />
            </div>
            <div className="lp-field" style={{ justifyContent: 'center' }}>
              <label className="lp-label">Email address</label>
              <input
                className="lp-input"
                placeholder="e.g. nicolas@example.com"
                value={email}
                type="email"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="lp-row-2">
            <div className="lp-field">
              <label className="lp-label">Business name <span className="lp-req">required</span></label>
              <input
                className="lp-input"
                placeholder="e.g. Joe's Diner"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="lp-field">
              <label className="lp-label">Contact name</label>
              <input
                className="lp-input"
                placeholder="e.g. Joe Marchetti"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </div>
          </div>

          <div className="lp-field">
            <label className="lp-label">Address</label>
            <input
              className="lp-input"
              placeholder="Street, city, state"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          {/* Project type */}
          <div className="lp-field">
            <label className="lp-label">Project type</label>
            <div className="lp-chip-row">
              {TYPES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  className={'lp-chip-btn' + (type === t.id ? ' is-active tone-' + t.tone : '')}
                  onClick={() => setType(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Value presets */}
          <div className="lp-field">
            <label className="lp-label">Estimated value</label>
            <div className="lp-value-row">
              <div className="lp-value-input-wrap">
                <span className="lp-value-prefix">$</span>
                <input
                  className="lp-input lp-value-input mono"
                  placeholder="0"
                  value={value}
                  onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
                  inputMode="numeric"
                />
              </div>
              <div className="lp-preset-row">
                {VALUE_PRESETS.map(v => (
                  <button
                    key={v}
                    type="button"
                    className={'lp-preset' + (parseInt(value, 10) === v ? ' is-active' : '')}
                    onClick={() => setValue(String(v))}
                  >
                    ${v >= 1000 ? (v / 1000) + 'k' : v}{v === 10000 ? '+' : ''}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Hot toggle */}
          <div className="lp-row-2">
            <div className="lp-field">
              <label className="lp-label">Stage</label>
              <div className="lp-stage-row">
                {STAGES.map(s => (
                  <button
                    key={s}
                    type="button"
                    className={'lp-stage-btn' + (stage === s ? ' is-active' : '')}
                    onClick={() => setStage(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="lp-field">
              <label className="lp-label">Priority</label>
              <button
                type="button"
                className={'lp-hot-btn' + (hot ? ' is-active' : '')}
                onClick={() => setHot(!hot)}
              >
                <span className="lp-hot-flame">{hot ? '🔥' : '○'}</span>
                <span>{hot ? 'Hot lead — follow up today' : 'Mark as hot'}</span>
              </button>
            </div>
          </div>

          {/* Advanced toggle */}
          <button
            type="button"
            className="lp-advanced-toggle"
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none' }}
          >
            <Icon d={showAdvanced ? Icons.chevronDown : Icons.chevronRight} size={13} />
            <span>{showAdvanced ? 'Hide' : 'Show'} advanced</span>
          </button>

          {showAdvanced && (
            <div className="lp-advanced" style={{ marginTop: '12px' }}>
              <div className="lp-field">
                <label className="lp-label">Notes</label>
                <textarea
                  className="lp-input lp-textarea"
                  placeholder="What did they say? What do they need?"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <div className="lead-panel-foot">
          <label className="lp-rapid" style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={rapidMode}
              onChange={(e) => setRapidMode(e.target.checked)}
            />
            <span>Rapid entry</span>
          </label>
          <div className="flex gap-8" style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" type="button" onClick={onClose}>Cancel</button>
            <button
              className="btn btn-primary btn-lg"
              type="button"
              onClick={handleSave}
              disabled={!valid}
            >
              <Icon d={Icons.plus} size={14} />
              Save lead
            </button>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

// ── Outreach Panel ───────────────────────────────────────────────────────────────
const TEMPLATES_LIBRARY = [
  {
    id: 'intro_email',
    name: 'Intro & Call Schedule',
    type: 'Email',
    stage: 'New',
    subject: 'Demo Surface Co. — Quote Request Follow-up',
    body: `Hi [Contact],

Thank you for reaching out to Demo Surface Co.! We received your request for an estimate regarding the [Coating] project at [Address].

I'd love to ask a couple of quick questions about your floor condition to make sure we give you a precise quote. Do you have 5 minutes for a quick call today or tomorrow? 

Best regards,
[Owner]
[Company]
[Phone]`
  },
  {
    id: 'intro_sms',
    name: 'Intro & Schedule Text',
    type: 'SMS',
    stage: 'New',
    body: `Hi [Contact], this is [Owner] with [Company]. Thanks for requesting a quote for your [Coating]! Do you have a few minutes today for a quick call to discuss the space at [Address]?`
  },
  {
    id: 'followup_email',
    name: 'Project Details Confirmation',
    type: 'Email',
    stage: 'Contacted',
    subject: 'Confirming your project details — [Company]',
    body: `Hi [Contact],

It was great speaking with you about your upcoming [Coating] project.

Just to confirm, we are looking at coating a total area of [Address] with our premium system. 

I am compiling the final estimate report and will send it over shortly. In the meantime, feel free to check out our gallery or reply with any questions.

Best,
[Owner]
[Company]
[Phone]`
  },
  {
    id: 'followup_sms',
    name: 'Brief Follow-up Text',
    type: 'SMS',
    stage: 'Contacted',
    body: `Hi [Contact]! Great speaking with you today about your [Coating] floor. I am preparing your estimate for the space at [Address] and will send it to your email shortly. Thanks, [Owner] ([Company]).`
  },
  {
    id: 'estimate_email',
    name: 'Estimate Review & Approval',
    type: 'Email',
    stage: 'Quoted',
    subject: 'Demo Surface Co. — Estimate for [Contact]',
    body: `Hi [Contact],

I have finalized the estimate for your [Coating] system at [Address].

The estimated total for the project is [Value], which includes all concrete grinding, surface preparation, cracks/pitted area repairs, and materials.

Please review the quote details and let me know if you would like to proceed and get scheduled on our calendar. We have a few slots open next week!

Best regards,
[Owner]
[Company]
[Phone]`
  },
  {
    id: 'estimate_sms',
    name: 'Estimate Ready Alert',
    type: 'SMS',
    stage: 'Quoted',
    body: `Hi [Contact]! Your estimate for the [Coating] project at [Address] is ready. The total is [Value], including all prep & materials. Let me know if this looks good to proceed and get you on the schedule! - [Owner], [Company]`
  },
  {
    id: 'stale_followup',
    name: 'Checking In (Nurturing)',
    type: 'Email',
    stage: 'Contacted',
    subject: 'Checking in on your floor coating project — [Company]',
    body: `Hi [Contact],

I wanted to check back in regarding the floor coating project we discussed for [Address]. 

Are you still planning to get the floors coated in the near future? I would be happy to answer any questions about the coating systems or adjust the scope if needed.

Looking forward to hearing from you.

Best,
[Owner]
[Company]
[Phone]`
  }
];

function compileTemplate(text: string, lead: any) {
  const coatingName = lead.type || 'floor coating';
  const valStr = lead.value > 0 ? `$${lead.value.toLocaleString()}` : '[pricing estimate]';
  const addressStr = lead.address && lead.address !== '—' ? lead.address : '[your address]';
  const contactName = lead.contact || lead.name || 'there';
  const ownerName = 'Nicolas Valdivieso';
  const companyName = 'Demo Surface Co.';
  const phoneStr = '(555) 010-0100';

  return text
    .replaceAll('[Contact]', contactName)
    .replaceAll('[Coating]', coatingName)
    .replaceAll('[Address]', addressStr)
    .replaceAll('[Value]', valStr)
    .replaceAll('[Owner]', ownerName)
    .replaceAll('[Company]', companyName)
    .replaceAll('[Phone]', phoneStr);
}

function OutreachPanel({ lead }: { lead: any }) {
  const [filterType, setFilterType] = useState<'all' | 'email' | 'sms'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const currentStage = lead.status || 'New';

  const filtered = TEMPLATES_LIBRARY.filter(t => {
    return filterType === 'all' || t.type.toLowerCase() === filterType;
  });

  const sorted = [...filtered].sort((a, b) => {
    const aMatch = a.stage === currentStage ? 1 : 0;
    const bMatch = b.stage === currentStage ? 1 : 0;
    return bMatch - aMatch;
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleEmailAction = (template: any) => {
    const subject = compileTemplate(template.subject || '', lead);
    const body = compileTemplate(template.body, lead);
    const mailto = `mailto:${encodeURIComponent(lead.email || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, '_blank');
  };

  const handleSMSAction = (template: any) => {
    const body = compileTemplate(template.body, lead);
    const sms = `sms:${encodeURIComponent(lead.phone || '')}?body=${encodeURIComponent(body)}`;
    window.open(sms, '_blank');
  };

  return (
    <div className="op-panel">
      <style>{`
        .op-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
          animation: op-fade-in 0.15s ease;
        }
        @keyframes op-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .op-filter-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--line-soft);
          padding-bottom: 12px;
          margin-bottom: 4px;
        }
        .op-filter-label {
          font-size: 11.5px;
          font-family: var(--mono);
          text-transform: uppercase;
          color: var(--ink-3);
          letter-spacing: 0.04em;
        }
        .op-filter-btns {
          display: flex;
          gap: 6px;
        }
        .op-filter-btn {
          background: var(--bg);
          border: 1px solid var(--line);
          border-radius: 99px;
          padding: 4px 10px;
          font-size: 11.5px;
          cursor: pointer;
          transition: all 0.12s;
        }
        .op-filter-btn:hover {
          border-color: var(--line-strong);
        }
        .op-filter-btn.active {
          background: var(--ink);
          color: var(--bg);
          border-color: var(--ink);
        }
        .op-list {
          display: grid;
          gap: 14px;
          max-height: 440px;
          overflow-y: auto;
          padding-right: 4px;
        }
        .op-card {
          background: var(--bg);
          border: 1px solid var(--line);
          border-radius: var(--r-lg);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          position: relative;
          transition: border-color 0.12s;
        }
        .op-card.recommended {
          border-color: var(--accent);
          background: var(--surface);
          box-shadow: 0 4px 12px rgba(194, 65, 12, 0.03);
        }
        .op-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .op-card-title {
          font-weight: 600;
          font-size: 13px;
          color: var(--ink);
        }
        .op-card-badges {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .op-badge-rec {
          background: var(--accent-soft);
          color: var(--accent);
          font-size: 9px;
          font-family: var(--mono);
          font-weight: 600;
          text-transform: uppercase;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .op-card-field {
          background: var(--bg);
          border: 1px solid var(--line-soft);
          border-radius: var(--r-md);
          padding: 10px 12px;
          font-size: 12.5px;
          font-family: var(--body);
          color: var(--ink-2);
          white-space: pre-wrap;
          line-height: 1.5;
        }
        .op-card-subject {
          margin-bottom: 6px;
          font-weight: 600;
          border-bottom: 1px solid var(--line-soft);
          padding-bottom: 6px;
          font-size: 12px;
        }
        .op-card-foot {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }
        .op-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--r-sm);
          padding: 5px 9px;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.12s, border-color 0.12s;
        }
        .op-action-btn:hover {
          background: var(--bg-2);
          border-color: var(--line-strong);
        }
        .op-action-btn.primary {
          background: var(--accent);
          color: white;
          border-color: var(--accent);
        }
        .op-action-btn.primary:hover {
          background: var(--accent-hover);
        }
      `}</style>

      <div className="op-filter-row">
        <span className="op-filter-label">Filter Templates</span>
        <div className="op-filter-btns">
          {[
            { id: 'all', label: 'All' },
            { id: 'email', label: 'Emails' },
            { id: 'sms', label: 'SMS' }
          ].map(btn => (
            <button
              key={btn.id}
              type="button"
              className={`op-filter-btn ${filterType === btn.id ? 'active' : ''}`}
              onClick={() => setFilterType(btn.id as any)}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="op-list">
        {sorted.map(t => {
          const compiledBody = compileTemplate(t.body, lead);
          const compiledSubject = t.subject ? compileTemplate(t.subject, lead) : '';
          const isRec = t.stage === currentStage;

          return (
            <div key={t.id} className={`op-card ${isRec ? 'recommended' : ''}`}>
              <div className="op-card-head">
                <div className="op-card-title">{t.name}</div>
                <div className="op-card-badges">
                  {isRec && <span className="op-badge-rec">Recommended</span>}
                  <span className={`chip tone-${t.type === 'Email' ? 'blue' : 'violet'}`} style={{ fontSize: 9, padding: '1px 6px' }}>
                    {t.type}
                  </span>
                </div>
              </div>

              <div className="op-card-field">
                {t.type === 'Email' && (
                  <div className="op-card-subject">
                    <span className="muted" style={{ marginRight: 4 }}>Subject:</span>
                    {compiledSubject}
                  </div>
                )}
                {compiledBody}
              </div>

              <div className="op-card-foot">
                <button
                  type="button"
                  className="op-action-btn"
                  onClick={() => handleCopy(t.type === 'Email' ? `Subject: ${compiledSubject}\n\n${compiledBody}` : compiledBody, t.id)}
                >
                  {copiedId === t.id ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span style={{ color: 'var(--green)' }}>Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      <span>Copy</span>
                    </>
                  )}
                </button>

                {t.type === 'Email' ? (
                  <button
                    type="button"
                    className="op-action-btn primary"
                    onClick={() => handleEmailAction(t)}
                    disabled={!lead.email}
                    title={lead.email ? 'Open draft in local mail app' : 'Lead does not have an email address'}
                    style={{ opacity: lead.email ? 1 : 0.5, cursor: lead.email ? 'pointer' : 'not-allowed' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <span>Open Email</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="op-action-btn primary"
                    onClick={() => handleSMSAction(t)}
                    disabled={!lead.phone}
                    title={lead.phone ? 'Open draft in text messaging app' : 'Lead does not have a phone number'}
                    style={{ opacity: lead.phone ? 1 : 0.5, cursor: lead.phone ? 'pointer' : 'not-allowed' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>Send SMS</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Edit Lead Modal ──────────────────────────────────────────────────────────────
// ── Lead Proposal Manager ────────────────────────────────────────────────────────
interface LeadProposalManagerProps {
  lead: any;
  proposals: any[];
  onAddProposal: (proposal: any) => Promise<any>;
  onUpdateProposal: (id: string, updates: any) => Promise<any>;
  onDeleteProposal: (id: string) => Promise<boolean>;
}

function LeadProposalManager({ lead, proposals, onAddProposal, onUpdateProposal, onDeleteProposal }: LeadProposalManagerProps) {
  const leadProposals = useMemo(() => {
    return (proposals || []).filter(p => p.client_id === lead.id);
  }, [proposals, lead.id]);

  const [editingProposal, setEditingProposal] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Proposal form state
  const [items, setItems] = useState<any[]>([{ description: `${lead.type || 'Floor Coating'} Project`, qty: 1, price: lead.value || 2500 }]);
  const [upgrades, setUpgrades] = useState<any[]>([
    { id: 'moisture_barrier', name: 'Moisture Vapor Barrier', price: 450, description: 'Prevents concrete hydrostatic pressure damage.', selected: false },
    { id: 'stem_walls', name: 'Coated Stem Walls', price: 350, description: 'Coats vertical concrete borders for seamless look.', selected: false },
    { id: 'premium_topcoat', name: 'Premium UV Topcoat Upgrade', price: 300, description: 'Provides extra scratch & UV sunlight resistance.', selected: false }
  ]);
  const [status, setStatus] = useState<'Draft' | 'Sent' | 'Approved' | 'Declined'>('Draft');

  const calculatedTotal = useMemo(() => {
    const itemsSum = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const upgradesSum = upgrades.reduce((sum, up) => sum + (up.selected ? up.price : 0), 0);
    return itemsSum + upgradesSum;
  }, [items, upgrades]);

  const handleStartCreate = () => {
    setItems([{ description: `${lead.type || 'Floor Coating'} Project`, qty: 1, price: lead.value || 2500 }]);
    setUpgrades([
      { id: 'moisture_barrier', name: 'Moisture Vapor Barrier', price: 450, description: 'Prevents concrete hydrostatic pressure damage.', selected: false },
      { id: 'stem_walls', name: 'Coated Stem Walls', price: 350, description: 'Coats vertical concrete borders for seamless look.', selected: false },
      { id: 'premium_topcoat', name: 'Premium UV Topcoat Upgrade', price: 300, description: 'Provides extra scratch & UV sunlight resistance.', selected: false }
    ]);
    setStatus('Draft');
    setIsCreating(true);
  };

  const handleStartEdit = (p: any) => {
    setEditingProposal(p);
    setItems(p.items || []);
    setUpgrades(p.upgrades || []);
    setStatus(p.status || 'Draft');
    setIsCreating(false);
  };

  const handleAddItem = () => {
    setItems(prev => [...prev, { description: '', qty: 1, price: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, key: string, val: any) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [key]: val } : item));
  };

  const handleToggleUpgrade = (index: number) => {
    setUpgrades(prev => prev.map((up, i) => i === index ? { ...up, selected: !up.selected } : up));
  };

  const handleSaveProposal = async () => {
    const payload = {
      client_id: lead.id,
      items,
      upgrades,
      total_amount: calculatedTotal,
      status
    };

    if (editingProposal) {
      await onUpdateProposal(editingProposal.id, payload);
    } else {
      await onAddProposal(payload);
    }

    setEditingProposal(null);
    setIsCreating(false);
  };

  const handleCopyLink = (pId: string) => {
    const url = `${window.location.origin}/?view=proposal&id=${pId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(pId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isCreating || editingProposal) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'op-fade-in 0.15s ease' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>
          {editingProposal ? 'Edit Proposal / Estimate' : 'Create New Proposal / Estimate'}
        </h3>

        {/* Status selection */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label className="lp-label" style={{ marginBottom: 0 }}>Proposal Status</label>
          <div className="lp-stage-row" style={{ display: 'flex', gap: '4px' }}>
            {(['Draft', 'Sent', 'Approved', 'Declined'] as const).map(s => (
              <button
                key={s}
                type="button"
                className={'lp-stage-btn' + (status === s ? ' is-active' : '')}
                onClick={() => setStatus(s)}
                style={{ padding: '6px 12px', border: 'none', background: status === s ? 'var(--surface)' : 'transparent', cursor: 'pointer', borderRadius: '4px' }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Line Items */}
        <div style={{ border: '1px solid var(--line-soft)', borderRadius: 'var(--r-lg)', padding: '16px', background: 'var(--surface-2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 600 }}>Proposal Line Items</span>
            <button className="btn btn-secondary btn-sm" type="button" onClick={handleAddItem}>+ Add Item</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  className="lp-input"
                  placeholder="e.g. 2-Car Garage Epoxy Coating"
                  value={item.description}
                  onChange={e => handleUpdateItem(idx, 'description', e.target.value)}
                  style={{ flex: 1 }}
                />
                <input
                  className="lp-input mono"
                  type="number"
                  placeholder="Qty"
                  value={item.qty}
                  onChange={e => handleUpdateItem(idx, 'qty', parseInt(e.target.value, 10) || 0)}
                  style={{ width: '60px', textAlign: 'center' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: '110px' }}>
                  <span style={{ position: 'absolute', left: '10px', fontSize: '13px', color: 'var(--ink-3)' }}>$</span>
                  <input
                    className="lp-input mono"
                    type="number"
                    placeholder="Price"
                    value={item.price}
                    onChange={e => handleUpdateItem(idx, 'price', parseInt(e.target.value, 10) || 0)}
                    style={{ paddingLeft: '22px' }}
                  />
                </div>
                {items.length > 1 && (
                  <button
                    className="icon-btn"
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    style={{ padding: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--red)' }}
                  >
                    <Icon d={Icons.close} size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Upgrades */}
        <div style={{ border: '1px solid var(--line-soft)', borderRadius: 'var(--r-lg)', padding: '16px', background: 'var(--surface-2)' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 600, display: 'block', marginBottom: '12px' }}>Standard Optional Upgrades</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {upgrades.map((up, idx) => (
              <label key={up.id} style={{ display: 'flex', alignItems: 'start', gap: '10px', cursor: 'pointer', padding: '6px', borderRadius: '4px', background: 'var(--surface)' }}>
                <input
                  type="checkbox"
                  checked={up.selected}
                  onChange={() => handleToggleUpgrade(idx)}
                  style={{ marginTop: '4px' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '13px' }}>
                    <span>{up.name}</span>
                    <span className="mono" style={{ color: 'var(--accent)' }}>+${up.price}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--ink-3)' }}>{up.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Total Summary */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid var(--line-soft)', paddingTop: '12px' }}>
          <span style={{ fontWeight: 600, fontSize: '14px' }}>Estimated Total:</span>
          <span className="mono" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent)' }}>
            ${calculatedTotal.toLocaleString()}
          </span>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
          <button className="btn btn-secondary" type="button" onClick={() => { setIsCreating(false); setEditingProposal(null); }}>
            Cancel
          </button>
          <button className="btn btn-primary" type="button" onClick={handleSaveProposal} disabled={items.some(i => !i.description || i.price <= 0)}>
            Save Proposal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'op-fade-in 0.15s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>Proposals & Digital Estimates</h3>
        <button className="btn btn-primary btn-sm" type="button" onClick={handleStartCreate}>
          + New Proposal
        </button>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        {leadProposals.length === 0 ? (
          <div className="db-empty" style={{ padding: '32px 16px', textAlign: 'center', background: 'var(--surface-2)', border: '1px dashed var(--line)', borderRadius: 'var(--r-lg)' }}>
            No proposals generated for this lead yet.
          </div>
        ) : (
          leadProposals.map(p => (
            <div key={p.id} style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className={`chip tone-${p.status === 'Approved' ? 'green' : p.status === 'Sent' ? 'violet' : p.status === 'Declined' ? 'red' : 'blue'}`} style={{ fontSize: 10 }}>
                    {p.status}
                  </span>
                  <span className="mono muted" style={{ fontSize: '11px', marginLeft: '8px' }}>
                    Created {new Date(p.created_at).toLocaleDateString()}
                  </span>
                </div>
                <span className="mono" style={{ fontWeight: 700, fontSize: '15px' }}>
                  ${p.total_amount.toLocaleString()}
                </span>
              </div>

              {/* Items Summary list */}
              <div style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
                {(p.items || []).map((item: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{item.description} (x{item.qty})</span>
                    <span className="mono">${(item.price * item.qty).toLocaleString()}</span>
                  </div>
                ))}
                {(p.upgrades || []).filter((u: any) => u.selected).map((up: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent)' }}>
                    <span>+ {up.name} (Upgrade)</span>
                    <span className="mono">+${up.price}</span>
                  </div>
                ))}
              </div>

              {/* Actions row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line-soft)', paddingTop: '10px', marginTop: '4px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="btn btn-secondary btn-sm" type="button" onClick={() => handleStartEdit(p)}>
                    Edit
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    type="button"
                    onClick={() => onDeleteProposal(p.id)}
                    style={{ color: 'var(--red)' }}
                  >
                    Delete
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  {/* Copy public link */}
                  <button
                    className="btn btn-secondary btn-sm"
                    type="button"
                    onClick={() => handleCopyLink(p.id)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    {copiedId === p.id ? (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span style={{ color: 'var(--green)' }}>Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        <span>Link</span>
                      </>
                    )}
                  </button>
                  {/* Preview public link */}
                  <a
                    href={`${window.location.origin}/?view=proposal&id=${p.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: 'inherit' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <span>Open</span>
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface EditLeadModalProps {
  lead: any;
  onClose: () => void;
  onSave: (updatedLead: any) => void;
  activities: any[];
  onAddActivity: (act: any) => void;
  tasks: any[];
  onAddTask: (tk: any) => void;
  onCompleteTask: (id: string) => void;
  proposals: any[];
  addProposal: (proposal: any) => Promise<any>;
  updateProposal: (id: string, updates: any) => Promise<any>;
  deleteProposal: (id: string) => Promise<boolean>;
}

function EditLeadModal({
  lead, onClose, onSave,
  activities, onAddActivity,
  tasks, onAddTask, onCompleteTask,
  proposals, addProposal, updateProposal, deleteProposal
}: EditLeadModalProps) {
  const [name, setName] = useState(lead.name);
  const [contact, setContact] = useState(lead.contact);
  const [phone, setPhone] = useState(lead.phone);
  const [email, setEmail] = useState(lead.email || '');
  const [address, setAddress] = useState(lead.address === '—' ? '' : lead.address);
  const [source, setSource] = useState(lead.source);
  const [type, setType] = useState(lead.type);
  const [value, setValue] = useState(lead.value > 0 ? String(lead.value) : '');
  const [hot, setHot] = useState(!!lead.hot);
  const [notes, setNotes] = useState(lead.notes || '');
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const valid = name.trim().length > 0 && phone.replace(/\D/g, '').length >= 10;

  function handleSave() {
    if (!valid) return;
    onSave({
      ...lead,
      name: name.trim(),
      contact: contact.trim() || name.trim(),
      phone,
      email: email.trim(),
      address: address.trim() || '—',
      source,
      type,
      value: parseInt(value, 10) || 0,
      hot,
      notes: notes.trim() || undefined,
    });
    onClose();
  }

  const EDIT_SOURCES = ['Referral', 'Ads', 'Warm call', 'Cold call', 'Walk-in', 'Event'];
  const EDIT_TYPES   = ['Restaurant', 'Contractor', 'Barber', 'Healthcare', 'Retail', 'Professional', 'Other'];
  const VALUE_PRESETS = [1000, 3000, 5000, 10000];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        backdropFilter: 'blur(2px)',
        animation: 'elm-scrim-in 0.15s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="elm-modal" role="dialog" aria-label="Edit lead">
        {/* Header */}
        <div className="elm-head">
          <div>
            <div className="elm-eyebrow">Edit lead</div>
            <div className="elm-title">{lead.name}</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <Icon d={Icons.x} size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="elm-tabs">
          {[
            { id: 'details', label: 'Details' },
            { id: 'proposals', label: 'Proposals & Estimates' },
            { id: 'outreach', label: 'Outreach Templates' },
            { id: 'activity', label: 'Activity & Tasks' }
          ].map(t => {
            const c = t.id === 'activity'
              ? ((tasks || []).filter(tk => tk.linkedId === lead.id && !tk.done).length
                 + (activities || []).filter(a => a.linkedId === lead.id).length)
              : t.id === 'proposals'
              ? (proposals || []).filter(p => p.client_id === lead.id).length
              : 0;
            return (
              <button key={t.id} type="button"
                className={'elm-tab' + (activeTab === t.id ? ' is-active' : '')}
                onClick={() => setActiveTab(t.id)}>
                {t.label}
                {c > 0 && <span className="elm-tab-badge">{c}</span>}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="elm-body">
          {activeTab === 'details' && <>
            {/* Phone & Email with Shortcuts */}
            <div className="elm-row-2">
              <div className="elm-field">
                <label className="elm-label">Phone</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="elm-input mono"
                    placeholder="(___) ___-____"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    inputMode="tel"
                    autoFocus
                    style={{ flex: 1 }}
                  />
                  <a
                    href={phone ? `tel:${phone.replace(/\D/g, '')}` : '#'}
                    className={`btn btn-secondary ${!phone ? 'disabled' : ''}`}
                    style={{ padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: phone ? 'auto' : 'none', opacity: phone ? 1 : 0.5 }}
                    title="Call client"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Icon d={['M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z']} size={14} />
                  </a>
                </div>
              </div>
              <div className="elm-field">
                <label className="elm-label">Email address</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="elm-input"
                    placeholder="e.g. nicolas@example.com"
                    value={email}
                    type="email"
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <a
                    href={email ? `mailto:${email}` : '#'}
                    className={`btn btn-secondary ${!email ? 'disabled' : ''}`}
                    style={{ padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: email ? 'auto' : 'none', opacity: email ? 1 : 0.5 }}
                    title="Send email"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Icon d={['M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z', 'M22 6l-10 7-10-7']} size={14} />
                  </a>
                </div>
              </div>
            </div>

            {/* Business + Contact */}
            <div className="elm-row-2">
              <div className="elm-field">
                <label className="elm-label">Business name</label>
                <input
                  className="elm-input"
                  placeholder="e.g. Joe's Diner"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="elm-field">
                <label className="elm-label">Contact name</label>
                <input
                  className="elm-input"
                  placeholder="e.g. Joe Marchetti"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                />
              </div>
            </div>

            {/* Address */}
            <div className="elm-field">
              <label className="elm-label">Address</label>
              <input
                className="elm-input"
                placeholder="Street, city, state"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="elm-divider" />

            {/* Source */}
            <div className="elm-field">
              <label className="elm-label">Source</label>
              <div className="elm-chips">
                {EDIT_SOURCES.map(s => (
                  <button
                    key={s}
                    type="button"
                    className={'elm-chip' + (source === s ? ' is-active' : '')}
                    onClick={() => setSource(s)}
                  >{s}</button>
                ))}
              </div>
            </div>

            {/* Type */}
            <div className="elm-field">
              <label className="elm-label">Project type</label>
              <div className="elm-chips">
                {EDIT_TYPES.map(t => (
                  <button
                    key={t}
                    type="button"
                    className={'elm-chip' + (type === t ? ' is-active' : '')}
                    onClick={() => setType(t)}
                  >{t}</button>
                ))}
              </div>
            </div>

            <div className="elm-divider" />

            {/* Value */}
            <div className="elm-field">
              <label className="elm-label">Estimated value</label>
              <div className="elm-value-wrap">
                <span className="elm-value-prefix">$</span>
                <input
                  className="elm-input mono elm-value-input"
                  placeholder="0"
                  value={value}
                  onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
                  inputMode="numeric"
                />
              </div>
              <div className="elm-preset-row">
                {VALUE_PRESETS.map(v => (
                  <button
                    key={v}
                    type="button"
                    className={'elm-preset' + (parseInt(value, 10) === v ? ' is-active' : '')}
                    onClick={() => setValue(String(v))}
                  >
                    ${v >= 1000 ? (v / 1000) + 'k' : v}{v === 10000 ? '+' : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Hot toggle */}
            <div className="elm-field">
              <label className="elm-label">Priority</label>
              <button
                type="button"
                className={'elm-hot-btn' + (hot ? ' is-active' : '')}
                onClick={() => setHot(!hot)}
              >
                <span style={{ fontSize: 15 }}>{hot ? '🔥' : '○'}</span>
                <span>{hot ? 'Hot lead — follow up today' : 'Mark as hot'}</span>
              </button>
            </div>

            {/* Notes */}
            <div className="elm-field">
              <label className="elm-label">Notes</label>
              <textarea
                className="elm-input elm-textarea"
                placeholder="What did they say? What do they need?"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </>}

          {activeTab === 'proposals' && (
            <LeadProposalManager
              lead={lead}
              proposals={proposals}
              onAddProposal={addProposal}
              onUpdateProposal={updateProposal}
              onDeleteProposal={deleteProposal}
            />
          )}

          {activeTab === 'outreach' && (
            <OutreachPanel lead={lead} />
          )}

          {activeTab === 'activity' && (
            <ActivityTaskPanel
              entityId={lead.id}
              entityName={lead.name}
              entityType="lead"
              activities={activities}
              onAddActivity={onAddActivity}
              tasks={tasks}
              onAddTask={onAddTask}
              onCompleteTask={onCompleteTask}
            />
          )}
        </div>

        {/* Footer */}
        <div className="elm-foot">
          <button className="btn btn-secondary" type="button" onClick={onClose}>Close</button>
          {activeTab === 'details' && (
            <button
              className="btn btn-primary btn-lg"
              type="button"
              onClick={handleSave}
              disabled={!valid}
            >
              Save changes
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── LeadsList (Main Component) ──────────────────────────────────────────────────
interface LeadsListProps {
  leads: any;
  setLeads: React.Dispatch<React.SetStateAction<any>>;
  history: any[];
  setHistory: React.Dispatch<React.SetStateAction<any[]>>;
  onConvert: () => void;
  addMode?: 'panel' | 'inline';
  defaultView?: 'board' | 'table';
  activities: any[];
  onAddActivity: (act: any) => void;
  tasks: any[];
  onAddTask: (tk: any) => void;
  onCompleteTask: (id: string) => void;
  addLead: (lead: any) => Promise<any>;
  updateLead: (id: string, updates: any) => Promise<any>;
  deleteLead: (id: string) => Promise<void>;
  proposals: any[];
  addProposal: (proposal: any) => Promise<any>;
  updateProposal: (id: string, updates: any) => Promise<any>;
  deleteProposal: (id: string) => Promise<boolean>;
  targetAccounts?: any[];
  accountContacts?: any[];
  accountTouchpoints?: any[];
  accountSignals?: any[];
  researchFeeds?: any[];
  addTargetAccount?: (account: any) => Promise<any>;
  updateTargetAccount?: (id: string, updates: any) => Promise<any>;
  addAccountTouchpoint?: (touchpoint: any) => Promise<any>;
  addAccountSignal?: (signal: any) => Promise<any>;
  reviewAccountSignal?: (id: string, action: string) => Promise<any>;
  addResearchFeed?: (feed: any) => Promise<any>;
  updateResearchFeed?: (id: string, updates: any) => Promise<any>;
  deleteResearchFeed?: (id: string) => Promise<boolean>;
}

export function LeadsList({
  leads, setLeads,
  history, setHistory,
  addMode = 'panel', defaultView = 'board',
  activities, onAddActivity,
  tasks, onAddTask, onCompleteTask,
  addLead, updateLead, deleteLead,
  proposals, addProposal, updateProposal, deleteProposal,
  targetAccounts = [], accountContacts = [], accountTouchpoints = [], accountSignals = [],
  researchFeeds,
  addTargetAccount, updateTargetAccount, addAccountTouchpoint, addAccountSignal, reviewAccountSignal,
  addResearchFeed, updateResearchFeed, deleteResearchFeed
}: LeadsListProps) {
  const [activeTab, setActiveTab] = useState('Pipeline');
  const [viewMode, setViewMode]   = useState<'board' | 'table'>(defaultView);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);

  // Sources & Inbox state (mocked locally until backend ingestion lands)
  const [localFeeds, setLocalFeeds] = useState<any[]>(MOCK_SOURCES);
  const [inbox, setInbox]     = useState<any[]>(MOCK_INBOX);

  const usingBackendFeeds = researchFeeds !== undefined;
  const feeds = usingBackendFeeds ? researchFeeds : localFeeds;

  // Modals for sources
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [editingFeed, setEditingFeed] = useState<any | undefined>(undefined);

  // ABM state. Supabase data wins when the new tables are present; otherwise the
  // local demo keeps the workflow explorable.
  const [localAbmAccounts, setLocalAbmAccounts] = useState<any[]>(MOCK_ACCOUNTS);
  const [localAbmContacts] = useState<any[]>(MOCK_CONTACTS);
  const [localAbmTouchpoints, setLocalAbmTouchpoints] = useState<any[]>(MOCK_TOUCHPOINTS);
  const [localAbmSignals, setLocalAbmSignals] = useState<any[]>(MOCK_SIGNALS);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [touchModalAccountId, setTouchModalAccountId] = useState<string | null>(null);
  const [apolloModalOpen, setApolloModalOpen] = useState(false);

  const usingBackendAccounts = targetAccounts.length > 0;
  const abmAccounts = usingBackendAccounts ? targetAccounts : localAbmAccounts;
  const abmContacts = usingBackendAccounts ? accountContacts : localAbmContacts;
  const abmTouchpoints = usingBackendAccounts ? accountTouchpoints : localAbmTouchpoints;
  const abmSignals = usingBackendAccounts ? accountSignals : localAbmSignals;

  const addToast = (message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  function getRelativeDateStr(days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }

  async function triggerFollowupAutomation(lead: any, toCol: string) {
    if (toCol === 'Contacted') {
      const taskName = `Follow up with ${lead.contact || lead.name} regarding appointment schedule & color selection`;
      const dueDate = getRelativeDateStr(3);
      await onAddTask({
        text: taskName,
        linkedId: lead.id,
        linkedName: lead.name,
        linkedType: 'lead',
        dueDate,
        priority: 'med',
        done: false
      });
      addToast(`✨ Auto-scheduled: "${taskName.substring(0, 45)}..." due in 3 days`);
    } else if (toCol === 'Quoted') {
      const task1 = `Prepare and send formal estimate proposal for ${lead.contact || lead.name}`;
      const due1 = getRelativeDateStr(1);
      await onAddTask({
        text: task1,
        linkedId: lead.id,
        linkedName: lead.name,
        linkedType: 'lead',
        dueDate: due1,
        priority: 'high',
        done: false
      });
      addToast(`✨ Auto-scheduled: "${task1.substring(0, 45)}..." due in 1 day`);

      const task2 = `Follow up with ${lead.contact || lead.name} on estimate review`;
      const due2 = getRelativeDateStr(4);
      await onAddTask({
        text: task2,
        linkedId: lead.id,
        linkedName: lead.name,
        linkedType: 'lead',
        dueDate: due2,
        priority: 'med',
        done: false
      });
      addToast(`✨ Auto-scheduled: "${task2.substring(0, 45)}..." due in 4 days`);
    }
  }

  function handleCopyLink() {
    const url = window.location.origin + '/?view=quote';
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  const [dragging, setDragging] = useState<{ fromCol: string; leadId: string } | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [dragOverTrash, setDragOverTrash] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; lead: any; fromCol: string } | null>(null);

  // Edit modal
  const [editingLead, setEditingLead] = useState<{ lead: any; fromCol: string } | null>(null);

  async function handleEditSave(updatedLead: any) {
    if (!editingLead) return;
    const res = await updateLead(updatedLead.id, {
      name: updatedLead.name,
      contact: updatedLead.contact,
      phone: updatedLead.phone,
      email: updatedLead.email,
      address: updatedLead.address,
      source: updatedLead.source,
      type: updatedLead.type,
      value: updatedLead.value,
      hot: updatedLead.hot,
      notes: updatedLead.notes
    });

    if (res) {
      setLeads((prev: any) => ({
        ...prev,
        [editingLead.fromCol]: prev[editingLead.fromCol].map((l: any) =>
          l.id === updatedLead.id ? res : l
        ),
      }));
    }
    setEditingLead(null);
  }

  // Panel state
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelStage, setPanelStage] = useState('New');
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  // Inline quick-add
  const [inlineCol, setInlineCol] = useState<string | null>(null);
  const [inlineName, setInlineName] = useState('');
  const [inlinePhone, setInlinePhone] = useState('');

  const cols = ['New', 'Contacted', 'Quoted'];

  function openPanel(stage = 'New') {
    setPanelStage(stage);
    setPanelOpen(true);
  }

  async function handleSave(stage: string, lead: any) {
    const res = await addLead({ ...lead, status: stage });
    if (res) {
      setLeads((prev: any) => ({
        ...prev,
        [stage]: [res, ...(prev[stage] || [])],
      }));
      setJustAddedId(res.id);
      setTimeout(() => setJustAddedId(null), 900);
    }
  }

  async function handleInlineSave(col: string) {
    if (!inlineName.trim() || inlinePhone.replace(/\D/g, '').length < 10) return;
    const lead = {
      name: inlineName.trim(),
      contact: inlineName.trim(),
      phone: inlinePhone,
      address: '—',
      source: 'Referral',
      type: 'Other',
      value: 0,
      hot: false,
    };

    const res = await addLead({ ...lead, status: col });
    if (res) {
      setLeads((prev: any) => ({
        ...prev,
        [col]: [res, ...(prev[col] || [])]
      }));
      setJustAddedId(res.id);
      setTimeout(() => setJustAddedId(null), 900);
      setInlineName(''); setInlinePhone(''); setInlineCol(null);
    }
  }

  async function archiveLead(fromCol: string, leadId: string, outcome: string) {
    const res = await updateLead(leadId, { status: outcome, outcome, reason: outcome === 'Lost' ? 'Archived' : undefined });
    if (res) {
      setLeads((prev: any) => ({
        ...prev,
        [fromCol]: prev[fromCol].filter((l: any) => l.id !== leadId),
      }));
      setHistory((prev: any[]) => [res, ...prev]);
    }
  }

  async function handleDelete(fromCol: string, leadId: string) {
    await deleteLead(leadId);
    setLeads((prev: any) => ({
      ...prev,
      [fromCol]: prev[fromCol].filter((l: any) => l.id !== leadId),
    }));
  }

  // ── Sources / Inbox handlers ───────────────────────────────────────────────────
  async function handleToggleSource(id: string) {
    const src = feeds.find(s => s.id === id);
    if (!src) return;
    const nextStatus = src.status === 'paused' ? 'active' : 'paused';
    
    if (usingBackendFeeds && updateResearchFeed) {
      const saved = await updateResearchFeed(id, { status: nextStatus });
      if (saved) {
        addToast(nextStatus === 'active' ? `▶ Resumed · ${src.name}` : `❚❚ Paused · ${src.name}`);
      }
    } else {
      setLocalFeeds(prev => prev.map(s =>
        s.id === id ? { ...s, status: nextStatus } : s
      ));
      addToast(nextStatus === 'active' ? `▶ Resumed · ${src.name}` : `❚❚ Paused · ${src.name}`);
    }
  }

  function handleCopyText(text: string) {
    navigator.clipboard.writeText(text);
    const preview = text.length > 40 ? text.substring(0, 37) + '…' : text;
    addToast(`Copied · ${preview}`);
  }

  function handleAddSourceClick() {
    setEditingFeed(undefined);
    setSourceModalOpen(true);
  }

  function handleEditSourceClick(feed: any) {
    setEditingFeed(feed);
    setSourceModalOpen(true);
  }

  async function handleSaveSource(form: any) {
    if (editingFeed) {
      // Edit
      if (usingBackendFeeds && updateResearchFeed) {
        await updateResearchFeed(editingFeed.id, form);
        addToast(`Saved changes to lead source · ${form.name}`);
      } else {
        setLocalFeeds(prev => prev.map(f => f.id === editingFeed.id ? { ...f, ...form } : f));
        addToast(`Saved changes to lead source · ${form.name}`);
      }
    } else {
      // Add
      if (usingBackendFeeds && addResearchFeed) {
        const saved = await addResearchFeed(form);
        if (saved) {
          addToast(`Connected new lead source · ${form.name}`);
        }
      } else {
        const localNew = {
          ...form,
          id: 'src_' + Math.random().toString(36).slice(2, 9),
          status: 'active',
          last_run: null,
          next_run: null,
          webhook_path: '/api/leads/ingest',
          api_key: 'sk_demo_' + Math.random().toString(36).slice(2, 9) + '••••' + Math.random().toString(36).slice(2, 6),
          metrics: { day: 0, week: 0, brought: 0, qualified: 0, won: 0 }
        };
        setLocalFeeds(prev => [...prev, localNew]);
        addToast(`Connected new lead source · ${form.name}`);
      }
    }
    setSourceModalOpen(false);
  }

  async function handleDeleteSource(id: string) {
    const src = feeds.find(s => s.id === id);
    if (!src) return;
    if (confirm(`Are you sure you want to delete lead source "${src.name}"?`)) {
      if (usingBackendFeeds && deleteResearchFeed) {
        const ok = await deleteResearchFeed(id);
        if (ok) {
          addToast(`Deleted lead source · ${src.name}`);
        }
      } else {
        setLocalFeeds(prev => prev.filter(f => f.id !== id));
        addToast(`Deleted lead source · ${src.name}`);
      }
    }
  }

  async function handleAddTargetAccount(form: any) {
    const payload = {
      name: form.name.trim(),
      segment: form.segment,
      tier: Number(form.tier),
      status: 'untouched',
      website: form.website.trim(),
      location: form.location.trim(),
      reasoning: form.reasoning.trim(),
      owner: 'Ahmi',
      source: 'manual'
    };
    if (!payload.name) return;

    const saved = addTargetAccount ? await addTargetAccount(payload) : null;
    const account = saved || {
      ...payload,
      id: 'acc_' + Math.random().toString(36).slice(2, 9),
      last_touched_at: null,
      created_at: new Date().toISOString()
    };
    if (!saved) setLocalAbmAccounts(prev => [account, ...prev]);
    setAccountModalOpen(false);
    addToast(`Target account added · ${account.name}`);
  }

  async function handleImportApolloAccount(candidate: any, tier: number) {
    const payload = {
      name: candidate.name,
      segment: candidate.segment || 'restaurant',
      tier,
      status: 'untouched',
      website: candidate.website || '',
      location: candidate.location || '',
      reasoning: candidate.reasoning || 'Imported from Apollo.',
      owner: 'Ahmi',
      source: 'apollo',
      external_id: candidate.external_id || null,
      metadata: candidate.metadata || {},
      last_touched_at: null,
    };

    const saved = addTargetAccount ? await addTargetAccount(payload) : null;
    const account = saved || {
      ...payload,
      id: 'acc_' + Math.random().toString(36).slice(2, 9),
      created_at: new Date().toISOString()
    };
    if (!saved) setLocalAbmAccounts(prev => [account, ...prev]);
    addToast(`Imported from Apollo · ${account.name}`);
  }

  async function handleLogAccountTouchpoint(accountId: string, form: any) {
    const account = abmAccounts.find(a => a.id === accountId);
    const nowIso = new Date().toISOString();
    const payload = {
      account_id: accountId,
      channel: form.channel,
      direction: form.direction,
      notes: form.notes.trim(),
      outcome: form.outcome.trim() || 'logged',
      at: nowIso
    };
    if (!payload.notes) return;

    const saved = addAccountTouchpoint ? await addAccountTouchpoint(payload) : null;
    const touchpoint = saved || {
      ...payload,
      id: 'tp_' + Math.random().toString(36).slice(2, 9),
      created_at: nowIso
    };
    if (!saved) {
      setLocalAbmTouchpoints(prev => [touchpoint, ...prev]);
      setLocalAbmAccounts(prev => prev.map(a => a.id === accountId ? { ...a, last_touched_at: nowIso, status: a.status === 'untouched' ? 'engaging' : a.status } : a));
    }
    setTouchModalAccountId(null);
    addToast(`Touch logged · ${account?.name || 'account'}`);
  }

  async function handleReviewSignal(id: string, action: string) {
    const signal = abmSignals.find(s => s.id === id);
    const account = signal?.account_id ? abmAccounts.find(a => a.id === signal.account_id) : null;
    const saved = reviewAccountSignal ? await reviewAccountSignal(id, action) : null;
    if (!saved) {
      setLocalAbmSignals(prev => prev.map(s => s.id === id ? {
        ...s,
        reviewed: true,
        reviewed_at: new Date().toISOString(),
        action_taken: action
      } : s));
    }

    if (action === 'task' && account) {
      await onAddTask({
        text: `Follow up with ${account.name}: ${signal.summary}`,
        linkedId: account.id,
        linkedName: account.name,
        linkedType: 'lead',
        dueDate: getRelativeDateStr(1),
        priority: signal.kind === 'referral' || signal.kind === 'quote_intent' ? 'high' : 'med',
        done: false
      });
      addToast(`Signal converted to follow-up task · ${account.name}`);
    } else if (action === 'task' && signal) {
      await onAddTask({
        text: `Research signal: ${signal.summary}`,
        linkedId: undefined,
        linkedName: 'Signals',
        linkedType: 'lead',
        dueDate: getRelativeDateStr(1),
        priority: 'med',
        done: false
      });
      addToast('Signal converted to research task');
    } else if (action === 'touch' && account) {
      setTouchModalAccountId(account.id);
      addToast(`Signal logged · add the outreach you made for ${account.name}`);
    } else if (signal?.account_id) {
      addToast('Signal logged against account');
    } else {
      addToast('Signal reviewed · add the company as a target account when ready');
    }
  }

  async function handleApproveInbox(item: any) {
    const lead = {
      name: item.name,
      contact: item.contact || item.name,
      phone: item.phone || '',
      email: item.email || '',
      address: item.address || '—',
      source: 'Bot',
      type: item.type || 'Other',
      value: 0,
      hot: false,
    };
    const res = await addLead({ ...lead, status: 'New' });
    if (res) {
      setLeads((prev: any) => ({ ...prev, New: [res, ...(prev.New || [])] }));
      setJustAddedId(res.id);
      setTimeout(() => setJustAddedId(null), 900);
    }
    setInbox(prev => prev.filter(i => i.id !== item.id));
    addToast(`✨ Approved · "${item.name}" → Pipeline / New`);
  }

  function handleRejectInbox(id: string) {
    const item = inbox.find(i => i.id === id);
    setInbox(prev => prev.filter(i => i.id !== id));
    if (item) addToast(`Rejected · "${item.name}"`);
  }

  function handleMergeInbox(item: any) {
    setInbox(prev => prev.filter(i => i.id !== item.id));
    addToast(`Merged · "${item.name}" into existing lead`);
  }

  function onDragStart(e: React.DragEvent, fromCol: string, leadId: string) {
    setDragging({ fromCol, leadId });
    e.dataTransfer.effectAllowed = 'move';
  }
  function onDragEnd() {
    setDragging(null);
    setDragOverCol(null);
    setDragOverTrash(false);
  }
  function onDragOver(e: React.DragEvent, col: string) {
    e.preventDefault();
    setDragOverCol(col);
    setDragOverTrash(false);
  }
  async function onDrop(e: React.DragEvent, toCol: string) {
    e.preventDefault();
    if (!dragging) return;
    const { fromCol, leadId } = dragging;
    if (fromCol === toCol) { setDragging(null); setDragOverCol(null); return; }

    const activeLead = leads[fromCol].find((l: any) => l.id === leadId);
    if (!activeLead) return;

    const res = await updateLead(leadId, { status: toCol });
    if (res) {
      setLeads((prev: any) => ({
        ...prev,
        [fromCol]: prev[fromCol].filter((l: any) => l.id !== leadId),
        [toCol]: [...prev[toCol], res],
      }));
      triggerFollowupAutomation(activeLead, toCol);
    }
    setDragging(null);
    setDragOverCol(null);
  }
  function onTrashDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOverTrash(true);
    setDragOverCol(null);
  }
  function onTrashDragLeave() { setDragOverTrash(false); }
  function onTrashDrop(e: React.DragEvent) {
    e.preventDefault();
    if (!dragging) return;
    const { fromCol, leadId } = dragging;
    handleDelete(fromCol, leadId);
    setDragging(null);
    setDragOverCol(null);
    setDragOverTrash(false);
  }

  function handleContextMenu(e: React.MouseEvent, col: string, lead: any) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, lead, fromCol: col });
  }

  const filtered = useMemo(() => {
    if (!search) return leads;
    const q = search.toLowerCase();
    const out: any = {};
    cols.forEach(c => {
      out[c] = (leads[c] || []).filter((l: any) =>
        l.name.toLowerCase().includes(q) ||
        l.contact.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        l.address.toLowerCase().includes(q)
      );
    });
    return out;
  }, [leads, search]);

  const total = cols.reduce((a, c) => a + (leads[c]?.length || 0), 0);
  const pipelineValue = cols.reduce((a, c) =>
    a + (leads[c] || []).reduce((s: number, l: any) => s + l.value, 0), 0
  );
  const wonValue = history.filter(l => l.outcome === 'Won').reduce((a, l) => a + l.value, 0);

  return (
    <div className="page page-leads">
      <div className="page-header">
        <div>
          <h1 className="page-title">Leads</h1>
          <div className="page-subtitle">
            {total} active · <strong style={{ color: 'var(--ink)' }}>${pipelineValue.toLocaleString()}</strong> in pipeline · ${wonValue.toLocaleString()} won
          </div>
        </div>
        <div className="flex gap-8" style={{ display: 'flex', gap: '8px' }}>
          <button 
            type="button" 
            className="btn btn-secondary btn-lg" 
            onClick={handleCopyLink}
            title="Copy public link to client quote request form"
          >
            {copied ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Link copied!</span>
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                <span>Share Quote Form</span>
              </>
            )}
          </button>
          <button className="btn btn-primary btn-lg" onClick={() => openPanel('New')}>
            <Icon d={Icons.plus} size={16} /> New lead
          </button>
        </div>
      </div>

      {/* Tab strip */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--line)', marginBottom: 16 }}>
        {(['Pipeline', 'Accounts', 'Signals', 'Inbox', 'Sources', 'History'] as const).map(tab => {
          const count =
            tab === 'Inbox'    ? inbox.length :
            tab === 'Sources'  ? feeds.filter(s => s.status === 'active').length :
            tab === 'History'  ? history.length :
            tab === 'Accounts' ? abmAccounts.length :
            tab === 'Signals'  ? abmSignals.filter(s => !s.reviewed).length :
            0;
          const showBadge = (tab === 'Inbox'    && count > 0)
                         || (tab === 'Sources'  && count > 0)
                         || (tab === 'History'  && count > 0)
                         || (tab === 'Accounts' && count > 0)
                         || (tab === 'Signals'  && count > 0);
          const isHot = (tab === 'Inbox' && count > 0) || (tab === 'Signals' && count > 0);
          return (
            <div
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                color: activeTab === tab ? 'var(--ink)' : 'var(--ink-3)',
                borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {tab}
              {showBadge && (
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    background: isHot ? 'var(--accent)' : 'var(--surface-2)',
                    border: isHot ? '1px solid var(--accent)' : '1px solid var(--line)',
                    borderRadius: 999,
                    padding: '1px 6px',
                    color: isHot ? 'var(--surface)' : 'var(--ink-3)',
                    fontWeight: 600,
                  }}
                >
                  {count}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {activeTab === 'History' && <LeadsHistory history={history} />}

      {activeTab === 'Sources' && (
        <LeadsSources
          sources={feeds}
          onAdd={handleAddSourceClick}
          onToggle={handleToggleSource}
          onCopy={handleCopyText}
          onEdit={handleEditSourceClick}
          onDelete={handleDeleteSource}
          abmAccounts={abmAccounts}
          usingBackend={usingBackendFeeds}
        />
      )}

      {activeTab === 'Inbox' && (
        <LeadsInbox
          items={inbox}
          sources={feeds}
          onApprove={handleApproveInbox}
          onReject={handleRejectInbox}
          onMerge={handleMergeInbox}
        />
      )}

      {activeTab === 'Accounts' && (
        <LeadsAccounts
          accounts={abmAccounts}
          contacts={abmContacts}
          touchpoints={abmTouchpoints}
          signals={abmSignals}
          onAdd={() => setAccountModalOpen(true)}
          onImportApollo={() => setApolloModalOpen(true)}
          onLogTouchpoint={(id) => setTouchModalAccountId(id)}
        />
      )}

      {activeTab === 'Signals' && (
        <LeadsSignals
          signals={abmSignals}
          accounts={abmAccounts}
          onReview={(id) => handleReviewSignal(id, 'touch')}
          onCreateTask={(id) => handleReviewSignal(id, 'task')}
          onDismiss={(id) => {
            handleReviewSignal(id, 'dismissed');
          }}
        />
      )}

      {activeTab === 'Pipeline' && (
        <>
          <div className="toolbar" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="search-input">
              <Icon d={Icons.search} size={14} />
              <input placeholder="Search name, contact, phone, address…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="view-switch" role="tablist" aria-label="View mode" style={{ display: 'flex' }}>
              <button
                type="button"
                className={'view-switch-btn' + (viewMode === 'board' ? ' is-active' : '')}
                onClick={() => setViewMode('board')}
                title="Board view"
              >
                Board
              </button>
              <button
                type="button"
                className={'view-switch-btn' + (viewMode === 'table' ? ' is-active' : '')}
                onClick={() => setViewMode('table')}
                title="Table view"
              >
                Table
              </button>
            </div>
          </div>

          {viewMode === 'table' && (
            <LeadsTable
              leads={leads}
              cols={cols}
              search={search}
              onRowClick={(lead, fromCol) => setEditingLead({ lead, fromCol })}
              onContextMenu={handleContextMenu}
              onStageChange={async (fromCol, toCol, leadId) => {
                if (fromCol === toCol) return;
                const activeLead = (leads[fromCol] || []).find((l: any) => l.id === leadId);
                const res = await updateLead(leadId, { status: toCol });
                if (res) {
                  setLeads((prev: any) => ({
                    ...prev,
                    [fromCol]: prev[fromCol].filter((l: any) => l.id !== leadId),
                    [toCol]:   [...prev[toCol], res],
                  }));
                  if (activeLead) {
                    triggerFollowupAutomation(activeLead, toCol);
                  }
                }
              }}
              onArchive={archiveLead}
              onDelete={handleDelete}
              justAddedId={justAddedId}
            />
          )}

          {viewMode === 'board' && (
            <div className="leads-board">
              {cols.map(col => {
                const colLeads = filtered[col] || [];
                const colVal = colLeads.reduce((a: number, l: any) => a + l.value, 0);
                const isOver = dragOverCol === col;
                return (
                  <div
                    key={col}
                    className={'leads-col' + (isOver ? ' is-over' : '')}
                    onDragOver={(e) => onDragOver(e, col)}
                    onDragLeave={() => setDragOverCol(null)}
                    onDrop={(e) => onDrop(e, col)}
                  >
                    <div className="leads-col-head" style={{ '--col-accent': STAGE_COLORS[col].accent } as React.CSSProperties}>
                      <div className="leads-col-bar" />
                      <div className="leads-col-title-row">
                        <span className="leads-col-title">{col}</span>
                        <span className="leads-col-count">{colLeads.length}</span>
                      </div>
                      <div className="leads-col-value mono">${colVal.toLocaleString()}</div>
                    </div>
                    <div className="leads-col-body">
                      {addMode === 'inline' && inlineCol === col && (
                        <div className="leads-quickadd-card">
                          <input
                            className="lp-input"
                            placeholder="Business name"
                            value={inlineName}
                            onChange={(e) => setInlineName(e.target.value)}
                            autoFocus
                          />
                          <input
                            className="lp-input mono"
                            placeholder="(___) ___-____"
                            value={inlinePhone}
                            onChange={(e) => setInlinePhone(formatPhone(e.target.value))}
                            inputMode="tel"
                            onKeyDown={(e) => { if (e.key === 'Enter') handleInlineSave(col); }}
                          />
                          <div className="leads-quickadd-foot">
                            <button className="btn btn-ghost btn-sm" onClick={() => { openPanel(col); setInlineCol(null); setInlineName(''); setInlinePhone(''); }} type="button">
                              + details
                            </button>
                            <div className="flex gap-6">
                              <button className="btn btn-secondary btn-sm" onClick={() => { setInlineCol(null); setInlineName(''); setInlinePhone(''); }} type="button">Cancel</button>
                              <button className="btn btn-primary btn-sm" onClick={() => handleInlineSave(col)} type="button">Save</button>
                            </div>
                          </div>
                        </div>
                      )}
                      {colLeads.map((l: any) => (
                        <LeadCard
                          key={l.id}
                          lead={l}
                          onDragStart={(e) => onDragStart(e, col, l.id)}
                          onDragEnd={onDragEnd}
                          onContextMenu={(e) => handleContextMenu(e, col, l)}
                          onClick={() => setEditingLead({ lead: l, fromCol: col })}
                          isDragging={dragging?.leadId === l.id}
                          isJustAdded={justAddedId === l.id}
                        />
                      ))}
                      {colLeads.length === 0 && !(addMode === 'inline' && inlineCol === col) && (
                        <div className="leads-empty">— empty —</div>
                      )}
                      <button
                        className="kanban-add"
                        onClick={() => {
                          if (addMode === 'inline') setInlineCol(col);
                          else openPanel(col);
                        }}
                      >
                        <Icon d={Icons.plus} size={13} /> Add lead
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div
            className={'trash-zone' + (dragging ? ' visible' : '') + (dragOverTrash ? ' over' : '')}
            onDragOver={onTrashDragOver}
            onDragLeave={onTrashDragLeave}
            onDrop={onTrashDrop}
          >
            <div className="trash-zone-inner">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
              <span>{dragOverTrash ? 'Release to delete' : 'Drop here to delete'}</span>
            </div>
          </div>
        </>
      )}

      {/* Context menu */}
      {contextMenu && (
        <LeadContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          lead={contextMenu.lead}
          onClose={() => setContextMenu(null)}
          onMarkWon={() => archiveLead(contextMenu.fromCol, contextMenu.lead.id, 'Won')}
          onMarkLost={() => archiveLead(contextMenu.fromCol, contextMenu.lead.id, 'Lost')}
          onDelete={() => handleDelete(contextMenu.fromCol, contextMenu.lead.id)}
        />
      )}

      <NewLeadPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onSave={handleSave}
        defaultStage={panelStage}
      />

      <AddAccountModal
        open={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        onSave={handleAddTargetAccount}
      />

      <AddSourceModal
        open={sourceModalOpen}
        feed={editingFeed}
        onClose={() => setSourceModalOpen(false)}
        onSave={handleSaveSource}
      />

      <LogTouchpointModal
        open={!!touchModalAccountId}
        account={abmAccounts.find(a => a.id === touchModalAccountId)}
        onClose={() => setTouchModalAccountId(null)}
        onSave={(form) => touchModalAccountId && handleLogAccountTouchpoint(touchModalAccountId, form)}
      />

      <ApolloImportModal
        open={apolloModalOpen}
        onClose={() => setApolloModalOpen(false)}
        onImport={handleImportApolloAccount}
      />

      {editingLead && (
        <EditLeadModal
          lead={editingLead.lead}
          onClose={() => setEditingLead(null)}
          onSave={handleEditSave}
          activities={activities}
          onAddActivity={onAddActivity}
          tasks={tasks}
          onAddTask={onAddTask}
          onCompleteTask={onCompleteTask}
          proposals={proposals}
          addProposal={addProposal}
          updateProposal={updateProposal}
          deleteProposal={deleteProposal}
        />
      )}

      {/* Floating Toast Alerts */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          pointerEvents: 'none'
        }}
      >
        <style>{`
          @keyframes toast-slide-in {
            from { transform: translateX(110%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}</style>
        {toasts.map(t => (
          <div
            key={t.id}
            style={{
              background: 'var(--surface)',
              color: 'var(--ink)',
              border: '1px solid var(--line)',
              borderLeft: '4px solid var(--accent)',
              borderRadius: 'var(--r-md)',
              padding: '12px 18px',
              fontSize: '13px',
              fontWeight: 500,
              boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
              minWidth: 280,
              maxWidth: 360,
              pointerEvents: 'auto',
              animation: 'toast-slide-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
