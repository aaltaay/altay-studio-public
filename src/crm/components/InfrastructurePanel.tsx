import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Activity, Trash2, RotateCcw, ShieldAlert, Bot, Database, Globe } from "lucide-react";

const GithubIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
);
import type { Project } from "../hooks/useCRM";

export function InfrastructurePanel({ project }: { project: Project }) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string>("");
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [agentStats, setAgentStats] = useState<any>(null);

  if (!project) return null;

  const handleAction = async (action: string) => {
    if (action === "cleanup") {
      const confirmMsg = `WARNING: You are about to ARCHIVE the infrastructure for ${project.name}.\n\nThe database schema and GitHub repository will be renamed (archived).\nThe Vercel project will be PERMANENTLY deleted.\n\nType the project name "${project.name}" exactly to proceed:`;
      const input = window.prompt(confirmMsg);
      if (input !== project.name) {
        alert("Name mismatch. Archival cancelled.");
        return;
      }
    }

    setActionLoading(action);
    setActionError("");
    try {
      // Calling our edge function with project info
      const { data, error } = await supabase.functions.invoke("admin-action", {
        body: { action, project_id: project.id }
      });
      
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      if (action === "diagnose") {
        setDiagnostics(data);
      } else if (action === "agent_stats") {
        setAgentStats(data);
      } else {
        alert(`${action} completed successfully.`);
      }
    } catch (e: any) {
      setActionError(`Action ${action} failed: ` + e.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8 border-t border-line pt-8">
      {/* Infrastructure Details */}
      <div className="space-y-4">
        <h3 className="font-medium flex items-center text-sm gap-2">
          <Activity size={16} className="text-blue-500" />
          Infrastructure Details
        </h3>
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-3 gap-2 border-b border-line pb-2">
            <span className="muted flex items-center gap-1.5"><Database size={12}/> Schema</span>
            <code className="col-span-2 text-xs">{project.schema_name || 'pending'}</code>
          </div>
          <div className="grid grid-cols-3 gap-2 border-b border-line pb-2">
            <span className="muted flex items-center gap-1.5"><GithubIcon /> GitHub Repo</span>
            <div className="col-span-2 flex items-center gap-2">
              <code className="text-xs">{project.github_repo || 'pending'}</code>
              {project.github_repo && (
                <a href={`https://github.com/${project.github_repo}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-xs">View ↗</a>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 border-b border-line pb-2">
            <span className="muted flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M24 22.525H0l12-21.05 12 21.05z"/></svg> 
              Vercel Project
            </span>
            <code className="col-span-2 text-xs">{project.vercel_project_id || 'pending'}</code>
          </div>
          <div className="grid grid-cols-3 gap-2 border-b border-line pb-2">
            <span className="muted flex items-center gap-1.5"><Globe size={12}/> Domain</span>
            <div className="col-span-2 flex items-center gap-2">
              <code className="text-xs">{project.subdomain || 'pending'}</code>
              {project.subdomain && (
                <a href={`https://${project.subdomain}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-xs">Visit ↗</a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Agent OS */}
      <div className="space-y-4">
        <h3 className="font-medium flex items-center text-sm gap-2">
          <Bot size={16} className="text-violet-500" />
          Agent OS
        </h3>
        {!agentStats ? (
          <button
            onClick={() => handleAction("agent_stats")}
            disabled={actionLoading !== null}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-violet-500/10 text-violet-500 border border-violet-500/20 rounded hover:bg-violet-500/20 disabled:opacity-50 transition-colors"
          >
            <Bot size={14} />
            {actionLoading === "agent_stats" ? 'Loading...' : 'Load Agent Stats'}
          </button>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-3 gap-2 border-b border-line pb-2">
              <span className="muted">Tasks Today</span>
              <div className="col-span-2 flex items-center gap-2">
                <code className="text-xs font-mono">{agentStats.today?.tasks || 0}</code>
                <span className="text-xs muted">/ {agentStats.daily_limit || 100} limit</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-line pb-2">
              <span className="muted">Tokens (in/out)</span>
              <code className="col-span-2 text-xs font-mono">
                {agentStats.today?.tokens_in?.toLocaleString() || 0} / {agentStats.today?.tokens_out?.toLocaleString() || 0}
              </code>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-line pb-2">
              <span className="muted">Est. Cost Today</span>
              <code className="col-span-2 text-xs font-mono text-emerald-500">
                ${(agentStats.today?.estimated_cost_usd || 0).toFixed(4)}
              </code>
            </div>
            <button
              onClick={() => handleAction("agent_stats")}
              className="text-xs text-violet-500 hover:text-violet-400 mt-1"
            >
              ↻ Refresh
            </button>
          </div>
        )}
      </div>

      {/* Control Panel */}
      <div className="space-y-4">
        <h3 className="font-medium flex items-center text-sm gap-2">
          <ShieldAlert size={16} className="text-orange-500" />
          Control Panel
        </h3>

        {actionError && (
          <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-md text-sm text-red-500 mb-4 font-mono break-words">
            {actionError}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={() => handleAction("diagnose")}
            disabled={actionLoading !== null}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            <Activity size={14} />
            {actionLoading === "diagnose" ? 'Checking...' : 'Run Diagnostics'}
          </button>
          
          <button
            onClick={() => handleAction("resume")}
            disabled={actionLoading !== null}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50 transition-colors"
          >
            <RotateCcw size={14} />
            {actionLoading === "resume" ? 'Resuming...' : 'Resume Process'}
          </button>

          <button
            onClick={() => handleAction("cleanup")}
            disabled={actionLoading !== null}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            <Trash2 size={14} />
            {actionLoading === "cleanup" ? 'Archiving...' : 'Archive Infrastructure'}
          </button>
        </div>

        {diagnostics && (
          <div className="mt-4 p-3.5 bg-zinc-900 rounded-md border border-line text-xs font-mono space-y-2 text-zinc-100 shadow-inner">
            <p className="text-zinc-400 mb-2 font-semibold tracking-wider uppercase text-[10px]">Diagnostic Results</p>
            <div className="flex items-center justify-between">
              <span className="text-zinc-300">Schema {project.schema_name}:</span>
              <span className={diagnostics.schema ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{diagnostics.schema ? 'FOUND' : 'MISSING'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-300">GitHub Repo:</span>
              <span className={diagnostics.github ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{diagnostics.github ? 'OK' : 'NOT FOUND'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-300">Vercel Project:</span>
              <span className={diagnostics.vercel ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{diagnostics.vercel ? 'OK' : 'NOT FOUND'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
