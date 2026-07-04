import { useCallback, useEffect, useState } from 'react';
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUserSummary,
  fetchAdminUsers,
  updateAdminUser,
} from './adminService.js';

const EMPTY_SUMMARY = {
  total_users: 0,
  active_users: 0,
  pending_users: 0,
  disabled_users: 0,
  admin_users: 0,
};

export function useAdminUsers() {
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [filters, setFilters] = useState({ search: '', role: '', status: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const loadUsers = useCallback(async (filtersToLoad = filters, showLoader = true) => {
    if (showLoader) setIsLoading(true);

    try {
      const [nextUsers, nextSummary] = await Promise.all([
        fetchAdminUsers(filtersToLoad),
        fetchAdminUserSummary(),
      ]);
      setUsers(nextUsers);
      setSummary(nextSummary || EMPTY_SUMMARY);
    } catch (error) {
      setMessage({ text: error.message || 'Unable to load user management data.', type: 'error' });
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadUsers(filters);
  }, [filters.search, filters.role, filters.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateFilter = (key, value) => {
    setMessage({ text: '', type: '' });
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const runAction = async (action, successMessage) => {
    setIsSaving(true);
    setMessage({ text: '', type: '' });
    try {
      const response = await action();
      await loadUsers(filters, false);
      setMessage({ text: response?.message || successMessage, type: 'success' });
      return { ok: true, response };
    } catch (error) {
      setMessage({ text: error.message || 'The action could not be completed.', type: 'error' });
      return { ok: false, error };
    } finally {
      setIsSaving(false);
    }
  };

  return {
    users,
    summary,
    filters,
    isLoading,
    isSaving,
    message,
    setMessage,
    updateFilter,
    refresh: () => loadUsers(filters),
    createUser: (payload) => runAction(() => createAdminUser(payload), 'User created successfully.'),
    updateUser: (id, payload) => runAction(() => updateAdminUser(id, payload), 'User updated successfully.'),
    deleteUser: (id) => runAction(() => deleteAdminUser(id), 'User deleted successfully.'),
  };
}
