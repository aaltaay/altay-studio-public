import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface AgentTask {
  id: string;
  trigger_type: string;
  status: string;
  result: any;
  error_message: string;
  created_at: string;
}

interface AgentMemory {
  id: string;
  content: string;
  metadata: any;
  created_at: string;
}

export function AdminAgent() {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [memories, setMemories] = useState<AgentMemory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch recent tasks
    const { data: tasksData } = await supabase
      .from('agent_tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
      
    // Fetch recent memories
    const { data: memoriesData } = await supabase
      .from('agent_memories')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    setTasks(tasksData || []);
    setMemories(memoriesData || []);
    setLoading(false);
  };

  if (loading) {
    return <div className="text-neutral-400 animate-pulse flex h-64 items-center justify-center">Loading AI intelligence...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">AI Receptionist</h1>
          <p className="text-neutral-400 mt-1">Monitor the autonomous activities of your digital employee.</p>
        </div>
        <button onClick={fetchData} className="text-sm bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded transition-colors flex items-center gap-2">
          <span>⟳</span> Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Task Audit Trail */}
        <div className="bg-neutral-800 rounded-lg p-6 shadow-xl border border-neutral-700 flex flex-col max-h-[600px]">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-blue-400">⚡</span> Activity Log
          </h2>
          <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
            {tasks.length === 0 ? (
              <p className="text-neutral-500 text-sm italic bg-neutral-900/50 p-4 rounded text-center">No agent tasks recorded yet. The agent is sleeping.</p>
            ) : (
              tasks.map(task => (
                <div key={task.id} className="border-l-2 border-blue-500 pl-4 py-3 bg-neutral-900/30 rounded-r hover:bg-neutral-900/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-blue-400 uppercase tracking-wider">{task.trigger_type}</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      task.status === 'completed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                      task.status === 'failed' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                  <div className="mt-3 bg-neutral-950 rounded border border-neutral-800 p-3 overflow-x-auto">
                    <pre className="text-neutral-300 text-xs font-mono">
                      {task.status === 'failed' ? task.error_message : JSON.stringify(task.result, null, 2)}
                    </pre>
                  </div>
                  <p className="text-neutral-500 text-xs mt-3 flex justify-end">{new Date(task.created_at).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Memory Bank */}
        <div className="bg-neutral-800 rounded-lg p-6 shadow-xl border border-neutral-700 flex flex-col max-h-[600px]">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-purple-400">🧠</span> Long-Term Memory
          </h2>
          <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
            {memories.length === 0 ? (
              <p className="text-neutral-500 text-sm italic bg-neutral-900/50 p-4 rounded text-center">The AI's memory bank is empty.</p>
            ) : (
              memories.map(memory => (
                <div key={memory.id} className="bg-neutral-900 p-4 rounded border border-neutral-700 hover:border-neutral-600 transition-colors">
                  <p className="text-neutral-200 text-sm leading-relaxed">"{memory.content}"</p>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-neutral-800">
                    <span className="text-[10px] text-purple-400 font-mono uppercase bg-purple-400/10 px-2 py-0.5 rounded">
                      {memory.metadata?.type || 'General'}
                    </span>
                    <span className="text-xs text-neutral-500">{new Date(memory.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #52525b; }
      `}</style>
    </div>
  );
}
