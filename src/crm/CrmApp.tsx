import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar, TopBar, BottomTabs } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { LeadsList } from './components/Leads';
import { ProjectsList, CreateProject, ProjectDetail } from './components/Projects';
import { ClientsList, EditClientPanel } from './components/Clients';
import Templates from './components/Templates';
import InvoicesPage from './components/InvoicesPage';
import { TweaksPanel, TweakSection, TweakRadio } from './components/TweaksPanel';
import { PublicQuoteForm } from './components/PublicQuoteForm';
import { PublicProposalView } from './components/PublicProposalView';
import { WebsiteStats } from './components/WebsiteStats';
import { useCRM } from './hooks/useCRM';
import { supabase } from '@/lib/supabase';
import './crm.css';

export function CrmApp() {
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisioningStatus, setProvisioningStatus] = useState('');
  const [provisioningError, setProvisioningError] = useState('');
  const {
    leads,
    clients,
    contacts,
    projects,
    invoices,
    tasks,
    activities,
    loading,
    addLead,
    updateLead,
    deleteLead,
    addClient,
    updateClient,
    deleteClient,
    addProject,
    updateProject,
    deleteProject,
    addInvoice,
    updateInvoice,
    addTask,
    updateTask,
    addActivity,
    proposals,
    addProposal,
    updateProposal,
    deleteProposal,
    templates,
    targetAccounts,
    accountContacts,
    accountTouchpoints,
    accountSignals,
    researchFeeds,
    addTargetAccount,
    updateTargetAccount,
    addAccountTouchpoint,
    addAccountSignal,
    reviewAccountSignal,
    addResearchFeed,
    updateResearchFeed,
    deleteResearchFeed,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    seedMockData
  } = useCRM();

  // Route state: dashboard | projects | create-project | project-detail | clients | leads | public-quote | public-proposal
  const [route, setRoute] = useState<string>('dashboard');
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);
  const [editClientId, setEditClientId] = useState<string | null>(null);
  const [openProposalId, setOpenProposalId] = useState<string | null>(null);

  // Layout Tweaks state
  const [tweaks, setTweaks] = useState({
    theme: 'light',
    density: 'comfortable',
    leadAddMode: 'panel',
    editClientVariant: 'stacked',
  });

  const setTweak = (key: string, value: string) => {
    setTweaks(prev => ({ ...prev, [key]: value }));
  };

  // Check query param for public quote form or proposal
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (view === 'quote') {
      setRoute('public-quote');
    } else if (view === 'proposal') {
      setRoute('public-proposal');
      setOpenProposalId(params.get('id'));
    }
  }, []);

  // Sync theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tweaks.theme || 'light');
  }, [tweaks.theme]);

  // Local state to format leads as expected by LeadsList (grouped by stage)
  const [localLeads, setLocalLeads] = useState<{ New: any[]; Contacted: any[]; Quoted: any[] }>({
    New: [],
    Contacted: [],
    Quoted: [],
  });

  const [localHistory, setLocalHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!loading) {
      setLocalLeads({
        New: leads.filter(l => l.status === 'New'),
        Contacted: leads.filter(l => l.status === 'Contacted'),
        Quoted: leads.filter(l => l.status === 'Quoted'),
      });
      setLocalHistory(leads.filter(l => l.status === 'Won' || l.status === 'Lost'));
    }
  }, [leads, loading]);

  const handleNavigate = (id: string) => {
    if (['projects', 'create-project', 'clients', 'leads', 'dashboard', 'templates', 'invoices', 'stats'].includes(id)) {
      setRoute(id);
    }
  };

  const handleQuickAdd = () => setRoute('create-project');

  const handleCreateProject = async (form: { 
    name: string; 
    clientId: string; 
    templateId: string; 
    due: string; 
    notes: string;
    provisionSite: boolean;
    slug?: string;
    businessType?: string;
    primaryColor?: string;
    ownerName?: string;
    ownerEmail?: string;
  }) => {
    const formattedDue = form.due || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    let infraData: any = {};
    
    if (form.provisionSite) {
      setIsProvisioning(true);
      setProvisioningStatus('Initiating website provisioning...');
      setProvisioningError('');
      
      try {
        const client = contacts.find(c => c.id === form.clientId);
        const businessName = client ? client.name : form.name.split('—')[0].trim();
        
        setProvisioningStatus('Calling provisioning agent (database, GitHub & Vercel deployment)...');
        const { data, error } = await supabase.functions.invoke('provision-client', {
          body: {
            business_name: businessName,
            business_type: form.businessType || 'bespoke',
            slug: form.slug,
            primary_color: form.primaryColor || '#2563eb',
            owner_name: form.ownerName || 'Client Owner',
            owner_email: form.ownerEmail || 'client@email.com',
            features: {
              booking_calendar: true,
              gallery: true,
              contact_form: true,
            }
          }
        });
        
        if (error) throw new Error(error.message);
        if (data?.success === false || data?.error) throw new Error(data?.error || 'Provisioning failed');
        
        infraData = {
          business_id: data.business_id,
          github_repo: data.github_repo,
          vercel_project_id: data.vercel_project_id,
          schema_name: data.schema_name,
          subdomain: data.subdomain,
        };
      } catch (err: any) {
        console.error("Provisioning failed:", err);
        setProvisioningError(err.message || 'An unknown error occurred during website setup.');
        setIsProvisioning(false);
        return; // Stop here, do not create the project
      } finally {
        setIsProvisioning(false);
      }
    }

    const newProject = await addProject({
      name: form.name,
      client: form.clientId,
      template: form.templateId || undefined,
      progress: 0,
      due: formattedDue,
      stage: 'Kickoff',
      ...infraData
    });

    if (newProject) {
      // Add first activity
      await addActivity({
        type: 'note',
        text: `Project "${form.name}" created.`,
        linkedId: form.clientId,
        linkedName: contacts.find(c => c.id === form.clientId)?.name || 'Client',
        linkedType: 'client'
      });

      // Add default kickoff task
      await addTask({
        text: 'Kickoff call and requirements gathering',
        linkedId: newProject.id,
        linkedName: newProject.name,
        linkedType: 'project',
        dueDate: formattedDue,
        stage: 'To do',
        priority: 'high',
        done: false
      });

      // Create page tasks from template
      if (form.templateId) {
        const tmpl = templates.find(t => t.id === form.templateId);
        if (tmpl && tmpl.pages.length > 0) {
          for (const page of tmpl.pages) {
            await addTask({
              text: page,
              linkedId: newProject.id,
              linkedName: newProject.name,
              linkedType: 'project',
              dueDate: formattedDue,
              stage: 'To do',
              priority: 'med',
              page: page,
              done: false
            });
          }
        }
      }

      setOpenProjectId(newProject.id);
      setRoute('project-detail');
    }
  };

  const handleClientSave = async (form: any) => {
    const res = await updateClient(form.id, form);
    if (res) {
      setEditClientId(null);
    }
  };

  const handleClientDelete = async (form: any) => {
    await deleteClient(form.id);
    setEditClientId(null);
  };

  // Nav counts helper
  const counts = useMemo(() => {
    const activeLeadsCount = localLeads.New.length + localLeads.Contacted.length + localLeads.Quoted.length;
    const activeProjects = projects.filter(p => p.stage !== 'Live').length;
    const activeClients = clients.filter(c => c.status === 'active').length;
    return {
      leads: activeLeadsCount,
      projects: activeProjects,
      clients: activeClients
    };
  }, [localLeads, projects, clients]);

  const editingClient = useMemo(() => clients.find(c => c.id === editClientId) || null, [clients, editClientId]);

  // Task check trigger
  const handleCompleteTask = async (id: string) => {
    await updateTask(id, { done: true });
  };

  const handleAddTaskDirectly = async (tk: Partial<any>) => {
    return await addTask(tk);
  };

  let content: React.ReactNode = null;

  if (route === 'public-quote') {
    content = (
      <PublicQuoteForm
        onSave={addLead}
      />
    );
  } else if (route === 'public-proposal') {
    content = (
      <PublicProposalView
        proposalId={openProposalId || ''}
        updateProposal={updateProposal}
        updateLead={updateLead}
        addProject={addProject}
        addInvoice={addInvoice}
        addActivity={addActivity}
      />
    );
  } else if (loading && leads.length === 0 && clients.length === 0 && projects.length === 0) {
    content = (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="brand-mark" style={{ width: 48, height: 48, fontSize: 24, margin: '0 auto 16px', animation: 'spin 2s linear infinite' }}>A</div>
          <div className="muted" style={{ fontSize: 14 }}>Connecting to Altay CRM Database…</div>
        </div>
      </div>
    );
  } else if (!loading && leads.length === 0 && clients.length === 0 && projects.length === 0) {
    content = (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70vh' }}>
        <div style={{ textAlign: 'center', maxWidth: 440, padding: 32, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-xl)', boxShadow: '0 8px 30px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 600, marginBottom: 12 }}>Welcome to your Agency CRM</h2>
          <p className="muted" style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 24 }}>
            It looks like your database schema is completely brand new and empty. Click below to seed realistic mock data so you can test all the modules immediately.
          </p>
          <button className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} onClick={seedMockData}>
            ✨ Seed mock data
          </button>
        </div>
      </div>
    );
  } else {
    if (route === 'dashboard') {
      content = (
        <Dashboard
          activities={activities}
          tasks={tasks}
          onCompleteTask={handleCompleteTask}
          leads={localLeads}
          leadsHistory={localHistory}
          projects={projects}
        />
      );
    } else if (route === 'stats') {
      content = (
        <WebsiteStats
          projects={projects}
        />
      );
    } else if (route === 'create-project') {
      content = (
        <CreateProject
          onCancel={() => setRoute('projects')}
          onSave={handleCreateProject}
          clients={contacts}
          onAddClient={addClient}
          templates={templates}
        />
      );
    } else if (route === 'project-detail' && openProjectId) {
      content = (
        <ProjectDetail
          projectId={openProjectId}
          onBack={() => setRoute('projects')}
          onDelete={deleteProject}
          clients={clients}
          projects={projects}
          invoices={invoices}
          tasks={tasks}
          onAddTask={handleAddTaskDirectly}
          onCompleteTask={updateTask}
          onUpdateProject={updateProject}
          onAddInvoice={addInvoice}
          onUpdateInvoice={updateInvoice}
        />
      );
    } else if (route === 'clients') {
      content = (
        <ClientsList
          clients={clients}
          projects={projects}
          onCreate={() => setRoute('create-project')}
          onOpen={(id) => setEditClientId(id)}
        />
      );
    } else if (route === 'templates') {
      content = (
        <Templates
          templates={templates}
          onAdd={addTemplate}
          onUpdate={updateTemplate}
          onDelete={deleteTemplate}
        />
      );
    } else if (route === 'invoices') {
      content = (
        <InvoicesPage
          invoices={invoices}
          clients={contacts}
          onAddInvoice={addInvoice}
          onUpdateInvoice={updateInvoice}
        />
      );
    } else if (route === 'leads') {
      content = (
        <LeadsList
          leads={localLeads}
          setLeads={setLocalLeads}
          history={localHistory}
          setHistory={setLocalHistory}
          activities={activities}
          onAddActivity={addActivity}
          tasks={tasks}
          onAddTask={addTask}
          onCompleteTask={handleCompleteTask}
          onConvert={() => setRoute('create-project')}
          addMode={tweaks.leadAddMode as 'panel' | 'inline'}
          addLead={addLead}
          updateLead={updateLead}
          deleteLead={deleteLead}
          proposals={proposals}
          addProposal={addProposal}
          updateProposal={updateProposal}
          deleteProposal={deleteProposal}
          targetAccounts={targetAccounts}
          accountContacts={accountContacts}
          accountTouchpoints={accountTouchpoints}
          accountSignals={accountSignals}
          researchFeeds={researchFeeds}
          addTargetAccount={addTargetAccount}
          updateTargetAccount={updateTargetAccount}
          addAccountTouchpoint={addAccountTouchpoint}
          addAccountSignal={addAccountSignal}
          reviewAccountSignal={reviewAccountSignal}
          addResearchFeed={addResearchFeed}
          updateResearchFeed={updateResearchFeed}
          deleteResearchFeed={deleteResearchFeed}
        />
      );
    } else {
      content = (
        <ProjectsList
          projects={projects}
          clients={clients}
          onCreate={() => setRoute('create-project')}
          onOpen={(id) => { setOpenProjectId(id); setRoute('project-detail'); }}
        />
      );
    }
  }

  if (route === 'public-quote' || route === 'public-proposal') {
    return <>{content}</>;
  }

  return (
    <div style={{ backgroundColor: 'var(--bg)', color: 'var(--ink)', minHeight: '100vh', width: '100%', margin: 0, padding: 0, overflowX: 'hidden' }}>
      <div className="app-shell">
        <Sidebar
          activeRoute={
            (route === 'create-project' || route === 'project-detail') ? 'projects' :
            route
          }
          onNavigate={handleNavigate}
          counts={counts}
        />
        <div className="main">
          <TopBar title={
            route === 'create-project' ? 'New project' :
            route === 'project-detail' ? 'Project' :
            route === 'clients' ? 'Clients' :
            route === 'leads' ? 'Leads' :
            route === 'dashboard' ? 'Home' :
            route === 'stats' ? 'Website Stats' :
            'Projects'
          } />
          {content}
        </div>
      </div>

      <BottomTabs
        activeRoute={
          (route === 'create-project' || route === 'project-detail') ? 'projects' :
          route
        }
        onNavigate={handleNavigate}
        onQuickAdd={handleQuickAdd}
      />

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme">
          <TweakRadio
            value={tweaks.theme}
            onChange={v => setTweak('theme', v)}
            options={[
              { label: 'Light', value: 'light' },
              { label: 'Dark',  value: 'dark' },
            ]}
          />
        </TweakSection>
        <TweakSection label="Edit client — layout" hint="Slide-over arrangement when editing a client">
          <TweakRadio
            value={tweaks.editClientVariant}
            onChange={v => setTweak('editClientVariant', v)}
            options={[
              { label: 'Stacked', value: 'stacked' },
              { label: 'Tabbed',  value: 'tabbed' },
              { label: 'Rail',    value: 'rail' },
            ]}
          />
        </TweakSection>
        <TweakSection label="New lead — add mode" hint="How leads get captured on the board">
          <TweakRadio
            value={tweaks.leadAddMode}
            onChange={v => setTweak('leadAddMode', v)}
            options={[
              { label: 'Slide-over panel', value: 'panel' },
              { label: 'Inline quick-add', value: 'inline' },
            ]}
          />
        </TweakSection>
      </TweaksPanel>

      <EditClientPanel
        open={!!editingClient}
        client={editingClient}
        variant={tweaks.editClientVariant as 'stacked' | 'tabbed' | 'rail'}
        onClose={() => setEditClientId(null)}
        onSave={handleClientSave}
        onArchive={handleClientSave}
        onDelete={handleClientDelete}
        projects={projects}
        activities={activities}
        onAddActivity={addActivity}
        tasks={tasks}
        onAddTask={addTask}
        onCompleteTask={handleCompleteTask}
      />

      {/* Provisioning Loader and Error Modals */}
      {isProvisioning && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(26,22,18,0.7)',
          zIndex: 9999,
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <style>{`
            @keyframes loadingBar {
              0% { transform: translateX(-100%); }
              50% { transform: translateX(50%); }
              100% { transform: translateX(200%); }
            }
          `}</style>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-xl)',
            padding: '40px',
            width: 440,
            maxWidth: 'calc(100vw - 32px)',
            boxShadow: '0 24px 72px rgba(0,0,0,0.25)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px'
          }}>
            <div className="brand-mark" style={{ width: 64, height: 64, fontSize: 32, animation: 'spin 2s linear infinite' }}>A</div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px' }}>Provisioning Website</h3>
              <p className="muted" style={{ fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
                {provisioningStatus}
              </p>
            </div>
            <div style={{ width: '100%', height: '4px', background: 'var(--line)', borderRadius: '2px', overflow: 'hidden', position: 'relative' }}>
              <div style={{
                position: 'absolute',
                top: 0, left: 0, bottom: 0,
                width: '60%',
                background: 'var(--accent)',
                borderRadius: '2px',
                animation: 'loadingBar 1.5s infinite ease-in-out'
              }} />
            </div>
            <p className="muted" style={{ fontSize: '11.5px' }}>This process configures GitHub & Vercel. Please do not close or reload this page.</p>
          </div>
        </div>
      )}

      {provisioningError && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(26,22,18,0.7)',
          zIndex: 9999,
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--red)',
            borderRadius: 'var(--r-xl)',
            padding: '40px',
            width: 460,
            maxWidth: 'calc(100vw - 32px)',
            boxShadow: '0 24px 72px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'var(--red-soft)',
                display: 'flex', alignItems: 'center',
                flexShrink: 0, justifyContent: 'center'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 600, margin: 0, color: 'var(--red)' }}>Provisioning Failed</h3>
                <p className="muted" style={{ fontSize: '12px', marginTop: '2px' }}>Website infrastructure setup could not be completed.</p>
              </div>
            </div>
            <div style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r-md)',
              padding: '16px',
              fontFamily: 'var(--mono)',
              fontSize: '12.5px',
              color: 'var(--red)',
              wordBreak: 'break-word',
              maxHeight: '160px',
              overflowY: 'auto',
              lineHeight: 1.4
            }}>
              {provisioningError}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '4px' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setProvisioningError('')}
              >
                Close & Edit Fields
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

