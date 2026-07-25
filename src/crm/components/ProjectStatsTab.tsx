import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, Eye, Users, ArrowUpRight, Search, 
  Globe, Percent, Clock, RefreshCw, BarChart2, Tag
} from 'lucide-react';
import type { Project } from '../hooks/useCRM';
import { getMockStatsData, getProjectStatsIdentifier, DateRange } from './WebsiteStats';

interface ProjectStatsTabProps {
  project: Project;
}

export function ProjectStatsTab({ project }: ProjectStatsTabProps) {
  const [dateRange, setDateRange] = useState<DateRange>('30days');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const stats = useMemo(() => {
    const identifier = getProjectStatsIdentifier(project);
    return getMockStatsData(identifier, dateRange);
  }, [project, dateRange]);

  const triggerRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  const hasRevenue = stats.conversionsLabel === 'Orders' || stats.conversionsLabel === 'Bookings';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px 0' }}>
      
      {/* Tab Header with Date Range picker & Sync button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        paddingBottom: '16px',
        borderBottom: '1px solid var(--line-soft)'
      }}>
        <div>
          <h3 className="font-medium text-sm flex items-center gap-2" style={{ margin: 0, color: 'var(--ink)' }}>
            <BarChart2 size={16} className="text-[#C2410C]" />
            Website Analytics: {project.name}
          </h3>
          <span className="mono muted" style={{ fontSize: '11px' }}>
            Live performance indicators for {project.subdomain ? `${project.subdomain}.altaystudio.com` : 'local domain'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Date range picker */}
          <div style={{ display: 'flex', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
            {(['today', '7days', '30days', 'all'] as const).map((r) => (
              <button
                key={r}
                onClick={() => { setDateRange(r); triggerRefresh(); }}
                style={{
                  background: dateRange === r ? 'var(--ink)' : 'transparent',
                  color: dateRange === r ? 'var(--bg)' : 'var(--ink-2)',
                  border: 'none',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {r === 'today' ? 'Today' : r === '7days' ? '7D' : r === '30days' ? '30D' : 'All'}
              </button>
            ))}
          </div>

          <button 
            onClick={triggerRefresh}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '28px', padding: '0 10px', fontSize: '11.5px' }}
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            Sync
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
        gap: '12px'
      }}>
        {/* Page Views */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line-soft)', padding: '14px', borderRadius: 'var(--r-md)', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ padding: '8px', background: 'var(--blue-soft)', color: 'var(--blue)', borderRadius: 'var(--r-sm)' }}>
            <Eye size={16} />
          </div>
          <div>
            <div style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--ink-4)', textTransform: 'uppercase' }}>Page Views</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
              {formatNumber(stats.pageViews)}
            </div>
          </div>
        </div>

        {/* Unique Sessions */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line-soft)', padding: '14px', borderRadius: 'var(--r-md)', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ padding: '8px', background: 'var(--green-soft)', color: 'var(--green)', borderRadius: 'var(--r-sm)' }}>
            <Users size={16} />
          </div>
          <div>
            <div style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--ink-4)', textTransform: 'uppercase' }}>Sessions</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
              {formatNumber(stats.uniqueSessions)}
            </div>
          </div>
        </div>

        {/* Bounce Rate */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line-soft)', padding: '14px', borderRadius: 'var(--r-md)', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ padding: '8px', background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 'var(--r-sm)' }}>
            <Percent size={16} />
          </div>
          <div>
            <div style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--ink-4)', textTransform: 'uppercase' }}>Bounce Rate</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
              {stats.bounceRate}%
            </div>
          </div>
        </div>

        {/* Avg Duration */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line-soft)', padding: '14px', borderRadius: 'var(--r-md)', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ padding: '8px', background: 'var(--violet-soft)', color: 'var(--violet)', borderRadius: 'var(--r-sm)' }}>
            <Clock size={16} />
          </div>
          <div>
            <div style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--ink-4)', textTransform: 'uppercase' }}>Avg. Session</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
              {stats.avgDuration}
            </div>
          </div>
        </div>

        {/* Conversions */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line-soft)', padding: '14px', borderRadius: 'var(--r-md)', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ padding: '8px', background: 'var(--amber-soft)', color: 'var(--amber)', borderRadius: 'var(--r-sm)' }}>
            <BarChart2 size={16} />
          </div>
          <div>
            <div style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--ink-4)', textTransform: 'uppercase' }}>{stats.conversionsLabel}</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
              {formatNumber(stats.conversions)}
            </div>
          </div>
        </div>

        {/* Conversion Rate */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line-soft)', padding: '14px', borderRadius: 'var(--r-md)', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ padding: '8px', background: 'var(--blue-soft)', color: 'var(--blue)', borderRadius: 'var(--r-sm)' }}>
            <TrendingUp size={16} />
          </div>
          <div>
            <div style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--ink-4)', textTransform: 'uppercase' }}>Conv. Rate</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
              {stats.conversionRate.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '20px'
      }} className="md:grid-cols-2">
        
        {/* SEO Performance Card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search className="w-4 h-4 text-blue-600" />
            <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)' }}>Google Search SEO Performance</span>
          </div>
          
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Core SEO Metrics row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line-soft)', padding: '8px 10px', borderRadius: 'var(--r-md)' }}>
                <div style={{ fontSize: '9px', fontFamily: 'var(--mono)', color: 'var(--ink-4)', letterSpacing: '0.04em' }}>CLICKS</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
                  {formatNumber(stats.pageViews * 0.12)}
                </div>
              </div>
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line-soft)', padding: '8px 10px', borderRadius: 'var(--r-md)' }}>
                <div style={{ fontSize: '9px', fontFamily: 'var(--mono)', color: 'var(--ink-4)', letterSpacing: '0.04em' }}>IMPRESSIONS</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
                  {formatNumber(stats.pageViews * 1.8)}
                </div>
              </div>
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line-soft)', padding: '8px 10px', borderRadius: 'var(--r-md)' }}>
                <div style={{ fontSize: '9px', fontFamily: 'var(--mono)', color: 'var(--ink-4)', letterSpacing: '0.04em' }}>AVG POSITION</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
                  2.4
                </div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left', color: 'var(--ink-3)' }}>
                  <th style={{ padding: '6px 4px', fontWeight: 600 }}>Keyword Query</th>
                  <th style={{ padding: '6px 4px', fontWeight: 600, textAlign: 'right' }}>Imps</th>
                  <th style={{ padding: '6px 4px', fontWeight: 600, textAlign: 'right' }}>Clicks</th>
                  <th style={{ padding: '6px 4px', fontWeight: 600, textAlign: 'right' }}>CTR</th>
                </tr>
              </thead>
              <tbody>
                {stats.keywords.slice(0, 4).map((k, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                    <td style={{ padding: '8px 4px', fontWeight: 500, color: 'var(--ink)' }}>{k.query}</td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--ink-2)' }}>{k.impressions.toLocaleString()}</td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--ink-2)' }}>{k.clicks.toLocaleString()}</td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--green)' }}>{k.ctr.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Marketing Campaigns & Countries */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Campaigns */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Tag className="w-4 h-4 text-emerald-600" />
              <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)' }}>Traffic Referrer Campaigns</span>
            </div>
            
            <div style={{ padding: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left', color: 'var(--ink-3)' }}>
                    <th style={{ padding: '6px 4px', fontWeight: 600 }}>Campaign</th>
                    <th style={{ padding: '6px 4px', fontWeight: 600, textAlign: 'right' }}>Visits</th>
                    <th style={{ padding: '6px 4px', fontWeight: 600, textAlign: 'right' }}>{stats.conversionsLabel}</th>
                    {hasRevenue ? (
                      <th style={{ padding: '6px 4px', fontWeight: 600, textAlign: 'right' }}>Rev</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {stats.campaigns.slice(0, 3).map((c, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                      <td style={{ padding: '8px 4px', fontWeight: 500, color: 'var(--ink)' }}>{c.campaign}</td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--ink-2)' }}>{c.visits.toLocaleString()}</td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--ink-2)' }}>{c.conversions.toLocaleString()}</td>
                      {hasRevenue && c.value !== undefined ? (
                        <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 600, fontFamily: 'var(--mono)', color: 'var(--ink)' }}>
                          {formatCurrency(c.value)}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Geographic Countries list */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe className="w-4 h-4 text-orange-600" />
              <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)' }}>Geographic Visitors</span>
            </div>
            
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {stats.countries.slice(0, 3).map((c) => (
                  <div key={c.countryId} style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '8px',
                    background: 'var(--surface-2)',
                    borderRadius: 'var(--r-md)',
                    border: '1px solid var(--line-soft)',
                    fontSize: '12px'
                  }}>
                    <span style={{ fontWeight: 700, color: 'var(--ink-2)', marginBottom: '2px' }}>
                      {c.countryId}
                    </span>
                    <span className="mono muted" style={{ fontSize: '11px' }}>{c.visits.toLocaleString()} visits</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
