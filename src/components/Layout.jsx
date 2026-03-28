import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ChatbotPanel from './ChatbotPanel';
import './Layout.css';

const Layout = () => {
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileOpen, setMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadNotasCount, setUnreadNotasCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const { count: pCount } = await supabase
          .from('citas')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pendiente');
        setPendingCount(pCount || 0);

        const { count: nCount } = await supabase
          .from('notas')
          .select('*', { count: 'exact', head: true })
          .eq('is_read', false);
        setUnreadNotasCount(nCount || 0);
      } catch (err) {
        console.error('Error fetching counts:', err);
      }
    };

    fetchCounts();

    const citaChannel = supabase.channel('cita-counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'citas' }, fetchCounts)
      .subscribe();

    const notaChannel = supabase.channel('nota-counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notas' }, fetchCounts)
      .subscribe();

    return () => {
      supabase.removeChannel(citaChannel);
      supabase.removeChannel(notaChannel);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className={`layout ${isSidebarCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
      {/* Sidebar Desktop */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-container">
            <img 
              src="/umbrella_no_bg_clean.png" 
              alt="KIVO Logo" 
              className="sidebar-logo"
            />
          </div>
          <button className="collapse-btn" onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/>
            </svg>
          </button>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </span>
            <span className="nav-text">Dashboard</span>
          </NavLink>
          
          <NavLink to="/notificaciones" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
             <span className="nav-icon" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {pendingCount > 0 && <span className="nav-badge">{pendingCount}</span>}
            </span>
            <span className="nav-text">Pipeline</span>
          </NavLink>

          <NavLink to="/analytics" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20V14"/></svg>
            </span>
            <span className="nav-text">Analytics</span>
          </NavLink>

          <NavLink to="/canceled" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </span>
            <span className="nav-text">Canceladas</span>
          </NavLink>

          <NavLink to="/notas" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              {unreadNotasCount > 0 && <span className="nav-badge unread">{unreadNotasCount}</span>}
            </span>
            <span className="nav-text">Notas</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <span className="nav-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </span>
            <span className="nav-text">Salir</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="mobile-header">
        <button className="menu-toggle" onClick={() => setMobileOpen(!isMobileOpen)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <span className="mobile-title">KIVO</span>
        <div style={{ width: 24 }}></div>
      </header>

      {/* Mobile Overlay */}
      {isMobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}

      <main className="content">
        <Outlet />
        <ChatbotPanel />
      </main>
    </div>
  );
};

export default Layout;
