import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShipmentIssue } from '@/types/issue';
import { IssuesAPI } from '@/lib/api';
import IssueCard from './IssueCard';
import { Home, Map, AlertTriangle, Bike, RotateCcw,ArrowLeft } from 'lucide-react';

export default function AdminIssues() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState<ShipmentIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] =
    useState<'all' | 'reported' | 'admin_responded' | 'resolved'>('all');

  const fetchIssues = async () => {
    try {
      const data = await IssuesAPI.getAll();
      setIssues(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
    const interval = setInterval(fetchIssues, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredIssues = issues.filter(i =>
    filter === 'all' ? true : i.status === filter
  );

  const count = (s: ShipmentIssue['status']) =>
    issues.filter(i => i.status === s).length;

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-28 font-[DM Sans]">

      {/* ================= TOP BAR ================= */}
      <header className="bg-white px-4 pt-4 pb-3 border-b">
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/shipment')}>
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

         {/* PROFILE AVATAR */}
  <button
    onClick={() => navigate('/profile')}
    className="w-[46px] h-[46px] rounded-full border border-black overflow-hidden"
  >
    <img
      src="/ava2.png"
      alt="Profile"
      className="w-full h-full object-cover"
    />
  </button>

        </div>

        <div className="mt-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Delivery Issues</h2>
            <p className="text-sm text-gray-500">
              Manage and respond to delivery issues
            </p>
          </div>

          <button
            onClick={fetchIssues}
            className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
          >
            <RotateCcw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </header>

      {/* ================= FILTER CARDS ================= */}
      <div className="px-4 mt-4">
        <div className="grid grid-cols-4 gap-2">
          <FilterBox
            label="All Issues"
            value={issues.length}
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          />
          <FilterBox
            label="Need Response"
            value={count('reported')}
            color="red"
            active={filter === 'reported'}
            onClick={() => setFilter('reported')}
          />
          <FilterBox
            label="Waiting for Rider"
            value={count('admin_responded')}
            color="green"
            active={filter === 'admin_responded'}
            onClick={() => setFilter('admin_responded')}
          />
          <FilterBox
            label="Resolved"
            value={count('resolved')}
            color="blue"
            active={filter === 'resolved'}
            onClick={() => setFilter('resolved')}
          />
          
        </div>
      </div>

      {/* ================= ISSUE LIST ================= */}
      <div className="px-4 mt-4 space-y-4">
        {loading ? (
          <p className="text-center text-sm text-gray-500">
            Loading issues…
          </p>
        ) : (
          filteredIssues.map(issue => (
            <IssueCard
              key={issue.id}
              issue={issue}
              onUpdate={fetchIssues}
            />
          ))
        )}
      </div>

      {/* ================= BOTTOM NAV ================= */}
      {/* ===== BOTTOM NAV (FIGMA EXACT) ===== */}
<nav className="fixed bottom-0 left-0 right-0 z-50 h-[76px] bg-white rounded-t-2xl shadow-[0_-1px_12px_rgba(0,0,0,0.11)]">
  <div className="max-w-[439px] mx-auto h-full flex justify-around items-center">
    
    {/* HOME */}
    <button
      onClick={() => navigate('/shipment')}
      className="flex flex-col items-center justify-center text-[11px] font-medium text-[#2B2B2B]"
    >
      <Home size={22} strokeWidth={1.8} />
      <span className="mt-1">HOME</span>
    </button>

    {/* ISSUES (ACTIVE SAMPLE) */}
    <button
      onClick={() => navigate('/issues')}
      className="flex flex-col items-center justify-center text-[11px] font-medium text-[#2B2B2B]"
    >
      <AlertTriangle size={22} strokeWidth={1.8} />
      <span className="mt-1">ISSUES</span>
    </button>

    {/* MAP */}
    <button
      onClick={() => navigate('/map')}
      className="flex flex-col items-center justify-center text-[11px] font-medium text-[#2B2B2B]"
    >
      <Map size={22} strokeWidth={1.8} />
      <span className="mt-1">MAP</span>
    </button>

    {/* RIDERS */}
    <button
      onClick={() => navigate('/riders')}
      className="flex flex-col items-center justify-center text-[11px] font-medium text-[#2B2B2B]"
    >
      <Bike size={22} strokeWidth={1.8} />
      <span className="mt-1">RIDERS</span>
    </button>

  </div>
</nav>

    </div>
  );
}

/* ================= FILTER CARD ================= */

function FilterBox({
  label,
  value,
  active,
  onClick,
  color = 'gray',
}: any) {
  const colors: any = {
    gray: 'bg-gray-200 text-gray-700',
    red: 'bg-red-100 text-red-600',
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
  };

  return (
    <button
      onClick={onClick}
      className={`rounded-xl p-2 text-center border ${
        active ? 'border-black' : 'border-transparent'
      } ${colors[color]}`}
    >
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[11px] leading-tight">{label}</div>
    </button>
  );
}
