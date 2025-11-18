import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShipmentIssue } from '@/types/issue';
import { IssuesAPI } from '@/lib/api';
import IssueCard from './IssueCard';
import { Button } from '@/components/ui/button';

export default function AdminIssues() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState<ShipmentIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'reported' | 'admin_responded' | 'resolved'>('all');

  const fetchIssues = async () => {
    try {
      setError(null);
      // Try to get all issues (including resolved)
      const data = await IssuesAPI.getAll();
      console.log('Fetched issues:', data);
      
      // Ensure data is an array
      if (Array.isArray(data)) {
        setIssues(data);
      } else {
        console.error('Invalid data format:', data);
        setIssues([]);
      }
    } catch (err) {
      console.error('Failed to fetch issues:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch issues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
    
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchIssues, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const filteredIssues = issues.filter(issue => {
    if (filter === 'all') return true;
    return issue.status === filter;
  });

  const getFilterCount = (status: 'reported' | 'admin_responded' | 'resolved') => {
    return issues.filter(issue => issue.status === status).length;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/shipment')}
                variant="outline"
                className="flex items-center gap-2"
              >
                ← Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">⚠️ Delivery Issues</h1>
                <p className="text-sm text-gray-600">Manage and respond to delivery issues</p>
              </div>
            </div>
            <button
              onClick={fetchIssues}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            All Issues ({issues.length})
          </button>
          <button
            onClick={() => setFilter('reported')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              filter === 'reported'
                ? 'bg-yellow-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            🟡 Needs Response ({getFilterCount('reported')})
          </button>
          <button
            onClick={() => setFilter('admin_responded')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              filter === 'admin_responded'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            🔵 Waiting for Rider ({getFilterCount('admin_responded')})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              filter === 'resolved'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            ✅ Resolved ({getFilterCount('resolved')})
          </button>
        </div>

        {/* Content */}
        {loading && issues.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading issues...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 mb-4">{error}</p>
            <Button onClick={fetchIssues} variant="outline">
              Try Again
            </Button>
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {filter === 'all' ? 'No Issues Found' : `No ${filter.replace('_', ' ')} Issues`}
            </h3>
            <p className="text-gray-600">
              {filter === 'reported' && 'All reported issues have been responded to.'}
              {filter === 'admin_responded' && 'No issues waiting for rider action.'}
              {filter === 'resolved' && 'No resolved issues yet.'}
              {filter === 'all' && 'All deliveries are running smoothly!'}
            </p>
          </div>
        ) : (
          <div>
            {filteredIssues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} onUpdate={fetchIssues} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

