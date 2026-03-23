import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import DetailModal from '../components/DetailModal';
import Toast from '../components/Toast';
import './Pipeline.css';

const formatDisplay = (date) => {
  const dt = new Date(date);
  const options = { timeZone: 'America/Tegucigalpa' };
  
  const formatter = new Intl.DateTimeFormat('es-HN', {
    ...options,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  return formatter.format(dt).toString() + ' (UTC-6)';
};

const Notificaciones = () => {
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [exitingCards, setExitingCards] = useState([]);
  const [cardActionStates, setCardActionStates] = useState({});
  const [selectedCita, setSelectedCita] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '' });
  const { decrementPending } = useOutletContext();

  const fetchCitas = async () => {
    try {
      const { data, error } = await supabase
        .from('citas')
        .select('*')
        .eq('status', 'pendiente')
        .order('fecha_inicio', { ascending: true });

      if (error) throw error;
      if (data) setCitas(data.filter(c => c.status === 'pendiente'));
    } catch (error) {
      console.error('Error fetching pending citas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCitas();

    const channel = supabase
      .channel('citas-changes-notificaciones')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'citas'
      }, () => {
        fetchCitas(); // refetch on any change
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const handleAceptar = async (cita) => {
    setActionLoading(`accept-${cita.id}`);
    setCardActionStates(prev => ({ ...prev, [cita.id]: 'accepted' }));
    
    try {
      await fetch('https://n8n.srv1306518.hstgr.cloud/webhook/cita-aceptar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cita_id: cita.id,
          cliente_nombre: cita.cliente_nombre,
          cliente_contacto: cita.cliente_contacto,
          fecha_inicio: cita.fecha_inicio,
          fecha_fin: cita.fecha_fin,
          motivo: cita.motivo
        })
      });
      
      setToast({ show: true, message: `Confirmación a ${cita.cliente_nombre}` });
      if (selectedCita?.id === cita.id) setSelectedCita(null);

      setExitingCards((prev) => [...prev, cita.id]);
      decrementPending();
      setTimeout(() => {
        setCitas((prevCitas) => prevCitas.filter((c) => c.id !== cita.id));
        setActionLoading(null);
      }, 600);
    } catch (error) {
      console.error('Error accepting:', error);
      setActionLoading(null);
      setCardActionStates(prev => ({ ...prev, [cita.id]: null }));
    }
  };

  const handleDenegar = async (cita, motivo_cancelacion) => {
    setActionLoading(`deny-${cita.id}`);
    setCardActionStates(prev => ({ ...prev, [cita.id]: 'denied' }));
    
    try {
      await fetch('https://n8n.srv1306518.hstgr.cloud/webhook/cita-denegar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cita_id: cita.id,
          cliente_nombre: cita.cliente_nombre,
          cliente_contacto: cita.cliente_contacto,
          motivo_cancelacion: motivo_cancelacion || ''
        })
      });
      
      if (selectedCita?.id === cita.id) setSelectedCita(null);

      setExitingCards((prev) => [...prev, cita.id]);
      decrementPending();
      setTimeout(() => {
        setCitas((prevCitas) => prevCitas.filter((c) => c.id !== cita.id));
        setActionLoading(null);
      }, 600);
    } catch (error) {
      console.error('Error denying:', error);
      setActionLoading(null);
      setCardActionStates(prev => ({ ...prev, [cita.id]: null }));
    }
  };

  return (
    <div className="pipeline-page">
      <div className="pipeline-header">
        <h2 className="hide-mobile">Pendientes</h2>
        <span className="count-badge">{citas.length}</span>
      </div>
      
      <div className="pipeline-container">
        {loading && citas.length === 0 ? (
          <div className="pipeline-empty">Cargando...</div>
        ) : citas.filter(c => c.status === 'pendiente').length === 0 ? (
          <div className="pipeline-empty">No hay citas pendientes</div>
        ) : (
          citas.filter(c => c.status === 'pendiente').map(cita => (
            <div 
              key={cita.id} 
              className={`kanban-card ${exitingCards.includes(cita.id) ? 'card-exiting' : ''}`}
            >
              <div className="card-click-area" onClick={() => setSelectedCita(cita)}>
                <div className="card-header">
                  <h3 className="client-name">{cita.cliente_nombre}</h3>
                  <span className="status-indicator pending"></span>
                </div>
                
                <div className="card-details">
                  <div className="detail-row">
                    <span className="detail-label">Contacto:</span>
                    <span>{cita.cliente_contacto}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Fecha:</span>
                    <span className="capitalize">{formatDisplay(cita.fecha_inicio)}</span>
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
                  className={`btn btn-danger ${cardActionStates[cita.id] === 'denied' ? 'denied' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setSelectedCita(cita); }}
                  disabled={actionLoading !== null || cardActionStates[cita.id]}
                >
                  {cardActionStates[cita.id] === 'denied' ? '✕ Denegado' : '✕ Denegar'}
                </button>
                <button 
                  className={`btn btn-primary ${cardActionStates[cita.id] === 'accepted' ? 'confirmed' : ''}`}
                  onClick={(e) => { e.stopPropagation(); handleAceptar(cita); }}
                  disabled={actionLoading !== null || cardActionStates[cita.id]}
                >
                  {cardActionStates[cita.id] === 'accepted' ? (
                    actionLoading === `accept-${cita.id}` ? '...' : '✓ Aceptado'
                  ) : (
                    actionLoading === `accept-${cita.id}` ? '...' : '✓ Aceptar'
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      
      <DetailModal 
        isOpen={!!selectedCita} 
        cita={selectedCita} 
        onClose={() => setSelectedCita(null)} 
        onAccept={handleAceptar}
        onDeny={handleDenegar}
        actionLoading={actionLoading}
        buttonState={selectedCita ? cardActionStates[selectedCita.id] : null}
        onRescheduleSuccess={fetchCitas}
      />
      
      <Toast 
        show={toast.show} 
        message={toast.message} 
        onClose={() => setToast({ show: false, message: '' })} 
      />
    </div>
  );
};

export default Notificaciones;
