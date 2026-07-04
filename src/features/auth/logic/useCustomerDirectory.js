import { useCallback, useEffect, useState } from 'react';
import { fetchCustomers } from './customerService.js';

function initialFilters() {
  const params = new URLSearchParams(window.location.search);
  return {
    search: params.get('search') || '',
    industry: params.get('industry') || '',
    healthBand: params.get('health_band') || '',
    riskLevel: params.get('risk_level') || '',
    renewalWithinDays: params.get('renewal_within_days') || '',
  };
}

export function useCustomerDirectory() {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [scope, setScope] = useState('all_customers');
  const [filters, setFilters] = useState(initialFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const result = await fetchCustomers(filters);
      setCustomers(result.customers);
      setTotal(result.total);
      setScope(result.scope);
    } catch (requestError) {
      setError(requestError.message || 'Customer directory could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  return {
    customers,
    total,
    scope,
    filters,
    isLoading,
    error,
    setFilters,
    refresh: loadCustomers,
  };
}
