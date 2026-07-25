export function AdminAnalytics() {
  return (
    <div className="max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Platform Analytics</h1>
        <button className="text-sm bg-neutral-800 hover:bg-neutral-700 text-white py-2 px-4 rounded border border-neutral-700 transition-colors">
          Download Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-neutral-800 border border-neutral-700 p-6 rounded-lg shadow-xl">
          <h3 className="text-neutral-400 text-sm font-medium mb-2">Total Visitors (30d)</h3>
          <p className="text-3xl font-bold text-white">1,248</p>
          <p className="text-green-400 text-sm mt-2 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
            12% increase
          </p>
        </div>
        
        <div className="bg-neutral-800 border border-neutral-700 p-6 rounded-lg shadow-xl">
          <h3 className="text-neutral-400 text-sm font-medium mb-2">Leads Generated</h3>
          <p className="text-3xl font-bold text-white">42</p>
          <p className="text-green-400 text-sm mt-2 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
            5% increase
          </p>
        </div>

        <div className="bg-neutral-800 border border-neutral-700 p-6 rounded-lg shadow-xl">
          <h3 className="text-neutral-400 text-sm font-medium mb-2">AI Agent Actions</h3>
          <p className="text-3xl font-bold text-white">89</p>
          <p className="text-green-400 text-sm mt-2 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
            24% increase
          </p>
        </div>
      </div>

      <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-12 text-center shadow-xl">
        <div className="text-neutral-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
        </div>
        <h3 className="text-xl text-white font-medium mb-2">Advanced Analytics Coming Soon</h3>
        <p className="text-neutral-400">Detailed charts, traffic sources, and conversion funnels are currently being developed.</p>
      </div>
    </div>
  );
}
