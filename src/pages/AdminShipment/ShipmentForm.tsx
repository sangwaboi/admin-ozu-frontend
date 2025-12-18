import { useState } from 'react';
import { CustomerDetails } from './index';
import LocationSearchInput, { LocationResult } from '../../components/LocationSearchInput';
import { authenticatedFetch } from '../../lib/api';

/* ================= TYPES ================= */

interface Rider {
  id: string;
  name: string;
  mobile: string;
  zone: string;
  isAvailable: boolean;
}

interface ShipmentFormProps {
  onSubmit: (customer: CustomerDetails, specificRiderId?: string) => void;
  disabled?: boolean;
  onClose: () => void;
}

/* ================= COMPONENT ================= */

function ShipmentForm({ onSubmit, disabled, onClose }: ShipmentFormProps) {
  const [formData, setFormData] = useState<CustomerDetails>({
    name: '',
    mobile: '',
    locationLink: '',
    address: '',
    landmark: '',
    price: 0,
  });

  const [errors, setErrors] =
    useState<Partial<Record<keyof CustomerDetails, string>>>({});

  const [showRiderModal, setShowRiderModal] = useState(false);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loadingRiders, setLoadingRiders] = useState(false);
  const [selectedRider, setSelectedRider] = useState<string | null>(null);

  const [customerLocationDisplay, setCustomerLocationDisplay] = useState('');
  const [customerHouseAddress, setCustomerHouseAddress] = useState('');
  const [customerLandmark, setCustomerLandmark] = useState('');

  /* ✅ TERMS STATE */
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsError, setTermsError] = useState('');

  /* ================= HELPERS ================= */

  const handleChange = (field: keyof CustomerDetails, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleCustomerLocationSelect = (location: LocationResult) => {
    const locationLink = `${location.lat},${location.lng}`;

    const fullAddress = [customerHouseAddress, location.address]
      .filter(Boolean)
      .join(', ');

    setFormData(prev => ({
      ...prev,
      locationLink,
      address: fullAddress || location.address,
      landmark: customerLandmark || location.landmark || prev.landmark,
    }));

    setCustomerLocationDisplay(location.displayName);

    setErrors(prev => ({
      ...prev,
      locationLink: undefined,
      address: undefined,
      landmark: undefined,
    }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CustomerDetails, string>> = {};

    if (!formData.name.trim()) newErrors.name = 'Customer name is required';
    if (!formData.mobile.trim()) newErrors.mobile = 'Mobile number is required';
    if (!/^[6-9]\d{9}$/.test(formData.mobile.replace(/\s+/g, '')))
      newErrors.mobile = 'Enter valid 10-digit mobile number';
    if (!formData.locationLink)
      newErrors.locationLink = 'Please select customer location';
    if (!formData.address) newErrors.address = 'Address is required';
    if (formData.price <= 0) newErrors.price = 'Price must be greater than 0';

    if (!acceptedTerms) {
      setTermsError('You must accept Terms & Privacy Policy');
    } else {
      setTermsError('');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 && acceptedTerms;
  };

  /* ================= RIDER LOGIC ================= */

  const fetchRiders = async () => {
    setLoadingRiders(true);
    try {
      const response = await authenticatedFetch('/riders/available');
      if (!response.ok) throw new Error('Failed to fetch riders');
      const data = await response.json();
      setRiders(Array.isArray(data) ? data : []);
    } catch {
      setRiders([]);
    } finally {
      setLoadingRiders(false);
    }
  };

  /* ================= ACTIONS ================= */

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit(formData);
    onClose();
  };

  const handleSpecificRiderClick = () => {
    if (!validate()) return;
    fetchRiders();
    setShowRiderModal(true);
  };

  const handleSendToSpecificRider = () => {
    if (!selectedRider) return;

    onSubmit(formData, selectedRider);
    setShowRiderModal(false);
    onClose();
  };

  /* ================= UI ================= */

  /* ================= UI ================= */

return (
  <>
    {/* ===== BOOKING POPUP (BOTTOM SHEET) ===== */}
    <div className="fixed inset-0 bg-black/70 z-40 flex items-end justify-center">
      <div
        className="
          bg-white
          w-full
          max-w-[440px]
          rounded-t-[20px]
          px-4
          pt-4
          pb-6
          max-h-[85vh]
          overflow-y-auto
        "
      >
        <div className="flex justify-center mb-4">
          <h2 className="text-lg font-semibold">Booking Details</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <LocationSearchInput
            value={customerLocationDisplay}
            onChange={handleCustomerLocationSelect}
            placeholder="Customer location *"
            label="Customer Location"
            required
            error={errors.locationLink}
            showAddressFields
            houseAddress={customerHouseAddress}
            landmark={customerLandmark}
            onHouseAddressChange={setCustomerHouseAddress}
            onLandmarkChange={setCustomerLandmark}
          />

          <input
            className={`w-full h-[52px] rounded-xl border px-4 text-sm ${
              errors.name ? 'border-red-400' : 'border-gray-300'
            }`}
            placeholder="Customer Name *"
            value={formData.name}
            onChange={e => handleChange('name', e.target.value)}
          />

          <input
            className={`w-full h-[52px] rounded-xl border px-4 text-sm ${
              errors.mobile ? 'border-red-400' : 'border-gray-300'
            }`}
            placeholder="+91 Receiver Phone Number *"
            value={formData.mobile}
            onChange={e => handleChange('mobile', e.target.value)}
          />

          <input
            type="number"
            className={`w-full h-[52px] rounded-xl border px-4 text-sm ${
              errors.price ? 'border-red-400' : 'border-gray-300'
            }`}
            placeholder="₹ Delivery Price *"
            value={formData.price || ''}
            onChange={e =>
              handleChange('price', parseFloat(e.target.value) || 0)
            }
          />

          {/* TERMS */}
          <div className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={e => {
                setAcceptedTerms(e.target.checked);
                setTermsError('');
              }}
              className="mt-1"
            />
            <p className="text-gray-600">
              I agree to the{' '}
              <span className="text-blue-600 underline cursor-pointer">
                Terms of Service
              </span>{' '}
              and{' '}
              <span className="text-blue-600 underline cursor-pointer">
                Privacy Policy
              </span>
            </p>
          </div>

          {termsError && (
            <p className="text-xs text-red-500">{termsError}</p>
          )}

          <button
            type="submit"
            disabled={disabled || !acceptedTerms}
            className="w-full h-[52px] rounded-full bg-[#FFCA28] font-semibold disabled:opacity-60"
          >
            Confirm Booking
          </button>

          <button
            type="button"
            onClick={handleSpecificRiderClick}
            disabled={disabled || !acceptedTerms}
            className="w-full h-[52px] rounded-full bg-gray-200 font-medium disabled:opacity-60"
          >
            Book Specific Rider
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full h-[52px] rounded-full border border-gray-300 font-medium"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>

    {/* ===== RIDER POPUP (BOTTOM SHEET) ===== */}
    {showRiderModal && (
      <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center">
        <div
          className="
            bg-white
            w-full
            max-w-md
            rounded-t-xl
            p-4
            max-h-[80vh]
            overflow-y-auto
          "
        >
          <h3 className="font-semibold mb-3">Select Rider</h3>

          {loadingRiders ? (
            <p className="text-center text-sm">Loading riders…</p>
          ) : (
            <div className="space-y-2">
              {riders.map(rider => (
                <div
                  key={rider.id}
                  onClick={() => setSelectedRider(rider.id)}
                  className={`p-3 border rounded-lg cursor-pointer ${
                    selectedRider === rider.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <p className="font-medium">{rider.name}</p>
                  <p className="text-xs text-gray-500">{rider.mobile}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setShowRiderModal(false)}
              className="flex-1 border rounded-lg py-2"
            >
              Cancel
            </button>
            <button
              onClick={handleSendToSpecificRider}
              disabled={!selectedRider}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    )}
  </>
);

}

export default ShipmentForm;
