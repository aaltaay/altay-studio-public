import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

interface PublicProposalViewProps {
  proposalId: string;
  updateProposal: (id: string, updates: any) => Promise<any>;
  updateLead: (id: string, updates: any) => Promise<any>;
  addProject: (project: any) => Promise<any>;
  addInvoice: (invoice: any) => Promise<any>;
  addActivity: (activity: any) => Promise<any>;
}

const SCHEMA = import.meta.env.VITE_DB_SCHEMA || 'public';
const db = () => supabase.schema(SCHEMA);

export function PublicProposalView({
  proposalId,
  updateProposal,
  updateLead,
  addProject,
  addInvoice,
  addActivity
}: PublicProposalViewProps) {
  const [proposal, setProposal] = useState<any | null>(null);
  const [lead, setLead] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [upgrades, setUpgrades] = useState<any[]>([]);
  const [signature, setSignature] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!proposalId) {
        setError('No proposal ID was provided.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);

      try {
        // Fetch proposal
        const { data: propData, error: propError } = await db()
          .from('proposals')
          .select('*')
          .eq('id', proposalId)
          .maybeSingle();

        if (propError || !propData) {
          setError('We could not find this proposal. It may have been deleted or expired.');
          setLoading(false);
          return;
        }

        setProposal(propData);
        setUpgrades(propData.upgrades || []);
        
        if (propData.status === 'Approved') {
          setSuccess(true);
        }

        // Fetch corresponding lead/contact details
        const { data: clientData, error: clientError } = await db()
          .from('clients')
          .select('*')
          .eq('id', propData.client_id)
          .maybeSingle();

        if (clientError || !clientData) {
          setError('Unable to load client contact details.');
        } else {
          setLead(clientData);
        }
      } catch (err) {
        console.error(err);
        setError('An unexpected error occurred while loading proposal details.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [proposalId]);

  const baseTotal = useMemo(() => {
    if (!proposal) return 0;
    const items = proposal.items || [];
    return items.reduce((sum: number, item: any) => sum + (item.price * item.qty), 0);
  }, [proposal]);

  const upgradesTotal = useMemo(() => {
    return upgrades.reduce((sum, up) => sum + (up.selected ? up.price : 0), 0);
  }, [upgrades]);

  const calculatedTotal = baseTotal + upgradesTotal;

  const handleToggleUpgrade = (idx: number) => {
    if (proposal?.status === 'Approved') return; // Read-only once approved
    setUpgrades(prev => prev.map((u, i) => i === idx ? { ...u, selected: !u.selected } : u));
  };

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signature.trim() || submitting || !proposal || !lead) return;

    setSubmitting(true);
    setError(null);

    const total = calculatedTotal;
    const depositAmount = Math.round(total * 0.5);
    const formattedDue = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    try {
      // 1. Update proposal status in Supabase
      const updatedProp = await updateProposal(proposal.id, {
        status: 'Approved',
        client_signature: signature.trim(),
        signed_at: new Date().toISOString(),
        upgrades,
        total_amount: total
      });

      if (!updatedProp) {
        throw new Error('Failed to update proposal status.');
      }

      // 2. Update lead status to Won in Supabase
      await updateLead(lead.id, {
        status: 'Won',
        outcome: 'Won',
        value: total
      });

      // 3. Create Project
      await addProject({
        name: `${lead.name} — Floor Coating Project`,
        client: lead.id,
        progress: 0,
        due: formattedDue,
        stage: 'Kickoff'
      });

      // 4. Create Deposit Invoice
      await addInvoice({
        client_id: lead.id,
        amount: depositAmount,
        status: 'Pending'
      });

      // 5. Add Activity
      await addActivity({
        type: 'note',
        text: `Proposal approved by client. Digital signature: "${signature.trim()}". 50% deposit invoice of $${depositAmount.toLocaleString()} created.`,
        linkedId: lead.id,
        linkedName: lead.name,
        linkedType: 'client'
      });

      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError('An error occurred during approval. Please refresh and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="ppv-container">
        <div style={{ textAlign: 'center' }}>
          <div className="brand-mark" style={{ width: 48, height: 48, fontSize: 24, margin: '0 auto 16px', animation: 'spin 2s linear infinite' }}>A</div>
          <div className="muted" style={{ fontSize: 14 }}>Retrieving your proposal details…</div>
        </div>
      </div>
    );
  }

  if (error && !proposal) {
    return (
      <div className="ppv-container">
        <div className="ppv-card" style={{ padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Unable to load proposal</h2>
          <p className="muted" style={{ fontSize: '14px', lineHeight: 1.5, marginBottom: '24px' }}>{error}</p>
          <a href="/" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', justifyContent: 'center' }}>Return to CRM</a>
        </div>
      </div>
    );
  }

  return (
    <div className="ppv-container">
      <style>{`
        .ppv-container {
          min-height: 100vh;
          background: var(--bg);
          color: var(--ink);
          font-family: var(--body);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 16px;
        }
        .ppv-card {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--r-xl);
          width: 100%;
          max-width: 680px;
          box-shadow: 0 16px 48px rgba(26, 22, 18, 0.05);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: ppv-fade-in 0.35s ease;
        }
        @keyframes ppv-fade-in {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .ppv-header {
          padding: 36px 36px 20px;
          border-bottom: 1px solid var(--line-soft);
          text-align: center;
          background: var(--surface-2);
        }
        .ppv-brand {
          font-family: var(--display);
          font-size: 26px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--accent);
          margin-bottom: 4px;
        }
        .ppv-title {
          font-size: 14px;
          color: var(--ink-3);
          margin: 0;
          font-family: var(--mono);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .ppv-body {
          padding: 36px;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }
        .ppv-meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          background: var(--surface-2);
          padding: 20px;
          border-radius: var(--r-lg);
          border: 1px solid var(--line-soft);
        }
        @media (max-width: 550px) {
          .ppv-meta-grid {
            grid-template-columns: 1fr;
          }
        }
        .ppv-meta-label {
          font-size: 10px;
          font-family: var(--mono);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--ink-3);
          margin-bottom: 4px;
        }
        .ppv-meta-val {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--ink);
        }
        .ppv-section-title {
          font-family: var(--display);
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 12px;
          color: var(--ink);
          border-bottom: 1px solid var(--line-soft);
          padding-bottom: 6px;
        }
        .ppv-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .ppv-table th {
          font-size: 11px;
          font-family: var(--mono);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--ink-3);
          padding: 8px 12px;
          border-bottom: 1px solid var(--line-strong);
        }
        .ppv-table td {
          font-size: 13.5px;
          padding: 12px;
          border-bottom: 1px solid var(--line-soft);
        }
        .ppv-upgrade-card {
          border: 1px solid var(--line);
          background: var(--surface);
          border-radius: var(--r-lg);
          padding: 16px;
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 16px;
          align-items: start;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .ppv-upgrade-card:hover {
          border-color: var(--line-strong);
          background: var(--surface-2);
        }
        .ppv-upgrade-card.active {
          border-color: var(--accent);
          background: var(--accent-soft);
        }
        .ppv-upgrade-card.approved {
          cursor: default;
        }
        .ppv-upgrade-card.approved:hover {
          border-color: var(--line);
          background: var(--surface);
        }
        .ppv-upgrade-check {
          margin-top: 3px;
          width: 16px;
          height: 16px;
          accent-color: var(--accent);
        }
        .ppv-upgrade-title {
          font-weight: 600;
          font-size: 14px;
          display: flex;
          justify-content: space-between;
          margin-bottom: 2px;
        }
        .ppv-upgrade-price {
          color: var(--accent);
          font-family: var(--mono);
        }
        .ppv-upgrade-desc {
          font-size: 12px;
          color: var(--ink-3);
        }
        .ppv-total-bar {
          background: var(--ink);
          color: var(--bg);
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-radius: var(--r-lg);
        }
        [data-theme="dark"] .ppv-total-bar {
          background: var(--surface-2);
          color: var(--ink);
          border: 1px solid var(--line);
        }
        .ppv-total-val {
          font-size: 26px;
          font-weight: 700;
          font-family: var(--mono);
          color: var(--accent);
        }
        .ppv-sign-block {
          background: var(--surface-2);
          padding: 24px;
          border-radius: var(--r-lg);
          border: 1px solid var(--line-soft);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .ppv-sign-input {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--r-md);
          padding: 12px 16px;
          font-size: 16px;
          font-family: var(--body);
          font-style: italic;
          outline: none;
          width: 100%;
          transition: border-color 0.12s;
        }
        .ppv-sign-input:focus {
          border-color: var(--accent);
        }
      `}</style>

      {success ? (
        <div className="ppv-card" style={{ maxWidth: '560px' }}>
          <div className="ppv-header" style={{ padding: '48px 24px 24px' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: 'var(--green-soft)', color: 'var(--green)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="ppv-brand">Proposal Approved!</div>
            <p style={{ fontSize: '14px', color: 'var(--ink-3)', margin: 0 }}>Demo Surface Co.</p>
          </div>
          <div style={{ padding: '36px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <p style={{ fontSize: '14.5px', lineHeight: 1.6, color: 'var(--ink-2)', margin: 0 }}>
              Thank you, <strong>{lead?.contact || lead?.name || 'Customer'}</strong>! The estimate has been signed and approved. 
            </p>
            
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line-soft)', padding: '16px 20px', borderRadius: 'var(--r-lg)', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', borderBottom: '1px solid var(--line-soft)' }}>
                <span className="muted">Total Project Value</span>
                <span className="mono" style={{ fontWeight: 600 }}>${(proposal?.total_amount || calculatedTotal).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', borderBottom: '1px solid var(--line-soft)' }}>
                <span className="muted">50% Deposit Invoice</span>
                <span className="mono" style={{ fontWeight: 600 }}>${Math.round((proposal?.total_amount || calculatedTotal) * 0.5).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0' }}>
                <span className="muted">Signature</span>
                <span style={{ fontStyle: 'italic', fontWeight: 600 }}>{proposal?.client_signature}</span>
              </div>
            </div>

            <p className="muted" style={{ fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
              A deposit invoice has been issued and we will reach out directly to coordinate your kickoff and final color choices. Feel free to contact us at <strong>(555) 010-0100</strong> if you have any questions.
            </p>
          </div>
        </div>
      ) : (
        <div className="ppv-card">
          <div className="ppv-header">
            <div className="ppv-brand">Demo Surface Co.</div>
            <p className="ppv-title">Service Agreement & Estimate Proposal</p>
          </div>

          <div className="ppv-body">
            {/* Meta details */}
            <div className="ppv-meta-grid">
              <div>
                <div className="ppv-meta-label">Prepared For</div>
                <div className="ppv-meta-val">{lead?.contact || lead?.name}</div>
                {lead?.email && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{lead.email}</div>}
              </div>
              <div>
                <div className="ppv-meta-label">Installation Address</div>
                <div className="ppv-meta-val">{lead?.address}</div>
              </div>
            </div>

            {/* Quote details */}
            <div>
              <div className="ppv-section-title">Estimated Scope of Services</div>
              <table className="ppv-table">
                <thead>
                  <tr>
                    <th>Service Description</th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(proposal?.items || []).map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 500 }}>{item.description}</td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 12 }}>{item.qty}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600 }}>${(item.price * item.qty).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Optional Upgrades */}
            {upgrades.length > 0 && (
              <div>
                <div className="ppv-section-title">Select Optional Upgrades</div>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {upgrades.map((up, idx) => (
                    <div
                      key={up.id}
                      className={`ppv-upgrade-card ${up.selected ? 'active' : ''}`}
                      onClick={() => handleToggleUpgrade(idx)}
                    >
                      <input
                        type="checkbox"
                        className="ppv-upgrade-check"
                        checked={up.selected}
                        onChange={() => {}} // Controlled via card div click
                      />
                      <div style={{ flex: 1 }}>
                        <div className="ppv-upgrade-title">
                          <span>{up.name}</span>
                          <span className="ppv-upgrade-price">+${up.price}</span>
                        </div>
                        <div className="ppv-upgrade-desc">{up.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total */}
            <div className="ppv-total-bar">
              <div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', fontFamily: 'var(--mono)', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)' }}>Proposed Total</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>*Includes concrete prep, diamond grinding & topcoat</div>
              </div>
              <div className="ppv-total-val">${calculatedTotal.toLocaleString()}</div>
            </div>

            {/* Signature Block */}
            <form onSubmit={handleApprove} className="ppv-sign-block">
              <div className="ppv-section-title" style={{ border: 0, padding: 0, margin: 0 }}>Authorization & Sign-off</div>
              <p className="muted" style={{ fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
                By signing and submitting below, you authorize Demo Surface Co. to perform the services outlined above. You agree to the terms, including a 50% deposit before launching kickoff and scheduling.
              </p>
              <div>
                <label className="ppv-meta-label">Digital Signature (Type your full name)</label>
                <input
                  type="text"
                  className="ppv-sign-input"
                  placeholder="e.g. Nicolas Valdivieso"
                  value={signature}
                  onChange={e => setSignature(e.target.value)}
                  required
                />
              </div>

              {error && <div style={{ color: 'var(--red)', fontSize: '13px', textAlign: 'center' }}>{error}</div>}

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '15px' }}
                disabled={!signature.trim() || submitting}
              >
                {submitting ? 'Processing Approval…' : 'Approve Proposal & Authorize Work'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
