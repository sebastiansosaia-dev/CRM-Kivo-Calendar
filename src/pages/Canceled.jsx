import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './Pipeline.css';

const Canceled = () => {
  const [citasCanceled, setCitasCanceled] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    
    const fetchCitas = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('citas')
        .select('*')
        .or('status.eq.cancelada,status.eq.denegada')
        .order('updated_at', { ascending: false });
        
      if (!error && active) {
        setCitasCanceled(data || []);
      }
      if (active) setLoading(false);
    };

    fetchCitas();

    const channel = supabase
      .channel('canceled-citas')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'citas' },
        (payload) => {
          if (!active) return;
          const { eventType, new: newRec, old: oldRec } = payload;
          
          setCitasCanceled(prev => {
            if (eventType === 'INSERT' && (newRec.status === 'cancelada' || newRec.status === 'denegada')) {
              return [newRec, ...prev];
            } else if (eventType === 'UPDATE') {
              if (newRec.status !== 'cancelada' && newRec.status !== 'denegada') {
                return prev.filter(c => c.id !== newRec.id);
              }
              const exists = prev.find(c => c.id === newRec.id);
              if (exists) {
                return prev.map(c => c.id === newRec.id ? newRec : c);
              }
              return [newRec, ...prev].sort((a,b) => new Date(b.updated_at) - new Date(a.updated_at));
            } else if (eventType === 'DELETE') {
              return prev.filter(c => c.id !== oldRec.id);
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const formatDisplay = (date) => {
    if (!date) return '';
    const dt = new Date(date);
    const formatter = new Intl.DateTimeFormat('es-HN', {
      timeZone: 'America/Tegucigalpa',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    return formatter.format(dt);
  };

  return (
    <div className="pipeline-page">
      <div className="pipeline-header">
        <h2>Canceladas & Rechazadas</h2>
        <span className="count-badge" style={{ backgroundColor: '#E53935' }}>{citasCanceled.length}</span>
      </div>

      <div className="pipeline-container">
        {loading ? (
          <>
            <div className="kanban-card skeleton-card skeleton-shimmer"></div>
            <div className="kanban-card skeleton-card skeleton-shimmer"></div>
            <div className="kanban-card skeleton-card skeleton-shimmer"></div>
          </>
        ) : citasCanceled.length === 0 ? (
          <div className="pipeline-empty-state">
             <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#E8E2D9" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
            <h3>Historial Limpio</h3>
            <p>No hay citas canceladas o denegadas recientes.</p>
          </div>
        ) : (
          citasCanceled.map(cita => (
            <div 
              key={cita.id} 
              className="kanban-card"
              style={{ borderLeftColor: '#E53935' }}
            >
              <div className="card-header">
                <h3 className="client-name">{cita.cliente_nombre}</h3>
                <div className="status-indicator" style={{ backgroundColor: '#E53935' }}></div>
              </div>
              
              <div className="card-details">
                <div className="detail-row">
                  <span className="detail-label">Fecha original:</span>
                  <span className="capitalize">{formatDisplay(cita.fecha_inicio)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Estado:</span>
                  <span className="capitalize" style={{ color: '#E53935', fontWeight: 500 }}>{cita.status}</span>
                </div>
                <div className="detail-row reason" style={{ marginTop: '4px' }}>
                  <span className="detail-label">Razón ({formatDisplay(cita.updated_at)}):</span>
                  <p style={{ background: '#F9F7F4', padding: '8px', borderRadius: '6px', fontSize: '13px' }}>
                    {cita.motivo_cancelacion || 'Ningún motivo registrado.'}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Canceled;
