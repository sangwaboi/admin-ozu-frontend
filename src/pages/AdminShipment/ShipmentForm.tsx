import { useState } from 'react';
import { CustomerDetails } from './index';
import LocationSearchInput, { LocationResult } from '../../components/LocationSearchInput';
import { authenticatedFetch } from '../../lib/api';
import './ShipmentForm.css';

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

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsError, setTermsError] = useState('');

  const handleChange = (field: keyof CustomerDetails, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleCustomerLocationSelect = (location: LocationResult) => {
    const locationLink = `${location.lat},${location.lng}`;
    const fullAddress = [customerHouseAddress, location.address].filter(Boolean).join(', ');

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
    if (!formData.locationLink) newErrors.locationLink = 'Please select customer location';
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

  return (
    <>
      {/* Booking Popup */}
      <div className="sf-overlay">
        <div className="sf-popup">
          <div className="sf-title-wrap">
            <h2 className="sf-title">Booking Details</h2>
          </div>

          <form onSubmit={handleSubmit} className="sf-form">
            
            <LocationSearchInput
              value={customerLocationDisplay}
              onChange={handleCustomerLocationSelect}
              placeholder="Customer location *"
              // label="Customer Location"
              required
              error={errors.locationLink}
              showAddressFields
              houseAddress={customerHouseAddress}
              landmark={customerLandmark}
              onHouseAddressChange={setCustomerHouseAddress}
              onLandmarkChange={setCustomerLandmark}
              
            />

            <input
              className={`sf-input ${errors.name ? 'sf-input-error' : ''}`}
              placeholder="Customer Name *"
              value={formData.name}
              onChange={e => handleChange('name', e.target.value)}
            />

            <input
              className={`sf-input ${errors.mobile ? 'sf-input-error' : ''}`}
              placeholder="Receiver Phone Number *"
              value={formData.mobile}
              onChange={e => handleChange('mobile', e.target.value)}
            />

            <input
              type="number"
              className={`sf-input ${errors.price ? 'sf-input-error' : ''}`}
              placeholder="₹ Delivery Price *"
              value={formData.price || ''}
              onChange={e => handleChange('price', parseFloat(e.target.value) || 0)}
            />
            <small className='support-text'>Amount you will pay to the rider</small>

            {/* Terms */}
            <div className="sf-terms">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={e => {
                  setAcceptedTerms(e.target.checked);
                  setTermsError('');
                }}
                className="sf-terms-checkbox"
              />
              <p className="sf-terms-text">
                I agree to the <span className="sf-link">Terms of Service</span> and{' '}
                <span className="sf-link">Privacy Policy</span>
              </p>
            </div>

            {termsError && <p className="sf-terms-error">{termsError}</p>}

            <button
              type="submit"
              disabled={disabled || !acceptedTerms}
              className="sf-btn sf-btn-confirm"
            >
              Confirm Booking
            </button>

            <button
              type="button"
              onClick={handleSpecificRiderClick}
              disabled={disabled || !acceptedTerms}
              className="sf-btn sf-btn-secondary"
            >
              Book Specific Rider
            </button>

            <button
              type="button"
              onClick={onClose}
              className="sf-btn sf-btn-cancel"
            >
              Cancel
            </button>
          </form>
        </div>
      </div>

      {/* Rider Popup */}
      {showRiderModal && (
        <div className="sf-overlay">
          <div className="sf-rider-popup">
            <h3 className="sf-rider-title">Select Rider</h3>

            {loadingRiders ? (
              <p className="sf-rider-loading">Loading riders…</p>
            ) : (
              <div className="sf-rider-list">
                {riders.map(rider => (
                  <div
                    key={rider.id}
                    onClick={() => setSelectedRider(rider.id)}
                    className={`sf-rider-item ${
                      selectedRider === rider.id ? 'sf-rider-selected' : ''
                    }`}
                  >
                    <p className="sf-rider-name">{rider.name}</p>
                    <p className="sf-rider-mobile">{rider.mobile}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="sf-rider-actions">
              <button
                onClick={() => setShowRiderModal(false)}
                className="sf-btn sf-btn-cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleSendToSpecificRider}
                disabled={!selectedRider}
                className="sf-btn sf-btn-send"
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
