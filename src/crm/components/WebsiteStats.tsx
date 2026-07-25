import { useState, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, Eye, Users, ArrowUpRight, Search, 
  Globe, Percent, Clock, Calendar, RefreshCw, BarChart2, Tag
} from 'lucide-react';
import { WorldMap } from './WorldMap';

export interface Project {
  id: string;
  name: string;
  client?: string;
  template?: string;
  progress?: number;
  stage?: string;
  subdomain?: string;
}

export interface WebsiteStatsProps {
  projects: Project[];
}

export type DateRange = 'today' | '7days' | '30days' | 'all';

export function getProjectStatsIdentifier(project: Project) {
  if (!project) return 'global';
  if (project.id === 'apparel' || project.name?.toLowerCase().includes('apparel')) {
    return 'apparel';
  }
  return `${project.name || ''} ${project.subdomain || ''} ${project.id || ''}`.toLowerCase();
}

// Mock datasets helper for each project type
export const getMockStatsData = (projectId: string, range: DateRange) => {
  // Base factors based on date range
  let multiplier = 1;
  if (range === 'today') multiplier = 0.03;
  if (range === '7days') multiplier = 0.23;
  if (range === '30days') multiplier = 1.0;
  if (range === 'all') multiplier = 7.4;

  const isApparel = projectId === 'apparel';
  const isGlobal = projectId === 'global';
  const nameLower = projectId.toLowerCase();

  // 1. Determine site profile characteristics
  let profile = {
    viewsFactor: 1.0,
    sessionsFactor: 1.0,
    conversionsFactor: 1.0,
    bounceRate: 41.5,
    avgDuration: '2m 14s',
    conversionsLabel: 'Leads',
    keywords: [
      { query: 'altay studio builder', impressions: 450, clicks: 88, ctr: 19.5, position: 1.2 },
      { query: 'custom website provisioning', impressions: 1200, clicks: 76, ctr: 6.3, position: 3.4 },
      { query: 'automated saas websites', impressions: 890, clicks: 42, ctr: 4.7, position: 4.8 },
      { query: 'instant landing pages b2b', impressions: 650, clicks: 31, ctr: 4.7, position: 5.1 }
    ],
    campaigns: [
      { campaign: 'Product Launch', source: 'linkedin', medium: 'social-organic', visits: 850, conversions: 48, rate: 5.6, value: 0 },
      { campaign: 'Google Ads Branded', source: 'google', medium: 'cpc', visits: 1200, conversions: 96, rate: 8.0, value: 0 },
      { campaign: 'Tech Newsletter', source: 'indiehackers', medium: 'newsletter', visits: 410, conversions: 12, rate: 2.9, value: 0 }
    ],
    countries: [
      { countryId: 'USA', visits: 1240 },
      { countryId: 'CAN', visits: 350 },
      { countryId: 'GBR', visits: 290 },
      { countryId: 'DEU', visits: 180 },
      { countryId: 'MEX', visits: 140 },
      { countryId: 'JPN', visits: 90 }
    ]
  };

  if (isApparel) {
    profile = {
      viewsFactor: 2.8,
      sessionsFactor: 2.6,
      conversionsFactor: 3.4,
      bounceRate: 36.2,
      avgDuration: '3m 42s',
      conversionsLabel: 'Orders',
      keywords: [
        { query: 'streetwear blanks wholesale', impressions: 14200, clicks: 1350, ctr: 9.5, position: 1.6 },
        { query: 'heavyweight custom hoodies', impressions: 9800, clicks: 840, ctr: 8.5, position: 2.4 },
        { query: 'premium cotton shirts', impressions: 7500, clicks: 510, ctr: 6.8, position: 3.1 },
        { query: 'oversized drop shoulder tee', impressions: 5400, clicks: 310, ctr: 5.7, position: 4.2 },
        { query: 'sustainable apparel manufacturer', impressions: 3200, clicks: 110, ctr: 3.4, position: 6.8 }
      ],
      campaigns: [
        { campaign: 'Summer Streetwear Promo', source: 'instagram', medium: 'influencer', visits: 5400, conversions: 280, rate: 5.1, value: 18200 },
        { campaign: 'Google CPC Apparel', source: 'google', medium: 'cpc', visits: 4200, conversions: 168, rate: 4.0, value: 10920 },
        { campaign: 'Abandon Cart Email', source: 'klaviyo', medium: 'email', visits: 850, conversions: 102, rate: 12.0, value: 7140 },
        { campaign: 'TikTok Fashion Haul', source: 'tiktok', medium: 'paid-video', visits: 6200, conversions: 112, rate: 1.8, value: 6850 }
      ],
      countries: [
        { countryId: 'USA', visits: 9540 },
        { countryId: 'CAN', visits: 2150 },
        { countryId: 'GBR', visits: 1840 },
        { countryId: 'AUS', visits: 1120 },
        { countryId: 'DEU', visits: 890 },
        { countryId: 'FRA', visits: 740 },
        { countryId: 'JPN', visits: 620 }
      ]
    };
  } else if (nameLower.includes('bakery') || nameLower.includes('cake')) {
    profile = {
      viewsFactor: 0.8,
      sessionsFactor: 0.8,
      conversionsFactor: 1.2,
      bounceRate: 29.4,
      avgDuration: '2m 55s',
      conversionsLabel: 'Orders',
      keywords: [
        { query: 'custom wedding cakes near me', impressions: 1100, clicks: 220, ctr: 20.0, position: 1.4 },
        { query: 'custom birthday cakes demo city', impressions: 3400, clicks: 410, ctr: 12.0, position: 2.1 },
        { query: 'artisan cupcake delivery', impressions: 1500, clicks: 135, ctr: 9.0, position: 3.5 },
        { query: 'gluten free bakery cakes', impressions: 850, clicks: 68, ctr: 8.0, position: 4.1 }
      ],
      campaigns: [
        { campaign: 'Local Instagram Showcase', source: 'instagram', medium: 'social-organic', visits: 1200, conversions: 84, rate: 7.0, value: 5880 },
        { campaign: 'Wedding Season Booking', source: 'facebook', medium: 'cpc', visits: 640, conversions: 38, rate: 5.9, value: 11400 },
        { campaign: 'Google Maps Local', source: 'google', medium: 'organic', visits: 1800, conversions: 162, rate: 9.0, value: 8100 }
      ],
      countries: [
        { countryId: 'USA', visits: 3800 },
        { countryId: 'CAN', visits: 120 },
        { countryId: 'MEX', visits: 40 }
      ]
    };
  } else if (nameLower.includes('restaurant') || nameLower.includes('dining')) {
    profile = {
      viewsFactor: 1.5,
      sessionsFactor: 1.4,
      conversionsFactor: 1.8,
      bounceRate: 32.1,
      avgDuration: '1m 50s',
      conversionsLabel: 'Reservations',
      keywords: [
        { query: 'demo restaurant downtown', impressions: 4500, clicks: 1200, ctr: 26.6, position: 1.0 },
        { query: 'best omakase downtown', impressions: 3200, clicks: 280, ctr: 8.7, position: 2.8 },
        { query: 'restaurant reservations', impressions: 2100, clicks: 140, ctr: 6.6, position: 3.9 },
        { query: 'tasting menu reservations', impressions: 1400, clicks: 68, ctr: 4.8, position: 4.5 }
      ],
      campaigns: [
        { campaign: 'Friday Reservation Push', source: 'newsletter', medium: 'email', visits: 950, conversions: 114, rate: 12.0, value: 0 },
        { campaign: 'Google Local Services', source: 'google', medium: 'cpc', visits: 1400, conversions: 98, rate: 7.0, value: 0 },
        { campaign: 'Yelp Listing Ads', source: 'yelp', medium: 'referral', visits: 820, conversions: 41, rate: 5.0, value: 0 }
      ],
      countries: [
        { countryId: 'USA', visits: 4500 },
        { countryId: 'JPN', visits: 620 },
        { countryId: 'CAN', visits: 180 },
        { countryId: 'GBR', visits: 110 }
      ]
    };
  } else if (nameLower.includes('venue') || nameLower.includes('events')) {
    profile = {
      viewsFactor: 0.9,
      sessionsFactor: 0.9,
      conversionsFactor: 1.1,
      bounceRate: 44.8,
      avgDuration: '2m 10s',
      conversionsLabel: 'Inquiries',
      keywords: [
        { query: 'event venue demo city', impressions: 2400, clicks: 310, ctr: 12.9, position: 2.2 },
        { query: 'demo venue weddings', impressions: 980, clicks: 185, ctr: 18.8, position: 1.3 },
        { query: 'party venue rental', impressions: 4100, clicks: 205, ctr: 5.0, position: 4.8 },
        { query: 'banquet hall demo city', impressions: 600, clicks: 48, ctr: 8.0, position: 2.5 }
      ],
      campaigns: [
        { campaign: 'Bodas 2026 Promo', source: 'facebook', medium: 'paid-ad', visits: 1100, conversions: 33, rate: 3.0, value: 0 },
        { campaign: 'Instagram Organico', source: 'instagram', medium: 'social', visits: 780, conversions: 39, rate: 5.0, value: 0 },
        { campaign: 'Buscador Google Local', source: 'google', medium: 'organic', visits: 1500, conversions: 60, rate: 4.0, value: 0 }
      ],
      countries: [
        { countryId: 'MEX', visits: 3800 },
        { countryId: 'USA', visits: 420 },
        { countryId: 'CAN', visits: 60 }
      ]
    };
  } else if (nameLower.includes('retreat') || nameLower.includes('lodge')) {
    profile = {
      viewsFactor: 1.2,
      sessionsFactor: 1.1,
      conversionsFactor: 1.3,
      bounceRate: 35.6,
      avgDuration: '3m 15s',
      conversionsLabel: 'Bookings',
      keywords: [
        { query: 'demo lodge weekend getaway', impressions: 3800, clicks: 940, ctr: 24.7, position: 1.1 },
        { query: 'glamping cabins demo region', impressions: 5200, clicks: 460, ctr: 8.8, position: 2.9 },
        { query: 'eco friendly hotel demo city', impressions: 1200, clicks: 96, ctr: 8.0, position: 3.4 },
        { query: 'romantic weekend escape', impressions: 3100, clicks: 120, ctr: 3.8, position: 5.2 }
      ],
      campaigns: [
        { campaign: 'Desconexion de Fin de Semana', source: 'facebook', medium: 'cpc', visits: 1600, conversions: 48, rate: 3.0, value: 7200 },
        { campaign: 'Influencer Glamping Review', source: 'instagram', medium: 'referral', visits: 2100, conversions: 105, rate: 5.0, value: 15750 },
        { campaign: 'Búsquedas Glamping Google', source: 'google', medium: 'organic', visits: 2400, conversions: 96, rate: 4.0, value: 14400 }
      ],
      countries: [
        { countryId: 'MEX', visits: 5400 },
        { countryId: 'USA', visits: 1120 },
        { countryId: 'CAN', visits: 150 },
        { countryId: 'DEU', visits: 60 }
      ]
    };
  } else if (nameLower.includes('coatings') || nameLower.includes('flooring')) {
    profile = {
      viewsFactor: 0.7,
      sessionsFactor: 0.6,
      conversionsFactor: 1.0,
      bounceRate: 48.2,
      avgDuration: '1m 58s',
      conversionsLabel: 'Leads',
      keywords: [
        { query: 'epoxy garage floor demo city', impressions: 1800, clicks: 198, ctr: 11.0, position: 2.5 },
        { query: 'concrete coatings demo region', impressions: 1200, clicks: 102, ctr: 8.5, position: 3.1 },
        { query: 'garage flooring contractors', impressions: 950, clicks: 85, ctr: 8.9, position: 2.8 },
        { query: 'demo surface coatings reviews', impressions: 450, clicks: 90, ctr: 20.0, position: 1.0 }
      ],
      campaigns: [
        { campaign: 'Spring Garage Makeover', source: 'facebook', medium: 'lead-form', visits: 800, conversions: 48, rate: 6.0, value: 0 },
        { campaign: 'Google Local Service Ads', source: 'google', medium: 'paid-call', visits: 520, conversions: 52, rate: 10.0, value: 0 }
      ],
      countries: [
        { countryId: 'USA', visits: 2350 },
        { countryId: 'CAN', visits: 20 }
      ]
    };
  }

  // Global aggregate compilation
  if (isGlobal) {
    const totalViews = Math.round(15240 * multiplier);
    const totalSessions = Math.round(10850 * multiplier);
    const totalConversions = Math.round(620 * multiplier);
    const conversionRate = totalSessions > 0 ? (totalConversions / totalSessions) * 100 : 0;
    
    return {
      pageViews: totalViews,
      uniqueSessions: totalSessions,
      bounceRate: 38.6,
      avgDuration: '2m 45s',
      conversions: totalConversions,
      conversionRate: conversionRate,
      conversionsLabel: 'Conversions',
      keywords: [
        { query: 'streetwear blanks wholesale', impressions: 14200, clicks: 1350, ctr: 9.5, position: 1.6 },
        { query: 'demo restaurant downtown', impressions: 4500, clicks: 1200, ctr: 26.6, position: 1.0 },
        { query: 'demo lodge weekend getaway', impressions: 3800, clicks: 940, ctr: 24.7, position: 1.1 },
        { query: 'custom birthday cakes demo city', impressions: 3400, clicks: 410, ctr: 12.0, position: 2.1 },
        { query: 'event venue demo city', impressions: 2400, clicks: 310, ctr: 12.9, position: 2.2 },
        { query: 'epoxy garage floor demo city', impressions: 1800, clicks: 198, ctr: 11.0, position: 2.5 }
      ].map(k => ({ ...k, impressions: Math.round(k.impressions * multiplier), clicks: Math.round(k.clicks * multiplier) })),
      campaigns: [
        { campaign: 'Summer Streetwear Promo', source: 'instagram', medium: 'influencer', visits: Math.round(5400 * multiplier), conversions: Math.round(280 * multiplier), rate: 5.1, value: 18200 * multiplier },
        { campaign: 'Google CPC Apparel', source: 'google', medium: 'cpc', visits: Math.round(4200 * multiplier), conversions: Math.round(168 * multiplier), rate: 4.0, value: 10920 * multiplier },
        { campaign: 'Búsquedas Glamping Google', source: 'google', medium: 'organic', visits: Math.round(2400 * multiplier), conversions: Math.round(96 * multiplier), rate: 4.0, value: 14400 * multiplier },
        { campaign: 'Influencer Glamping Review', source: 'instagram', medium: 'referral', visits: Math.round(2100 * multiplier), conversions: Math.round(105 * multiplier), rate: 5.0, value: 15750 * multiplier },
        { campaign: 'Google Maps Local', source: 'google', medium: 'organic', visits: Math.round(1800 * multiplier), conversions: Math.round(162 * multiplier), rate: 9.0, value: 8100 * multiplier }
      ],
      countries: [
        { countryId: 'USA', visits: Math.round(17640 * multiplier) },
        { countryId: 'MEX', visits: Math.round(9360 * multiplier) },
        { countryId: 'CAN', visits: Math.round(2600 * multiplier) },
        { countryId: 'GBR', visits: Math.round(2240 * multiplier) },
        { countryId: 'AUS', visits: Math.round(1360 * multiplier) },
        { countryId: 'DEU', visits: Math.round(1130 * multiplier) },
        { countryId: 'JPN', visits: Math.round(800 * multiplier) }
      ]
    };
  }

  // Calculate stats based on range multiplier and site profile factors
  const pageViews = Math.round(4500 * profile.viewsFactor * multiplier);
  const uniqueSessions = Math.round(3200 * profile.sessionsFactor * multiplier);
  const conversions = Math.round(110 * profile.conversionsFactor * multiplier);
  const conversionRate = uniqueSessions > 0 ? (conversions / uniqueSessions) * 100 : 0.0;

  // Apply multipliers to keywords & campaigns
  const keywords = profile.keywords.map(k => ({
    ...k,
    impressions: Math.max(Math.round(k.impressions * multiplier), 1),
    clicks: Math.max(Math.round(k.clicks * multiplier), 0),
    ctr: k.impressions > 0 ? (k.clicks / k.impressions) * 100 : k.ctr
  }));

  const campaigns = profile.campaigns.map(c => ({
    ...c,
    visits: Math.max(Math.round(c.visits * multiplier), 1),
    conversions: Math.max(Math.round(c.conversions * multiplier), 0),
    rate: c.visits > 0 ? (c.conversions / c.visits) * 100 : c.rate,
    value: Math.round(c.value * multiplier)
  }));

  const countries = profile.countries.map(co => ({
    ...co,
    visits: Math.max(Math.round(co.visits * multiplier), 1)
  }));

  return {
    pageViews,
    uniqueSessions,
    bounceRate: profile.bounceRate,
    avgDuration: profile.avgDuration,
    conversions,
    conversionRate,
    conversionsLabel: profile.conversionsLabel,
    keywords,
    campaigns,
    countries
  };
};

export function WebsiteStats({ projects }: WebsiteStatsProps) {
  const [selectedProject, setSelectedProject] = useState<string>('apparel'); // Pre-default to Apparel
  const [dateRange, setDateRange] = useState<DateRange>('30days');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const activeProjectList = useMemo(() => {
    const defaultOptions = [
      { id: 'global', name: 'Global Summary (All Sites)' },
      { id: 'apparel', name: 'Altay Studio Apparel (E-Commerce Store)' }
    ];
    const projectOptions = projects.map(p => ({
      id: p.id,
      name: `${p.name} (Subdomain: ${p.subdomain || 'local'})`
    }));
    return [...defaultOptions, ...projectOptions];
  }, [projects]);

  const isApparelSelected = useMemo(() => {
    if (selectedProject === 'apparel') return true;
    const proj = projects.find(p => p.id === selectedProject);
    return proj ? getProjectStatsIdentifier(proj) === 'apparel' : false;
  }, [selectedProject, projects]);

  const isApparelOrGlobal = isApparelSelected || selectedProject === 'global';

  const stats = useMemo(() => {
    if (selectedProject === 'global') return getMockStatsData('global', dateRange);
    if (selectedProject === 'apparel') return getMockStatsData('apparel', dateRange);
    const proj = projects.find(p => p.id === selectedProject);
    if (proj) {
      return getMockStatsData(getProjectStatsIdentifier(proj), dateRange);
    }
    return getMockStatsData(selectedProject, dateRange);
  }, [selectedProject, dateRange, projects]);

  const triggerRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  return (
    <div className="page" style={{ padding: '0 24px 32px' }}>
      
      {/* Controls row */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '16px', 
        marginBottom: '24px',
        padding: '16px 20px',
        background: 'var(--surface)',
        border: '1px solid var(--line-soft)',
        borderRadius: 'var(--r-lg)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'var(--mono)', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Website:</span>
          <select 
            value={selectedProject} 
            onChange={(e) => { setSelectedProject(e.target.value); triggerRefresh(); }}
            className="input"
            style={{ 
              maxWidth: '380px', 
              padding: '6px 12px', 
              fontSize: '13.5px', 
              background: 'var(--bg-2)', 
              borderColor: 'var(--line)',
              borderRadius: 'var(--r-md)'
            }}
          >
            {activeProjectList.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {r === 'today' ? 'Today' : r === '7days' ? '7 Days' : r === '30days' ? '30 Days' : 'All Time'}
              </button>
            ))}
          </div>

          <button 
            onClick={triggerRefresh}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '32px' }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Sync
          </button>
        </div>
      </div>

      {/* Main metrics grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', 
        gap: '16px', 
        marginBottom: '28px' 
      }}>
        
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '18px', borderRadius: 'var(--r-xl)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink-3)', fontSize: '12px', fontWeight: 500 }}>
            <span>PAGE VIEWS</span>
            <Eye className="w-4 h-4 opacity-75" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, margin: '8px 0 2px', fontFamily: 'var(--display)' }}>
            {formatNumber(stats.pageViews)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--green)', fontWeight: 600 }}>
            <TrendingUp className="w-3 h-3" />
            <span>+14.2% vs last period</span>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '18px', borderRadius: 'var(--r-xl)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink-3)', fontSize: '12px', fontWeight: 500 }}>
            <span>UNIQUE SESSIONS</span>
            <Users className="w-4 h-4 opacity-75" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, margin: '8px 0 2px', fontFamily: 'var(--display)' }}>
            {formatNumber(stats.uniqueSessions)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--green)', fontWeight: 600 }}>
            <TrendingUp className="w-3 h-3" />
            <span>+11.8% vs last period</span>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '18px', borderRadius: 'var(--r-xl)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink-3)', fontSize: '12px', fontWeight: 500 }}>
            <span>BOUNCE RATE</span>
            <Globe className="w-4 h-4 opacity-75" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, margin: '8px 0 2px', fontFamily: 'var(--display)' }}>
            {stats.bounceRate}%
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--green)', fontWeight: 600 }}>
            <TrendingDown className="w-3 h-3 text-[#4A7C59]" style={{ transform: 'rotate(180deg) scaleX(-1)' }} />
            <span>-2.4% bounce drop</span>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '18px', borderRadius: 'var(--r-xl)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink-3)', fontSize: '12px', fontWeight: 500 }}>
            <span>AVG DURATION</span>
            <Clock className="w-4 h-4 opacity-75" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, margin: '8px 0 2px', fontFamily: 'var(--display)' }}>
            {stats.avgDuration}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--green)', fontWeight: 600 }}>
            <TrendingUp className="w-3 h-3" />
            <span>+8s session duration</span>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '18px', borderRadius: 'var(--r-xl)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink-3)', fontSize: '12px', fontWeight: 500 }}>
            <span>TOTAL {stats.conversionsLabel.toUpperCase()}</span>
            <BarChart2 className="w-4 h-4 opacity-75" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, margin: '8px 0 2px', fontFamily: 'var(--display)' }}>
            {formatNumber(stats.conversions)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--green)', fontWeight: 600 }}>
            <TrendingUp className="w-3 h-3" />
            <span>+24.1% vs last period</span>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '18px', borderRadius: 'var(--r-xl)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink-3)', fontSize: '12px', fontWeight: 500 }}>
            <span>CONVERSION RATE</span>
            <Percent className="w-4 h-4 opacity-75" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, margin: '8px 0 2px', fontFamily: 'var(--display)' }}>
            {stats.conversionRate.toFixed(2)}%
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--green)', fontWeight: 600 }}>
            <TrendingUp className="w-3 h-3" />
            <span>+0.3% rate growth</span>
          </div>
        </div>

      </div>

      {/* Main dashboard splits */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
        
        {/* Left: Map & Search queries */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Map card */}
          <div className="db-section">
            <div className="db-section-head" style={{ padding: '14px 20px', borderBottom: '1px solid var(--line-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe className="w-4.5 h-4.5 text-orange-600" />
                <span className="db-section-title">Geographic Distribution</span>
              </div>
              <span className="mono muted" style={{ fontSize: '11px' }}>Visits by country of origin</span>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <WorldMap data={stats.countries} />
              
              {/* Mini country list table */}
              <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                {stats.countries.slice(0, 6).map((c, i) => (
                  <div key={c.countryId} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: 'var(--surface-2)',
                    borderRadius: 'var(--r-md)',
                    border: '1px solid var(--line-soft)',
                    fontSize: '12.5px'
                  }}>
                    <span style={{ fontWeight: 600, fontFamily: 'var(--mono)', color: 'var(--ink-2)' }}>
                      {i + 1}. {c.countryId}
                    </span>
                    <span className="mono muted">{c.visits.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Google Search SEO Card */}
          <div className="db-section">
            <div className="db-section-head" style={{ padding: '14px 20px', borderBottom: '1px solid var(--line-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Search className="w-4.5 h-4.5 text-blue-600" />
                <span className="db-section-title">Google Search (SEO) Performance</span>
              </div>
              <span className="mono muted" style={{ fontSize: '11px' }}>Search Console Insights</span>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Core SEO Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line-soft)', padding: '10px 14px', borderRadius: 'var(--r-md)' }}>
                  <div style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--ink-4)', letterSpacing: '0.04em' }}>CLICKS</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
                    {formatNumber(stats.pageViews * 0.12)}
                  </div>
                </div>
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line-soft)', padding: '10px 14px', borderRadius: 'var(--r-md)' }}>
                  <div style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--ink-4)', letterSpacing: '0.04em' }}>IMPRESSIONS</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
                    {formatNumber(stats.pageViews * 1.8)}
                  </div>
                </div>
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line-soft)', padding: '10px 14px', borderRadius: 'var(--r-md)' }}>
                  <div style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--ink-4)', letterSpacing: '0.04em' }}>AVERAGE CTR</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
                    6.7%
                  </div>
                </div>
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line-soft)', padding: '10px 14px', borderRadius: 'var(--r-md)' }}>
                  <div style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--ink-4)', letterSpacing: '0.04em' }}>AVG POSITION</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent)', marginTop: '2px' }}>
                    3.1
                  </div>
                </div>
              </div>

              {/* Keyword rankings table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left', color: 'var(--ink-3)' }}>
                      <th style={{ padding: '8px 4px', fontWeight: 600 }}>Top Search Query</th>
                      <th style={{ padding: '8px 4px', fontWeight: 600, textAlign: 'right' }}>Clicks</th>
                      <th style={{ padding: '8px 4px', fontWeight: 600, textAlign: 'right' }}>Impr.</th>
                      <th style={{ padding: '8px 4px', fontWeight: 600, textAlign: 'right' }}>CTR</th>
                      <th style={{ padding: '8px 4px', fontWeight: 600, textAlign: 'right' }}>Pos.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.keywords.map((k, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                        <td style={{ padding: '10px 4px', fontWeight: 500, color: 'var(--ink)' }}>{k.query}</td>
                        <td style={{ padding: '10px 4px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{k.clicks.toLocaleString()}</td>
                        <td style={{ padding: '10px 4px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{k.impressions.toLocaleString()}</td>
                        <td style={{ padding: '10px 4px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{k.ctr.toFixed(1)}%</td>
                        <td style={{ padding: '10px 4px', textAlign: 'right', fontFamily: 'var(--mono)' }}>
                          <span style={{ 
                            background: k.position <= 2 ? 'var(--green-soft)' : 'transparent',
                            color: k.position <= 2 ? 'var(--green)' : 'inherit',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontWeight: k.position <= 2 ? 700 : 'normal'
                          }}>
                            {k.position.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          </div>

        </div>

        {/* Right: Campaigns & Top Channels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Campaign Performance card */}
          <div className="db-section" style={{ height: '100%' }}>
            <div className="db-section-head" style={{ padding: '14px 20px', borderBottom: '1px solid var(--line-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag className="w-4.5 h-4.5 text-violet-600" />
                <span className="db-section-title">Marketing & Campaign Performance</span>
              </div>
              <span className="mono muted" style={{ fontSize: '11px' }}>UTM analytics and referral channels</span>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left', color: 'var(--ink-3)' }}>
                      <th style={{ padding: '8px 4px', fontWeight: 600 }}>Campaign</th>
                      <th style={{ padding: '8px 4px', fontWeight: 600 }}>Source / Medium</th>
                      <th style={{ padding: '8px 4px', fontWeight: 600, textAlign: 'right' }}>Visits</th>
                      <th style={{ padding: '8px 4px', fontWeight: 600, textAlign: 'right' }}>{stats.conversionsLabel}</th>
                      <th style={{ padding: '8px 4px', fontWeight: 600, textAlign: 'right' }}>Conv %</th>
                      {isApparelOrGlobal ? (
                        <th style={{ padding: '8px 4px', fontWeight: 600, textAlign: 'right' }}>Revenue</th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.campaigns.map((c, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                        <td style={{ padding: '12px 4px', fontWeight: 600, color: 'var(--ink)' }}>{c.campaign}</td>
                        <td style={{ padding: '12px 4px' }}>
                          <span style={{ 
                            background: 'var(--surface-2)', 
                            border: '1px solid var(--line-soft)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11.5px',
                            fontFamily: 'var(--mono)',
                            color: 'var(--ink-3)'
                          }}>
                            {c.source} / {c.medium}
                          </span>
                        </td>
                        <td style={{ padding: '12px 4px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{c.visits.toLocaleString()}</td>
                        <td style={{ padding: '12px 4px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{c.conversions.toLocaleString()}</td>
                        <td style={{ padding: '12px 4px', textAlign: 'right' }}>
                          <span style={{ 
                            color: c.rate >= 8 ? 'var(--green)' : c.rate >= 4 ? 'var(--accent)' : 'inherit',
                            fontWeight: c.rate >= 4 ? 600 : 'normal',
                            fontFamily: 'var(--mono)'
                          }}>
                            {c.rate.toFixed(1)}%
                          </span>
                        </td>
                        {isApparelOrGlobal && c.value !== undefined ? (
                          <td style={{ padding: '12px 4px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--ink)' }}>
                            {formatCurrency(c.value)}
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Marketing Insights tip */}
              <div style={{ 
                marginTop: '16px',
                padding: '14px 18px',
                background: 'var(--surface-2)',
                border: '1px solid var(--line-soft)',
                borderRadius: 'var(--r-md)',
                display: 'flex',
                gap: '12px'
              }}>
                <div style={{ 
                  width: '28px', 
                  height: '28px', 
                  borderRadius: '50%', 
                  background: 'var(--accent-soft)', 
                  color: 'var(--accent)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <ArrowUpRight className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-2)' }}>Traffic Insight</div>
                  <p style={{ fontSize: '12px', color: 'var(--ink-3)', margin: '4px 0 0', lineHeight: 1.4 }}>
                    {isApparelSelected
                      ? 'The Klaviyo email campaign has a conversion rate of 12.0%, generating highest conversion efficiency. Consider increasing retargeting spend on Instagram as it brings highest total traffic.' 
                      : 'Organic local queries via Google Maps bring the highest volume of reservations and form inquiries. Ensure schema RLS schemas and keywords are kept fully updated to maintain SERP positioning.'}
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
