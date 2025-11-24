import { useState } from 'react';
import { ShipmentIssue } from '@/types/issue';
import { IssuesAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RespondToIssueProps {
  issue: ShipmentIssue;
  onSuccess: () => void;
}

export default function RespondToIssue({ issue, onSuccess }: RespondToIssueProps) {
  const [action, setAction] = useState<'redeliver' | 'return_to_shop'>('redeliver');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      setError('Please enter instructions for the rider');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await IssuesAPI.respond(issue.id, {
        action,
        message: message.trim(),
      });
      
      alert('Response sent to rider successfully!');
      setMessage('');
      onSuccess();
    } catch (err) {
      console.error('Failed to send response:', err);
      setError(err instanceof Error ? err.message : 'Failed to send response');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-4 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="text-lg">📝 Respond to Issue</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Action Required
            </label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as 'redeliver' | 'return_to_shop')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="redeliver">🔄 Re-deliver to Customer</option>
              <option value="return_to_shop">↩️ Return to Shop</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instructions for Rider *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter detailed instructions for the rider..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Example: "Please try again after 2 PM. Customer will be available then."
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? 'Sending...' : '📤 Send Instructions'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}


