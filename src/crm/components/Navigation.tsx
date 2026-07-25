import { useState } from 'react';

// Icons (inline SVG)
export const Icon = ({ d, size = 18 }: { d: string | string[]; size?: number }) => (
  <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

export const Icons = {
  home:     ['M3 11l9-8 9 8', 'M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10'],
  leads:    ['M3 6h18', 'M3 12h12', 'M3 18h6'],
  projects: ['M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z'],
  templates: ['M4 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5z', 'M14 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V5z', 'M4 15a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4z', 'M14 15a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-4z'],
  clients:  ['M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0z', 'M3 21a9 9 0 0 1 18 0'],
  invoices: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M8 13h8', 'M8 17h8'],
  plus:     ['M12 5v14', 'M5 12h14'],
  search:   ['M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z', 'M21 21l-4.5-4.5'],
  filter:   ['M4 5h16', 'M7 12h10', 'M10 19h4'],
  close:    ['M6 6l12 12', 'M18 6L6 18'],
  menu:     ['M3 6h18', 'M3 12h18', 'M3 18h18'],
  bell:     ['M18 16v-5a6 6 0 0 0-12 0v5l-2 2h16l-2-2z', 'M10 20a2 2 0 0 0 4 0'],
  arrow:    ['M5 12h14', 'M13 6l6 6-6 6'],
  x:             ['M6 6l12 12', 'M18 6L6 18'],
  chevronDown:   ['M6 9l6 6 6-6'],
  chevronRight:  ['M9 6l6 6-6 6'],
  stats:         ['M18 20V10', 'M12 20V4', 'M6 20v-6'],
};

interface NavigationProps {
  activeRoute: string;
  onNavigate: (route: string) => void;
  counts: {
    leads: number;
    projects: number;
    clients: number;
  };
}

export function Sidebar({ activeRoute, onNavigate, counts }: NavigationProps) {
  const [collapsed, setCollapsed] = useState(false);

  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: Icons.home,      count: null },
    { id: 'stats',     label: 'Website Stats', icon: Icons.stats,  count: null },
    { id: 'leads',     label: 'Leads',     icon: Icons.leads,     count: counts.leads },
    { id: 'projects',  label: 'Projects',  icon: Icons.projects,  count: counts.projects },
    { id: 'templates', label: 'Templates', icon: Icons.templates, count: null },
    { id: 'clients',   label: 'Clients',   icon: Icons.clients,   count: counts.clients },
    { id: 'invoices',  label: 'Invoices',  icon: Icons.invoices,  count: null },
  ];

  return (
    <aside className={'sidebar' + (collapsed ? ' sidebar-collapsed' : '')}>
      <div className="sidebar-brand">
        <div className="brand-mark">A</div>
        <div className="sidebar-brand-text">
          <div className="brand-name">Altay Studio</div>
          <div className="brand-sub">workshop · v0.1</div>
        </div>
        <button
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <Icon d={collapsed ? Icons.chevronRight : Icons.arrow} size={14} />
        </button>
      </div>

      <div className="nav-section sidebar-section-label">Workspace</div>
      {NAV_ITEMS.map(item => (
        <div
          key={item.id}
          className={'nav-item' + (item.id === activeRoute ? ' active' : '')}
          onClick={() => onNavigate(item.id)}
          title={collapsed ? item.label : undefined}
        >
          <Icon d={item.icon} />
          <span className="nav-item-label">{item.label}</span>
          {item.count != null && <span className="count">{item.count}</span>}
        </div>
      ))}

      <div className="sidebar-foot">
        <div className="avatar">AY</div>
        <div className="sidebar-foot-text" style={{ minWidth: 0 }}>
          <div className="user-name">Altaay Y.</div>
          <div className="user-mail">altaay@studio.store</div>
        </div>
      </div>
    </aside>
  );
}

export function TopBar({ title }: { title: string }) {
  return (
    <header className="topbar">
      <div className="flex center gap-12" style={{ display: 'flex', alignItems: 'center' }}>
        <div className="brand-mark" style={{ width: 28, height: 28, fontSize: 16 }}>A</div>
        <div style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 17 }}>{title}</div>
      </div>
      <button className="btn btn-ghost btn-sm" aria-label="Notifications">
        <Icon d={Icons.bell} size={18} />
      </button>
    </header>
  );
}

interface BottomTabsProps {
  activeRoute: string;
  onNavigate: (route: string) => void;
  onQuickAdd: () => void;
}

export function BottomTabs({ activeRoute, onNavigate, onQuickAdd }: BottomTabsProps) {
  const tabs = [
    { id: 'dashboard', label: 'Home',     icon: Icons.home },
    { id: 'leads',     label: 'Leads',    icon: Icons.leads },
    { id: 'add',       label: '',         icon: Icons.plus, fab: true },
    { id: 'projects',  label: 'Projects', icon: Icons.projects },
    { id: 'clients',   label: 'Clients',  icon: Icons.clients },
  ];
  return (
    <nav className="bottom-tabs">
      {tabs.map(t => {
        if (t.fab) {
          return (
            <div key={t.id} className="tab fab" onClick={onQuickAdd}>
              <div className="fab-circle"><Icon d={t.icon} /></div>
            </div>
          );
        }
        return (
          <div
            key={t.id}
            className={'tab' + (t.id === activeRoute ? ' active' : '')}
            onClick={() => onNavigate(t.id)}
          >
            <Icon d={t.icon} />
            <span>{t.label}</span>
          </div>
        );
      })}
    </nav>
  );
}
