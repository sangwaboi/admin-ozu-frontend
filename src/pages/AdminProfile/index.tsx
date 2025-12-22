import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import AddressManager from "../../components/AddressManager";
import Lottie from "lottie-react";
import riderAnimation from "@/assets/loader-rider.json";
import { Pencil } from 'lucide-react';

import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  LogOut,
  QrCode,
} from "lucide-react";

interface AdminProfile {
  mobile: string;
  name: string;
  shopName?: string;
}

export default function AdminProfile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [profile, setProfile] = useState<AdminProfile>({
    mobile: user?.user_metadata?.mobile || "",
    name: user?.user_metadata?.name || "",
    shopName: "",
  });

  /* ================= LOAD PROFILE (UNCHANGED) ================= */

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("admin_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setProfile({
          mobile: data.mobile,
          name: data.name,
          shopName: data.shop_name || "",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to load profile" });
    } finally {
      setIsLoading(false);
    }
  };

  /* ================= SAVE (UNCHANGED) ================= */

  const handleSave = async () => {
    if (!user) return;

    if (!profile.name) {
      setMessage({ type: "error", text: "Your name is required" });
      return;
    }

    if (!profile.mobile) {
      setMessage({ type: "error", text: "Mobile number is required" });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase.from("admin_profiles").upsert(
        {
          user_id: user.id,
          mobile: profile.mobile,
          name: profile.name,
          shop_name: profile.shopName || null,
        },
        { onConflict: "user_id" }
      );

      if (error) throw error;

      setMessage({
        type: "success",
        text: "✅ Profile saved successfully!",
      });
      setIsEditOpen(false);
    } catch {
      setMessage({
        type: "error",
        text: "Failed to save profile. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  function RiderLoading() {
    return (
      <div className="loading-screen">
        <Lottie
          animationData={riderAnimation}
          loop
          style={{ width: 180, height: 180 }}
        />
        <p className="loading-text">Loading riders…</p>
      </div>
    );
  }

  if (isLoading) {
    return <RiderLoading />;
  }

  return (
    <div className="min-h-screen bg-white font-[DM Sans]">
      {/* ================= HEADER ================= */}
      <div className="px-4 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/shipment")}>
            <ArrowLeft />
          </button>
           {/* OZU LOGO */}
  {/* OZU LOGO */}
<div className="w-[109px] h-[46px] flex items-center">
  <img
    src="/ozu-logo.png"
    alt="OZU"
    className="h-[32px] w-auto object-contain"
  />
</div>

        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-sm border px-3 py-1.5 rounded"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>

      {/* ================= PROFILE ================= */}
      <div className="px-4 mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/ava2.png"
            alt="Avatar"
            className="w-[64px] h-[64px] rounded-full"
          />
          <div>
            <p className="text-[16px] font-semibold text-black">
              {profile.name}
            </p>
            <p className="text-[12px] text-gray-500">Joined : 15 Dec 2025</p>
          </div>
        </div>

 

<button
  onClick={() => setIsEditOpen(true)}
  className="
    w-[101px]
    h-[32px]
    flex
    items-center
    justify-center
    gap-2
    rounded-[8px]
    border
    border-[#EAE6E6]
    bg-[#F3F3F3]
    font-['DM_Sans']
    text-[14px]
    font-normal
    tracking-normal
    normal-case
    text-black
  "
>
  <Pencil className="w-4 h-4 text-black" />
  Edit
</button>

      </div>

      {/* ================= MESSAGE ================= */}
      {message && (
        <div className="px-4 mt-4">
          <div
            className={`flex items-center gap-2 p-3 rounded ${
              message.type === "success"
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
            {message.text}
          </div>
        </div>
      )}
      <div className="mx-auto mt-5 w-full max-w-[410px] px-4">

      {/* ================= INVITE RIDERS CARD ================= */}
      <div className=" mt-5 w-full h-[192px] rounded-[16px] border border-[#E3E3E3] bg-[#EFEFEF] px-6 py-6 flex flex-col items-center justify-center text-center">
        <p
          className="mx-auto w-full max-w-[339px] h-[26px] font-[DM Sans] text-[22px] font-bold leading-[120%] tracking-[-0.02em] text-center text-black"
        >
          Invite Riders to your shop
        </p>
        <p className="mt-1 text-[13px]  font-bold leading-[120%] text-gray-600">
          Send this unique QR code to rider
        </p>

        <button
          onClick={() => navigate("/tenant-settings")}
          className="mx-auto mt-4 flex h-[60px] w-full max-w-[301.36px] items-center justify-center rounded-full border border-[#FFDBD8] bg-[#FFCA28] font-semibold text-black"
        >
          <QrCode className="mr-2 h-4 w-4" />
          View Join Code
        </button>
      </div>

      {/* ================= ADDRESS MANAGER ================= */}
      <div className="mt-4">
        <AddressManager />
      </div>
      </div>
      {/* FOOTER TEXT */}
      <div className="mt-6 flex justify-center">
        <p className="text-[12px] text-gray-500">
          Made with <span className="text-red-500">❤️</span> in India
        </p>
      </div>

      {/* ================= FOOTER IMAGE ================= */}
      <img
        src="/7606758_3700324.jpg"
        alt="Delivery"
        className="mt-6 w-full opacity-20"
      />

      {/* ================= EDIT PROFILE POPUP ================= */}
      {isEditOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" />

          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="w-full max-w-[440px] h-[521px] bg-white rounded-[20px] p-6">
              <h2 className="text-center font-semibold text-[16px] mb-5">
                Basic Information
              </h2>

              <input
                className="w-full h-[52px] border rounded-xl px-4 mb-4"
                placeholder="Your Name"
                value={profile.name}
                onChange={(e) =>
                  setProfile({ ...profile, name: e.target.value })
                }
              />

              <input
                className="w-full h-[52px] border rounded-xl px-4 mb-4"
                placeholder="+91 Phone Number"
                value={profile.mobile}
                onChange={(e) =>
                  setProfile({ ...profile, mobile: e.target.value })
                }
              />

              <input
                className="w-full h-[52px] border rounded-xl px-4 mb-4 bg-gray-100"
                value={user?.email || ""}
                disabled
              />

              <input
                className="w-full h-[52px] border rounded-xl px-4 mb-6"
                placeholder="Store Name (Optional)"
                value={profile.shopName || ""}
                onChange={(e) =>
                  setProfile({ ...profile, shopName: e.target.value })
                }
              />

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full h-[52px] bg-[#FFCA28] rounded-full font-semibold"
              >
                {isSaving ? "Saving…" : "Done"}
              </button>

              <button
                onClick={() => setIsEditOpen(false)}
                className="w-full mt-3 text-[14px] text-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
