import React from 'react';
import { formatRelTime, formatTaskDue, ACT_TYPES_DEF } from './ActivityTaskPanel';
import { WorldMap } from './WorldMap';

interface DashboardProps {
  activities: any[];
  tasks: any[];
  onCompleteTask: (id: string) => void;
  leads: {
    New: any[];
    Contacted: any[];
    Quoted: any[];
  };
  leadsHistory: any[];
  projects: any[];
}

export function Dashboard({ activities, tasks, onCompleteTask, leads, leadsHistory, projects }: DashboardProps) {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const COLS = ['New', 'Contacted', 'Quoted'] as const;
  const allLeads = COLS.flatMap(c => leads[c] || []);
  const pipeVal = allLeads.reduce((a, l) => a + (l.value || 0), 0);

  // Marketing Analytics & ROI calculations
  const allHistorical = leadsHistory || [];
  const wonLeads = allHistorical.filter(l => l.outcome === 'Won');
  const lostLeads = allHistorical.filter(l => l.outcome === 'Lost');
  
  const sourcesList = ['Referral', 'Ads', 'Warm call', 'Cold call', 'Walk-in', 'Event', 'Website Form'];
  
  const sourceStats = sourcesList.map(src => {
    const activeCount = allLeads.filter(l => l.source === src).length;
    const wonCount = wonLeads.filter(l => l.source === src).length;
    const lostCount = lostLeads.filter(l => l.source === src).length;
    const total = activeCount + wonCount + lostCount;
    const winRate = total > 0 ? Math.round((wonCount / total) * 100) : 0;
    const wonValue = wonLeads.filter(l => l.source === src).reduce((a, l) => a + (l.value || 0), 0);
    return { source: src, wonCount, total, winRate, wonValue };
  }).sort((a, b) => b.wonValue - a.wonValue);

  let totalDays = 0;
  let closeCount = 0;
  wonLeads.forEach(l => {
    const p = (projects || []).find(proj => proj.client === l.id);
    if (p && p.created_at && l.created_at) {
      const diffTime = new Date(p.created_at).getTime() - new Date(l.created_at).getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0) {
        totalDays += diffDays;
        closeCount++;
      }
    }
  });
  const avgTimeToClose = closeCount > 0 ? (totalDays / closeCount).toFixed(1) : null;

  const allValueLeads = [...allLeads, ...wonLeads];
  const lowVal = allValueLeads.filter(l => (l.value || 0) < 3000);
  const midVal = allValueLeads.filter(l => (l.value || 0) >= 3000 && (l.value || 0) <= 6000);
  const highVal = allValueLeads.filter(l => (l.value || 0) > 6000);
  const distTotal = allValueLeads.length || 1;
  const lowPct = Math.round((lowVal.length / distTotal) * 100);
  const midPct = Math.round((midVal.length / distTotal) * 100);
  const highPct = Math.round((highVal.length / distTotal) * 100);

  const todayStr = now.toISOString().split('T')[0];
  const openTasks = (tasks || []).filter(t => !t.done);
  const overdue = openTasks.filter(t => t.dueDate < todayStr);
  const dueToday = openTasks.filter(t => t.dueDate === todayStr);
  const upcoming = openTasks.filter(t => t.dueDate > todayStr);
  const urgent = [...overdue, ...dueToday];

  const wonValue = (leadsHistory || [])
    .filter(l => l.outcome === 'Won')
    .reduce((a, l) => a + (l.value || 0), 0);

  function parseDays(createdStr: string) {
    if (!createdStr) return 0;
    const diff = Math.round((now.getTime() - new Date(createdStr).getTime()) / 86400000);
    return diff > 0 ? diff : 0;
  }

  const stale = COLS.flatMap(c =>
    (leads[c] || [])
      .filter(l => parseDays(l.created_at) >= 4)
      .map(l => ({ ...l, col: c }))
  );

  const recentActs = [...(activities || [])]
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, 5);

  const pipeBreak = COLS.map(c => {
    const ls = leads[c] || [];
    return { col: c, value: ls.reduce((a, l) => a + (l.value || 0), 0), count: ls.length };
  });
  const maxPipe = Math.max(...pipeBreak.map(b => b.value), 1);
  const PIPE_CLR: Record<string, string> = { New: 'var(--blue)', Contacted: 'var(--violet)', Quoted: 'var(--amber)' };

  const CheckCircle = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  return (
    <div className="page">
      {/* Greeting */}
      <div className="db-greeting">
        <div className="db-greeting-text">{greeting}, Altaay.</div>
        <div className="db-greeting-date mono muted">{dateStr}</div>
      </div>

      {/* Stats strip */}
      <div className="db-stats">
        <div className="db-stat">
          <div className="db-stat-value">${(pipeVal / 1000).toFixed(1)}k</div>
          <div className="db-stat-label">pipeline value</div>
        </div>
        <div className="db-stat">
          <div className="db-stat-value">{allLeads.length}</div>
          <div className="db-stat-label">active leads</div>
        </div>
        <div className={'db-stat' + (overdue.length > 0 ? ' db-stat-warn' : '')}>
          <div className="db-stat-value"
            style={{ color: overdue.length > 0 ? 'var(--red)' : 'inherit' }}>
            {openTasks.length}
          </div>
          <div className="db-stat-label">
            {overdue.length > 0 ? overdue.length + ' overdue' : 'open tasks'}
          </div>
        </div>
        <div className="db-stat">
          <div className="db-stat-value" style={{ color: 'var(--green)' }}>
            ${wonValue.toLocaleString()}
          </div>
          <div className="db-stat-label">won · all time</div>
        </div>
      </div>

      <div className="db-layout">
        {/* ── Left column ── */}
        <div className="db-col-main">
          {/* Tasks */}
          <div className="db-section">
            <div className="db-section-head">
              <span className="db-section-title">Tasks needing attention</span>
              {urgent.length > 0 && (
                <span className="chip tone-red" style={{ fontSize: 10 }}>{urgent.length}</span>
              )}
            </div>

            {urgent.length === 0 ? (
              <div className="db-empty" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><CheckCircle />All caught up — nothing due today.</div>
            ) : (
              urgent.map(t => {
                const due = formatTaskDue(t.dueDate);
                return (
                  <div key={t.id} className="db-row" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      className="atp-check-btn"
                      onClick={() => onCompleteTask && onCompleteTask(t.id)}
                      title="Mark complete"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="9" />
                      </svg>
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13.5px', fontWeight: 500 }}>{t.text}</div>
                      <div className="mono muted" style={{ fontSize: '10.5px', marginTop: '1px' }}>
                        {t.linkedName} · {t.linkedType}
                      </div>
                    </div>
                    <span className={'chip' + (due.tone ? ' tone-' + due.tone : '')}
                      style={{ fontSize: 10, flexShrink: 0 }}>
                      {due.label}
                    </span>
                  </div>
                );
              })
            )}

            {upcoming.length > 0 && (
              <div className="db-row" style={{ opacity: 0.5 }}>
                <span className="muted" style={{ fontSize: 12, paddingLeft: 28 }}>
                  + {upcoming.length} upcoming task{upcoming.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Stale leads */}
          <div className="db-section">
            <div className="db-section-head">
              <span className="db-section-title">Stale leads</span>
              <span className="mono muted" style={{ fontSize: 11 }}>4+ days no activity</span>
            </div>

            {stale.length === 0 ? (
              <div className="db-empty" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><CheckCircle />Pipeline is fresh.</div>
            ) : (
              stale.map(l => (
                <div key={l.id} className="db-row" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 500 }}>{l.name}</div>
                    <div className="mono muted" style={{ fontSize: '10.5px', marginTop: '1px' }}>
                      {l.contact} · {l.col}
                    </div>
                  </div>
                  <span className="chip tone-red" style={{ fontSize: 10 }}>{parseDays(l.created_at)}d stale</span>
                </div>
              ))
            )}
          </div>

          {/* Marketing & ROI Insights Section */}
          <div className="db-section">
            <div className="db-section-head">
              <span className="db-section-title">Marketing & Conversion Insights</span>
            </div>
            
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* ROI & Close efficiency Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'var(--surface-2)', padding: '12px 16px', borderRadius: 'var(--r-md)', border: '1px solid var(--line-soft)' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', fontFamily: 'var(--mono)', color: 'var(--ink-3)', letterSpacing: '0.04em' }}>Avg Time-to-Close</div>
                  <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '4px', color: 'var(--ink)' }}>
                    {avgTimeToClose ? `${avgTimeToClose} days` : '—'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--ink-4)', marginTop: '2px' }}>From contact to won project</div>
                </div>
                <div style={{ background: 'var(--surface-2)', padding: '12px 16px', borderRadius: 'var(--r-md)', border: '1px solid var(--line-soft)' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', fontFamily: 'var(--mono)', color: 'var(--ink-3)', letterSpacing: '0.04em' }}>Top Source by Won Value</div>
                  <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '4px', color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sourceStats.length > 0 && sourceStats[0].wonValue > 0 ? sourceStats[0].source : '—'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--ink-4)', marginTop: '2px' }}>
                    {sourceStats.length > 0 && sourceStats[0].wonValue > 0 ? `$${(sourceStats[0].wonValue / 1000).toFixed(1)}k generated` : 'No won leads yet'}
                  </div>
                </div>
              </div>

              {/* Lead Value Distribution */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 600 }}>Lead Value Distribution</span>
                  <span className="mono muted" style={{ fontSize: '11px' }}>Total: {allValueLeads.length} leads</span>
                </div>
                {/* Visual Stacked bar */}
                <div style={{ display: 'flex', height: '18px', borderRadius: '9px', overflow: 'hidden', background: 'var(--line-soft)' }}>
                  {lowVal.length > 0 && (
                    <div style={{ width: `${lowPct}%`, background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '9px', fontWeight: 700 }} title={`Low (<$3k): ${lowVal.length} leads (${lowPct}%)`}>
                      {lowPct > 10 ? 'Low' : ''}
                    </div>
                  )}
                  {midVal.length > 0 && (
                    <div style={{ width: `${midPct}%`, background: 'var(--violet)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '9px', fontWeight: 700 }} title={`Mid ($3k-$6k): ${midVal.length} leads (${midPct}%)`}>
                      {midPct > 10 ? 'Mid' : ''}
                    </div>
                  )}
                  {highVal.length > 0 && (
                    <div style={{ width: `${highPct}%`, background: 'var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '9px', fontWeight: 700 }} title={`High (>$6k): ${highVal.length} leads (${highPct}%)`}>
                      {highPct > 10 ? 'High' : ''}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: 'var(--ink-3)' }} className="mono">
                  <span>● Low (&lt;$3k): {lowVal.length}</span>
                  <span>● Mid ($3k-$6k): {midVal.length}</span>
                  <span>● High (&gt;$6k): {highVal.length}</span>
                </div>
              </div>

              {/* Win Rate by Lead Source */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 600 }}>Conversion Win Rate by Source</span>
                  <span className="mono muted" style={{ fontSize: '11px' }}>Won / Total leads</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {sourceStats.slice(0, 5).map(stat => (
                    <div key={stat.source}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '11.5px', marginBottom: '3px' }}>
                        <span style={{ fontWeight: 500 }}>{stat.source}</span>
                        <span className="mono muted" style={{ fontSize: '10.5px' }}>
                          {stat.winRate}% win rate · {stat.wonCount}/{stat.total}
                        </span>
                      </div>
                      <div style={{ height: '6px', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${stat.winRate}%`,
                          background: stat.winRate > 50 ? 'var(--green)' : stat.winRate > 25 ? 'var(--accent)' : 'var(--ink-3)',
                          borderRadius: '99px'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SEO Traffic World Map */}
              <div style={{ marginTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 600 }}>Global Traffic Summary</span>
                  <span className="mono muted" style={{ fontSize: '11px' }}>SEO traffic (mocked)</span>
                </div>
                <div style={{ padding: '16px 20px', height: '400px' }}>
                  <WorldMap data={[
                    { countryId: 'USA', visits: 1240 },
                    { countryId: 'CAN', visits: 350 },
                    { countryId: 'GBR', visits: 420 },
                    { countryId: 'MEX', visits: 180 },
                    { countryId: 'AUS', visits: 110 },
                    { countryId: 'DEU', visits: 85 }
                  ]} />
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="db-col-side">
          {/* Pipeline breakdown */}
          <div className="db-section">
            <div className="db-section-head">
              <span className="db-section-title">Pipeline</span>
            </div>
            <div style={{ padding: '6px 18px 16px' }}>
              {pipeBreak.map(b => (
                <div key={b.col} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 500 }}>{b.col}</span>
                    <span className="mono muted" style={{ fontSize: 11 }}>
                      ${b.value.toLocaleString()} · {b.count} lead{b.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="db-pipe-track">
                    <div className="db-pipe-fill" style={{
                      width: (b.value / maxPipe * 100) + '%',
                      background: PIPE_CLR[b.col] || 'var(--ink)',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <div className="db-section">
            <div className="db-section-head">
              <span className="db-section-title">Recent activity</span>
            </div>
            {recentActs.length === 0 ? (
              <div className="db-empty">No activity logged yet.</div>
            ) : (
              recentActs.map(a => {
                const def = ACT_TYPES_DEF.find(t => t.id === a.type) || { label: a.type, color: 'var(--ink-3)', d: [] };
                return (
                  <div key={a.id} className="db-act-row" style={{ display: 'flex', gap: '12px' }}>
                    <div className="db-act-icon" style={{ '--atp-clr': def.color } as React.CSSProperties}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        {(def.d || []).map((p, i) => <path key={i} d={p} />)}
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="db-act-text">{a.text}</div>
                      <div className="mono muted" style={{ fontSize: '10.5px', marginTop: 2 }}>
                        {def.label} · {a.linkedName} · {formatRelTime(a.ts)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
