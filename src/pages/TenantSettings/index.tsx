import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { TenantAPI } from "../../lib/api";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  Copy,
  Download,
  CheckCircle,
  PlusCircle,
} from "lucide-react";
import Lottie from "lottie-react";
import riderAnimation from "@/assets/loader-rider.json";

/* ================= TYPES ================= */

interface Tenant {
  id: number;
  name: string;
  join_code: string;
  is_active: boolean;
}

/* ================= COMPONENT ================= */

export default function TenantSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [missingTenant, setMissingTenant] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const whatsappNumber = import.meta.env.VITE_WABA_NUMBER || "919594948009";

  /* ================= LOAD TENANT ================= */

  useEffect(() => {
    if (user) loadTenant();
  }, [user]);

  const loadTenant = async () => {
    setIsLoading(true);
    setError(null);
    setMissingTenant(false);

    try {
      const data = await TenantAPI.getMyTenant();
      if (data) {
        setTenant(data);
      } else {
        setMissingTenant(true);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load tenant");
    } finally {
      setIsLoading(false);
    }
  };

  /* ================= CREATE TENANT ================= */

  const generateJoinCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return Array.from({ length: 6 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join("");
  };

  const createTenant = async () => {
    if (!user) return;
    setIsCreating(true);
    setError(null);

    const tenantName =
      (user.user_metadata as any)?.shopName ||
      (user.user_metadata as any)?.name ||
      "My Shop";

    try {
      const created = await TenantAPI.create(tenantName, generateJoinCode());
      setTenant(created);
      setMissingTenant(false);
    } catch (err: any) {
      setError(err.message || "Failed to create tenant");
    } finally {
      setIsCreating(false);
      setIsLoading(false);
    }
  };

  /* ================= HELPERS ================= */

  const generateJoinLink = () => {
    if (!tenant?.join_code) return "";
    const encoded = encodeURIComponent(`JOIN ${tenant.join_code}`);
    return `https://wa.me/${whatsappNumber}?text=${encoded}`;
  };

  const copyToClipboard = async (type: "code" | "link") => {
    const text = type === "code" ? tenant?.join_code || "" : generateJoinLink();

    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const downloadQRCode = () => {
    const svg = document.getElementById("qr-code-svg");
    if (!svg || !tenant) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 200;
    canvas.height = 200;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const blob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, 200, 200);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((b) => {
        if (!b) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = `join-${tenant.join_code}.png`;
        a.click();
      });
    };

    img.src = url;
  };

  /* ================= LOADING ================= */

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Lottie animationData={riderAnimation} loop style={{ width: 180 }} />
      </div>
    );
  }

  /* ================= NO TENANT ================= */

  if (missingTenant) {
    return (
      <div className="min-h-screen bg-white px-4 pt-10">
        <h2 className="text-xl font-semibold mb-4">Tenant not found</h2>
        <p className="text-gray-500 mb-6">
          Create your shop to generate a join code.
        </p>

        {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

        <button
          onClick={createTenant}
          disabled={isCreating}
          className="w-full h-12 rounded-full bg-[#FFCA28] font-semibold flex items-center justify-center gap-2"
        >
          <PlusCircle />
          {isCreating ? "Creating…" : "Create Tenant"}
        </button>
      </div>
    );
  }

  /* ================= MAIN UI ================= */

  const joinLink = generateJoinLink();

  return (
    <div className="min-h-screen bg-white pb-100 font-[DM Sans]">
      {/* HEADER */}
      <header className="px-4 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/shipment")}>
            <ArrowLeft />
          </button>

          {/* OZU LOGO */}

          <div className="w-[109px] h-[46px] flex items-center">
            <img
              src="/ozu-logo.png"
              alt="OZU"
              className="h-[32px] w-auto object-contain"
            />
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-4 mt-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="px-4 mt-6 space-y-5">
        {/* JOIN CODE */}
        <div className="rounded-2xl border p-4">
          <p className="font-medium">Join code</p>
          <p className="text-3xl font-bold text-black-600 font-mono tracking-wider">
            {tenant?.join_code || "N/A"}
          </p>

          <button
            onClick={() => copyToClipboard("code")}
            className="mt-4 w-full h-12 rounded-full bg-[#FFCA28] font-semibold flex items-center justify-center gap-2"
          >
            {copied === "code" ? <CheckCircle /> : <Copy />}
            {copied === "code" ? "Copied" : "Copy Code"}
          </button>
          <p className="text-sm text-gray-500 mt-3">
            Riders can join your shop by sending:{" "}
            <code className="bg-gray-100 px-2 py-1 rounded">
              JOIN {tenant?.join_code}
            </code>
          </p>
        </div>

        {/* WHATSAPP LINK */}
        <div className="rounded-2xl border p-4 space-y-3">
          <p className="font-medium">WhatsApp Join Link</p>

          <input
            readOnly
            value={joinLink}
            className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-sm font-mono"
          />

          <button
            onClick={() => copyToClipboard("link")}
            className="w-full h-12 rounded-full bg-black text-white font-medium flex items-center justify-center gap-2"
          >
            {copied === "link" ? <CheckCircle /> : <Copy />}
            {copied === "link" ? "Copied" : "Copy Link"}
          </button>
        </div>

        {/* QR CODE */}
        <div className="rounded-2xl border p-6 flex flex-col items-center">
          <QRCodeSVG id="qr-code-svg" value={joinLink} size={180} />

          <button
            onClick={downloadQRCode}
            className="mt-5 w-full h-12 rounded-full bg-[#FFCA28] font-semibold flex items-center justify-center gap-2"
          >
            <Download />
            Download QR Code
          </button>
        </div>

        {/* INSTRUCTIONS — THEME MATCHED */}
        <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-5">
          <h3 className="text-[16px] font-semibold text-gray-900 mb-4">
            How It Works:
          </h3>

          <ol className="space-y-3 text-sm text-gray-800">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-[#FFCA28] text-black rounded-full flex items-center justify-center font-semibold">
                1
              </span>
              <span>Share the WhatsApp link or QR code with your riders</span>
            </li>

            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-[#FFCA28] text-black rounded-full flex items-center justify-center font-semibold">
                2
              </span>
              <span>Rider clicks the link or scans the QR code</span>
            </li>

            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-[#FFCA28] text-black rounded-full flex items-center justify-center font-semibold">
                3
              </span>
              <span>
                WhatsApp opens with message:{" "}
                <code className="bg-yellow-100 px-1 py-0.5 rounded font-mono text-black">
                  JOIN {tenant?.join_code}
                </code>
              </span>
            </li>

            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-[#FFCA28] text-black rounded-full flex items-center justify-center font-semibold">
                4
              </span>
              <span>Rider sends the message</span>
            </li>

            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-[#FFCA28] text-black rounded-full flex items-center justify-center font-semibold">
                5
              </span>
              <span>
                Rider automatically appears in{" "}
                <a
                  href="/riders"
                  className="underline font-semibold text-black"
                >
                  Rider Approval
                </a>{" "}
                page
              </span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
