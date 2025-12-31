import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

/* Shipment pages */

/* Auth pages */
import Welcome from './pages/Auth/Welcome';
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';

/* App pages */
import AdminPortal from '@/pages/AdminPortal';
import AdminShipment from '@/pages/AdminShipment';
import AllShipmentsMap from '@/pages/AllShipmentsMap';
import AdminProfile from '@/pages/AdminProfile';
import AdminIssues from '@/pages/AdminIssues';
import RiderApproval from '@/pages/RiderApproval';
import TenantSettings from '@/pages/TenantSettings';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ================= PUBLIC ROUTES ================= */}
          <Route path="/" element={<Welcome />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          

          {/* ================= PROTECTED ROUTES ================= */}
         

          <Route
            path="/shipment"
            element={
              <ProtectedRoute>
                <AdminShipment />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <AdminProfile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/map"
            element={
              <ProtectedRoute>
                <AllShipmentsMap />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tracking"
            element={
              <ProtectedRoute>
                <AdminPortal />
              </ProtectedRoute>
            }
          />

          <Route
            path="/issues"
            element={
              <ProtectedRoute>
                <AdminIssues />
              </ProtectedRoute>
            }
          />

          <Route
            path="/riders"
            element={
              <ProtectedRoute>
                <RiderApproval />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tenant-settings"
            element={
              <ProtectedRoute>
                <TenantSettings />
              </ProtectedRoute>
            }
          />

          {/* ================= FALLBACK ================= */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
