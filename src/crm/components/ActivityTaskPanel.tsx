import React, { useState } from 'react';

export const ACT_TYPES_DEF = [
  { id: 'call',    label: 'Call',    color: 'var(--blue)',
    d: ['M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.19 12 19.79 19.79 0 0 1 1.12 3.38a2 2 0 0 1 2-1.38h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.7A2 2 0 0 1 22 16.92z'] },
  { id: 'note',    label: 'Note',    color: 'var(--amber)',
    d: ['M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7', 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'] },
  { id: 'email',   label: 'Email',   color: 'var(--violet)',
    d: ['M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z', 'M22 6l-10 7L2 6'] },
  { id: 'meeting', label: 'Meeting', color: 'var(--green)',
    d: ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'] },
];

export function formatRelTime(isoStr: string) {
  const d = new Date(isoStr);
  const now = new Date();
  const diff = Math.round((now.getTime() - d.getTime()) / 60000);
  if (diff < 2)   return 'just now';
  if (diff < 60)  return diff + 'm ago';
  const h = Math.round(diff / 60);
  if (h < 24)    return h + 'h ago';
  const days = Math.round(diff / 1440);
  if (days === 1) return 'yesterday';
  if (days < 7)  return days + 'd ago';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatTaskDue(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - now.getTime()) / 86400000);
  if (diff < 0)   return { label: Math.abs(diff) + 'd overdue', tone: 'red' };
  if (diff === 0) return { label: 'Today',    tone: 'amber' };
  if (diff === 1) return { label: 'Tomorrow', tone: 'amber' };
  return { label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), tone: '' };
}

interface ActivityTaskPanelProps {
  entityId: string;
  entityName: string;
  entityType: 'client' | 'lead';
  activities: any[];
  onAddActivity: (act: any) => void;
  tasks: any[];
  onAddTask: (tk: any) => void;
  onCompleteTask: (id: string) => void;
}

export function ActivityTaskPanel({
  entityId, entityName, entityType,
  activities, onAddActivity,
  tasks, onAddTask, onCompleteTask,
}: ActivityTaskPanelProps) {
  const [addingAct, setAddingAct] = useState(false);
  const [actType, setActType] = useState('call');
  const [actText, setActText] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [taskText, setTaskText] = useState('');
  const [taskDue, setTaskDue] = useState('');

  const myActs = (activities || [])
    .filter(a => a.linkedId === entityId)
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  const myTasks = (tasks || []).filter(t => t.linkedId === entityId);
  const openT = myTasks.filter(t => !t.done);
  const doneT = myTasks.filter(t => t.done);

  function submitAct() {
    if (!actText.trim()) return;
    onAddActivity && onAddActivity({
      type: actType,
      text: actText.trim(),
      linkedId: entityId,
      linkedName: entityName,
      linkedType: entityType,
      ts: new Date().toISOString(),
    });
    setActText('');
    setAddingAct(false);
  }

  function submitTask() {
    if (!taskText.trim()) return;
    const def = new Date();
    def.setDate(def.getDate() + 1);
    onAddTask && onAddTask({
      text: taskText.trim(),
      linkedId: entityId,
      linkedName: entityName,
      linkedType: entityType,
      dueDate: taskDue || def.toISOString().split('T')[0],
      done: false,
    });
    setTaskText('');
    setTaskDue('');
    setAddingTask(false);
  }

  return (
    <div className="atp">
      {/* ── Tasks ── */}
      <div className="atp-section">
        <div className="atp-section-head">
          <span className="atp-section-title">Tasks</span>
          {openT.length > 0 && (
            <span className="mono muted" style={{ fontSize: 10.5 }}>{openT.length} open</span>
          )}
          {!addingTask && (
            <button className="atp-ghost-btn" onClick={() => setAddingTask(true)}>+ Add</button>
          )}
        </div>

        {addingTask && (
          <div className="atp-composer">
            <input
              className="atp-input"
              placeholder="What needs to happen?"
              value={taskText}
              autoFocus
              onChange={e => setTaskText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') submitTask();
                if (e.key === 'Escape') setAddingTask(false);
              }}
            />
            <div className="atp-composer-foot">
              <input
                type="date"
                className="atp-input atp-date"
                value={taskDue}
                onChange={e => setTaskDue(e.target.value)}
              />
              <button className="btn btn-secondary btn-sm" onClick={() => setAddingTask(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={submitTask}>Save</button>
            </div>
          </div>
        )}

        {openT.length === 0 && !addingTask && (
          <div className="atp-empty">No open tasks.</div>
        )}

        {openT.map(t => {
          const due = formatTaskDue(t.dueDate);
          return (
            <div key={t.id} className="atp-task">
              <button
                className="atp-check-btn"
                onClick={() => onCompleteTask && onCompleteTask(t.id)}
                title="Mark complete"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                </svg>
              </button>
              <span className="atp-task-text">{t.text}</span>
              <span className={'chip' + (due.tone ? ' tone-' + due.tone : '')}
                style={{ fontSize: 10, flexShrink: 0 }}>
                {due.label}
              </span>
            </div>
          );
        })}

        {doneT.length > 0 && (
          <div style={{ opacity: 0.5, marginTop: 4 }}>
            {doneT.map(t => (
              <div key={t.id} className="atp-task atp-task-done">
                <div className="atp-check-btn" style={{ color: 'var(--green)', cursor: 'default' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span className="atp-task-text">{t.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Activity log ── */}
      <div className="atp-section">
        <div className="atp-section-head">
          <span className="atp-section-title">Activity log</span>
          {!addingAct && (
            <button className="atp-ghost-btn" onClick={() => setAddingAct(true)}>+ Log</button>
          )}
        </div>

        {addingAct && (
          <div className="atp-composer">
            <div className="atp-type-row" style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              {ACT_TYPES_DEF.map(t => (
                <button
                  key={t.id}
                  type="button"
                  className={'atp-type-btn' + (actType === t.id ? ' is-active' : '')}
                  style={{ '--atp-clr': t.color } as React.CSSProperties}
                  onClick={() => setActType(t.id)}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    {t.d.map((p, i) => <path key={i} d={p} />)}
                  </svg>
                  {t.label}
                </button>
              ))}
            </div>
            <textarea
              className="atp-input atp-textarea"
              placeholder="What happened?"
              rows={2}
              value={actText}
              autoFocus
              onChange={e => setActText(e.target.value)}
            />
            <div className="atp-composer-foot">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => { setAddingAct(false); setActText(''); }}
              >
                Cancel
              </button>
              <button className="btn btn-primary btn-sm" onClick={submitAct}>Log it</button>
            </div>
          </div>
        )}

        {myActs.length === 0 && !addingAct && (
          <div className="atp-empty">No activity logged yet.</div>
        )}

        <div className="atp-timeline">
          {myActs.map(a => {
            const def = ACT_TYPES_DEF.find(t => t.id === a.type) || ACT_TYPES_DEF[1];
            return (
              <div key={a.id} className="atp-event">
                <div className="atp-event-icon" style={{ '--atp-clr': def.color } as React.CSSProperties}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    {def.d.map((p, i) => <path key={i} d={p} />)}
                  </svg>
                </div>
                <div className="atp-event-body">
                  <div className="atp-event-text">{a.text}</div>
                  <div className="atp-event-meta">{def.label} · {formatRelTime(a.ts)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
