import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Mail,
  Lock,
  AlertCircle,
  Loader2,
  UserPlus,
  User,
  Phone,
  Store,
  Eye,
  EyeOff,
} from 'lucide-react';
import './Signup.css';

export default function Signup() {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    shopName: '',
    password: '',
    confirmPassword: '',
  });

  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateForm = () => {
    if (!formData.name.trim()) return setError('Name is required'), false;
    if (!formData.email.trim()) return setError('Email is required'), false;
    if (!formData.mobile.trim()) return setError('Mobile number is required'), false;
    if (!/^[6-9]\d{9}$/.test(formData.mobile.replace(/\s+/g, '')))
      return setError('Enter valid 10-digit mobile number'), false;
    if (formData.password.length < 6)
      return setError('Password must be at least 6 characters'), false;
    if (formData.password !== formData.confirmPassword)
      return setError('Passwords do not match'), false;
    if (!agree)
      return setError('Please agree to the Terms and Privacy Policy'), false;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { error } = await signUp(
        formData.email,
        formData.password,
        formData.mobile,
        formData.name,
        formData.shopName || undefined
      );

      if (error) {
        setError(error.message || 'Signup failed');
      } else {
        alert('✅ Account created successfully! Please check your email.');
        navigate('/login');
      }
    } catch (err: any) {
      setError(err?.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="su-root">
      <div className="su-card">
        <img src="/hands_2.png" alt="Welcome" className="su-illustration" />

        <h1 className="su-title">Welcome to OZU</h1>
        <p className="su-subtitle">
          Connect Your Store
          <br />
          Get control on your deliveries
        </p>

        <form onSubmit={handleSubmit} className="su-form">
          <Input
            icon={<Phone size={18} />}
            placeholder="Your Mobile Nuber"
            value={formData.mobile}
           inputMode="numeric"
            maxLength={10}
            onChange={v => {
              // keep only digits
              const digitsOnly = v.replace(/\D/g, '');

              // limit to 10 digits
              const value = digitsOnly.slice(0, 10);

              handleChange('mobile', value);
            }}
          />

          <Input
            icon={<Store size={18} />}
            placeholder="Business Name"
            value={formData.shopName}
            onChange={v => handleChange('shopName', v)}
          />

          <Input
            icon={<User size={18} />}
            placeholder="Full name"
            value={formData.name}
            onChange={v => handleChange('name', v)}
          />

          <Input
            icon={<Mail size={18} />}
            placeholder="Enter email ID"
            value={formData.email}
            onChange={v => handleChange('email', v)}
            type="email"
          />

          <Input
            icon={<Lock size={18} />}
            placeholder="Create a password"
            value={formData.password}
            onChange={v => handleChange('password', v)}
            type={showPassword ? 'text' : 'password'}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="su-eye-btn"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
          />

          <Input
            icon={<Lock size={18} />}
            placeholder="Confirm password"
            value={formData.confirmPassword}
            onChange={v => handleChange('confirmPassword', v)}
            type="password"
          />

          <div className="su-terms">
            <input
              type="checkbox"
              checked={agree}
              onChange={e => setAgree(e.target.checked)}
              className="su-checkbox"
            />
            <p className="su-terms-text">
              I've read and agree with the <span className="su-link">Terms and Conditions</span> and the <span className="su-link">Privacy Policy</span>
            </p>
          </div>

          {error && (
            <div className="su-error">
              <AlertCircle size={18} className="su-error-icon" />
              <p className="su-error-text">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="su-primary-btn"
          >
            {loading ? (
              <>
                <Loader2 className="su-spinner" size={18} />
                Creating...
              </>
            ) : (
              <>
                
                Get Started
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="su-secondary-btn"
          >
            Already registered? Login
          </button>
        </form>

        <p className="su-footer">© {new Date().getFullYear()} Ozu Admin</p>
      </div>
    </div>
  );
}

/* ---------- INPUT COMPONENT ---------- */
function Input({
  icon,
  placeholder,
  value,
  onChange,
  type = 'text',
  rightIcon,
}: {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  rightIcon?: React.ReactNode;
}) {
  return (
    <div className="su-input">
      <div className="su-input-icon">{icon}</div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="su-input-field"
      />
      {rightIcon && <div className="su-input-right">{rightIcon}</div>}
    </div>
  );
}
