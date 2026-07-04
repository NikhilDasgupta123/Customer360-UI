import { useEffect, useMemo, useState } from 'react';
import {
  approveAccessRequest,
  fetchPendingAccessRequests,
  rejectAccessRequest,
} from './adminService.js';
import { logoutCustomerGraph } from '../../auth/logic/authService.js';

export function useAccessRequests() {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState('');
  const [message, setMessage] = useState('');

  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === 'pending').length,
    [requests]
  );

  const loadRequests = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      const data = await fetchPendingAccessRequests();
      setRequests(data);
    } catch (error) {
      setMessage(error.message || 'Unable to load pending requests');
    } finally {
      setIsLoading(false);
    }
  };

  const approveRequest = async (requestId) => {
    setActionId(requestId);
    setMessage('');

    try {
      await approveAccessRequest(requestId);
      setRequests((current) => current.filter((request) => request.id !== requestId));
      setMessage('Access request approved successfully.');
    } catch (error) {
      setMessage(error.message || 'Approve failed');
    } finally {
      setActionId('');
    }
  };

  const rejectRequest = async (requestId) => {
    setActionId(requestId);
    setMessage('');

    try {
      await rejectAccessRequest(requestId);
      setRequests((current) => current.filter((request) => request.id !== requestId));
      setMessage('Access request rejected.');
    } catch (error) {
      setMessage(error.message || 'Reject failed');
    } finally {
      setActionId('');
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  return {
    requests,
    isLoading,
    actionId,
    message,
    pendingCount,
    loadRequests,
    approveRequest,
    rejectRequest,
    logoutCustomerGraph,
  };
}
