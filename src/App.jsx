import { useEffect, useState } from 'react';
import LoginPage from './features/auth/components/LoginPage.jsx';
import AdminUserManagementPage from './features/admin/components/AdminUserManagementPage.jsx';
import MainDashboardPage from './features/dashboard/components/MainDashboardPage.jsx';
import CustomerDirectoryPage from './features/auth/components/CustomerDirectoryPage.jsx';
import SettingsPage from './features/settings/components/SettingsPage.jsx';
import { getCustomerGraphSession } from './features/auth/logic/authService.js';

function getCurrentPath() {
  return window.location.pathname || '/';
}

function isAdminRoute(path) {
  return path === '/admin/users' || path === '/admin/access-requests';
}

export default function App() {
  const [path, setPath] = useState(getCurrentPath());
  const session = getCustomerGraphSession();

  useEffect(() => {
    const handleNavigation = () => setPath(getCurrentPath());
    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('customergraph:navigate', handleNavigation);
    return () => {
      window.removeEventListener('popstate', handleNavigation);
      window.removeEventListener('customergraph:navigate', handleNavigation);
    };
  }, []);

  if (!session?.accessToken) return <LoginPage />;

  if (path === '/customers') return <CustomerDirectoryPage />;
  if (path === '/settings' && session.role === 'admin') return <SettingsPage />;
  if (isAdminRoute(path) && session.role === 'admin') return <AdminUserManagementPage />;

  // Dashboard is the default authenticated landing page. Unsupported/deep links
  // intentionally fall back here until their backend modules are implemented.
  return <MainDashboardPage />;
}
