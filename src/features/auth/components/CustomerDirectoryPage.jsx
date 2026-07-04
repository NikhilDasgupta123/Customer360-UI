import { useMemo, useState } from 'react';
import CustomerGraphAppShell, { Icon } from '../../layout/components/CustomerGraphAppShell.jsx';
import { useCustomerDirectory } from '../logic/useCustomerDirectory.js';
import './CustomerDirectoryPage.css';

function initials(value) { return String(value || '?').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?'; }
function formatDate(value) { if (!value) return '—'; const date = new Date(`${value}T00:00:00`); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date); }
function scoreClass(score) { const value = Number(score ?? -1); if (value < 0) return 'neutral'; if (value <= 40) return 'critical'; if (value <= 60) return 'medium'; return 'healthy'; }
function riskClass(risk) { const value = String(risk || '').toLowerCase(); return ['critical', 'high', 'medium', 'low'].includes(value) ? value : 'unknown'; }
function riskLabel(risk) { const text = String(risk || 'Unknown'); return text[0]?.toUpperCase() + text.slice(1); }

export default function CustomerDirectoryPage() {
  const { customers, total, scope, filters, isLoading, error, setFilters, refresh } = useCustomerDirectory();
  const [notice, setNotice] = useState('');
  const industries = useMemo(() => [...new Set(customers.map((item) => item.industry).filter(Boolean))].sort(), [customers]);
  const set = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const showNotice = (message) => { setNotice(message); window.setTimeout(() => setNotice(''), 3200); };

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
        <div className="directory-table-wrap"><table className="directory-table"><thead><tr><th>Customer Name</th><th>Industry</th><th>Account Owner</th><th>Health Score</th><th>Renewal Date</th><th>Risk</th><th>Actions</th></tr></thead><tbody>{isLoading ? <tr><td colSpan="7" className="directory-empty">Loading CustomerGraph data…</td></tr> : customers.length ? customers.map((customer) => (<tr key={customer.id}><td><div className="directory-customer-cell"><span className="directory-avatar">{initials(customer.company_name)}</span><div><strong>{customer.company_name}</strong><small>{customer.location || 'Location unavailable'}</small></div></div></td><td>{customer.industry || '—'}</td><td>{customer.owner_name || 'Unassigned'}</td><td><span className={`directory-score ${scoreClass(customer.health_score)}`}>{customer.health_score ?? '—'}</span></td><td>{formatDate(customer.renewal_date)}</td><td><span className={`directory-risk ${riskClass(customer.risk_level)}`}>{riskLabel(customer.risk_level)}</span></td><td><div className="directory-row-actions"><button type="button" title="Customer 360 detail UI is next" onClick={() => showNotice(`Customer 360 detail API is next for ${customer.company_name}.`)}>◉</button><button type="button" title="View graph relationships later" onClick={() => showNotice(`Graph view will be connected to ${customer.company_name} after the detail API.`)}>+</button></div></td></tr>)) : <tr><td colSpan="7" className="directory-empty">No customers match the selected filters.</td></tr>}</tbody></table></div>
        <footer className="directory-footer"><span>Showing {customers.length ? 1 : 0} to {customers.length} of {total} customers</span><div className="directory-pagination"><button type="button" disabled>‹</button><button type="button" className="active">1</button><button type="button" disabled>›</button></div></footer>
      </section>
    </CustomerGraphAppShell>
  );
}
