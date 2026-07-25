import React from 'react';

type Project = {
  name: string;
  tag: string;
  description: string;
  href: string;
  imageAlt: string;
  placeholder: { from: string; via?: string; to: string; accent?: string };
  external?: boolean;
};

const FEATURED = {
  name: 'Nova',
  tag: 'FinTech · Desktop + Web',
  href: 'https://nova.altaystudio.com',
  description:
    'A local-first market alert system with FastAPI, React, and Electron — live scanners, quote panels, multi-timeframe charts, and IBKR trading workflows.',
  images: [
    {
      alt: 'Nova Stock Scanner trading dashboard',
      placeholder: { from: '#0f172a', via: '#1e3a8a', to: '#312e81', accent: '#3b82f6' },
    },
    {
      alt: 'Nova gap scanner with live quotes',
      placeholder: { from: '#111827', via: '#1d4ed8', to: '#0f172a', accent: '#60a5fa' },
    },
  ],
};

const PROJECTS: Project[] = [
  {
    name: 'Demo Studio',
    tag: 'Photography · Bespoke',
    description: 'Full CMS creative-services site with portfolio galleries, pricing pages, and gated client areas.',
    href: '#work',
    imageAlt: 'Demo Studio photography homepage',
    placeholder: { from: '#18181b', via: '#3f3f46', to: '#09090b', accent: '#a78bfa' },
  },
  {
    name: 'Demo Restaurant',
    tag: 'Restaurant · Ordering',
    description: 'Authentic dining site with menu, hours, and online ordering — provisioned on the Altay platform.',
    href: '#work',
    imageAlt: 'Demo Restaurant homepage',
    placeholder: { from: '#1c1917', via: '#78350f', to: '#0c0a09', accent: '#f59e0b' },
  },
  {
    name: 'Demo Bakery',
    tag: 'Patisserie · Lead Gen',
    description: 'Warm, conversion-focused bakery landing page with WhatsApp booking and a polished brand story.',
    href: '#work',
    imageAlt: 'Demo Bakery homepage',
    placeholder: { from: '#1f1410', via: '#92400e', to: '#0c0a09', accent: '#fb923c' },
  },
  {
    name: 'Demo Band',
    tag: 'Music · Booking',
    description: 'Artist site for a touring band — music, gallery, shows, press, and booking inquiry.',
    href: '#work',
    imageAlt: 'Demo Band website',
    placeholder: { from: '#0f172a', via: '#581c87', to: '#020617', accent: '#c084fc' },
  },
];

function ExternalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  );
}

function PortfolioPlaceholder({
  alt,
  placeholder,
  className = '',
}: {
  alt: string;
  placeholder: Project['placeholder'];
  className?: string;
}) {
  const gradient = placeholder.via
    ? `linear-gradient(135deg, ${placeholder.from} 0%, ${placeholder.via} 45%, ${placeholder.to} 100%)`
    : `linear-gradient(135deg, ${placeholder.from} 0%, ${placeholder.to} 100%)`;

  return (
    <div
      role="img"
      aria-label={alt}
      className={`relative overflow-hidden ${className}`}
      style={{ background: gradient }}
    >
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '3rem 3rem',
        }}
      />
      {placeholder.accent && (
        <div
          className="absolute -top-16 -right-16 w-56 h-56 rounded-full blur-3xl opacity-40"
          style={{ backgroundColor: placeholder.accent }}
        />
      )}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-zinc-950/70 to-transparent" />
      <div className="absolute inset-x-8 top-8 space-y-3 opacity-70">
        <div className="h-3 w-24 rounded-full bg-white/20" />
        <div className="h-2 w-40 rounded-full bg-white/10" />
        <div className="h-2 w-28 rounded-full bg-white/10" />
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-blue-500/30 flex flex-col font-sans overflow-x-hidden">
      {/* Navigation */}
      <nav className="w-full flex items-center justify-between px-6 md:px-12 py-6 absolute top-0 z-50">
        <a href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center text-white font-bold text-lg shadow-[0_0_20px_rgba(37,99,235,0.3)] group-hover:shadow-[0_0_28px_rgba(37,99,235,0.45)] transition-shadow">
            A
          </div>
          <span className="font-semibold text-lg tracking-tight">Altay Studio</span>
        </a>
        <div className="flex items-center gap-2 sm:gap-4">
          <a
            href="#work"
            className="hidden sm:inline-flex px-4 py-2 rounded-full text-sm font-medium text-zinc-300 hover:text-white transition-colors"
          >
            Work
          </a>
          <a
            href="mailto:hello@altaystudio.com?subject=Build%20Site%20for%20Us"
            className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 backdrop-blur-md text-sm font-medium transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            Contact Us
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-[88vh] flex flex-col items-center justify-center px-6 text-center pt-24 pb-16">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-blue-200 mb-8 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Now accepting new projects
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-white/90 to-white/40 mb-8 leading-[1.1]">
            Engineering digital <br className="hidden md:block" />
            experiences that inspire.
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 mb-12 max-w-2xl leading-relaxed">
            Altay Studio is an elite software agency specializing in bespoke web applications, enterprise platforms, and scalable infrastructure.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <a
              href="mailto:hello@altaystudio.com?subject=Build%20Site%20for%20Us"
              className="group relative px-8 py-4 rounded-full bg-white text-zinc-950 font-bold text-lg overflow-hidden transition-transform hover:scale-105 active:scale-95"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-indigo-100 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative flex items-center gap-2">
                Build Site for Us
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </span>
            </a>

            <a
              href="#work"
              className="px-8 py-4 rounded-full bg-zinc-900 border border-zinc-800 text-white font-medium text-lg hover:bg-zinc-800 transition-colors"
            >
              View Our Work
            </a>
          </div>
        </div>

        <a
          href="#work"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
          aria-label="Scroll to work"
        >
          <svg className="w-6 h-6 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </a>
      </section>

      {/* Selected Work */}
      <main id="work" className="relative z-10 px-6 md:px-12 pb-24 scroll-mt-8">
        <div className="max-w-6xl mx-auto">
          <header className="mb-14 md:mb-16 max-w-2xl">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-blue-300/80 mb-3">Selected work</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4">
              Projects we&apos;ve shipped.
            </h2>
            <p className="text-zinc-400 text-base md:text-lg leading-relaxed">
              From market-trading systems to photography studios and local businesses — each build is custom, production-ready, and designed to convert.
            </p>
          </header>

          {/* Featured: Nova */}
          <article className="mb-16 md:mb-20">
            <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-start">
              <div className="lg:col-span-5 lg:sticky lg:top-28">
                <p className="text-xs font-medium tracking-[0.18em] uppercase text-blue-300/70 mb-3">Featured product</p>
                <h3 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">{FEATURED.name}</h3>
                <p className="text-sm text-zinc-500 mb-5">{FEATURED.tag}</p>
                <p className="text-zinc-400 leading-relaxed mb-6">{FEATURED.description}</p>
                <ul className="flex flex-wrap gap-2 mb-8">
                  {['Python', 'FastAPI', 'React', 'Electron', 'IBKR'].map((tech) => (
                    <li
                      key={tech}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-zinc-300"
                    >
                      {tech}
                    </li>
                  ))}
                </ul>
                <a
                  href={FEATURED.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-300 hover:text-blue-200 transition-colors"
                >
                  Visit Nova
                  <ExternalIcon className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="lg:col-span-7 space-y-4">
                {FEATURED.images.map((img, i) => (
                  <a
                    key={img.alt}
                    href={FEATURED.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/80 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                  >
                    <PortfolioPlaceholder
                      alt={img.alt}
                      placeholder={img.placeholder}
                      className="aspect-[16/10] transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                    />
                  </a>
                ))}
              </div>
            </div>
          </article>

          {/* Client / product grid */}
          <div className="grid sm:grid-cols-2 gap-6 md:gap-8">
            {PROJECTS.map((project) => (
              <a
                key={project.name}
                href={project.href}
                className="group flex flex-col rounded-2xl border border-white/10 bg-zinc-900/40 overflow-hidden transition-all duration-300 hover:border-white/20 hover:bg-zinc-900/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-zinc-900">
                  <PortfolioPlaceholder
                    alt={project.imageAlt}
                    placeholder={project.placeholder}
                    className="absolute inset-0 w-full h-full transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  />
                </div>
                <div className="flex flex-col flex-1 p-6 md:p-7">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-xl font-semibold tracking-tight group-hover:text-white transition-colors">
                      {project.name}
                    </h3>
                    <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 mt-1">Demo</span>
                  </div>
                  <p className="text-xs font-medium tracking-wide uppercase text-zinc-500 mb-3">{project.tag}</p>
                  <p className="text-sm text-zinc-400 leading-relaxed flex-1">{project.description}</p>
                </div>
              </a>
            ))}
          </div>

          {/* CTA band */}
          <aside className="mt-20 md:mt-24 relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-blue-600/15 via-zinc-900 to-indigo-900/20 px-8 py-12 md:px-14 md:py-16 text-center">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[420px] h-[420px] bg-blue-500/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="relative z-10 max-w-xl mx-auto">
              <h2 className="text-2xl md:text-4xl font-bold tracking-tight mb-4">Ready for your next launch?</h2>
              <p className="text-zinc-400 mb-8 leading-relaxed">
                Tell us about your business. We&apos;ll design, build, and ship a production site on modern infrastructure.
              </p>
              <a
                href="mailto:hello@altaystudio.com?subject=Build%20Site%20for%20Us"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-zinc-950 font-bold text-lg hover:scale-105 active:scale-95 transition-transform"
              >
                Start a project
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </div>
          </aside>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/5 px-6 md:px-12 py-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
          <p>© {new Date().getFullYear()} Altay Studio</p>
          <div className="flex items-center gap-6">
            <a href="#work" className="hover:text-zinc-300 transition-colors">
              Work
            </a>
            <a href="/admin" className="hover:text-zinc-300 transition-colors">
              Client Portal
            </a>
            <a href="mailto:hello@altaystudio.com" className="hover:text-zinc-300 transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>

      {/* Grid background overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-[-1]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
          backgroundSize: '4rem 4rem',
        }}
      />
    </div>
  );
}
