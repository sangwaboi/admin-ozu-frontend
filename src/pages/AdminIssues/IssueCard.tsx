import { useState } from 'react';
import { ShipmentIssue } from '@/types/issue';
import { Card, CardContent } from '@/components/ui/card';
import RespondToIssue from './RespondToIssue';

interface IssueCardProps {
  issue: ShipmentIssue;
  onUpdate: () => void;
}

export default function IssueCard({ issue, onUpdate }: IssueCardProps) {
  const [showRespondForm, setShowRespondForm] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <Card className="rounded-2xl border bg-white">
      <CardContent className="p-4 space-y-4">

        {/* HEADER */}
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-semibold flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full" />
              ⚠️ {issue.issueType}
            </p>
            <p className="text-xs text-gray-500">
              Shipment #{issue.shipmentId}
            </p>
          </div>
          <p className="text-xs text-gray-400">
            {formatDate(issue.reportedAt)}
          </p>
        </div>

        {/* INFO */}
        <div className="space-y-2 text-sm">
          <InfoRow label="Rider" value={`${issue.riderName} • ${issue.riderMobile}`} />
          <InfoRow label="Customer" value={issue.customerName} />
          <InfoRow label="Address" value={issue.customerAddress} />
        </div>

        {/* STATUS */}
        {issue.status === 'reported' && (
          <div className="bg-[#FFF5E6] rounded-lg px-3 py-2 text-xs text-[#A46A00]">
            Waiting for admin response
          </div>
        )}

        {issue.status === 'admin_responded' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
            Waiting for rider action
          </div>
        )}

        {issue.status === 'resolved' && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
            Issue resolved
          </div>
        )}

        {/* ADMIN RESPONSE (unchanged logic, cleaner UI) */}
        {issue.adminResponse && issue.adminMessage && (
          <div className="bg-gray-50 border rounded-lg p-3 text-xs text-gray-700">
            <p className="font-medium mb-1">
              Admin Response: {issue.adminResponse === 'redeliver' ? 'Re-deliver' : 'Return to Shop'}
            </p>
            <p className="italic">“{issue.adminMessage}”</p>
            {issue.adminRespondedAt && (
              <p className="text-[11px] text-gray-400 mt-1">
                {formatDate(issue.adminRespondedAt)}
              </p>
            )}
          </div>
        )}

        {/* RIDER REATTEMPT */}
        {issue.riderReattemptStatus && (
          <div
            className={`rounded-lg px-3 py-2 text-xs ${
              issue.riderReattemptStatus === 'completed'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {issue.riderReattemptStatus === 'completed'
              ? 'Rider re-attempt completed'
              : 'Rider re-attempt failed'}
          </div>
        )}

        {/* CTA */}
        {issue.status === 'reported' && !showRespondForm && (
          <button
            onClick={() => setShowRespondForm(true)}
            className="w-full h-[44px] rounded-lg bg-[#FFCA28] font-semibold text-sm"
          >
            Respond to this Issue
          </button>
        )}

        {/* RESPOND FORM */}
        {showRespondForm && issue.status === 'reported' && (
          <RespondToIssue
            issue={issue}
            onSuccess={() => {
              setShowRespondForm(false);
              onUpdate();
            }}
          />
        )}

      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 bg-gray-100 rounded-md px-3 py-2">
      <span className="text-xs text-gray-500 w-[70px]">{label}</span>
      <span className="text-xs text-gray-800">{value}</span>
    </div>
  );
}
