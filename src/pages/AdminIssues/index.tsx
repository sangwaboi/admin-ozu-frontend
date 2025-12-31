import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShipmentIssue } from '@/types/issue';
import { IssuesAPI } from '@/lib/api';
import IssueCard from './IssueCard';
import { Home, Map, AlertTriangle, Bike, RotateCcw, ArrowLeft } from 'lucide-react';
import Lottie from 'lottie-react';
import loadingIssuesAnimation from '@/assets/loading-issues.json';
import './AdminIssues.css';

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
    <div className="ai-root">

      {/* ================= TOP BAR ================= */}
      <header className="ai-topbar">

        <div className="ai-topbar-row">
          <div className="ai-left-group">
            <button className="ai-back-btn" onClick={() => navigate('/shipment')}>
              <ArrowLeft />
            </button>

            {/* OZU LOGO */}
            <div className="ai-logo-wrap">
              <img
                src="/ozu-logo.png"
                alt="OZU"
                className="ai-logo-img"
              />
            </div>
          </div>

          {/* PROFILE AVATAR */}
          <button
            onClick={() => navigate('/profile')}
            className="ai-profile-btn"
            aria-label="Profile"
          >
            <img
              src="/ava2.png"
              alt="Profile"
              className="ai-profile-img"
            />
          </button>
        </div>

        <div className="ai-title-row">
          <div className="ai-title-block">
            <h2 className="ai-title">Delivery Issues</h2>

            <p className="ai-subtitle">
              Manage and respond to delivery issues
            </p>
          </div>

          <button
            onClick={fetchIssues}
            className="ai-refresh-button"
          >
            <RotateCcw className="ai-refresh-icon" />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* ================= FILTER CARDS ================= */}
      <div className="ai-filters-container">
        <div className="ai-filters-grid">
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
      <div className="ai-issues-list">
        {loading ? (
          <div className="ai-loading-wrap">
            <Lottie
              animationData={loadingIssuesAnimation}
              loop
              className="ai-loading-lottie"
            />
          </div>
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

        {/* ===== BOTTOM NAV (FIGMA EXACT) ===== */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 h-[76px] bg-white rounded-t-2xl shadow-[0_-1px_12px_rgba(0,0,0,0.11)]">
        <div className="max-w-[439px] mx-auto h-full flex justify-around items-center">
          {/* HOME */}
          <button
            onClick={() => navigate("/shipment")}
            className="flex flex-col items-center justify-center text-[11px] font-medium text-[#2B2B2B]"
          >
            <Home size={22} strokeWidth={1.8} />
            <span className="mt-1">HOME</span>
          </button>

          {/* ISSUES (ACTIVE SAMPLE) */}
          <button
            onClick={() => navigate("/issues")}
            className="flex flex-col items-center justify-center text-[11px] font-medium text-[#2B2B2B]"
          >
            <AlertTriangle size={22} strokeWidth={1.8} />
            <span className="mt-1">ISSUES</span>
          </button>

          {/* MAP */}
          <button
            onClick={() => navigate("/map")}
            className="flex flex-col items-center justify-center text-[11px] font-medium text-[#2B2B2B]"
          >
            <Map size={22} strokeWidth={1.8} />
            <span className="mt-1">MAP</span>
          </button>

          {/* RIDERS */}
          <button
            onClick={() => navigate("/riders")}
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
    gray: 'ai-filter-gray',
    red: 'ai-filter-red',
    green: 'ai-filter-green',
    blue: 'ai-filter-blue',
  };

  const activeClass = active ? 'ai-filter-active' : '';

  return (
    <button
      onClick={onClick}
      className={`ai-filter-box ${colors[color]} ${activeClass}`}
    >
      <div className="ai-filter-value">{value}</div>
      <div className="ai-filter-label">{label}</div>
    </button>
  );
}
