import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ShipmentAPI, IssuesAPI } from '../../lib/api';
import type { AdminAddress } from '../../types/address';
import AddressSelector from '../../components/AddressSelector';
import ShipmentForm from './ShipmentForm';
import LiveTrackingMap from './LiveTrackingMap';
import RiderStatus from './RiderStatus';
import { LogOut } from 'lucide-react';
import { useIssues } from '../../hooks/useIssues';

export interface AdminLocation {
  latitude: number;
  longitude: number;
  address?: string;
  houseAddress?: string;
  landmark?: string;
}

export interface CustomerDetails {
  name: string;
  mobile: string;
  locationLink: string;
  address: string;
  landmark: string;
  price: number;
}

export interface ShipmentRequest {
  adminLocation: AdminLocation;
  adminMobile: string;
  customer: CustomerDetails;
}

function AdminShipment() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [selectedAddress, setSelectedAddress] = useState<AdminAddress | null>(null);
  const [adminMobile, setAdminMobile] = useState<string>('');
  const [adminName, setAdminName] = useState<string>('');
  const [allShipments, setAllShipments] = useState<any[]>([]);
  const [completedShipments, setCompletedShipments] = useState<any[]>([]);
  const [activeShipmentIndex, setActiveShipmentIndex] = useState<number>(0);
  const [activeShipment, setActiveShipment] = useState<any>(null);
  const [currentTab, setCurrentTab] = useState<'active' | 'completed'>('active');
  const [notifications, setNotifications] = useState<string[]>([]);
  const [shipmentIssues, setShipmentIssues] = useState<Record<string | number, number>>({});
  
  // Use refs to track state without causing re-renders in useEffect
  const allShipmentsRef = useRef<any[]>([]);
  const activeShipmentRef = useRef<any>(null);
  
  // Fetch issue counts for badge
  const { counts: issueCounts } = useIssues(true, 15000);

  // Load admin profile from Supabase
  const loadAdminProfile = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch basic profile from Supabase
      const { data, error } = await supabase
        .from('admin_profiles')
        .select('name, mobile')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading profile:', error);
      }

      if (data) {
        setAdminName(data.name || '');
        setAdminMobile(data.mobile || '');
      } else {
        // Fallback to user metadata
        setAdminName(user.user_metadata?.name || '');
        setAdminMobile(user.user_metadata?.mobile || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadAdminProfile();
    }
  }, [user, loadAdminProfile]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Show notification - memoize to avoid recreation (defined before fetchActiveShipments)
  const showNotification = useCallback((message: string) => {
    setNotifications(prev => [...prev, message]);
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(m => m !== message));
    }, 5000);
  }, []);

  // Fetch issues for shipments
  const fetchShipmentIssues = useCallback(async (shipments: any[]) => {
    const issuesMap: Record<string | number, number> = {};
    
    try {
      // Fetch issues for each shipment in parallel
      await Promise.all(
        shipments.map(async (shipment) => {
          try {
            const data = await IssuesAPI.getByShipmentId(shipment.id);
            // Count only unresolved issues (reported or admin_responded)
            const unresolvedCount = (data.issues || []).filter(
              (issue: any) => issue.status !== 'resolved'
            ).length;
            if (unresolvedCount > 0) {
              issuesMap[shipment.id] = unresolvedCount;
            }
          } catch (error) {
            // Silently fail for individual shipments
            console.error(`Error fetching issues for shipment ${shipment.id}:`, error);
          }
        })
      );
      
      setShipmentIssues(issuesMap);
    } catch (error) {
      console.error('Error fetching shipment issues:', error);
    }
  }, []);

  // Fetch active shipments - use useCallback to memoize
  const fetchActiveShipments = useCallback(async () => {
    try {
      const data = await ShipmentAPI.getActive();
      
      if (data && Array.isArray(data)) {
        // Use refs to access current state without causing dependency issues
        const previousShipments = allShipmentsRef.current;
        const previousIds = previousShipments.map(s => s.id);
        const newIds = data.map((s: any) => s.id);
        
        // Find shipments that were removed (moved to completed)
        const removedIds = previousIds.filter(id => !newIds.includes(id));
        if (removedIds.length > 0 && previousShipments.length > 0) {
          removedIds.forEach(id => {
            const shipment = previousShipments.find(s => s.id === id);
            if (shipment) {
              showNotification(`📦 Shipment #${id} has been delivered! ✅`);
            }
          });
        }
        
        // Check for status changes
        data.forEach((newShipment: any) => {
          const oldShipment = previousShipments.find(s => s.id === newShipment.id);
          if (oldShipment) {
            // Accepted notification
            if (oldShipment.status === 'pending' && newShipment.status === 'assigned') {
              showNotification(`✅ Shipment #${newShipment.id} has been accepted!`);
            }
            // Picked up notification
            if (oldShipment.status === 'assigned' && newShipment.status === 'picked_up') {
              showNotification(`📦 Shipment #${newShipment.id} has been picked up!`);
            }
          }
        });
        
        // Update refs
        allShipmentsRef.current = data;
        
        // Update state
        setAllShipments(data);
        
        // Fetch issues for each shipment
        fetchShipmentIssues(data);
        
        // Update active shipment if it still exists
        const currentActiveShipment = activeShipmentRef.current;
        if (currentActiveShipment) {
          const updated = data.find((s: any) => s.id === currentActiveShipment.id);
          if (updated) {
            activeShipmentRef.current = updated;
            setActiveShipment(updated);
          } else if (data.length > 0) {
            // Active shipment was removed, select first available
            activeShipmentRef.current = data[0];
            setActiveShipment(data[0]);
            setActiveShipmentIndex(0);
          } else {
            activeShipmentRef.current = null;
            setActiveShipment(null);
          }
        } else if (data.length > 0 && !currentActiveShipment) {
          activeShipmentRef.current = data[0];
          setActiveShipment(data[0]);
          setActiveShipmentIndex(0);
        }
      }
    } catch (error) {
      console.error('Error fetching active shipments:', error);
      // If it's an auth error, user will be redirected by ProtectedRoute
      if (error instanceof Error && error.message.includes('authentication')) {
        navigate('/login');
      }
    }
  }, [navigate, showNotification]); // Include showNotification in dependencies

  // Fetch completed shipments
  const fetchCompletedShipments = async () => {
    try {
      const data = await ShipmentAPI.getCompleted();
      
      if (data && Array.isArray(data)) {
        setCompletedShipments(data);
      }
    } catch (error) {
      console.error('Error fetching completed shipments:', error);
      // If it's an auth error, user will be redirected by ProtectedRoute
      if (error instanceof Error && error.message.includes('authentication')) {
        navigate('/login');
      }
    }
  };

  // Sync refs with state
  useEffect(() => {
    allShipmentsRef.current = allShipments;
  }, [allShipments]);

  useEffect(() => {
    activeShipmentRef.current = activeShipment;
  }, [activeShipment]);

  // Initial load of active shipments
  useEffect(() => {
    const timer = setTimeout(fetchActiveShipments, 500);
    return () => clearTimeout(timer);
  }, [fetchActiveShipments]);

  // Polling: Fetch active shipments every 5 seconds
  useEffect(() => {
    if (!user) return; // Only poll when authenticated

    const interval = setInterval(() => {
      fetchActiveShipments();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [user, fetchActiveShipments]); // Depend on user and memoized fetchActiveShipments

  const handleShipmentCreate = async (customerDetails: CustomerDetails, specificRiderId?: string) => {
    if (!selectedAddress) {
      alert('Please select an address first');
      return;
    }

    if (!adminMobile) {
      alert('Please set your mobile number in Profile Settings');
      return;
    }

    const adminLocation: AdminLocation = {
      latitude: selectedAddress.location_lat,
      longitude: selectedAddress.location_lng,
      address: selectedAddress.location_address,
      houseAddress: selectedAddress.location_house_address || undefined,
      landmark: selectedAddress.location_landmark || undefined,
    };

    const shipmentRequest: ShipmentRequest & { specificRiderId?: string } = {
      adminLocation,
      adminMobile,
      customer: customerDetails,
    };

    // Add specific rider ID if provided
    if (specificRiderId) {
      shipmentRequest.specificRiderId = specificRiderId;
      console.log('📤 Sending to SPECIFIC rider:', specificRiderId);
    } else {
      console.log('📤 Sending to ALL available riders (broadcast)');
    }

    console.log('📤 Request payload:', JSON.stringify(shipmentRequest, null, 2));

    try {
      // Call API to create shipment and notify rider(s)
      const data = await ShipmentAPI.create(shipmentRequest);
      console.log('✅ Shipment created:', data);
      
      // Add new shipment to the list
      const newShipments = [...allShipments, data];
      setAllShipments(newShipments);
      setActiveShipmentIndex(newShipments.length - 1);
      setActiveShipment(data);
      
      // No popup messages - silently add to list
    } catch (error: any) {
      console.error('Failed to create shipment:', error);
      
      // Handle authentication errors
      if (error.message?.includes('authentication')) {
        alert('❌ Please login to create shipments.');
        navigate('/login');
        return;
      }
      
      // Handle profile errors
      if (error.message?.includes('profile')) {
        alert('❌ Please complete your profile first.');
        navigate('/profile');
        return;
      }
      
      alert(`❌ ${error.message || 'Network error. Please check your connection and try again.'}`);
    }
  };

  const handleShipmentSwitch = (index: number) => {
    setActiveShipmentIndex(index);
    setActiveShipment(allShipments[index]);
  };

  const handleTabSwitch = (tab: 'active' | 'completed') => {
    setCurrentTab(tab);
    if (tab === 'completed') {
      fetchCompletedShipments();
    }
  };


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification, index) => (
          <div
            key={index}
            className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">{notification}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Shipment Portal</h1>
              <p className="text-sm text-gray-500 mt-1">
                {adminName ? `Welcome, ${adminName}` : 'Create and manage delivery requests'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/profile')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile
              </button>
              <button
                onClick={() => navigate('/issues')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 font-semibold relative transition-all ${
                  issueCounts.pending > 0
                    ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse'
                    : 'bg-yellow-600 text-white hover:bg-yellow-700'
                }`}
                title={issueCounts.pending > 0 ? `${issueCounts.pending} issue(s) need attention` : 'View issues'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {issueCounts.pending > 0 ? '⚠️ Issues' : 'Issues'}
                {issueCounts.pending > 0 && (
                  <span className="absolute -top-2 -right-2 bg-white text-red-600 text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center border-2 border-red-600 shadow-lg">
                    {issueCounts.pending}
                  </span>
                )}
              </button>
              <button
                onClick={() => navigate('/riders')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 font-semibold"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Riders
              </button>
              <button
                onClick={() => navigate('/map')}
                disabled={!adminMobile || !selectedAddress}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                MAP
              </button>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 flex items-center gap-2 font-medium"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </button>
            </div>
          </div>

          {/* Admin Location & Mobile */}
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
            {/* Address Selector */}
            <AddressSelector
              selectedAddress={selectedAddress}
              onAddressChange={setSelectedAddress}
            />

            {/* Admin Mobile Number */}
            <div className="pt-3 border-t border-blue-200">
              <label className="block text-sm font-medium text-blue-900 mb-2">
                Your Mobile Number (Shared with rider) <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={adminMobile}
                onChange={(e) => setAdminMobile(e.target.value)}
                placeholder="+91 XXXXX XXXXX"
                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">
                Update in <button onClick={() => navigate('/profile')} className="text-blue-600 hover:underline">Profile Settings</button>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Shipment Form */}
          <div>
            <ShipmentForm
              onSubmit={handleShipmentCreate}
              disabled={!selectedAddress || !adminMobile}
            />
          </div>

          {/* Right: Tracking & Status */}
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              {/* Tab Headers */}
              <div className="flex border-b">
                <button
                  onClick={() => handleTabSwitch('active')}
                  className={`flex-1 px-6 py-3 font-semibold text-sm transition-all ${
                    currentTab === 'active'
                      ? 'bg-blue-600 text-white border-b-2 border-blue-700'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Active Shipments
                    {allShipments.length > 0 && (
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                        currentTab === 'active' ? 'bg-blue-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {allShipments.length}
                      </span>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => handleTabSwitch('completed')}
                  className={`flex-1 px-6 py-3 font-semibold text-sm transition-all ${
                    currentTab === 'completed'
                      ? 'bg-green-600 text-white border-b-2 border-green-700'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Completed
                    {completedShipments.length > 0 && (
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                        currentTab === 'completed' ? 'bg-green-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {completedShipments.length}
                      </span>
                    )}
                  </div>
                </button>
              </div>

              {/* Tab Content */}
              {currentTab === 'active' ? (
                allShipments.length > 0 ? (
                  <div className="p-2">
                    <div className="flex flex-wrap gap-2">
                      {allShipments.map((shipment, index) => (
                        <button
                          key={shipment.id}
                          onClick={() => handleShipmentSwitch(index)}
                          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all relative ${
                            activeShipmentIndex === index
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span>Shipment #{shipment.id}</span>
                              {shipment.status === 'pending' && (
                                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" title="Waiting for rider"></span>
                              )}
                              {shipment.status === 'assigned' && (
                                <span className="w-2 h-2 bg-green-400 rounded-full" title="Accepted - Waiting for pickup"></span>
                              )}
                              {shipment.status === 'picked_up' && (
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" title="Picked up - On the way"></span>
                              )}
                              {shipmentIssues[shipment.id] && (
                                <span className="flex items-center gap-1 text-xs" title={`${shipmentIssues[shipment.id]} issue(s) reported`}>
                                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                  <span className={activeShipmentIndex === index ? 'text-yellow-200' : 'text-red-600'}>⚠️</span>
                                </span>
                              )}
                            </div>
                            {shipment.status === 'picked_up' && (
                              <span className={`text-xs font-medium ${activeShipmentIndex === index ? 'text-blue-100' : 'text-blue-600'}`}>🚴 On the way</span>
                            )}
                            {shipmentIssues[shipment.id] && (
                              <span className={`text-xs font-medium ${activeShipmentIndex === index ? 'text-yellow-100' : 'text-red-600'}`}>
                                ⚠️ Issue reported
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="text-sm text-gray-500">No active shipments</p>
                  </div>
                )
              ) : (
                <div className="p-4">
                  {completedShipments.length > 0 ? (
                    <div className="space-y-3">
                      {completedShipments.map((shipment) => (
                        <div key={shipment.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-gray-900">Shipment #{shipment.id}</h4>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                ✅ Delivered
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-green-700">
                                ₹{shipment.price || 0}
                              </div>
                            </div>
                          </div>

                          {/* Customer Details */}
                          <div className="bg-white rounded-lg p-3 mb-3">
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Customer</p>
                            <div className="space-y-1 text-sm text-gray-700">
                              <p><strong>Name:</strong> {shipment.customerName || 'N/A'}</p>
                              <p><strong>Mobile:</strong> {shipment.customerMobile || 'N/A'}</p>
                              <p><strong>Landmark:</strong> {shipment.landmark || 'N/A'}</p>
                            </div>
                          </div>

                          {/* Rider Details */}
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                            <p className="text-xs font-semibold text-blue-700 uppercase mb-2">🏍️ Delivered By</p>
                            <div className="space-y-1 text-sm text-gray-700">
                              <p><strong>Name:</strong> {shipment.assignedRiderName || 'N/A'}</p>
                              <p><strong>Mobile:</strong> {shipment.assignedRiderMobile || 'N/A'}</p>
                            </div>
                          </div>

                          {/* Timestamp */}
                          {shipment.deliveredAt && (
                            <p className="text-xs text-gray-500 mt-2">
                              🕐 Delivered: {new Date(shipment.deliveredAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-gray-500">No completed shipments yet</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Active Shipment Details - Only show on Active tab */}
            {currentTab === 'active' && activeShipment && (
              <>
                <RiderStatus 
                  shipmentId={activeShipment.id}
                  shipmentStatus={activeShipment.status}
                />
                <LiveTrackingMap
                  adminLocation={selectedAddress ? {
                    latitude: selectedAddress.location_lat,
                    longitude: selectedAddress.location_lng,
                    address: selectedAddress.location_address,
                    houseAddress: selectedAddress.location_house_address || undefined,
                    landmark: selectedAddress.location_landmark || undefined,
                  } : null}
                  shipment={activeShipment}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminShipment;

