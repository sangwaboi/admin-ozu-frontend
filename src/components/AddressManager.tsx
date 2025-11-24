import { useState, useEffect } from 'react';
import { AddressAPI } from '../lib/supabase';
import type { AdminAddress, CreateAddressInput } from '../types/address';
import { MapPin, Home, MapPinned, Plus, Edit2, Trash2, Check } from 'lucide-react';
import LocationSearchInput, { LocationResult } from './LocationSearchInput';

export default function AddressManager() {
  const [addresses, setAddresses] = useState<AdminAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AdminAddress | null>(null);

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    setIsLoading(true);
    try {
      const data = await AddressAPI.getAll();
      setAddresses(data);
    } catch (error) {
      console.error('Error loading addresses:', error);
      alert('Failed to load addresses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAddress = () => {
    setEditingAddress(null);
    setShowAddModal(true);
  };

  const handleEditAddress = (address: AdminAddress) => {
    setEditingAddress(address);
    setShowAddModal(true);
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Are you sure you want to delete this address?')) {
      return;
    }

    try {
      await AddressAPI.delete(id);
      await loadAddresses();
      alert('Address deleted successfully!');
    } catch (error) {
      console.error('Error deleting address:', error);
      alert('Failed to delete address');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await AddressAPI.setDefault(id);
      await loadAddresses();
    } catch (error) {
      console.error('Error setting default:', error);
      alert('Failed to set as default');
    }
  };

  const handleSaveAddress = async (addressData: CreateAddressInput) => {
    try {
      if (editingAddress) {
        // Update existing
        await AddressAPI.update({
          id: editingAddress.id,
          ...addressData,
        });
        alert('Address updated successfully!');
      } else {
        // Create new
        await AddressAPI.create(addressData);
        alert('Address added successfully!');
      }
      
      setShowAddModal(false);
      setEditingAddress(null);
      await loadAddresses();
    } catch (error) {
      console.error('Error saving address:', error);
      alert('Failed to save address');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2 text-blue-600">
          <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Loading addresses...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">My Addresses</h3>
        <button
          onClick={handleAddAddress}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Address
        </button>
      </div>

      {/* Address List */}
      {addresses.length === 0 ? (
        <div className="p-8 bg-gray-50 border border-gray-200 rounded-lg text-center">
          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 mb-4">No addresses added yet</p>
          <button
            onClick={handleAddAddress}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Add Your First Address
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((address) => (
            <div
              key={address.id}
              className={`p-4 border-2 rounded-lg ${
                address.is_default ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Address Name */}
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-base font-semibold text-gray-900">
                      {address.address_name}
                    </h4>
                    {address.is_default && (
                      <span className="inline-flex items-center gap-1 text-xs bg-green-600 text-white px-2 py-1 rounded-full">
                        <Check className="w-3 h-3" />
                        Default
                      </span>
                    )}
                  </div>

                  {/* Address Details */}
                  <div className="space-y-1.5">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700">{address.location_address}</p>
                    </div>
                    {address.location_house_address && (
                      <div className="flex items-start gap-2">
                        <Home className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-600">{address.location_house_address}</p>
                      </div>
                    )}
                    {address.location_landmark && (
                      <div className="flex items-start gap-2">
                        <MapPinned className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-600">{address.location_landmark}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleEditAddress(address)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteAddress(address.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Set as Default Button */}
              {!address.is_default && (
                <button
                  onClick={() => handleSetDefault(address.id)}
                  className="mt-3 text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline"
                >
                  Set as Default
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
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

// Address Modal Component
interface AddressModalProps {
  address: AdminAddress | null;
  onSave: (data: CreateAddressInput) => void;
  onClose: () => void;
}

function AddressModal({ address, onSave, onClose }: AddressModalProps) {
  const [addressName, setAddressName] = useState(address?.address_name || '');
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(
    address
      ? {
          lat: address.location_lat,
          lng: address.location_lng,
          address: address.location_address,
          displayName: address.location_address,
        }
      : null
  );
  const [houseAddress, setHouseAddress] = useState(address?.location_house_address || '');
  const [landmark, setLandmark] = useState(address?.location_landmark || '');
  const [isDefault, setIsDefault] = useState(address?.is_default || false);
  const [isSaving, setIsSaving] = useState(false);

  const handleLocationSelect = (location: LocationResult) => {
    setSelectedLocation(location);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!addressName.trim()) {
      alert('Please enter an address name');
      return;
    }

    if (!selectedLocation) {
      alert('Please select a location');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        address_name: addressName.trim(),
        location_lat: selectedLocation.lat,
        location_lng: selectedLocation.lng,
        location_address: selectedLocation.address,
        location_house_address: houseAddress.trim() || undefined,
        location_landmark: landmark.trim() || undefined,
        is_default: isDefault,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {address ? 'Edit Address' : 'Add New Address'}
            </h2>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* Address Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={addressName}
                onChange={(e) => setAddressName(e.target.value)}
                placeholder="e.g., Main Shop, Warehouse, Home Office"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Give this address a name for easy identification
              </p>
            </div>

            {/* Location Search */}
            <div>
              <LocationSearchInput
                value={selectedLocation?.address || ''}
                onChange={handleLocationSelect}
                placeholder="Search for location..."
                label="Location"
                required
                showAddressFields={true}
                houseAddress={houseAddress}
                landmark={landmark}
                onHouseAddressChange={setHouseAddress}
                onLandmarkChange={setLandmark}
              />
            </div>

            {/* Set as Default */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isDefault" className="text-sm font-medium text-gray-700">
                Set as default address
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving && (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isSaving ? 'Saving...' : address ? 'Update Address' : 'Add Address'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}




