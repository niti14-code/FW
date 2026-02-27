import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';

// Pages
import LoginPage        from './pages/LoginPage.jsx';
import RegisterPage     from './pages/RegisterPage.jsx';
import Dashboard        from './pages/Dashboard.jsx';
import CreateRide       from './pages/CreateRide.jsx';
import SearchRides      from './pages/SearchRides.jsx';
import RideDetail       from './pages/RideDetail.jsx';
import MyBookings       from './pages/MyBookings.jsx';
import ProviderBookings from './pages/ProviderBookings.jsx';

// ── Page registry ─────────────────────────────────────────────────
const PAGE_MAP = {
  login:              LoginPage,
  register:           RegisterPage,
  dashboard:          Dashboard,
  'create-ride':      CreateRide,
  'search-rides':     SearchRides,
  'ride-detail':      RideDetail,
  'my-bookings':      MyBookings,
  'provider-bookings':ProviderBookings,
};
const PUBLIC_PAGES = ['login', 'register'];

// ── Inner router (has access to auth context) ─────────────────────
function Router() {
  const { user } = useAuth();
  const [page,      setPage]      = useState(user ? 'dashboard' : 'login');
  const [pageProps, setPageProps] = useState({});

  const navigate = (to, props = {}) => {
    setPage(to);
    setPageProps(props);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Auth guard
  const isPublic = PUBLIC_PAGES.includes(page);
  if (!user && !isPublic) return <LoginPage navigate={navigate} />;
  if (user  &&  isPublic) return (
    <>
      <Navbar navigate={navigate} currentPage="dashboard" />
      <main className="with-nav"><Dashboard navigate={navigate} /></main>
    </>
  );

  const PageComponent = PAGE_MAP[page] || Dashboard;
  const showNav = !isPublic;

  return (
    <div className="app-shell">
      {showNav && <Navbar navigate={navigate} currentPage={page} />}
      <main className={showNav ? 'with-nav' : ''}>
        <PageComponent navigate={navigate} {...pageProps} />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
