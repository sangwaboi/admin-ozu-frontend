import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AddressAPI } from '../lib/supabase';
import type { AdminAddress } from '../types/address';
import { MapPin, ChevronDown, Plus } from 'lucide-react';

interface AddressSelectorProps {
  selectedAddress: AdminAddress | null;
  onAddressChange: (address: AdminAddress) => void;
}

export default function AddressSelector({
  selectedAddress,
  onAddressChange,
}: AddressSelectorProps) {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<AdminAddress[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /* ================= LOAD ADDRESSES ================= */

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      const data = await AddressAPI.getAll();
      setAddresses(data || []);

      if (!selectedAddress && data?.length) {
        const defaultAddress = data.find(a => a.is_default) || data[0];
        onAddressChange(defaultAddress);
      }
    } catch (err) {
      console.error('Failed to load addresses', err);
    } finally {
      setIsLoading(false);
    }
  };

  /* ================= CLICK OUTSIDE ================= */

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () =>
      document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* ================= HANDLERS ================= */

  const handleSelect = (address: AdminAddress) => {
    onAddressChange(address);
    setIsOpen(false);
  };

  /* ================= LOADING ================= */

  if (isLoading) {
    return (
      <div className="py-3 text-center text-sm text-gray-500">
        Loading pickup locations…
      </div>
    );
  }

  /* ================= EMPTY STATE ================= */

  if (!addresses.length) {
    return (
      <div className="bg-white border rounded-xl p-4 text-center">
        <p className="text-sm font-semibold text-black">
          Pickup Location
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Add your store address to start booking
        </p>

        <button
          onClick={() => navigate('/profile')}
          className="
            mt-4
            inline-flex
            items-center
            gap-2
            bg-black
            text-white
            px-5
            py-2.5
            rounded-full
            text-sm
            font-medium
          "
        >
          <Plus className="w-4 h-4" />
          Add Pickup Point
        </button>
      </div>
    );
  }

  /* ================= MAIN UI ================= */

 /* ================= MAIN UI ================= */

return (
  <div ref={dropdownRef} className="relative">

    {/* SELECTOR */}
    <button
      onClick={() => setIsOpen(!isOpen)}
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
      {/* LEFT CONTENT */}
      <div className="flex items-center gap-3 min-w-0">
        <MapPin className="w-5 h-5 text-green-700 flex-shrink-0" />

        <div className="min-w-0 text-left">
          <p className="text-sm text-[#6B7280] font-medium">
            Select Pickup Location
          </p>

          <p className="text-[15px] font-semibold text-black truncate">
            {selectedAddress?.location_address}
          </p>
        </div>
      </div>

      {/* DROPDOWN ICON */}
      <ChevronDown
        className={`w-5 h-5 text-gray-600 transition-transform ${
          isOpen ? 'rotate-180' : ''
        }`}
      />
    </button>

    {/* DROPDOWN */}
    {isOpen && (
      <div
        className="
          absolute
          z-50
          mt-2
          w-full
          bg-white
          border
          border-gray-200
          rounded-xl
          shadow-lg
          max-h-72
          overflow-y-auto
        "
      >
        {addresses.map(addr => (
          <button
            key={addr.id}
            onClick={() => handleSelect(addr)}
            className={`
              w-full
              px-4
              py-3
              text-left
              border-b
              last:border-0
              ${
                selectedAddress?.id === addr.id
                  ? 'bg-green-50'
                  : 'hover:bg-gray-50'
              }
            `}
          >
            <div className="flex gap-3">
              <MapPin
                className={`w-5 h-5 mt-0.5 ${
                  selectedAddress?.id === addr.id
                    ? 'text-green-600'
                    : 'text-gray-400'
                }`}
              />

              <div className="min-w-0">
                <p className="text-sm font-medium text-black truncate">
                  {addr.address_name}
                </p>
                <p className="text-xs text-gray-600 truncate">
                  {addr.location_address}
                </p>
              </div>
            </div>
          </button>
        ))}

        {/* ADD / UPDATE */}
        <button
          onClick={() => {
            setIsOpen(false);
            navigate('/profile');
          }}
          className="
            w-full
            px-4
            py-3
            flex
            items-center
            gap-2
            text-sm
            font-medium
            text-green-700
            hover:bg-gray-50
            border-t
          "
        >
          <Plus className="w-5 h-5" />
          Add / Update Pickup Point
        </button>
      </div>
    )}
  </div>
);

}
