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
    <div className="min-h-screen bg-gradient-to-b from-[#F9FAFB] to-white px-4 font-['DM Sans']">
      <div className="max-w-md mx-auto flex flex-col items-center pt-20">

        {/* Illustration */}
        <img
          src="/hands_2.png"
          alt="Welcome"
          className="w-[77px] h-[138px] object-contain mb-6"
        />

        {/* Heading */}
        <h1 className="text-[24px] font-bold text-[#111111] text-center">
          Welcome to OZU
        </h1>
        <p className="text-[20px] font-semibold text-[#5F5F5F] text-center mt-2">
          Connect Your Store
          <br />
          Get control on your deliveries
        </p>

        <form onSubmit={handleSubmit} className="w-full mt-10 space-y-3">

          <Input
            icon={<Phone size={18} />}
            placeholder="+91 98765 43210"
            value={formData.mobile}
            onChange={v => handleChange('mobile', v)}
          />

          <Input
            icon={<Store size={18} />}
            placeholder="ABC Store"
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
            placeholder="name@email.com"
            value={formData.email}
            onChange={v => handleChange('email', v)}
            type="email"
          />

          {/* PASSWORD WITH EYE */}
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
                className="text-[#9E9E9E]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
          />

          {/* CONFIRM PASSWORD (NO EYE) */}
          <Input
            icon={<Lock size={18} />}
            placeholder="Confirm password"
            value={formData.confirmPassword}
            onChange={v => handleChange('confirmPassword', v)}
            type="password"
          />

          {/* TERMS */}
          <div className="flex items-start gap-3 mt-2">
            <input
              type="checkbox"
              checked={agree}
              onChange={e => setAgree(e.target.checked)}
              className="mt-1 h-4 w-4"
            />
            <p className="text-xs text-gray-600">
              I agree to the{' '}
              <span className="text-[#FFCA20] underline">Terms</span> and{' '}
              <span className="text-[#FFCA20] underline">Privacy Policy</span>
            </p>
          </div>

          {error && (
            <div className="flex gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertCircle size={18} className="text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[58px] rounded-[20px] bg-[#FFCA20] font-semibold flex justify-center items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Creating...
              </>
            ) : (
              <>
                <UserPlus size={18} />
                Get Started
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full h-[58px] rounded-[20px] bg-[#EFEFEF] text-[#B0B0B0]"
          >
            Login
          </button>
        </form>

        <p className="mt-6 text-xs text-gray-400 text-center">
          © {new Date().getFullYear()} Ozu Admin
        </p>
      </div>
    </div>
  );
}

/* ---------- INPUT ---------- */
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
    <div className="w-full h-[58px] rounded-[20px] border border-[#E0E0E0] px-4 flex items-center gap-3 bg-white">
      <div className="text-[#9E9E9E]">{icon}</div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 outline-none text-[14px]"
      />
      {rightIcon && <div>{rightIcon}</div>}
    </div>
  );
}
