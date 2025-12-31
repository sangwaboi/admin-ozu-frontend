import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Lock, Loader2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const from = (location.state as any)?.from?.pathname || '/shipment';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message || 'Login failed');
        setLoading(false);
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setError(err?.message || 'Unexpected error');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex justify-center px-4 font-[DM Sans]">
      <div className="w-full max-w-[377px] pt-24">

        {/* FIGMA HEADING */}
        <h1
          className="su-title"
        >
          Welcome Back
        </h1>
          <p className="su-subtitle">
          Please enter your details
        </p>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">

          <Input
            icon={<Mail />}
            placeholder="Enter email ID"
            value={email}
            onChange={setEmail}
            type="email" 
          />

          <Input
            icon={<Lock />}
            placeholder="Enter your password"
            value={password}
            onChange={setPassword}
            type="password" 
          />

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {/* LOGIN BUTTON */}
          <button
  type="submit"
  disabled={loading}
  className="
    w-full
    h-[57px]
    rounded-xl
    bg-[#FFCA20]
    text-black
    font-semibold
    flex
    items-center
    justify-center
    border-none
    cursor-pointer
    disabled:opacity-60
    disabled:cursor-not-allowed
  "
>
  {loading ? (
    <Loader2 className="w-5 h-5 animate-spin" />
  ) : (
    "Login"
  )}
</button>
        </form>

        {/* SIGNUP LINK */}
        <p className="mt-6 text-center text-[14px] text-[#5F5F5F] font-medium">
          Don't have an account?{' '}
          <Link to="/signup" className="text-[#006FFD;] font-medium">
            Create New
          </Link>
        </p>
      </div>
    </div>
  );
}

/* ===== INPUT COMPONENT ===== */
function Input({
  icon,
  placeholder,
  value,
  onChange,
  type = 'text',
}: any) {
  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
        {icon}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
    w-full
    h-[58px]
    font-medium
    border-2
    border-[#d1d5db]
    pl-[3.5rem]
    pr-[3.5rem]
    rounded-xl
    text-[15px]
    box-border
  "

        required
      />
    </div>
  );
}
