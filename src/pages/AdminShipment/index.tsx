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


import { Home, Map, AlertTriangle, Bike } from 'lucide-react';

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
  const { user} = useAuth();
  const [selectedAddress, setSelectedAddress] = useState<AdminAddress | null>(null);
  const [adminMobile, setAdminMobile] = useState<string>('');
  const [, setAdminName] = useState<string>('');
  const [allShipments, setAllShipments] = useState<any[]>([]);
  const [completedShipments, setCompletedShipments] = useState<any[]>([]);
  const [activeShipmentIndex, setActiveShipmentIndex] = useState<number>(0);
  const [activeShipment, setActiveShipment] = useState<any>(null);
  const [currentTab, setCurrentTab] = useState<'active' | 'completed'>('active');
  const [notifications, setNotifications] = useState<string[]>([]);
  const [shipmentIssues, setShipmentIssues] = useState<Record<string | number, number>>({});
  const [showBooking, setShowBooking] = useState(false);
  // Use refs to track state without causing re-renders in useEffect
  const allShipmentsRef = useRef<any[]>([]);
  const activeShipmentRef = useRef<any>(null);
  
  
  // Fetch issue counts for badge
  

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
    <div >
   <div className="min-h-screen w-full bg-white pb-24 font-[DM Sans] overflow-x-hidden">

    {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification, index) => (
          <div
            key={index}
            className="bg-gradient-to-r from-violet-600 to-purple-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slide-in"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">{notification}</span>
          </div>
        ))}
      </div>

    {/* ===== HEADER (FIGMA EXACT) ===== */}
<header className="px-4 pt-4 flex items-center justify-between">
  
{/* OZU LOGO */}
<div className="w-[109px] h-[46px] flex items-center">
  <img
    src="/ozu-logo.png"
    alt="OZU"
    className="h-[32px] w-auto object-contain"
  />
</div>


  {/* PROFILE AVATAR */}
  <button
    onClick={() => navigate('/profile')}
    className="w-[46px] h-[46px] rounded-full border border-black overflow-hidden"
  >
    <img
      src="/ava2.png"
      alt="Profile"
      className="w-full h-full object-cover"
    />
  </button>

</header>



      {/* Header */}
    <div className="bg-white text-black">
        <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 lg:px-8">
        
{/* ===== PICKUP / DROP / BOOK ===== */}
<div className="px-4 mt-4 space-y-4 relative">

  {/* PICKUP */}
  <AddressSelector
    selectedAddress={selectedAddress}
    onAddressChange={setSelectedAddress}
  />

  {/* DROP LOCATION (same size & style as pickup) */}
  <button
    onClick={() => setShowBooking(true)}
    className="
      w-full
      h-[64px]
      px-4
      bg-[#F5F5F5]
      border
      border-[#9CA3AF]
      rounded-[16px]
      flex
      items-center
      justify-between
    "
  >
    <div className="flex items-center gap-3 min-w-0">
      {/* icon placeholder to align with pickup */}
      <span className="w-5 h-5 rounded-full bg-[#DC2626]" />

      <div className="min-w-0 text-left">
        <p className="text-sm text-[#6B7280] font-medium">
          Enter Drop Location
        </p>
        <p className="text-[15px] font-semibold text-black truncate">
          Drop location & details
        </p>
      </div>
    </div>
  </button>

  {/* BOOK NOW */}
  <button
    onClick={() => setShowBooking(true)}
    className="
      w-full
      h-[56px]
      rounded-[28px]
      bg-[#FFCA28]
      text-[18px]
      font-semibold
      text-black
    "
  >
    Book Now
  </button>

</div>


         
</div>
       </div>
        {/* ===== QUICK ACTIONS ===== */}
{/* ===== QUICK ACTIONS ===== */}
<div className="px-4 mt-6 grid grid-cols-3 gap-3 text-center">
  
  {/* Card 1 */}
  <button
    onClick={() => navigate('/profile')}
    className="flex flex-col items-center"
  >
    <div className="w-[126.57px] h-[97px] bg-[#F5F5F5] border border-[#C8C8C8] rounded-[10px] flex items-center justify-center">
      <img
        src="/undraw_delivery-address_409g.svg"
        className="h-[44px] w-auto"
        alt=""
      />
    </div>

    <p className="mt-2 text-[12px] font-semibold leading-[125%] tracking-[-0.01em] text-[#242424] text-center">
      Add / Update Pickup Point
    </p>
  </button>

  {/* Card 2 */}
  <button
    onClick={() => navigate('/profile')}
    className="flex flex-col items-center"
  >
    <div className="w-[126.57px] h-[97px] bg-[#F5F5F5] border border-[#C8C8C8] rounded-[10px] flex items-center justify-center">
      <img
        src="/undraw_mobile-app_qxev.svg"
        className="h-[44px] w-auto"
        alt=""
      />
    </div>

    <p className="mt-2 text-[12px] font-semibold leading-[125%] tracking-[-0.01em] text-[#242424] text-center">
      Update Contact Number
    </p>
  </button>

  {/* Card 3 */}
  <button
    onClick={() => navigate('/issues')}
    className="flex flex-col items-center"
  >
    <div className="w-[126.57px] h-[97px] bg-[#F5F5F5] border border-[#C8C8C8] rounded-[10px] flex items-center justify-center">
      <img
        src="/undraw_questions_g2px.svg"
        className="h-[44px] w-auto"
        alt=""
      />
    </div>

    <p className="mt-2 text-[12px] font-semibold leading-[125%] tracking-[-0.01em] text-[#242424] text-center">
      Check Delivery Issues
    </p>
  </button>

</div>


      {/* Main Content */}
      <div className="max-w-screen-xl mx-auto px-2 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* ===== BOOKING MODAL ===== */}
{showBooking && (
  <div className="fixed inset-0 z-[60] flex items-end bg-black/40">
    {/* Modal container */}
    <div
      className="
        w-full
        max-h-[calc(100vh-76px)]
        bg-white
        rounded-t-2xl
        overflow-y-auto
        overscroll-contain
        pb-6
      "
    >
      <ShipmentForm
        onSubmit={handleShipmentCreate}
        disabled={!selectedAddress || !adminMobile}
        onClose={() => setShowBooking(false)}
      />
    </div>
  </div>
)}


          {/* Right: Tracking & Status */}
         {/* Right: Tracking & Status */}
<div className="space-y-6 lg:col-span-2 w-full">
  

            {/* Shipments Card */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Tab Headers */}
              <div className="flex border-b border-gray-100">
                <button
                  onClick={() => handleTabSwitch('active')}
                  className={`flex-1 px-6 py-3.5 font-medium text-sm transition-all ${
                    currentTab === 'active'
                      ? 'text-violet-600 border-b-2 border-violet-600 bg-white'
                      : 'text-gray-500 hover:text-gray-700 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Active Shipments
                    {allShipments.length > 0 && (
                      <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        currentTab === 'active' ? 'bg-violet-100 text-violet-600' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {allShipments.length}
                      </span>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => handleTabSwitch('completed')}
                  className={`flex-1 px-6 py-3.5 font-medium text-sm transition-all ${
                    currentTab === 'completed'
                      ? 'text-violet-600 border-b-2 border-violet-600 bg-white'
                      : 'text-gray-500 hover:text-gray-700 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Completed
                    {completedShipments.length > 0 && (
                      <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        currentTab === 'completed' ? 'bg-violet-100 text-violet-600' : 'bg-gray-200 text-gray-600'
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
                  <div className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {allShipments.map((shipment, index) => (
                        <button
                          key={shipment.id}
                          onClick={() => handleShipmentSwitch(index)}
                          className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all relative ${
                            activeShipmentIndex === index
                              ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span>Shipment #{shipment.id}</span>
                              {shipment.status === 'pending' && (
                                <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" title="Waiting for rider"></span>
                              )}
                              {shipment.status === 'assigned' && (
                                <span className="w-2 h-2 bg-emerald-400 rounded-full" title="Accepted - Waiting for pickup"></span>
                              )}
                              {shipment.status === 'picked_up' && (
                                <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" title="Picked up - On the way"></span>
                              )}
                              {shipmentIssues[shipment.id] && (
                                <span className="flex items-center gap-1 text-xs" title={`${shipmentIssues[shipment.id]} issue(s) reported`}>
                                  <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
                                </span>
                              )}
                            </div>
                            {shipment.status === 'picked_up' && (
                              <span className={`text-xs ${activeShipmentIndex === index ? 'text-violet-100' : 'text-violet-500'}`}>On the way</span>
                            )}
                            {shipmentIssues[shipment.id] && (
                              <span className={`text-xs ${activeShipmentIndex === index ? 'text-amber-100' : 'text-red-500'}`}>
                                Issue reported
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <svg className="w-12 h-12 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="text-sm text-gray-400">No active shipments</p>
                  </div>
                )
              ) : (
                <div className="p-4">
                  {completedShipments.length > 0 ? (
                    <div className="space-y-3">
                      {completedShipments.map((shipment) => (
                        <div key={shipment.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900">Shipment #{shipment.id}</h4>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-600">
                                Delivered
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-semibold text-gray-700">
                                ₹{shipment.price || 0}
                              </div>
                            </div>
                          </div>

                          {/* Customer Details */}
                          <div className="bg-white rounded-lg p-3 mb-3 border border-gray-100">
                            <p className="text-xs font-medium text-gray-400 uppercase mb-2">Customer</p>
                            <div className="space-y-1 text-sm text-gray-600">
                              <p><span className="text-gray-500">Name:</span> {shipment.customerName || 'N/A'}</p>
                              <p><span className="text-gray-500">Mobile:</span> {shipment.customerMobile || 'N/A'}</p>
                              <p><span className="text-gray-500">Landmark:</span> {shipment.landmark || 'N/A'}</p>
                            </div>
                          </div>

                          {/* Rider Details */}
                          <div className="bg-white rounded-lg p-3 mb-2 border border-gray-100">
                            <p className="text-xs font-medium text-gray-400 uppercase mb-2">Delivered By</p>
                            <div className="space-y-1 text-sm text-gray-600">
                              <p><span className="text-gray-500">Name:</span> {shipment.assignedRiderName || 'N/A'}</p>
                              <p><span className="text-gray-500">Mobile:</span> {shipment.assignedRiderMobile || 'N/A'}</p>
                            </div>
                          </div>

                          {/* Timestamp */}
                          {shipment.deliveredAt && (
                            <p className="text-xs text-gray-400 mt-2">
                              Delivered: {new Date(shipment.deliveredAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <svg className="w-12 h-12 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-gray-400">No completed shipments yet</p>
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


            
        {/* ===== ILLUSTRATION ===== */}
  <div className="relative w-full flex justify-center">
  <div className="w-[339px] h-[18px] flex items-center justify-center">
    <p className="text-[12px] font-normal leading-[18px] text-[#9CA3AF] text-center">
      Made with ❤️ in India
    </p>
  </div>
</div>


      
    
     {/* ===== BOTTOM NAV (FIGMA EXACT) ===== */}
<nav className="fixed bottom-0 left-0 right-0 z-50 h-[76px] bg-white rounded-t-2xl shadow-[0_-1px_12px_rgba(0,0,0,0.11)]">
  <div className="max-w-[439px] mx-auto h-full flex justify-around items-center">
    
    {/* HOME */}
    <button
      onClick={() => navigate('/shipment')}
      className="flex flex-col items-center justify-center text-[11px] font-medium text-[#2B2B2B]"
    >
      <Home size={22} strokeWidth={1.8} />
      <span className="mt-1">HOME</span>
    </button>

    {/* ISSUES (ACTIVE SAMPLE) */}
    <button
      onClick={() => navigate('/issues')}
      className="flex flex-col items-center justify-center text-[11px] font-medium text-[#2B2B2B]"
    >
      <AlertTriangle size={22} strokeWidth={1.8} />
      <span className="mt-1">ISSUES</span>
    </button>

    {/* MAP */}
    <button
      onClick={() => navigate('/map')}
      className="flex flex-col items-center justify-center text-[11px] font-medium text-[#2B2B2B]"
    >
      <Map size={22} strokeWidth={1.8} />
      <span className="mt-1">MAP</span>
    </button>

    {/* RIDERS */}
    <button
      onClick={() => navigate('/riders')}
      className="flex flex-col items-center justify-center text-[11px] font-medium text-[#2B2B2B]"
    >
      <Bike size={22} strokeWidth={1.8} />
      <span className="mt-1">RIDERS</span>
    </button>

  </div>
</nav>

        
         
          </div>
        </div>
      </div>
    </div>
    




{/* ===== FOOTER IMAGE (EXACT SIZE MATCH) ===== */}


  <img
    src="/7606758_3700324.jpg"
    alt="Delivery"
    className="w-full opacity-20"
  />
</div>











 );
}

export default AdminShipment;

