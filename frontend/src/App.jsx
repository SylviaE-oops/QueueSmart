import { useState, useEffect } from 'preact/hooks';
import { Shell } from './components/Shell';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { UserDashboard } from './components/UserDashboard';
import { JoinQueuePage } from './components/JoinQueuePage';
import { ServiceManagement } from './components/ServiceManagement';
import { ToastContainer } from './components/Toast';
import { loadServices, loadQueues } from './api';
import './base.css';

export function App() {
  const [route, setRoute] = useState(location.hash || '#/login');
  const [role, setRole] = useState(null);
  const [email, setEmail] = useState('');
  const [services, setServices] = useState([]);
  const [queues, setQueues] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load session on mount
  useEffect(() => {
    const savedRole = localStorage.getItem('qs_role');
    const savedEmail = localStorage.getItem('qs_email');

    if (savedRole && ['user', 'admin'].includes(savedRole) && savedEmail) {
      setRole(savedRole);
      setEmail(savedEmail);
    }

    // Load services and queues
    const loadData = async () => {
      try {
        const [servicesResult, queuesResult] = await Promise.all([
          loadServices(),
          loadQueues()
        ]);

        if (servicesResult && servicesResult.success) {
          setServices(servicesResult.data || []);
        }

        if (queuesResult && queuesResult.success) {
          setQueues(queuesResult.data || []);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
        pushToast('Error', 'Failed to load data from server');
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Listen for hash changes
    const handleHashChange = () => {
      setRoute(location.hash || '#/login');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const pushToast = (title, message) => {
    setToasts((prev) => [{ title, message }, ...prev].slice(0, 5));
  };

  const dismissToast = (index) => {
    setToasts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLogin = (userData) => {
    setRole(userData.role);
    setEmail(userData.email);
    const nextPath =
      userData.role === 'admin' ? '#/admin/dashboard' : '#/app/dashboard';
    location.hash = nextPath;
  };

  const handleLogout = () => {
    setRole(null);
    setEmail('');
    localStorage.removeItem('qs_user_id');
    localStorage.removeItem('qs_role');
    localStorage.removeItem('qs_email');
    location.hash = '#/login';
  };

  const handleNavigate = (path) => {
    location.hash = path;
  };

  const requireAuth = () => {
    if (!role) {
      location.hash = '#/login';
      return false;
    }
    return true;
  };

  const loadData = async () => {
    try {
      const [servicesResult, queuesResult] = await Promise.all([
        loadServices(),
        loadQueues()
      ]);

      if (servicesResult && servicesResult.success) {
        setServices(servicesResult.data || []);
      }

      if (queuesResult && queuesResult.success) {
        setQueues(queuesResult.data || []);
      }
    } catch (err) {
      pushToast('Error', 'Failed to refresh data');
    }
  };

  // Auth pages do not use the shell layout
  if (route === '#/login' || route === '#/') {
    return (
      <>
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        <LoginPage
          onLoginSuccess={handleLogin}
          onNavigate={handleNavigate}
          onShowToast={pushToast}
        />
      </>
    );
  }

  if (route === '#/register') {
    return (
      <>
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        <RegisterPage onNavigate={handleNavigate} onShowToast={pushToast} />
      </>
    );
  }

  // Protected routes
  if (!requireAuth()) {
    return null;
  }

  // Role-based guard
  const isAdminRoute = route.startsWith('#/admin');
  if (isAdminRoute && role !== 'admin') {
    location.hash = '#/app/dashboard';
    return null;
  }

  const isUserRoute = route.startsWith('#/app');
  if (isUserRoute && role !== 'user') {
    location.hash = '#/admin/dashboard';
    return null;
  }

  // Determine page content
  let content = null;

  if (route === '#/app/dashboard') {
    content = (
      <UserDashboard
        services={services}
        onShowToast={pushToast}
      />
    );
  } else if (route === '#/app/join') {
    content = (
      <JoinQueuePage
        services={services}
        email={email}
        onShowToast={pushToast}
        onUpdateQueues={loadData}
      />
    );
  } else if (route === '#/admin/services') {
    content = (
      <ServiceManagement
        services={services}
        onShowToast={pushToast}
        onUpdateServices={loadData}
      />
    );
  } else if (route === '#/admin/dashboard') {
    content = (
      <div>
        <p class="h1">Admin Dashboard</p>
        <p class="p">Welcome, {role}!</p>
        <div class="card">
          <strong>System Status</strong>
          <p class="p">Services: {services.length}</p>
          <p class="p">Queues: {queues.length}</p>
        </div>
      </div>
    );
  } else {
    location.hash = role === 'admin' ? '#/admin/dashboard' : '#/app/dashboard';
    return null;
  }

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <Shell
        role={role}
        email={email}
        activePath={route}
        content={content}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
      />
    </>
  );
}
