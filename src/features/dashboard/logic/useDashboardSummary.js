import { useCallback, useEffect, useState } from 'react';
import { fetchDashboardSummary } from './dashboardService.js';

const EMPTY_SUMMARY = {
  total_customers: 0,
  high_risk_customers: 0,
  upcoming_renewals_next_30_days: 0,
  open_critical_tickets: 0,
  delayed_invoices_count: 0,
  delayed_invoices_amount: 0,
  upsell_opportunities_count: 0,
  upsell_potential_revenue: 0,
  revenue_at_risk: 0,
  health_score_trend: [],
  top_high_risk_customers: [],
};

export function useDashboardSummary() {
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      setSummary({ ...EMPTY_SUMMARY, ...(await fetchDashboardSummary()) });
    } catch (requestError) {
      setError(requestError.message || 'Dashboard data could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  return { summary, isLoading, error, refresh };
}
