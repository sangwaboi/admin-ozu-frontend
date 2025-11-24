import { useState, useEffect } from 'react';
import { ShipmentIssue } from '@/types/issue';
import { IssuesAPI } from '@/lib/api';

export function useIssues(autoRefresh = false, refreshInterval = 10000) {
  const [issues, setIssues] = useState<ShipmentIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await IssuesAPI.getPending();
      setIssues(data);
    } catch (err) {
      console.error('Failed to fetch issues:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch issues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();

    if (autoRefresh) {
      const interval = setInterval(fetchIssues, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const pendingCount = issues.filter(issue => issue.status === 'reported').length;
  const waitingForRiderCount = issues.filter(issue => issue.status === 'admin_responded').length;
  const resolvedCount = issues.filter(issue => issue.status === 'resolved').length;

  return {
    issues,
    loading,
    error,
    refetch: fetchIssues,
    counts: {
      total: issues.length,
      pending: pendingCount,
      waitingForRider: waitingForRiderCount,
      resolved: resolvedCount,
    },
  };
}


