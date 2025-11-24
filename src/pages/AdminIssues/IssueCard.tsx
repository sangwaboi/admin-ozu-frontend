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

  const getStatusBadge = () => {
    switch (issue.status) {
      case 'reported':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">🟡 Waiting for Admin Response</span>;
      case 'admin_responded':
        return <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">🔵 Waiting for Rider</span>;
      case 'resolved':
        return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">✅ Resolved</span>;
      default:
        return null;
    }
  };

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
    <Card className={`mb-4 ${issue.status === 'resolved' ? 'bg-gray-50' : 'bg-white'}`}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              ⚠️ Issue: {issue.issueType}
            </h3>
            <p className="text-sm text-gray-600">Shipment #{issue.shipmentId}</p>
          </div>
          {getStatusBadge()}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm font-medium text-gray-700">🚴 Delivery Boy</p>
            <p className="text-sm text-gray-900">{issue.deliveryBoyName}</p>
            <p className="text-sm text-gray-600">📞 {issue.deliveryBoyMobile}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">👤 Customer</p>
            <p className="text-sm text-gray-900">{issue.customerName}</p>
            <p className="text-sm text-gray-600">📞 {issue.customerMobile}</p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700">📍 Customer Address</p>
          <p className="text-sm text-gray-600">{issue.customerAddress}</p>
        </div>

        <div className="mb-4">
          <p className="text-xs text-gray-500">
            📅 Reported: {formatDate(issue.reportedAt)}
          </p>
        </div>

        {/* Admin Response Section */}
        {issue.adminResponse && issue.adminMessage && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-blue-900 mb-2">
              {issue.adminResponse === 'redeliver' ? '🔄 Admin Response: Re-deliver' : '↩️ Admin Response: Return to Shop'}
            </p>
            <p className="text-sm text-blue-800 mb-2">
              💬 Message: "{issue.adminMessage}"
            </p>
            {issue.adminRespondedAt && (
              <p className="text-xs text-blue-600">
                📅 Sent: {formatDate(issue.adminRespondedAt)}
              </p>
            )}
          </div>
        )}

        {/* Rider Re-attempt Status */}
        {issue.riderReattemptStatus && (
          <div className={`border rounded-lg p-4 mb-4 ${
            issue.riderReattemptStatus === 'completed' 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <p className="text-sm font-medium mb-1">
              {issue.riderReattemptStatus === 'completed' 
                ? '✅ Rider Re-attempt: Completed' 
                : '❌ Rider Re-attempt: Failed'}
            </p>
            {issue.riderReattemptAt && (
              <p className="text-xs text-gray-600">
                📅 {formatDate(issue.riderReattemptAt)}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {issue.status === 'reported' && !showRespondForm && (
          <div className="flex gap-3">
            <button
              onClick={() => setShowRespondForm(true)}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
            >
              📝 Respond to Issue
            </button>
          </div>
        )}

        {/* Respond Form */}
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


