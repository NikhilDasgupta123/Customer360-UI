import { useEffect, useMemo, useState } from 'react';
import CustomerGraphAppShell, { Icon } from '../../layout/components/CustomerGraphAppShell.jsx';
import { analyseCustomer } from '../../ai/logic/aiAnalysisService.js';
import { useCustomerDirectory } from '../logic/useCustomerDirectory.js';
import './CustomerDirectoryPage.css';

const CUSTOMER_ANALYSIS_STAGES = [
  'Gathering customer health signals',
  'Reviewing support, renewal and account activity',
  'Generating the AI customer brief',
];

function initials(value) { return String(value || '?').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?'; }
function formatDate(value) { if (!value) return '—'; const date = new Date(`${value}T00:00:00`); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date); }
function formatDateTime(value) { if (!value) return ''; const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date); }
function inr(value) { const amount = Number(value || 0); if (!amount) return '—'; if (amount >= 100000) return `₹${(amount / 100000).toFixed(amount >= 1000000 ? 1 : 2).replace(/\.00$/, '')}L`; return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount); }
function scoreClass(score) { const value = Number(score ?? -1); if (value < 0) return 'neutral'; if (value <= 40) return 'critical'; if (value <= 60) return 'medium'; return 'healthy'; }
function riskClass(risk) { const value = String(risk || '').toLowerCase(); return ['critical', 'high', 'medium', 'low'].includes(value) ? value : 'unknown'; }
function riskLabel(risk) { const text = String(risk || 'Unknown'); return text[0]?.toUpperCase() + text.slice(1); }

function savedAiInsight(customer) {
  if (!customer?.ai_summary) return null;
  return {
    customer_id: customer.id,
    customer_name: customer.company_name,
    risk_level: customer.ai_risk_level || customer.risk_level || 'unknown',
    summary: customer.ai_summary,
    reasons: [],
    recommended_action: customer.ai_recommended_action || '',
    generated_at: customer.ai_generated_at || '',
    priority: String(customer.ai_risk_level || customer.risk_level || '').toLowerCase() === 'critical' ? 'urgent' : 'high',
  };
}

function aiNeedsReview(insight) {
  const risk = String(insight?.risk_level || '').toLowerCase();
  return risk === 'critical' || risk === 'high';
}

function AiStatus({ insight }) {
  if (!insight) return <span className="directory-ai-status muted"><span aria-hidden="true" />Not analysed</span>;
  const needsReview = aiNeedsReview(insight);
  return (
    <span className={`directory-ai-status ${needsReview ? 'attention' : 'ready'}`} title={needsReview ? 'AI insight needs review' : 'AI insight is ready'}>
      <Icon name="sparkles" size={11} />
      {needsReview ? 'Needs review' : 'Insight ready'}
    </span>
  );
}

function CustomerAiProgress({ stage }) {
  return (
    <div className="customer-ai-progress" role="status" aria-live="polite">
      <div className="customer-ai-progress-title"><span className="customer-ai-spinner" aria-hidden="true" /><div><strong>Analysing this customer</strong><p>The AI brief is generated from the connected customer graph.</p></div></div>
      <ol>
        {CUSTOMER_ANALYSIS_STAGES.map((label, index) => (
          <li key={label} className={`${index < stage ? 'is-complete' : ''} ${index === stage ? 'is-current' : ''}`}>
            <span>{index < stage ? <Icon name="check" size={12} /> : index + 1}</span>
            <strong>{label}</strong>
            {index === stage ? <em>In progress</em> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

function CustomerAiBrief({ insight }) {
  if (!insight) {
    return (
      <div className="customer-ai-empty">
        <span><Icon name="sparkles" size={17} /></span>
        <div><strong>No AI brief yet</strong><p>Generate a concise account brief from current health, support and renewal signals.</p></div>
      </div>
    );
  }

  const reasons = Array.isArray(insight.reasons) ? insight.reasons.filter(Boolean) : [];
  return (
    <div className="customer-ai-brief-result">
      <div className="customer-ai-brief-status">
        <span className={`customer-ai-risk ${riskClass(insight.risk_level)}`}>{riskLabel(insight.risk_level)} risk</span>
        {insight.priority ? <span className={`customer-ai-priority ${String(insight.priority).toLowerCase()}`}>{insight.priority}</span> : null}
        {insight.generated_at ? <small>Analysed {formatDateTime(insight.generated_at)}</small> : null}
      </div>
      <div className="customer-ai-summary"><h4>Executive summary</h4><p>{insight.summary || 'No AI summary was returned for this customer.'}</p></div>
      {reasons.length ? <div className="customer-ai-reasons"><h4>Why this was flagged</h4><ul>{reasons.slice(0, 4).map((reason, index) => <li key={`${reason}-${index}`}><Icon name="check" size={13} />{reason}</li>)}</ul></div> : null}
      {insight.recommended_action ? <div className="customer-ai-recommendation"><span><Icon name="sparkles" size={14} /></span><div><h4>Recommended next action</h4><p>{insight.recommended_action}</p></div></div> : null}
      <p className="customer-ai-human-note">AI insight is advisory. Review the source account data before taking action.</p>
    </div>
  );
}

function CustomerDrawer({ customer, insight, isAnalysing, analysisStage, analysisError, onClose, onAnalyse }) {
  if (!customer) return null;
  return (
    <div className="customer-ai-drawer-layer" role="presentation">
      <button className="customer-ai-drawer-backdrop" type="button" onClick={onClose} aria-label="Close customer panel" />
      <aside className="customer-ai-drawer" role="dialog" aria-modal="true" aria-label={`${customer.company_name} Customer 360`}>
        <header className="customer-ai-drawer-header">
          <div className="customer-ai-drawer-company"><span className="directory-avatar">{initials(customer.company_name)}</span><div><p>CUSTOMER 360</p><h2>{customer.company_name}</h2><span>{customer.industry || 'Industry unavailable'} · {customer.location || 'Location unavailable'}</span></div></div>
          <button type="button" className="customer-ai-drawer-close" onClick={onClose} aria-label="Close customer panel"><Icon name="close" size={18} /></button>
        </header>

        <div className="customer-ai-drawer-body">
          <section className="customer-ai-facts" aria-label="Customer account facts">
            <div><span>Health score</span><strong className={scoreClass(customer.health_score)}>{customer.health_score ?? '—'}</strong></div>
            <div><span>Renewal</span><strong>{formatDate(customer.renewal_date)}</strong></div>
            <div><span>Open tickets</span><strong>{customer.open_ticket_count ?? 0}</strong></div>
            <div><span>Annual contract</span><strong>{inr(customer.annual_contract_value)}</strong></div>
          </section>

          <section className="customer-ai-brief-card" aria-labelledby="customer-ai-brief-heading">
            <div className="customer-ai-brief-head"><div><span><Icon name="sparkles" size={15} /></span><div><p>AI INTELLIGENCE</p><h3 id="customer-ai-brief-heading">AI Customer Brief</h3></div></div>{!isAnalysing ? <button type="button" className="customer-ai-run-button" onClick={onAnalyse}><Icon name="sparkles" size={14} />{insight ? 'Analyse again' : 'Generate AI Brief'}</button> : null}</div>
            {isAnalysing ? <CustomerAiProgress stage={analysisStage} /> : null}
            {!isAnalysing && analysisError ? <div className="customer-ai-error" role="alert"><strong>Analysis was not completed.</strong><span>{analysisError}</span><button type="button" onClick={onAnalyse}>Try again</button></div> : null}
            {!isAnalysing && !analysisError ? <CustomerAiBrief insight={insight} /> : null}
          </section>
        </div>
      </aside>
    </div>
  );
}

export default function CustomerDirectoryPage() {
  const { customers, total, scope, filters, isLoading, error, setFilters, refresh } = useCustomerDirectory();
  const [notice, setNotice] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [aiOverrides, setAiOverrides] = useState({});
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState(0);
  const [analysisError, setAnalysisError] = useState('');
  const industries = useMemo(() => [...new Set(customers.map((item) => item.industry).filter(Boolean))].sort(), [customers]);
  const set = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const showNotice = (message) => { setNotice(message); window.setTimeout(() => setNotice(''), 3200); };
  const insightFor = (customer) => aiOverrides[customer.id] || savedAiInsight(customer);
  const selectedInsight = selectedCustomer ? insightFor(selectedCustomer) : null;

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && selectedCustomer && !isAnalysing) setSelectedCustomer(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAnalysing, selectedCustomer]);

  const openCustomer = (customer) => {
    setSelectedCustomer(customer);
    setAnalysisError('');
    setAnalysisStage(0);
  };

  const runCustomerAnalysis = async (customer) => {
    if (!customer || isAnalysing) return;
    setAnalysisError('');
    setIsAnalysing(true);
    setAnalysisStage(0);
    const firstTimer = window.setTimeout(() => setAnalysisStage(1), 650);
    const secondTimer = window.setTimeout(() => setAnalysisStage(2), 1700);
    try {
      const result = await analyseCustomer(customer.id);
      setAiOverrides((current) => ({ ...current, [customer.id]: result }));
      setAnalysisStage(CUSTOMER_ANALYSIS_STAGES.length);
      void refresh();
    } catch (requestError) {
      setAnalysisError(requestError.message || 'Customer AI analysis could not be completed.');
    } finally {
      window.clearTimeout(firstTimer);
      window.clearTimeout(secondTimer);
      setIsAnalysing(false);
    }
  };

  const quickAnalyse = (customer) => {
    openCustomer(customer);
    void runCustomerAnalysis(customer);
  };

  return (
    <CustomerGraphAppShell activeNav="customers" screenCode="C-03" screenTitle="Customer 360 Directory">
      <section className="directory-page-head">
        <div><p className="directory-eyebrow">CUSTOMER DIRECTORY</p><h2>Customer Directory</h2><p>Search, review and prioritise your connected customer portfolio.</p></div>
        <div className="directory-head-actions"><button type="button" className="directory-refresh" onClick={refresh} disabled={isLoading}>{isLoading ? 'Loading…' : '↻ Refresh'}</button><button type="button" className="directory-add" onClick={() => showNotice('Customer creation API will be added after the Customer 360 detail API.')}>+ Add Customer</button></div>
      </section>
      <section className="directory-filters" aria-label="Customer directory filters">
        <label className="directory-search"><Icon name="search" size={15} /><input value={filters.search} onChange={(event) => set('search', event.target.value)} placeholder="Search by name, industry or location..." /></label>
        <select value={filters.industry} onChange={(event) => set('industry', event.target.value)}><option value="">Industry: All</option>{industries.map((industry) => <option key={industry} value={industry}>{industry}</option>)}</select>
        <select value={filters.healthBand} onChange={(event) => set('healthBand', event.target.value)}><option value="">Health Score: All</option><option value="critical">0–40 Critical</option><option value="attention">41–60 Attention</option><option value="healthy">61–100 Healthy</option></select>
        <select value={filters.riskLevel} onChange={(event) => set('riskLevel', event.target.value)}><option value="">Risk Level: All</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
        <select value={filters.renewalWithinDays} onChange={(event) => set('renewalWithinDays', event.target.value)}><option value="">Renewal: All</option><option value="30">Next 30 days</option><option value="60">Next 60 days</option><option value="90">Next 90 days</option></select>
      </section>
      {error ? <div className="directory-feedback error">{error}</div> : null}{notice ? <div className="directory-feedback success">{notice}</div> : null}
      <section className="directory-table-card">
        <div className="directory-caption"><div><h3>Customer accounts</h3><p>{isLoading ? 'Loading live customer data…' : `${customers.length} customers shown · ${scope === 'assigned_customers' ? 'Your assigned portfolio' : 'All customer portfolio'}`}</p></div><span>{total} total</span></div>
        <div className="directory-table-wrap"><table className="directory-table"><thead><tr><th>Customer Name</th><th>Industry</th><th>Account Owner</th><th>Health Score</th><th>Renewal Date</th><th>Risk</th><th>AI</th><th>Actions</th></tr></thead><tbody>{isLoading ? <tr><td colSpan="8" className="directory-empty">Loading CustomerGraph data…</td></tr> : customers.length ? customers.map((customer) => {
          const insight = insightFor(customer);
          return <tr key={customer.id}><td><button className="directory-customer-open" type="button" onClick={() => openCustomer(customer)}><span className="directory-avatar">{initials(customer.company_name)}</span><span><strong>{customer.company_name}</strong><small>{customer.location || 'Location unavailable'}</small></span></button></td><td>{customer.industry || '—'}</td><td>{customer.owner_name || 'Unassigned'}</td><td><span className={`directory-score ${scoreClass(customer.health_score)}`}>{customer.health_score ?? '—'}</span></td><td>{formatDate(customer.renewal_date)}</td><td><span className={`directory-risk ${riskClass(customer.risk_level)}`}>{riskLabel(customer.risk_level)}</span></td><td><AiStatus insight={insight} /></td><td><div className="directory-row-actions"><button type="button" className="directory-open-action" title={`Open ${customer.company_name} Customer 360`} onClick={() => openCustomer(customer)}><Icon name="eye" size={15} /></button><button type="button" className="directory-ai-action" title={`Generate AI brief for ${customer.company_name}`} onClick={() => quickAnalyse(customer)} disabled={isAnalysing && selectedCustomer?.id === customer.id}><Icon name="sparkles" size={15} /></button></div></td></tr>;
        }) : <tr><td colSpan="8" className="directory-empty">No customers match the selected filters.</td></tr>}</tbody></table></div>
        <footer className="directory-footer"><span>Showing {customers.length ? 1 : 0} to {customers.length} of {total} customers</span><div className="directory-pagination"><button type="button" disabled>‹</button><button type="button" className="active">1</button><button type="button" disabled>›</button></div></footer>
      </section>
      <CustomerDrawer customer={selectedCustomer} insight={selectedInsight} isAnalysing={isAnalysing} analysisStage={analysisStage} analysisError={analysisError} onClose={() => { if (!isAnalysing) setSelectedCustomer(null); }} onAnalyse={() => void runCustomerAnalysis(selectedCustomer)} />
    </CustomerGraphAppShell>
  );
}
