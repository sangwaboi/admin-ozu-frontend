import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { TenantAPI } from '../../lib/api';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Copy, Download, CheckCircle, AlertCircle, Store, Share2, QrCode, PlusCircle } from 'lucide-react';

interface Tenant {
  id: number;
  name: string;
  join_code: string;
  is_active: boolean;
}

export default function TenantSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [missingTenant, setMissingTenant] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // WhatsApp Business number - configurable via env
  // Note: Vite env vars are replaced at BUILD time, so you must rebuild after adding to Netlify
  const whatsappNumber = import.meta.env.VITE_WABA_NUMBER || '919594948009';
  
  // Debug: Log env var (remove in production)
  useEffect(() => {
    console.log('VITE_WABA_NUMBER:', import.meta.env.VITE_WABA_NUMBER);
    console.log('Using WhatsApp number:', whatsappNumber);
  }, []);

  useEffect(() => {
    if (user) {
      loadTenant();
    }
  }, [user]);

  const generateJoinCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

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
      console.error('Error loading tenant:', err);
      setError(err.message || 'Failed to load tenant information');
    } finally {
      setIsLoading(false);
    }
  };

  const createTenant = async () => {
    if (!user) return;
    setIsCreating(true);
    setError(null);

    const tenantName =
      (user.user_metadata as any)?.shopName ||
      (user.user_metadata as any)?.name ||
      'My Shop';
    const joinCode = generateJoinCode();

    try {
      const created = await TenantAPI.create(tenantName, joinCode);
      setTenant(created);
      setMissingTenant(false);
    } catch (err: any) {
      console.error('Error creating tenant:', err);
      setError(err.message || 'Failed to create tenant');
    } finally {
      setIsCreating(false);
      setIsLoading(false);
    }
  };

  const generateJoinLink = () => {
    if (!tenant?.join_code) return '';
    const encodedCode = encodeURIComponent(`JOIN ${tenant.join_code}`);
    return `https://wa.me/${whatsappNumber}?text=${encodedCode}`;
  };

  const copyToClipboard = async (type: 'code' | 'link') => {
    try {
      let text = '';
      if (type === 'code') {
        text = tenant?.join_code || '';
      } else {
        text = generateJoinLink();
      }
      
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard');
    }
  };

  const downloadQRCode = () => {
    if (!tenant) return;
    
    // Get the SVG element
    const svgElement = document.getElementById('qr-code-svg');
    if (!svgElement) return;
    
    // Create a canvas to render the SVG
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = 200;
    canvas.height = 200;
    
    // Convert SVG to image
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = () => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      // Download as PNG
      canvas.toBlob((blob) => {
        if (!blob) return;
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `join-${tenant.join_code}.png`;
        link.href = downloadUrl;
        link.click();
        URL.revokeObjectURL(downloadUrl);
        URL.revokeObjectURL(url);
      }, 'image/png');
    };
    
    img.src = url;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tenant information...</p>
        </div>
      </div>
    );
  }

  if (missingTenant) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/profile')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Shop Join Code</h1>
                <p className="text-sm text-gray-500 mt-1">Create a tenant to get your join code</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Tenant not found</h2>
            </div>
            <p className="text-gray-700">Create your tenant to generate a join code and onboard riders.</p>
            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
            )}
            <div className="flex gap-3">
              <button
                onClick={createTenant}
                disabled={isCreating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2 font-medium transition-colors"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-4 w-4" />
                    Create Tenant
                  </>
                )}
              </button>
              <button
                onClick={() => navigate('/profile')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Go to Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const joinLink = generateJoinLink();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/profile')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Shop Join Code</h1>
              <p className="text-sm text-gray-500 mt-1">Share this code with your riders to join your shop</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Join Code Section */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-4">
              <Store className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Your Unique Join Code</h2>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="bg-gray-50 border-2 border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Join Code</p>
                  <p className="text-3xl font-bold text-blue-600 font-mono tracking-wider">
                    {tenant?.join_code || 'N/A'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => copyToClipboard('code')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium transition-colors"
              >
                {copied === 'code' ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Code
                  </>
                )}
              </button>
            </div>
            
            <p className="text-sm text-gray-500 mt-3">
              Riders can join your shop by sending: <code className="bg-gray-100 px-2 py-1 rounded">JOIN {tenant?.join_code}</code>
            </p>
          </div>

          {/* WhatsApp Link Section */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-4">
              <Share2 className="h-5 w-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">WhatsApp Join Link</h2>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={joinLink}
                  readOnly
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                />
                <button
                  onClick={() => copyToClipboard('link')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 font-medium transition-colors whitespace-nowrap"
                >
                  {copied === 'link' ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Link
                    </>
                  )}
                </button>
              </div>
              
              <p className="text-sm text-gray-500">
                Share this link with your riders. When they click it, WhatsApp will open with a pre-filled message.
              </p>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-4">
              <QrCode className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">QR Code</h2>
            </div>
            
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                {tenant && (
                  <div id="qr-code-container">
                    <QRCodeSVG
                      id="qr-code-svg"
                      value={joinLink}
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                )}
              </div>
              
              <button
                onClick={downloadQRCode}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 font-medium transition-colors"
              >
                <Download className="h-4 w-4" />
                Download QR Code
              </button>
              
              <p className="text-sm text-gray-500 text-center max-w-md">
                Print this QR code or share it digitally. Riders can scan it to join your shop.
              </p>
            </div>
          </div>

          {/* Instructions Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">How It Works:</h3>
            <ol className="space-y-3 text-sm text-blue-800">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">1</span>
                <span>Share the WhatsApp link or QR code with your riders</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">2</span>
                <span>Rider clicks the link or scans the QR code</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">3</span>
                <span>WhatsApp opens with message: <code className="bg-blue-100 px-1 py-0.5 rounded">JOIN {tenant?.join_code}</code></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">4</span>
                <span>Rider sends the message</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">5</span>
                <span>Rider automatically appears in your <a href="/riders" className="underline font-semibold">Rider Approval</a> page</span>
              </li>
            </ol>
          </div>

        </div>
      </div>
    </div>
  );
}

