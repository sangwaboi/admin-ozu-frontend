import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RidersAPI } from "@/lib/api";
import type { PendingRider, ApprovedRider } from "@/types/riderApproval";
import "./index.css";
import { ArrowLeft } from "lucide-react";
import Lottie from "lottie-react";
import riderAnimation from "@/assets/loader-rider.json";
import { Home, Map, AlertTriangle, Bike } from "lucide-react";
export default function RiderApprovalPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"pending" | "approved">("pending");
  const [pendingRiders, setPendingRiders] = useState<PendingRider[]>([]);
  const [approvedRiders, setApprovedRiders] = useState<ApprovedRider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRider, setSelectedRider] = useState<PendingRider | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [processingRiders, setProcessingRiders] = useState<
    Set<string | number>
  >(new Set());

  // Fetch riders data
  const fetchRiders = async () => {
    try {
      // Fetch pending riders
      const pendingData = await RidersAPI.getPending();
      setPendingRiders(pendingData.riders || []);

      // Fetch approved riders
      const approvedData = await RidersAPI.getApproved();
      setApprovedRiders(approvedData.riders || []);
    } catch (error) {
      console.error("Error fetching riders:", error);
      alert("Failed to load riders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiders();
    // Refresh every 30 seconds
    const interval = setInterval(fetchRiders, 30000);
    return () => clearInterval(interval);
  }, []);

  // Approve rider
  const handleApprove = async (riderId: string | number) => {
    // Prevent multiple clicks
    if (processingRiders.has(riderId)) return;

    setProcessingRiders((prev) => new Set(prev).add(riderId));

    try {
      await RidersAPI.approve(riderId);
      fetchRiders(); // Refresh list
    } catch (error) {
      console.error("Error approving rider:", error);
      alert("❌ Failed to approve rider");
    } finally {
      setProcessingRiders((prev) => {
        const newSet = new Set(prev);
        newSet.delete(riderId);
        return newSet;
      });
    }
  };

  // Approve with name edit
  const handleApproveWithEdit = (rider: PendingRider) => {
    setSelectedRider(rider);
    setEditedName(rider.name);
    setShowEditModal(true);
  };

  const submitApprovalWithName = async () => {
    if (!editedName.trim()) {
      alert("Please enter a rider name");
      return;
    }

    if (!selectedRider) return;

    // Prevent multiple clicks
    if (processingRiders.has(selectedRider.id)) return;

    setProcessingRiders((prev) => new Set(prev).add(selectedRider.id));

    try {
      await RidersAPI.approve(selectedRider.id, editedName);
      setShowEditModal(false);
      fetchRiders();
    } catch (error) {
      console.error("Error approving rider:", error);
      alert("❌ Failed to approve rider");
    } finally {
      setProcessingRiders((prev) => {
        const newSet = new Set(prev);
        newSet.delete(selectedRider.id);
        return newSet;
      });
    }
  };

  // Reject rider
  const handleReject = async (riderId: string | number) => {
    // Prevent multiple clicks
    if (processingRiders.has(riderId)) return;

    setProcessingRiders((prev) => new Set(prev).add(riderId));

    try {
      await RidersAPI.reject(riderId);
      fetchRiders(); // Refresh list
    } catch (error) {
      console.error("Error rejecting rider:", error);
      alert("❌ Failed to reject rider");
    } finally {
      setProcessingRiders((prev) => {
        const newSet = new Set(prev);
        newSet.delete(riderId);
        return newSet;
      });
    }
  };
  function RiderLoading() {
    return (
      <div className="loading-screen">
        <Lottie
          animationData={riderAnimation}
          loop
          style={{ width: 180, height: 180 }}
        />
        <p className="loading-text">Riders on the way…</p>
      </div>
    );
  }

  if (loading) {
    return <RiderLoading />;
  }

  return (
    <>
    <div className="riders-approval-page  pb-[100px] ">
      <header className="px-4 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/shipment")}>
            <ArrowLeft />
          </button>
         {/* OZU LOGO */}
            <div className="ai-logo-wrap">
              <img
                src="/ozu-logo.png"
                alt="OZU"
                className="ai-logo-img"
              />
            </div>
        </div>

        <button
          onClick={() => navigate("/profile")}
          className="ai-profile-btn"
        >
          <img
            src="/ava2.png"
            alt="Profile"
        
            className="ai-profile-img"
          />
        </button>
      </header>


       <div className="ai-title-row">
          <div className="ai-title-block">
            <h2 className="ai-title">Rider Management</h2>

            <p className="ai-subtitle">
              Approve or reject delivery riders
            </p>
          </div>

        </div>

  

      {/* Tabs */}
      <div className="pill-tabs">
        <button
          onClick={() => setActiveTab("pending")}
          className={activeTab === "pending" ? "pill active" : "pill"}
        >
          Pending Approval
        </button>
        <button
          onClick={() => setActiveTab("approved")}
          className={activeTab === "approved" ? "pill active" : "pill"}
        >
          Approved Rider
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === "pending" && (
          <PendingRidersTab
            riders={pendingRiders}
            onApprove={handleApprove}
            onApproveWithEdit={handleApproveWithEdit}
            onReject={handleReject}
            processingRiders={processingRiders}
          />
        )}

        {activeTab === "approved" && (
          <ApprovedRidersTab
            riders={approvedRiders}
            onRemove={handleReject}
            processingRiders={processingRiders}
          />
        )}
      </div>

      {/* Edit Name Modal */}
      {showEditModal && selectedRider && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Rider Name</h2>
            <div className="form-group">
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">
                  Rider Full Name
                </label>

                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="Eg: Aditya Shrivastav"
                  className="name-input mt-1"
                />

                <p className="mt-1 text-[12px] text-gray-400">
                  This name will be visible to customers and used for
                  deliveries.
                </p>
              </div>
            </div>
            <div className="modal-actions">
              <button
                onClick={() => setShowEditModal(false)}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button onClick={submitApprovalWithName} className="approve-btn">
                ✅ Approve
              </button>
            </div>
          </div>
        </div>
      )}
     
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
    </>
  );
}

// -------------------------
// Pending Riders Tab Component
// -------------------------
interface PendingRidersTabProps {
  riders: PendingRider[];
  onApprove: (riderId: string | number) => void;
  onApproveWithEdit: (rider: PendingRider) => void;
  onReject: (riderId: string | number) => void;
  processingRiders: Set<string | number>;
}

function PendingRidersTab({
  riders,
  onApprove,
  onApproveWithEdit,
  onReject,
  processingRiders,
}: PendingRidersTabProps) {
  if (riders.length === 0) {
    return (
      <div className="empty-state">
        <p> No pending riders</p>
        <small>New riders who send "hi" on WhatsApp will appear here</small>
      </div>
    );
  }

  return (
    <div className="mobile-list min-h-screen w-full bg-white pb-[100px] font-[DM Sans]">
      {riders.map((rider) => (
        <div key={rider.id} className="rider-card pending">
          <div className="rider-header">
            <div className="rider-avatar">
              {rider.name.charAt(0).toUpperCase()}
            </div>
            <div className="rider-info">
              <h3>{rider.name}</h3>
              <p className="contact">{rider.contact}</p>
              <p className="wa-id">WhatsApp: {rider.wa_id}</p>
            </div>
          </div>

          <div className="rider-details">
            <div className="detail-row">
              <span className="label">Zone:</span>
              <span className="value">{rider.zone || "Not set"}</span>
            </div>
            <div className="detail-row">
              <span className="label">Registered:</span>
              <span className="value">
                {new Date(rider.createdAt).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="rider-actions">
            <button
              onClick={() => onApprove(rider.id)}
              className="btn-approve"
              disabled={processingRiders.has(rider.id)}
            >
              {processingRiders.has(rider.id) ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 inline-block mr-1"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </>
              ) : (
                "✅ Approve"
              )}
            </button>
            <button
              onClick={() => onApproveWithEdit(rider)}
              className="btn-edit"
              disabled={processingRiders.has(rider.id)}
            >
              ✏️ Edit & Approve
            </button>
            <button
              onClick={() => onReject(rider.id)}
              className="btn-reject"
              disabled={processingRiders.has(rider.id)}
            >
              {processingRiders.has(rider.id) ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 inline-block mr-1"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </>
              ) : (
                "❌ Reject"
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// -------------------------
// Approved Riders Tab Component
// -------------------------
interface ApprovedRidersTabProps {
  riders: ApprovedRider[];
  onRemove: (riderId: string | number) => void;
  processingRiders: Set<string | number>;
}

function ApprovedRidersTab({
  riders,
  onRemove,
  processingRiders,
}: ApprovedRidersTabProps) {
  if (riders.length === 0) {
    return (
      <div className="empty-state">
        <p>No approved riders yet</p>
      </div>
    );
  }

  return (
    <div className="riders-grid">
      {riders.map((rider) => (
        <div key={rider.id} className="rider-card approved">
          <div className="rider-header">
            <div className="flex items-center gap-3">
              <div className="rider-avatar approved">
                {rider.name.charAt(0).toUpperCase()}
              </div>

              <div className="rider-info">
                <h3>{rider.name}</h3>
                <p className="contact">{rider.contact}</p>
                <p className="wa-id">
                  Joined: {new Date(rider.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <span className="busy-badge">Busy</span>
          </div>

          <div className="rider-details">
            <div className="detail-row">
              <span className="label">Zone:</span>
              <span className="value">{rider.zone || "Not set"}</span>
            </div>
            <div className="detail-row">
              <span className="label">Location:</span>
              <span className="value">
                {rider.hasLocation ? "📍 Tracked" : "📍 Not tracked"}
              </span>
            </div>
            <div className="detail-row">
              <span className="label">Joined:</span>
              <span className="value">
                {new Date(rider.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="rider-actions">
            <button
              onClick={() => onRemove(rider.id)}
              className="btn-remove"
              disabled={processingRiders.has(rider.id)}
            >
              {processingRiders.has(rider.id) ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 inline-block mr-1"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Removing...
                </>
              ) : (
                "🗑️ Remove Rider"
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
