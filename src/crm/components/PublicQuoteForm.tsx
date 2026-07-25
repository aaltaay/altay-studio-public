import React, { useState } from 'react';

// Form interface matching the CRM lead structure
interface PublicQuoteFormProps {
  onSave: (lead: any) => Promise<any>;
}

const COATING_SYSTEMS = [
  {
    id: 'epoxy_flake',
    name: 'Epoxy Flake System',
    price: 5.5,
    tagline: 'Multi-layered decorative chip finish.',
    bullets: ['Extremely durable & impact-resistant', 'Slip-resistant textured surface', 'Perfect for garages & workshops'],
    color: 'var(--blue)'
  },
  {
    id: 'polyaspartic',
    name: 'Polyaspartic Polyurea',
    price: 6.5,
    tagline: 'Premium UV-stable next-gen coating.',
    bullets: ['1-day install & fast cure time', '4x stronger than standard epoxy', 'Sunlight UV-stable (ideal for patios)'],
    color: 'var(--violet)'
  },
  {
    id: 'metallic',
    name: 'Metallic Epoxy',
    price: 7.5,
    tagline: 'Artistic, high-gloss marbleized look.',
    bullets: ['Unique, custom metallic pigments', 'Seamless glass-like reflection', 'Best for basements, retail & offices'],
    color: 'var(--amber)'
  },
  {
    id: 'solid_color',
    name: 'Solid Color Epoxy',
    price: 4.5,
    tagline: 'Clean, industrial-strength solid color finish.',
    bullets: ['High-gloss protective coating', 'Easy to clean & chemical-resistant', 'Economic solution for large spaces'],
    color: 'var(--green)'
  }
];

export function PublicQuoteForm({ onSave }: PublicQuoteFormProps) {
  const [step, setStep] = useState(1);

  // Step 1: Space & Dimensions
  const [spaceType, setSpaceType] = useState('Garage');
  const [areaPreset, setAreaPreset] = useState('2car');
  const [width, setWidth] = useState('20');
  const [length, setLength] = useState('24');
  const [customSqFt, setCustomSqFt] = useState('');

  // Step 2: Coating System
  const [coatingSystem, setCoatingSystem] = useState('epoxy_flake');

  // Step 3: Contact Info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [timeline, setTimeline] = useState('month');
  const [message, setMessage] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived square footage
  const sqFt = React.useMemo(() => {
    if (areaPreset === '1car') return 240; // 12x20
    if (areaPreset === '2car') return 480; // 20x24
    if (areaPreset === '3car') return 720; // 24x30
    if (areaPreset === 'custom') {
      if (customSqFt) return Number(customSqFt) || 0;
      return (Number(width) * Number(length)) || 0;
    }
    return 0;
  }, [areaPreset, width, length, customSqFt]);

  // Derived prices
  const coating = COATING_SYSTEMS.find(c => c.id === coatingSystem) || COATING_SYSTEMS[0];
  const totalBase = sqFt * coating.price;
  const minEstimate = Math.round(totalBase * 0.92);
  const maxEstimate = Math.round(totalBase * 1.08);
  const midpoint = Math.round((minEstimate + maxEstimate) / 2);

  // Format phone number as user types
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    if (raw.length === 0) setPhone('');
    else if (raw.length < 4) setPhone('(' + raw);
    else if (raw.length < 7) setPhone('(' + raw.slice(0, 3) + ') ' + raw.slice(3));
    else setPhone('(' + raw.slice(0, 3) + ') ' + raw.slice(3, 6) + '-' + raw.slice(6));
  };

  const isStep1Valid = sqFt > 0;
  const isStep2Valid = !!coatingSystem;
  const isStep3Valid = name.trim().length > 0 && phone.replace(/\D/g, '').length === 10 && email.includes('@');

  const handleNext = () => {
    if (step === 1 && isStep1Valid) setStep(2);
    else if (step === 2 && isStep2Valid) setStep(3);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStep3Valid) return;

    setSubmitting(true);
    setError(null);

    const projectNotes = [
      `Requested via Website Instant Estimator.`,
      `Floor details: ${spaceType} (${sqFt} sq ft total, layout preset: ${areaPreset === 'custom' ? 'Custom' : areaPreset}).`,
      areaPreset === 'custom' && !customSqFt ? `Dimensions: ${width} ft x ${length} ft.` : '',
      `Desired Coating System: ${coating.name} (Estimated unit price: $${coating.price}/sq ft).`,
      `Timeline for starting: ${
        timeline === 'immediate' ? 'Immediately (Within 2 weeks)' :
        timeline === 'month' ? 'Within 30 days' : 'Flexible / Planning & pricing'
      }.`,
      message.trim() ? `Client Message: "${message.trim()}"` : ''
    ].filter(Boolean).join('\n');

    const leadPayload = {
      name: `${name}'s ${spaceType} Project`,
      contact: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim() || '—',
      type: coating.name,
      status: 'New',
      source: 'Website Form',
      value: midpoint,
      hot: timeline === 'immediate',
      notes: projectNotes,
    };

    try {
      const saved = await onSave(leadPayload);
      if (saved) {
        setStep(4);
      } else {
        setError('Failed to submit quote request. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pq-container">
      {/* Scope styles specifically inside .pq-container to preserve encapsulation */}
      <style>{`
        .pq-container {
          min-height: 100vh;
          background: var(--bg);
          color: var(--ink);
          font-family: var(--body);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
        }

        .pq-card {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--r-xl);
          width: 100%;
          max-width: 640px;
          box-shadow: 0 10px 40px rgba(26, 22, 18, 0.04);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: pq-fade-in 0.3s ease;
        }

        @keyframes pq-fade-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .pq-header {
          padding: 32px 32px 16px;
          border-bottom: 1px solid var(--line-soft);
          text-align: center;
        }

        .pq-brand {
          font-family: var(--display);
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--accent);
          margin-bottom: 6px;
        }

        .pq-title {
          font-size: 15px;
          color: var(--ink-3);
          margin: 0;
        }

        .pq-progress {
          display: flex;
          justify-content: center;
          gap: 24px;
          margin-top: 20px;
        }

        .pq-progress-step {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          font-family: var(--mono);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--ink-4);
        }

        .pq-progress-step.active {
          color: var(--accent);
          font-weight: 600;
        }

        .pq-progress-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--line-strong);
        }

        .pq-progress-step.active .pq-progress-dot {
          background: var(--accent);
        }

        .pq-body {
          padding: 32px;
          flex: 1;
        }

        .pq-step-title {
          font-family: var(--display);
          font-size: 20px;
          font-weight: 600;
          letter-spacing: -0.01em;
          margin-bottom: 20px;
          color: var(--ink);
        }

        /* Form Controls */
        .pq-field {
          margin-bottom: 20px;
        }

        .pq-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: var(--ink-2);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .pq-input, .pq-select, .pq-textarea {
          background: var(--bg);
          border: 1px solid var(--line);
          border-radius: var(--r-md);
          padding: 11px 14px;
          width: 100%;
          font-size: 14px;
          color: var(--ink);
          outline: none;
          transition: border-color 0.12s, background 0.12s;
        }

        .pq-input:focus, .pq-select:focus, .pq-textarea:focus {
          border-color: var(--accent);
          background: var(--surface);
        }

        .pq-textarea {
          resize: vertical;
          min-height: 80px;
        }

        /* Option Grids */
        .pq-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        @media (max-width: 500px) {
          .pq-grid-2 {
            grid-template-columns: 1fr;
          }
        }

        .pq-card-btn {
          background: var(--bg);
          border: 1px solid var(--line);
          border-radius: var(--r-lg);
          padding: 16px;
          text-align: left;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .pq-card-btn:hover {
          border-color: var(--line-strong);
        }

        .pq-card-btn.active {
          border-color: var(--accent);
          background: var(--accent-soft);
          color: var(--ink);
        }

        .pq-card-btn-title {
          font-weight: 600;
          font-size: 14px;
        }

        .pq-card-btn-desc {
          font-size: 11.5px;
          color: var(--ink-3);
        }

        /* Custom Presets */
        .pq-presets {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .pq-preset-btn {
          background: var(--bg);
          border: 1px solid var(--line);
          border-radius: 99px;
          padding: 6px 14px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.12s;
        }

        .pq-preset-btn:hover {
          border-color: var(--line-strong);
        }

        .pq-preset-btn.active {
          background: var(--ink);
          color: var(--bg);
          border-color: var(--ink);
        }

        /* Dimensions Grid */
        .pq-dim-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          background: var(--bg);
          padding: 16px;
          border-radius: var(--r-lg);
          border: 1px solid var(--line-soft);
        }

        /* Coating Grid */
        .pq-coating-list {
          display: grid;
          gap: 12px;
        }

        .pq-coating-card {
          background: var(--bg);
          border: 1px solid var(--line);
          border-radius: var(--r-lg);
          padding: 16px;
          cursor: pointer;
          transition: all 0.15s;
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 16px;
          align-items: start;
        }

        .pq-coating-card:hover {
          border-color: var(--line-strong);
        }

        .pq-coating-card.active {
          border-color: var(--accent);
          background: var(--surface);
          box-shadow: 0 4px 15px rgba(194, 65, 12, 0.05);
        }

        .pq-coating-radio {
          margin-top: 4px;
          accent-color: var(--accent);
          width: 16px;
          height: 16px;
        }

        .pq-coating-name {
          font-weight: 600;
          font-size: 14.5px;
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }

        .pq-coating-rate {
          font-family: var(--mono);
          font-size: 11.5px;
          color: var(--ink-3);
          font-weight: 500;
        }

        .pq-coating-tagline {
          font-size: 12.5px;
          color: var(--ink-2);
          margin: 2px 0 8px;
        }

        .pq-coating-bullets {
          display: grid;
          gap: 4px;
          padding-left: 14px;
          margin: 0;
          font-size: 11.5px;
          color: var(--ink-3);
        }

        /* Dynamic Estimate Card */
        .pq-estimate-bar {
          background: var(--ink);
          color: var(--bg);
          padding: 20px 24px;
          border-top: 1px solid var(--line-soft);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        [data-theme="dark"] .pq-estimate-bar {
          background: var(--bg-2);
          color: var(--ink);
          border-top: 1px solid var(--line);
        }

        .pq-estimate-label {
          font-size: 11px;
          font-family: var(--mono);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--ink-4);
        }

        .pq-estimate-val {
          font-size: 20px;
          font-weight: 700;
          font-family: var(--mono);
          color: var(--bg);
        }

        [data-theme="dark"] .pq-estimate-val {
          color: var(--accent);
        }

        .pq-estimate-sub {
          font-size: 10px;
          color: var(--ink-4);
          text-align: right;
          margin-top: 2px;
        }

        /* Footer buttons */
        .pq-footer {
          padding: 24px 32px 32px;
          background: var(--surface-2);
          border-top: 1px solid var(--line-soft);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .pq-error {
          color: var(--red);
          font-size: 12.5px;
          margin-top: 8px;
          text-align: center;
        }

        /* Success screen */
        .pq-success {
          text-align: center;
          padding: 40px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .pq-success-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--green-soft);
          color: var(--green);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
        }

        .pq-success-title {
          font-family: var(--display);
          font-size: 24px;
          font-weight: 600;
          margin: 0;
        }

        .pq-success-desc {
          color: var(--ink-2);
          font-size: 14px;
          max-width: 440px;
          line-height: 1.6;
        }

        .pq-summary-box {
          background: var(--bg);
          border: 1px solid var(--line);
          border-radius: var(--r-xl);
          padding: 20px 24px;
          width: 100%;
          max-width: 400px;
          margin: 12px 0;
          text-align: left;
        }

        .pq-summary-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          padding: 8px 0;
          border-bottom: 1px solid var(--line-soft);
        }

        .pq-summary-row:last-child {
          border-bottom: 0;
          padding-bottom: 0;
          font-weight: 700;
        }
      `}</style>

      <div className="pq-card">
        {step < 4 && (
          <div className="pq-header">
            <div className="pq-brand">Demo Surface Co.</div>
            <p className="pq-title">Instant Floor Coating Cost Estimator</p>
            
            <div className="pq-progress">
              <div className={`pq-progress-step ${step === 1 ? 'active' : ''}`}>
                <span className="pq-progress-dot" />
                <span>1. Dimensions</span>
              </div>
              <div className={`pq-progress-step ${step === 2 ? 'active' : ''}`}>
                <span className="pq-progress-dot" />
                <span>2. Coating</span>
              </div>
              <div className={`pq-progress-step ${step === 3 ? 'active' : ''}`}>
                <span className="pq-progress-dot" />
                <span>3. Contact</span>
              </div>
            </div>
          </div>
        )}

        <div className="pq-body">
          {/* STEP 1: Dimensions */}
          {step === 1 && (
            <div className="pq-step">
              <h2 className="pq-step-title">Tell us about your space</h2>

              <div className="pq-field">
                <label className="pq-label">Area Type</label>
                <div className="pq-grid-2">
                  {['Garage', 'Patio / Porch', 'Basement', 'Commercial / Other'].map(type => (
                    <button
                      key={type}
                      type="button"
                      className={`pq-card-btn ${spaceType === type ? 'active' : ''}`}
                      onClick={() => setSpaceType(type)}
                    >
                      <span className="pq-card-btn-title">{type}</span>
                      <span className="pq-card-btn-desc">
                        {type === 'Garage' && 'Epoxy/Polyaspartic blends'}
                        {type === 'Patio / Porch' && 'UV-stable sealants'}
                        {type === 'Basement' && 'Moisture vapor barriers'}
                        {type === 'Commercial / Other' && 'Heavy traffic coatings'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pq-field">
                <label className="pq-label">Size / Layout</label>
                <div className="pq-presets">
                  {[
                    { id: '1car', label: '1-Car Garage (~240 sq ft)' },
                    { id: '2car', label: '2-Car Garage (~480 sq ft)' },
                    { id: '3car', label: '3-Car Garage (~720 sq ft)' },
                    { id: 'custom', label: 'Custom Dimensions' }
                  ].map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      className={`pq-preset-btn ${areaPreset === preset.id ? 'active' : ''}`}
                      onClick={() => setAreaPreset(preset.id)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {areaPreset === 'custom' && (
                  <div className="pq-dim-grid">
                    <div style={{ display: 'grid', gap: '4px' }}>
                      <label className="pq-label" style={{ fontSize: '10px' }}>Width (ft)</label>
                      <input
                        type="number"
                        className="pq-input"
                        placeholder="e.g. 20"
                        value={width}
                        onChange={e => { setWidth(e.target.value); setCustomSqFt(''); }}
                      />
                    </div>
                    <div style={{ display: 'grid', gap: '4px' }}>
                      <label className="pq-label" style={{ fontSize: '10px' }}>Length (ft)</label>
                      <input
                        type="number"
                        className="pq-input"
                        placeholder="e.g. 20"
                        value={length}
                        onChange={e => { setLength(e.target.value); setCustomSqFt(''); }}
                      />
                    </div>
                    <div style={{ gridColumn: 'span 2', display: 'grid', gap: '4px', marginTop: '8px', borderTop: '1px solid var(--line-soft)', paddingTop: '12px' }}>
                      <label className="pq-label" style={{ fontSize: '10px' }}>Or enter Total Area directly (sq ft)</label>
                      <input
                        type="number"
                        className="pq-input"
                        placeholder="e.g. 500"
                        value={customSqFt}
                        onChange={e => setCustomSqFt(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Coating System */}
          {step === 2 && (
            <div className="pq-step">
              <h2 className="pq-step-title">Select your coating system</h2>
              <div className="pq-coating-list">
                {COATING_SYSTEMS.map(system => (
                  <div
                    key={system.id}
                    className={`pq-coating-card ${coatingSystem === system.id ? 'active' : ''}`}
                    onClick={() => setCoatingSystem(system.id)}
                  >
                    <input
                      type="radio"
                      className="pq-coating-radio"
                      checked={coatingSystem === system.id}
                      onChange={() => {}} // Controlled click via card div
                    />
                    <div>
                      <div className="pq-coating-name">
                        <span>{system.name}</span>
                        <span className="pq-coating-rate">${system.price.toFixed(2)}/sq ft</span>
                      </div>
                      <div className="pq-coating-tagline">{system.tagline}</div>
                      <ul className="pq-coating-bullets">
                        {system.bullets.map((bullet, idx) => (
                          <li key={idx}>{bullet}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Contact & Timeline */}
          {step === 3 && (
            <form onSubmit={handleSubmit} className="pq-step">
              <h2 className="pq-step-title">Where should we send your estimate?</h2>

              <div className="pq-field">
                <label className="pq-label">Your name</label>
                <input
                  type="text"
                  className="pq-input"
                  placeholder="Nicolas Valdivieso"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div className="pq-grid-2">
                <div className="pq-field">
                  <label className="pq-label">Phone number</label>
                  <input
                    type="tel"
                    className="pq-input mono"
                    placeholder="(555) 010-0100"
                    required
                    value={phone}
                    onChange={handlePhoneChange}
                  />
                </div>
                <div className="pq-field">
                  <label className="pq-label">Email address</label>
                  <input
                    type="email"
                    className="pq-input"
                    placeholder="nicolas@example.com"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="pq-field">
                <label className="pq-label">Installation address</label>
                <input
                  type="text"
                  className="pq-input"
                  placeholder="Street address, city, state"
                  required
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />
              </div>

              <div className="pq-field">
                <label className="pq-label">Timeline for start</label>
                <select
                  className="pq-select"
                  value={timeline}
                  onChange={e => setTimeline(e.target.value)}
                >
                  <option value="immediate">Immediately (Next 1-2 weeks)</option>
                  <option value="month">Within 30 Days</option>
                  <option value="planning">Flexible / Planning & pricing phase</option>
                </select>
              </div>

              <div className="pq-field">
                <label className="pq-label">Special requests / Notes</label>
                <textarea
                  className="pq-textarea"
                  placeholder="Any specific concrete issues? Cracks? Colors you prefer?"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                />
              </div>

              {error && <div className="pq-error">{error}</div>}
            </form>
          )}

          {/* STEP 4: Success confirmation */}
          {step === 4 && (
            <div className="pq-success">
              <div className="pq-success-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="pq-success-title">Estimate Created!</h2>
              <p className="pq-success-desc">
                Thank you, <strong>{name}</strong>! We've received your request and calculated your instant flooring estimate. A copy has been saved to our pipeline.
              </p>

              <div className="pq-summary-box">
                <div className="pq-summary-row">
                  <span className="muted">Project Type</span>
                  <span>{spaceType} Coating</span>
                </div>
                <div className="pq-summary-row">
                  <span className="muted">Dimensions</span>
                  <span>{sqFt.toLocaleString()} sq ft ({coating.name})</span>
                </div>
                <div className="pq-summary-row">
                  <span className="muted">Timeline</span>
                  <span>{timeline === 'immediate' ? 'Urgent (Ready)' : timeline === 'month' ? 'Next 30 Days' : 'Planning'}</span>
                </div>
                <div className="pq-summary-row" style={{ marginTop: '8px', paddingTop: '12px', borderTop: '1px solid var(--line-strong)' }}>
                  <span>Est. Range</span>
                  <span className="mono" style={{ color: 'var(--accent)', fontSize: '15px' }}>
                    ${minEstimate.toLocaleString()} - ${maxEstimate.toLocaleString()}
                  </span>
                </div>
              </div>

              <p className="pq-success-desc" style={{ fontSize: '12.5px', color: 'var(--ink-3)' }}>
                Our flooring specialist will review your project details and contact you at <strong>{phone}</strong> to schedule an on-site inspection and select colors.
              </p>

              <button
                type="button"
                className="btn btn-secondary btn-lg"
                style={{ marginTop: '16px' }}
                onClick={() => {
                  // Reset form
                  setStep(1);
                  setAreaPreset('2car');
                  setCustomSqFt('');
                  setName('');
                  setEmail('');
                  setPhone('');
                  setAddress('');
                  setMessage('');
                }}
              >
                Estimate another space
              </button>
            </div>
          )}
        </div>

        {/* Dynamic bottom pricing bar */}
        {step < 3 && sqFt > 0 && (
          <div className="pq-estimate-bar">
            <div>
              <div className="pq-estimate-label">Calculated Area</div>
              <div className="mono" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--bg)' }}>{sqFt} sq ft</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="pq-estimate-label">Estimated Cost Range</div>
              <div className="pq-estimate-val">${minEstimate.toLocaleString()} - ${maxEstimate.toLocaleString()}</div>
              <div className="pq-estimate-sub">*Includes materials & preparation</div>
            </div>
          </div>
        )}

        {/* Navigation Footer */}
        {step < 4 && (
          <div className="pq-footer">
            {step > 1 ? (
              <button type="button" className="btn btn-secondary" onClick={handleBack}>
                Back
              </button>
            ) : (
              <div /> // Spacer
            )}

            {step < 3 ? (
              <button
                type="button"
                className="btn btn-primary btn-lg"
                disabled={step === 1 ? !isStep1Valid : !isStep2Valid}
                onClick={handleNext}
              >
                Next Step
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-lg"
                style={{ background: 'var(--green)', color: 'white' }}
                disabled={!isStep3Valid || submitting}
                onClick={handleSubmit}
              >
                {submitting ? 'Submitting...' : 'Request Quote'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
