import { useState } from 'react';
import { ShipmentIssue } from '@/types/issue';
import { IssuesAPI } from '@/lib/api';

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
    <form
      onSubmit={handleSubmit}
      className="mt-3 bg-[#F3F8FF] rounded-xl p-4 space-y-3 border"
    >
      {/* ACTION */}
      <select
        value={action}
        onChange={(e) =>
          setAction(e.target.value as 'redeliver' | 'return_to_shop')
        }
        className="w-full h-[44px] rounded-lg border px-3 text-sm focus:outline-none"
      >
        <option value="redeliver">🔄 Re-deliver to Customer</option>
        <option value="return_to_shop">↩️ Return to Shop</option>
      </select>

      {/* MESSAGE */}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Instructions for rider"
        rows={3}
        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
        required
      />

      {/* ERROR */}
      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* SUBMIT */}
      <button
        type="submit"
        disabled={loading}
        className="w-full h-[42px] rounded-lg bg-[#2563EB] text-white font-semibold disabled:opacity-60"
      >
        {loading ? 'Sending…' : 'Send Instructions'}
      </button>
    </form>
  );
}
