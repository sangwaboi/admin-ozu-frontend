import { useState, useEffect } from 'react';
import { AddressAPI } from '../lib/supabase';
import type { AdminAddress, CreateAddressInput } from '../types/address';
import { MapPin, Plus } from 'lucide-react';
import LocationSearchInput, { LocationResult } from './LocationSearchInput';

/* ================= COMPONENT ================= */

export default function AddressManager() {
  const [addresses, setAddresses] = useState<AdminAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAddress, setEditingAddress] =
    useState<AdminAddress | null>(null);

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    setIsLoading(true);
    try {
      const data = await AddressAPI.getAll();
      setAddresses(data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAddress = async (data: CreateAddressInput) => {
    if (editingAddress) {
      await AddressAPI.update({ id: editingAddress.id, ...data });
    } else {
      await AddressAPI.create(data);
    }
    setShowAddModal(false);
    setEditingAddress(null);
    await loadAddresses();
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    await AddressAPI.delete(id);
    await loadAddresses();
  };

  const handleSetDefault = async (id: string) => {
    await AddressAPI.setDefault(id);
    await loadAddresses();
  };

  if (isLoading) {
    return (
      <div className="py-6 text-center text-sm text-gray-500">
        Loading addresses…
      </div>
    );
  }

  return (
    <div className="space-y-3">

       {/* HEADER */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">My Addresses</h3>

        {/* ADD BUTTON — SOURCE OF TRUTH */}
        <button
          onClick={() => {
            setEditingAddress(null);
            setShowAddModal(true);
          }}
          className="
            flex items-center gap-1
            text-sm
            px-3 py-2
            rounded-xl
            border
            border-[#EAE6E6]
            bg-[#F3F3F3]
          "
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {/* LIST */}
      {addresses.map(address => (
        <div
          key={address.id}
          className="
            w-full
            rounded-[16px]
            border
            border-[#E3E3E3]
            bg-[#F5F5F5]
            p-4
          "
        >
          {/* TITLE + DEFAULT BADGE */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 leading-none">
              <MapPin className="w-4 h-4 text-green-600" />

              <p
                className="
                  text-sm
                  font-semibold
                  text-[#2F2F33]
                  leading-[120%]
                "
              >
                {address.address_name}
              </p>
            </div>

            {address.is_default && (
              <span
                className="
                  rounded-full
                  bg-[#F3F3F3]
                  px-2
                  py-[2px]
                  text-[10px]
                  font-medium
                  text-[#E53935]
                "
              >
                Default
              </span>
            )}
          </div>

          {/* ADDRESS */}
          <p className="mt-1 text-xs text-gray-600">
            {address.location_address}
          </p>

          {/* ACTIONS */}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                setEditingAddress(address);
                setShowAddModal(true);
              }}
              className="h-9 w-[72px] rounded-lg bg-black text-white text-xs"
            >
              Edit
            </button>

            <button
              onClick={() => handleDeleteAddress(address.id)}
              className="h-9 w-[72px] rounded-lg bg-red-600 text-white text-xs"
            >
              Delete
            </button>

            {!address.is_default && (
              <button
                onClick={() => handleSetDefault(address.id)}
                className="ml-auto text-xs text-gray-500 hover:underline"
              >
                Set default
              </button>
            )}
          </div>
        </div>
      ))}

      {/* MODAL */}
      {showAddModal && (
        <AddressModal
          address={editingAddress}
          onSave={handleSaveAddress}
          onClose={() => {
            setShowAddModal(false);
            setEditingAddress(null);
          }}
        />
      )}
    </div>
  );
}

/* ================= MODAL ================= */

interface AddressModalProps {
  address: AdminAddress | null;
  onSave: (data: CreateAddressInput) => void;
  onClose: () => void;
}

function AddressModal({ address, onSave, onClose }: AddressModalProps) {
  const [addressName, setAddressName] =
    useState(address?.address_name || '');
  const [selectedLocation, setSelectedLocation] =
    useState<LocationResult | null>(
      address
        ? {
            lat: address.location_lat,
            lng: address.location_lng,
            address: address.location_address,
            displayName: address.location_address,
          }
        : null
    );
  const [houseAddress, setHouseAddress] =
    useState(address?.location_house_address || '');
  const [landmark, setLandmark] =
    useState(address?.location_landmark || '');
  const [isDefault, setIsDefault] =
    useState(address?.is_default || false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocation || !addressName.trim()) return;

    await onSave({
      address_name: addressName.trim(),
      location_lat: selectedLocation.lat,
      location_lng: selectedLocation.lng,
      location_address: selectedLocation.address,
      location_house_address: houseAddress || undefined,
      location_landmark: landmark || undefined,
      is_default: isDefault,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full max-w-[440px] rounded-t-[20px] sm:rounded-[20px] p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <h3 className="text-base font-semibold text-center">
            {address ? 'Edit Address' : 'Add Address'}
          </h3>

          <input
            value={addressName}
            onChange={e => setAddressName(e.target.value)}
            placeholder="Address name"
            className="w-full h-[48px] rounded-xl border px-3 text-sm"
          />

          <LocationSearchInput
            value={selectedLocation?.address || ''}
            onChange={setSelectedLocation}
            label="Location"
            showAddressFields
            houseAddress={houseAddress}
            landmark={landmark}
            onHouseAddressChange={setHouseAddress}
            onLandmarkChange={setLandmark}
          />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={e => setIsDefault(e.target.checked)}
            />
            Set as default
          </label>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-[44px] rounded-xl border text-sm"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="flex-1 h-[44px] rounded-xl bg-black text-white text-sm"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
