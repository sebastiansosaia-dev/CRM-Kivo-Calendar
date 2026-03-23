import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import './Layout.css';

const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {
    console.warn('Audio play failed', e);
  }
};

const Layout = () => {
  const { role = null, loading, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadNotasCount, setUnreadNotasCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (role === 'jefe' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch((e) => console.warn('Notification permission error:', e));
      }
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('SW registration failed:', e));
      }
    }
  }, [role]);

  useEffect(() => {
    if (location.pathname === '/notas') {
      setUnreadNotasCount(0);
      localStorage.setItem('last_notas_visit', new Date().toISOString());
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    if (role !== 'jefe') return;

    const fetchCount = async () => {
      const { count } = await supabase
        .from('citas')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pendiente');
      setPendingCount(count || 0);
    };

    fetchCount();

    const channel = supabase
      .channel('global-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'citas'
      }, (payload) => {
        if (payload.new?.status !== 'pendiente') return;
        setPendingCount(prev => {
          playNotificationSound();
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Nueva Cita Pendiente', {
              body: `Tienes una nueva solicitud de cita de ${payload.new.cliente_nombre || 'KIVO Dashboard'}.`,
              icon: '/umbrella_no_bg_clean.png'
            });
          }
          return prev + 1;
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'citas'
      }, () => {
        fetchCount();
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'citas'
      }, () => {
        fetchCount();
      })
      .subscribe();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchCount();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [role]);

  useEffect(() => {
    const fetchUnread = async () => {
      const lastVisit = localStorage.getItem('last_notas_visit');
      let query = supabase.from('notas').select('*', { count: 'exact', head: true });
      if (lastVisit) query = query.gt('created_at', lastVisit);
      const { count, error } = await query;
      if (!error) setUnreadNotasCount(count || 0);
    };

    fetchUnread();

    const channel = supabase
      .channel('notas-unread')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notas' }, () => {
        if (window.location.pathname !== '/notas') {
          setUnreadNotasCount(prev => prev + 1);
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    if (pendingCount > 0) {
      document.title = `(${pendingCount}) KIVO Calendar`;
    } else {
      document.title = 'KIVO Calendar';
    }
  }, [pendingCount]);

  return (
    <div className="layout">
      {/* Mobile Fixed Navbar */}
      <div className="mobile-navbar">
        <button className="hamburger-btn" onClick={() => setMobileMenuOpen(true)} style={{ position: 'relative' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
          {pendingCount > 0 && (
            <span style={{ position: 'absolute', top: '-1px', right: '-1px', width: '10px', height: '10px', background: '#eab308', borderRadius: '50%', border: '2px solid #FFFFFF' }}></span>
          )}
        </button>
        <span className="mobile-navbar-title">
          {location.pathname === '/' ? 'KIVO Calendar' : 
           location.pathname.startsWith('/notificaciones') ? 'Pendientes' : 
           location.pathname.startsWith('/analytics') ? 'Analytics' :
           location.pathname.startsWith('/notas') ? 'Notas del Equipo' :
           location.pathname.startsWith('/canceled') ? 'Canceladas & Rechazadas' : 'KIVO'}
        </span>
        <div style={{ width: '40px' }}></div>
      </div>

      <div 
        className={`mobile-overlay ${mobileMenuOpen ? 'open' : ''}`} 
        onClick={() => setMobileMenuOpen(false)}
      ></div>

      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <NavLink to="/" onClick={() => setMobileMenuOpen(false)}>
            <img src="/umbrella_no_bg_clean.png" alt="KIVO Logo" className="sidebar-logo" />
          </NavLink>
        </div>
        <nav className="sidebar-nav">
          {loading ? (
            <div style={{ padding: '12px 20px', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Cargando...</div>
          ) : (
            <>
              <NavLink 
                to="/" 
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
                end
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span className="nav-label">Dashboard</span>
              </NavLink>

              {role === 'jefe' && (
                <NavLink 
                  to="/notificaciones" 
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                    {pendingCount > 0 && (
                      <span style={{
                        position: 'absolute', top: '-4px', right: '-4px',
                        minWidth: '16px', height: '16px',
                        background: '#eab308', color: '#161B21',
                        fontSize: '9px', fontWeight: 'bold',
                        borderRadius: '8px', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        padding: '0 3px', lineHeight: 1,
                        border: '1.5px solid #1F1A17'
                      }}>
                        {pendingCount > 9 ? '9+' : pendingCount}
                      </span>
                    )}
                  </span>
                  <span className="nav-label">Notificaciones</span>
                </NavLink>
              )}

              <NavLink 
                to="/analytics" 
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
                <span className="nav-label">Analytics</span>
              </NavLink>

              <NavLink 
                to="/notas" 
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span className="nav-label">Notas</span>
                {unreadNotasCount > 0 && (
                  <span style={{ marginLeft: 'auto', background: '#eab308', color: '#161B21', fontSize: '11px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '12px' }}>
                    {unreadNotasCount}
                  </span>
                )}
              </NavLink>

              {role === 'jefe' && (
                <NavLink 
                  to="/canceled" 
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                  </svg>
                  <span className="nav-label">Canceladas</span>
                </NavLink>
              )}
            </>
          )}
        </nav>
        <div 
          className="sidebar-footer" 
          onClick={handleLogout}  
          style={{ marginTop: 'auto', marginBottom: '24px', padding: '16px 24px', cursor: 'pointer', color: '#D97745', fontSize: '15px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '12px', transition: 'background-color 0.2s, color 0.2s' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          <span className="nav-label">Cerrar Sesión</span>
        </div>
      </aside>

      <div className="main-area">
        <main className="content">
          <Outlet context={{ decrementPending: () => setPendingCount((prev) => Math.max(0, prev - 1)) }} />
        </main>
      </div>
    </div>
  );
};

export default Layout;
