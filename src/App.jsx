import { useEffect, useState } from 'react';
import LoginPage from './features/auth/components/LoginPage.jsx';
import AdminUserManagementPage from './features/admin/components/AdminUserManagementPage.jsx';
import { getCustomerGraphSession } from './features/auth/logic/authService.js';

function getCurrentPath() {
  return window.location.pathname || '/';
}

function isAdminRoute(path) {
  return path === '/admin/users' || path === '/admin/access-requests';
}

export default function App() {
  const [path, setPath] = useState(getCurrentPath());

  useEffect(() => {
    const handleNavigation = () => setPath(getCurrentPath());
    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('customergraph:navigate', handleNavigation);
    return () => {
      window.removeEventListener('popstate', handleNavigation);
      window.removeEventListener('customergraph:navigate', handleNavigation);
    };
  }, []);

  if (isAdminRoute(path)) {
    const session = getCustomerGraphSession();
    if (session?.role === 'admin') {
      // The old access-request URL remains usable and now shows this richer screen.
      return <AdminUserManagementPage />;
    }
  }

  return <LoginPage />;
}
