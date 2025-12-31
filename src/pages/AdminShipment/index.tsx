import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { ShipmentAPI, IssuesAPI } from "../../lib/api";
import type { AdminAddress } from "../../types/address";
import AddressSelector from "../../components/AddressSelector";
import ShipmentForm from "./ShipmentForm";
import LiveTrackingMap from "./LiveTrackingMap";
import RiderStatus from "./RiderStatus";

import { Home, Map, AlertTriangle, ArrowLeft, Bike } from "lucide-react";
import "./AdminShipment.css";

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
  const { user } = useAuth();
  const [selectedAddress, setSelectedAddress] = useState<AdminAddress | null>(
    null
  );
  const [adminMobile, setAdminMobile] = useState<string>("");
  const [, setAdminName] = useState<string>("");
  const [allShipments, setAllShipments] = useState<any[]>([]);
  const [completedShipments, setCompletedShipments] = useState<any[]>([]);
  const [activeShipmentIndex, setActiveShipmentIndex] = useState<number>(0);
  const [activeShipment, setActiveShipment] = useState<any>(null);
  const [currentTab, setCurrentTab] = useState<"active" | "completed">(
    "active"
  );
  const [notifications, setNotifications] = useState<string[]>([]);
  const [shipmentIssues, setShipmentIssues] = useState<
    Record<string | number, number>
  >({});
  const [showBooking, setShowBooking] = useState(false);

  const allShipmentsRef = useRef<any[]>([]);
  const activeShipmentRef = useRef<any>(null);

  const loadAdminProfile = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("admin_profiles")
        .select("name, mobile")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading profile:", error);
      }

      if (data) {
        setAdminName(data.name || "");
        setAdminMobile(data.mobile || "");
      } else {
        setAdminName(user.user_metadata?.name || "");
        setAdminMobile(user.user_metadata?.mobile || "");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadAdminProfile();
    }
  }, [user, loadAdminProfile]);

  const showNotification = useCallback((message: string) => {
    setNotifications((prev) => [...prev, message]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((m) => m !== message));
    }, 5000);
  }, []);

  const fetchShipmentIssues = useCallback(async (shipments: any[]) => {
    const issuesMap: Record<string | number, number> = {};

    try {
      await Promise.all(
        shipments.map(async (shipment) => {
          try {
            const data = await IssuesAPI.getByShipmentId(shipment.id);
            const unresolvedCount = (data.issues || []).filter(
              (issue: any) => issue.status !== "resolved"
            ).length;
            if (unresolvedCount > 0) {
              issuesMap[shipment.id] = unresolvedCount;
            }
          } catch (error) {
            console.error(
              `Error fetching issues for shipment ${shipment.id}:`,
              error
            );
          }
        })
      );

      setShipmentIssues(issuesMap);
    } catch (error) {
      console.error("Error fetching shipment issues:", error);
    }
  }, []);

  const fetchActiveShipments = useCallback(async () => {
    try {
      const data = await ShipmentAPI.getActive();

      if (data && Array.isArray(data)) {
        const previousShipments = allShipmentsRef.current;
        const previousIds = previousShipments.map((s) => s.id);
        const newIds = data.map((s: any) => s.id);

        const removedIds = previousIds.filter((id) => !newIds.includes(id));
        if (removedIds.length > 0 && previousShipments.length > 0) {
          removedIds.forEach((id) => {
            const shipment = previousShipments.find((s) => s.id === id);
            if (shipment) {
              showNotification(`📦 Shipment #${id} has been delivered! ✅`);
            }
          });
        }

        data.forEach((newShipment: any) => {
          const oldShipment = previousShipments.find(
            (s) => s.id === newShipment.id
          );
          if (oldShipment) {
            if (
              oldShipment.status === "pending" &&
              newShipment.status === "assigned"
            ) {
              showNotification(
                `✅ Shipment #${newShipment.id} has been accepted!`
              );
            }
            if (
              oldShipment.status === "assigned" &&
              newShipment.status === "picked_up"
            ) {
              showNotification(
                `📦 Shipment #${newShipment.id} has been picked up!`
              );
            }
          }
        });

        allShipmentsRef.current = data;
        setAllShipments(data);
        fetchShipmentIssues(data);

        const currentActiveShipment = activeShipmentRef.current;
        if (currentActiveShipment) {
          const updated = data.find(
            (s: any) => s.id === currentActiveShipment.id
          );
          if (updated) {
            activeShipmentRef.current = updated;
            setActiveShipment(updated);
          } else if (data.length > 0) {
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
      console.error("Error fetching active shipments:", error);
      if (error instanceof Error && error.message.includes("authentication")) {
        navigate("/login");
      }
    }
  }, [navigate, showNotification, fetchShipmentIssues]);

  const fetchCompletedShipments = async () => {
    try {
      const data = await ShipmentAPI.getCompleted();

      if (data && Array.isArray(data)) {
        setCompletedShipments(data);
      }
    } catch (error) {
      console.error("Error fetching completed shipments:", error);
      if (error instanceof Error && error.message.includes("authentication")) {
        navigate("/login");
      }
    }
  };

  useEffect(() => {
    allShipmentsRef.current = allShipments;
  }, [allShipments]);

  useEffect(() => {
    activeShipmentRef.current = activeShipment;
  }, [activeShipment]);

  useEffect(() => {
    const timer = setTimeout(fetchActiveShipments, 500);
    return () => clearTimeout(timer);
  }, [fetchActiveShipments]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchActiveShipments();
    }, 5000);
    return () => clearInterval(interval);
  }, [user, fetchActiveShipments]);

  const handleShipmentCreate = async (
    customerDetails: CustomerDetails,
    specificRiderId?: string
  ) => {
    if (!selectedAddress) {
      alert("Please select an address first");
      return;
    }

    if (!adminMobile) {
      alert("Please set your mobile number in Profile Settings");
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

    if (specificRiderId) {
      shipmentRequest.specificRiderId = specificRiderId;
      console.log("📤 Sending to SPECIFIC rider:", specificRiderId);
    } else {
      console.log("📤 Sending to ALL available riders (broadcast)");
    }

    console.log(
      "📤 Request payload:",
      JSON.stringify(shipmentRequest, null, 2)
    );

    try {
      const data = await ShipmentAPI.create(shipmentRequest);
      console.log("✅ Shipment created:", data);

      const newShipments = [...allShipments, data];
      setAllShipments(newShipments);
      setActiveShipmentIndex(newShipments.length - 1);
      setActiveShipment(data);
    } catch (error: any) {
      console.error("Failed to create shipment:", error);

      if (error.message?.includes("authentication")) {
        alert("❌ Please login to create shipments.");
        navigate("/login");
        return;
      }

      if (error.message?.includes("profile")) {
        alert("❌ Please complete your profile first.");
        navigate("/profile");
        return;
      }

      alert(
        `❌ ${
          error.message ||
          "Network error. Please check your connection and try again."
        }`
      );
    }
  };

  const handleShipmentSwitch = (index: number) => {
    setActiveShipmentIndex(index);
    setActiveShipment(allShipments[index]);
  };

  const handleTabSwitch = (tab: "active" | "completed") => {
    setCurrentTab(tab);
    if (tab === "completed") {
      fetchCompletedShipments();
    }
  };

  return (
    <div>
      <div className="as-root">
        {/* Toast Notifications */}
        <div className="as-notifications">
          {notifications.map((notification, index) => (
            <div key={index} className="as-notification">
              <svg className="as-notification-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="as-notification-text">{notification}</span>
            </div>
          ))}
        </div>

        {/* HEADER */}
        <header className="as-header">
          <div className="as-header-left">
            <button className="as-invisible-back" aria-hidden>
              <ArrowLeft />
            </button>

            <div className="as-logo">
              <img src="/ozu-logo.png" alt="OZU" />
            </div>
          </div>

          <button
            onClick={() => navigate("/profile")}
            className="as-avatar-btn"
          >
            <img src="/ava2.png" alt="Profile" />
          </button>
        </header>

        <div className="as-top-section">
          <div className="as-top-inner">
            <div className="as-booking-area">
              <AddressSelector
                selectedAddress={selectedAddress}
                onAddressChange={setSelectedAddress}
              />

              <button
                onClick={() => setShowBooking(true)}
                className="as-drop-btn"
              >
                <div className="as-drop-inner">
                  <span className="as-drop-icon" />
                  <div className="as-drop-text">
                    
                    <p className="as-drop-main">Enter Drop location & details</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setShowBooking(true)}
                className="as-booknow-btn"
              >
                Book Now
              </button>
            </div>
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="as-quick-actions">
          <button onClick={() => navigate("/profile")} className="as-quick-card">
            <div className="as-quick-illustration">
              <img src="/undraw_delivery-address_409g.svg" alt="" />
            </div>
            <p className="as-quick-label">Add / Update Pickup Point</p>
          </button>

          <button onClick={() => navigate("/profile")} className="as-quick-card">
            <div className="as-quick-illustration">
              <img src="/undraw_mobile-app_qxev.svg" alt="" />
            </div>
            <p className="as-quick-label">Update Contact Number</p>
          </button>

          <button onClick={() => navigate("/issues")} className="as-quick-card">
            <div className="as-quick-illustration">
              <img src="/undraw_questions_g2px.svg" alt="" />
            </div>
            <p className="as-quick-label">Check Delivery Issues</p>
          </button>
        </div>

        {/* Main Content */}
        <div className="as-main">
          <div className="as-grid">
            {/* Booking Modal */}
            {showBooking && (
              <div className="as-booking-modal">
                <div className="as-booking-modal-inner">
                  <ShipmentForm
                    onSubmit={handleShipmentCreate}
                    disabled={!selectedAddress || !adminMobile}
                    onClose={() => setShowBooking(false)}
                  />
                </div>
              </div>
            )}

            {/* Shipments Card */}
            <div className="as-shipments-card">
              <div className="as-tabs">
                <button
                  onClick={() => handleTabSwitch("active")}
                  className={`as-tab ${currentTab === "active" ? "as-tab-active" : "as-tab-inactive"}`}
                >
                  <div className="as-tab-content">
                    <svg className="as-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Active Shipments
                    {allShipments.length > 0 && (
                      <span className={`as-badge ${currentTab === "active" ? "as-badge-active" : "as-badge-inactive"}`}>
                        {allShipments.length}
                      </span>
                    )}
                  </div>
                </button>

                <button
                  onClick={() => handleTabSwitch("completed")}
                  className={`as-tab ${currentTab === "completed" ? "as-tab-active" : "as-tab-inactive"}`}
                >
                  <div className="as-tab-content">
                    <svg className="as-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Completed
                    {completedShipments.length > 0 && (
                      <span className={`as-badge ${currentTab === "completed" ? "as-badge-active" : "as-badge-inactive"}`}>
                        {completedShipments.length}
                      </span>
                    )}
                  </div>
                </button>
              </div>

              {/* Tab Content */}
              {currentTab === "active" ? (
                allShipments.length > 0 ? (
                  <div className="as-active-list">
                    <div className="as-active-buttons">
                      {allShipments.map((shipment, index) => (
                        <button
                          key={shipment.id}
                          onClick={() => handleShipmentSwitch(index)}
                          className={`as-shipment-btn ${activeShipmentIndex === index ? "as-shipment-active" : "as-shipment-inactive"}`}
                        >
                          <div className="as-shipment-content">
                            <div className="as-shipment-top">
                              <span>Shipment #{shipment.id}</span>
                              {shipment.status === "pending" && <span className="as-dot amber" title="Waiting for rider" />}
                              {shipment.status === "assigned" && <span className="as-dot green" title="Accepted - Waiting for pickup" />}
                              {shipment.status === "picked_up" && <span className="as-dot blue" title="Picked up - On the way" />}
                              {shipmentIssues[shipment.id] && <span className="as-issue-dot" title={`${shipmentIssues[shipment.id]} issue(s) reported`} />}
                            </div>

                            {shipment.status === "picked_up" && (
                              <span className={`as-shipment-sub ${activeShipmentIndex === index ? "as-sub-active" : "as-sub-inactive"}`}>On the way</span>
                            )}

                            {shipmentIssues[shipment.id] && (
                              <span className={`as-shipment-issue ${activeShipmentIndex === index ? "as-issue-active" : "as-issue-inactive"}`}>Issue reported</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="as-empty p-12">
                    <svg className="as-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="as-empty-text">No active shipments</p>
                  </div>
                )
              ) : (
                <div className="as-completed-list">
                  {completedShipments.length > 0 ? (
                    <div className="as-completed-items">
                      {completedShipments.map((shipment) => (
                        <div key={shipment.id} className="as-completed-item">
                          <div className="as-completed-top">
                            <div className="as-completed-left">
                              <h4 className="as-completed-title">Shipment #{shipment.id}</h4>
                              <span className="as-delivered-badge">Delivered</span>
                            </div>
                            <div className="as-completed-price">₹{shipment.price || 0}</div>
                          </div>

                          <div className="as-box as-customer">
                            <p className="as-box-label">Customer</p>
                            <div className="as-box-content">
                              <p><span className="as-muted">Name:</span> {shipment.customerName || "N/A"}</p>
                              <p><span className="as-muted">Mobile:</span> {shipment.customerMobile || "N/A"}</p>
                              <p><span className="as-muted">Landmark:</span> {shipment.landmark || "N/A"}</p>
                            </div>
                          </div>

                          <div className="as-box as-rider">
                            <p className="as-box-label">Delivered By</p>
                            <div className="as-box-content">
                              <p><span className="as-muted">Name:</span> {shipment.assignedRiderName || "N/A"}</p>
                              <p><span className="as-muted">Mobile:</span> {shipment.assignedRiderMobile || "N/A"}</p>
                            </div>
                          </div>

                          {shipment.deliveredAt && (
                            <p className="as-delivered-at">Delivered: {new Date(shipment.deliveredAt).toLocaleString()}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="as-empty p-12">
                      <svg className="as-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="as-empty-text">No completed shipments yet</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right column: Tracking & Status */}
            <div className="as-right-column">
              {currentTab === "active" && activeShipment && (
                <>
                  <RiderStatus
                    shipmentId={activeShipment.id}
                    shipmentStatus={activeShipment.status}
                  />
                  <LiveTrackingMap
                    adminLocation={
                      selectedAddress
                        ? {
                            latitude: selectedAddress.location_lat,
                            longitude: selectedAddress.location_lng,
                            address: selectedAddress.location_address,
                            houseAddress:
                              selectedAddress.location_house_address ||
                              undefined,
                            landmark:
                              selectedAddress.location_landmark || undefined,
                          }
                        : null
                    }
                    shipment={activeShipment}
                  />
                </>
              )}

              <div className="as-made-with">
                <p>Made with ❤️ in India</p>
              </div>

              <img src="/7606758_3700324.jpg" alt="Delivery" className="as-footer-image" />
            </div>
          </div>
        </div>

          {/* ===== BOTTOM NAV (FIGMA EXACT) ===== */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 h-[76px] bg-white rounded-t-2xl shadow-[0_-1px_12px_rgba(0,0,0,0.11)]">
        <div className="max-w-[439px] mx-auto h-full flex justify-around items-center">
          {/* HOME */}
          <button
            onClick={() => navigate("/shipment")}
            className="flex flex-col items-center justify-center text-[11px] font-medium text-[#2B2B2B]"
          >
            <Home size={22} strokeWidth={1.8} />
            <span className="mt-1">HOME</span>
          </button>

          {/* ISSUES (ACTIVE SAMPLE) */}
          <button
            onClick={() => navigate("/issues")}
            className="flex flex-col items-center justify-center text-[11px] font-medium text-[#2B2B2B]"
          >
            <AlertTriangle size={22} strokeWidth={1.8} />
            <span className="mt-1">ISSUES</span>
          </button>

          {/* MAP */}
          <button
            onClick={() => navigate("/map")}
            className="flex flex-col items-center justify-center text-[11px] font-medium text-[#2B2B2B]"
          >
            <Map size={22} strokeWidth={1.8} />
            <span className="mt-1">MAP</span>
          </button>

          {/* RIDERS */}
          <button
            onClick={() => navigate("/riders")}
            className="flex flex-col items-center justify-center text-[11px] font-medium text-[#2B2B2B]"
          >
            <Bike size={22} strokeWidth={1.8} />
            <span className="mt-1">RIDERS</span>
          </button>
        </div>
      </nav>
      </div>
    </div>
  );
}

export default AdminShipment;
