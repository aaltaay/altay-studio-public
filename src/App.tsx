import React, { useState, useEffect } from "react"
import { CrmApp } from "@/crm/CrmApp"
import { AdminCalendar } from "../blocks/core/booking_calendar/AdminCalendar"
import LandingPage from "./LandingPage"
import { supabase } from "@/lib/supabase"

const ADMIN_EMAIL = "[YOUR_ADMIN_EMAIL]"

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname)
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false)
  const [authPassword, setAuthPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)

  useEffect(() => {
    const onPopState = () => setCurrentPath(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    
    // Check if there's an existing Supabase Auth session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email === ADMIN_EMAIL) {
        setIsAdminUnlocked(true)
      }
    })
    
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  if (currentPath === '/calendar-demo') {
    return (
      <div className="min-h-screen bg-background text-foreground relative overflow-hidden p-6">
        <header className="flex items-center justify-between mb-6 max-w-7xl mx-auto w-full">
           <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setCurrentPath('/')}>
             <span className="font-semibold text-lg tracking-tight hover:underline">&larr; Back to Home</span>
           </div>
        </header>
        <main className="max-w-7xl mx-auto w-full">
          <AdminCalendar />
        </main>
      </div>
    );
  }

  // Admin Route
  if (currentPath === '/admin') {
    if (!isAdminUnlocked) {
      const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoginLoading(true)
        setLoginError("")
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: ADMIN_EMAIL,
            password: authPassword,
          })
          if (error) {
            setLoginError(error.message)
          } else if (data.session) {
            setIsAdminUnlocked(true)
          }
        } catch (err: any) {
          setLoginError(err.message || "Login failed")
        } finally {
          setLoginLoading(false)
        }
      }

      return (
        <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4 relative overflow-hidden">
          {/* Ambient glow */}
          <div className="pointer-events-none fixed inset-0 z-0">
            <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-[120px]" />
          </div>
          
          <div className="w-full max-w-md bg-zinc-900/50 backdrop-blur-md border border-zinc-800 p-8 rounded-2xl relative z-10 shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/25 mx-auto mb-4">
                A
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Admin Access</h1>
              <p className="text-zinc-400 text-sm mt-2">Enter the admin password to view the CRM</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg text-center">
                  {loginError}
                </div>
              )}
              <div className="space-y-2">
                <input 
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-center tracking-[0.5em] font-mono text-lg"
                  placeholder="••••••"
                  required
                  autoFocus
                />
              </div>
              <button 
                type="submit"
                disabled={loginLoading}
                className="w-full h-12 bg-white hover:bg-zinc-200 text-zinc-950 font-bold rounded-xl transition-colors mt-4 disabled:opacity-50"
              >
                {loginLoading ? 'Signing in...' : 'Unlock'}
              </button>
            </form>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-background text-foreground relative flex flex-col">
        <main className="flex-1 relative bg-white dark:bg-zinc-950">
          <CrmApp />
        </main>
      </div>
    )
  }

  // Root Route (Landing Page)
  return <LandingPage />
}

export default App
