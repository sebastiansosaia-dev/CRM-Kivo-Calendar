import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import DetailModal from '../components/DetailModal';
import './Pipeline.css';

const Notificaciones = () => {
  const [citasPending, setCitasPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [buttonStates, setButtonStates] = useState({});

  useEffect(() => {
    let active = true;
    
    const fetchCitas = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('citas')
        .select('*')
        .eq('status', 'pendiente')
        .order('created_at', { ascending: false });
        
      if (!error && active) {
        setCitasPending(data || []);
      }
      if (active) setLoading(false);
    };

    fetchCitas();

    const channel = supabase
      .channel('notificaciones-citas')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'citas' },
        (payload) => {
          if (!active) return;
          const { eventType, new: newRec, old: oldRec } = payload;
          
          setCitasPending(prev => {
            if (eventType === 'INSERT' && newRec.status === 'pendiente') {
              return [newRec, ...prev];
            } else if (eventType === 'UPDATE') {
              if (newRec.status !== 'pendiente') {
                return prev.filter(c => c.id !== newRec.id);
              }
              const exists = prev.find(c => c.id === newRec.id);
              if (exists) {
                return prev.map(c => c.id === newRec.id ? newRec : c);
              }
              return [newRec, ...prev];
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

  const onAccept = async (cita) => {
    setActionLoading(cita.id);
    const payload = {
      cita_id: cita.id,
      chatwoot_conv_id: cita.chatwoot_conv_id || '',
      cliente_nombre: cita.cliente_nombre || '',
      cliente_contacto: cita.cliente_contacto || '',
      fecha_inicio: cita.fecha_inicio,
      fecha_fin: cita.fecha_fin
    };

    try {
      await fetch('https://n8n.srv1306518.hstgr.cloud/webhook/cita-confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setButtonStates(prev => ({ ...prev, [cita.id]: 'accepted' }));
      // We don't remove the card immediately, wait for realtime or modal close
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const onDeny = async (cita, reason) => {
    setActionLoading(cita.id);
    const payload = {
      cita_id: cita.id,
      chatwoot_conv_id: cita.chatwoot_conv_id || '',
      cliente_nombre: cita.cliente_nombre || '',
      cliente_contacto: cita.cliente_contacto || '',
      fecha_inicio: cita.fecha_inicio,
      motivo_cancelacion: reason || 'Cancelado por administración'
    };

    try {
      await fetch('https://n8n.srv1306518.hstgr.cloud/webhook/cita-denegar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setButtonStates(prev => ({ ...prev, [cita.id]: 'denied' }));
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      if (buttonStates[selectedEvent?.id]) {
        setSelectedEvent(null);
      }
    }, 300);
  };
  
  const handleCardClick = (cita) => {
    setSelectedEvent(cita);
    setIsModalOpen(true);
    setButtonStates(prev => ({ ...prev, [cita.id]: null }));
  };

  const formatDisplay = (date) => {
    const dt = new Date(date);
    const formatter = new Intl.DateTimeFormat('es-HN', {
      timeZone: 'America/Tegucigalpa',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    return formatter.format(dt) + ' (HND)';
  };

  return (
    <div className="pipeline-page">
      <div className="pipeline-header">
        <h2>Solicitudes Pendientes</h2>
        <span className="count-badge">{citasPending.length}</span>
      </div>

      <div className="pipeline-container">
        {loading ? (
          <>
            <div className="kanban-card skeleton-card skeleton-shimmer"></div>
            <div className="kanban-card skeleton-card skeleton-shimmer"></div>
            <div className="kanban-card skeleton-card skeleton-shimmer"></div>
          </>
        ) : citasPending.length === 0 ? (
          <div className="pipeline-empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#E8E2D9" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            <h3>Todo al Día</h3>
            <p>No hay solicitudes pendientes por revisar.</p>
          </div>
        ) : (
          citasPending.map(cita => {
            const state = buttonStates[cita.id];
            const isExiting = state === 'accepted' || state === 'denied';
            return (
              <div 
                key={cita.id} 
                className={`kanban-card ${isExiting ? 'card-exiting' : ''}`}
              >
                <div className="card-click-area" onClick={() => handleCardClick(cita)}>
                  <div className="card-header">
                    <h3 className="client-name">{cita.cliente_nombre}</h3>
                    <div className="status-indicator pending"></div>
                  </div>
                  
                  <div className="card-details">
                    <div className="detail-row">
                      <span className="detail-label">Fecha:</span>
                      <span className="capitalize">{formatDisplay(cita.fecha_inicio)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Contacto:</span>
                      <span>{cita.cliente_contacto}</span>
                    </div>
                    {cita.motivo && (
                      <div className="detail-row reason">
                        <span className="detail-label">Motivo:</span>
                        <p>{cita.motivo}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="card-actions">
                  <button 
                    className="btn btn-primary" 
                    onClick={() => handleCardClick(cita)}
                    disabled={actionLoading === cita.id || isExiting}
                  >
                    Revisar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <DetailModal 
        isOpen={isModalOpen}
        cita={selectedEvent}
        onClose={closeModal}
        onAccept={onAccept}
        onDeny={onDeny}
        actionLoading={actionLoading}
        buttonState={selectedEvent ? buttonStates[selectedEvent.id] : null}
      />
    </div>
  );
};

export default Notificaciones;
