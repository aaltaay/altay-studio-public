import { useMemo, useState, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';

countries.registerLocale(enLocale);

const featuresUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface CountryData {
  countryId: string; // ISO alpha-3
  visits: number;
}

interface WorldMapProps {
  data: CountryData[];
}

export function WorldMap({ data }: WorldMapProps) {
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'light');

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute('data-theme') || 'light');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const isDark = theme === 'dark';

  // Theme-specific color parameters
  const colors = useMemo(() => {
    if (isDark) {
      return {
        bg: 'bg-zinc-900/40 border-zinc-800/80',
        emptyFill: '#1E1A14',
        stroke: '#2E2920',
        hoverEmpty: '#25211A',
        minFill: '#2E2920',
        maxFill: '#E8623A',
        legendBg: 'bg-zinc-900 text-zinc-400 border-zinc-800',
        legendGradient: 'from-zinc-800 to-orange-500',
      };
    } else {
      return {
        bg: 'bg-[#FBF8F2] border-[#E0D6C4]',
        emptyFill: '#ECE5D8',
        stroke: '#E0D6C4',
        hoverEmpty: '#EBE3D2',
        minFill: '#EBE3D2',
        maxFill: '#C2410C',
        legendBg: 'bg-white text-slate-600 border-[#E0D6C4]',
        legendGradient: 'from-slate-200 to-orange-600',
      };
    }
  }, [isDark]);

  const colorScale = useMemo(() => {
    const maxVisits = Math.max(...data.map((d) => d.visits), 1);
    return scaleLinear<string>()
      .domain([0, maxVisits])
      .range([colors.minFill, colors.maxFill]);
  }, [data, colors]);

  const dataMap = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((d) => {
      const numericId = countries.alpha3ToNumeric(d.countryId);
      if (numericId) {
        map.set(numericId, d.visits);
      }
    });
    return map;
  }, [data]);

  return (
    <div className={`relative w-full h-full min-h-[350px] flex items-center justify-center rounded-xl overflow-hidden border ${colors.bg} transition-colors duration-200`}>
      <ComposableMap projectionConfig={{ scale: 140 }} width={800} height={400} style={{ width: "100%", height: "100%" }}>
        <ZoomableGroup center={[0, 20]}>
          <Geographies geography={featuresUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const countryCode = geo.id;
                const visits = countryCode ? dataMap.get(countryCode) || 0 : 0;
                const fill = visits > 0 ? colorScale(visits) : colors.emptyFill;
                const hoverFill = visits > 0 ? colorScale(visits * 1.15) : colors.hoverEmpty;
                
                return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={fill}
                      stroke={colors.stroke}
                      strokeWidth={0.5}
                      style={{
                        default: { outline: 'none' },
                        hover: { fill: hoverFill, outline: 'none', cursor: 'pointer' },
                        pressed: { outline: 'none' },
                      }}
                    >
                      <title>{geo.properties ? geo.properties.name : 'Unknown'}: {visits} visits</title>
                    </Geography>
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
      
      {/* Legend */}
      <div className={`absolute bottom-4 right-4 p-3 rounded-lg shadow-sm border flex items-center gap-2 text-xs transition-colors duration-200 ${colors.legendBg}`}>
        <span>0</span>
        <div className={`w-24 h-2 bg-gradient-to-r ${colors.legendGradient} rounded`}></div>
        <span>Max Visits</span>
      </div>
    </div>
  );
}

