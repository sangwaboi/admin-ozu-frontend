import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IssuesAPI } from '@/lib/api';
import type { ShipmentIssue } from '@/types/issue';

interface RiderStatusProps {
  shipmentId: string | number;  // Accept both types
  shipmentStatus?: string;  // Current shipment status
}

interface RiderResponse {
  riderId: string | number;  // Accept both string and number
  riderName: string;
  riderMobile: string;
  status: 'pending' | 'declined' | 'accepted';
  timestamp: string;
}

function RiderStatus({ shipmentId, shipmentStatus }: RiderStatusProps) {
  const navigate = useNavigate();
  const [responses, setResponses] = useState<RiderResponse[]>([]);
  const [acceptedRider, setAcceptedRider] = useState<RiderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [shipmentIssues, setShipmentIssues] = useState<ShipmentIssue[]>([]);

  useEffect(() => {
    // Reset state when shipment changes
    setResponses([]);
    setAcceptedRider(null);
    setLoading(true);
    setShipmentIssues([]);
    
    // Poll for rider responses
    const fetchResponses = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_BASE_URL}/shipments/${shipmentId}/responses`
        );
        
        if (!response.ok) {
          console.error('Failed to fetch responses:', response.status);
          setLoading(false);
          return;
        }
        
        const data = await response.json();
        
        // Ensure responses is an array
        const responsesArray = Array.isArray(data.responses) ? data.responses : [];
        
        setResponses(responsesArray);
        
        const accepted = responsesArray.find((r: any) => r.status === 'accepted');
        if (accepted) {
          setAcceptedRider(accepted);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch rider responses:', error);
        setLoading(false);
      }
    };

    // Fetch issues for this shipment
    const fetchIssues = async () => {
      try {
        const allIssues = await IssuesAPI.getPending();
        const shipmentRelatedIssues = allIssues.filter(
          (issue: ShipmentIssue) => issue.shipmentId === Number(shipmentId)
        );
        setShipmentIssues(shipmentRelatedIssues);
      } catch (error) {
        console.error('Failed to fetch issues:', error);
      }
    };

    // Initial fetch
    fetchResponses();
    fetchIssues();
    
    // Poll every 3 seconds
    const interval = setInterval(() => {
      if (!acceptedRider) {
        fetchResponses();
      }
      fetchIssues();
    }, 3000);

    return () => clearInterval(interval);
  }, [shipmentId]); // Only depend on shipmentId to avoid infinite loop

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">Rider Status</h3>
        <p className="text-sm text-gray-500 mt-1">
          {responses.length === 0 ? (
            <span className="text-amber-600"></span>
          ) : responses.length === 1 ? (
            <span>Request sent to <strong>{responses[0].riderName}</strong> (specific rider)</span>
          ) : (
            <span>Request sent to {responses.length} rider(s)</span>
          )}
        </p>
      </div>

      <div className="p-6">
        {acceptedRider ? (
          <>
            {/* Accepted Status */}
            <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-green-900 text-lg">Accepted!</h4>
                  <p className="text-sm text-green-700 mt-1">{acceptedRider.riderName}</p>
                  <p className="text-sm text-green-600">📞 {acceptedRider.riderMobile}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-green-200">
                <p className="text-xs text-green-700">
                  ✅ Rider has received full customer location and mobile number
                </p>
              </div>
            </div>

            {/* Show issue notification FIRST if there are any issues for this shipment */}
            {shipmentIssues.length > 0 ? (
              <div className="mt-4 bg-red-50 border-2 border-red-500 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-red-900 text-lg">⚠️ Delivery Issue Reported</h4>
                    <p className="text-sm text-red-700 mt-1">
                      {shipmentIssues[0].issueType}
                    </p>
                    {shipmentIssues[0].status === 'reported' && (
                      <p className="text-xs text-red-600 mt-1">
                        🟡 Waiting for your response
                      </p>
                    )}
                    {shipmentIssues[0].status === 'admin_responded' && (
                      <p className="text-xs text-blue-600 mt-1">
                        🔵 Waiting for rider action
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-red-200">
                  <button
                    onClick={() => navigate('/issues')}
                    className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Click here to view and respond to issue
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Pickup Status - Only show if NO issues */}
                {shipmentStatus === 'picked_up' && (
                  <div className="mt-4 bg-blue-50 border-2 border-blue-500 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-blue-900 text-lg">📦 Order Picked Up!</h4>
                        <p className="text-sm text-blue-700 mt-1">Rider has picked up the order from your location</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <p className="text-xs text-blue-700">
                        🚴 Rider is now on the way to deliver to customer
                      </p>
                    </div>
                  </div>
                )}

                {/* Waiting for Pickup - Only show if NO issues */}
                {shipmentStatus === 'assigned' && (
                  <div className="mt-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
                        <svg className="animate-spin w-6 h-6 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-yellow-900 text-lg">⏳ Waiting for Pickup</h4>
                        <p className="text-sm text-yellow-700 mt-1">Rider is on the way to pick up the order</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-yellow-200">
                      <p className="text-xs text-yellow-700">
                        📍 Rider will confirm once order is picked up
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <div>
            {/* Show different message based on whether riders were notified */}
            {responses.length === 0 ? (
              <div className="bg-amber-50 border border-amber-400 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm font-medium text-amber-900">
                    No rider available, please try after sometime
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2">
                    <svg className="animate-pulse w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                    <p className="text-sm text-yellow-800 font-medium">
                      Waiting for rider to accept...
                    </p>
                  </div>
                </div>

                {responses.length > 0 && (
              <div className="space-y-2">
                  {responses.map((response, index) => (
                    <div
                      key={`${response.riderId}-${index}`}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        response.status === 'declined'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            response.status === 'declined'
                              ? 'bg-red-500'
                              : 'bg-gray-400'
                          }`}
                        >
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {response.riderName}
                          </p>
                          <p className="text-xs text-gray-500">{response.riderMobile}</p>
                        </div>
                      </div>
                      <div>
                        {response.status === 'declined' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            ❌ Declined
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                            ⏳ Pending
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default RiderStatus;

