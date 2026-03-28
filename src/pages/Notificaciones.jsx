import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import DetailModal from '../components/DetailModal';
import Toast from '../components/Toast';
import './Pipeline.css';

const Notificaciones = () => {
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCita, setSelectedCita] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchPendientes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('citas')
        .select('*')
        .eq('status', 'pendiente')
        .order('fecha_inicio', { ascending: true });
      if (error) throw error;
      setCitas(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendientes();
  }, []);

  const handleUpdate = () => {
    fetchPendientes();
    setToast({ message: 'Cita procesada con éxito', type: 'success' });
  };

  return (
    <div className="pipeline-page">
      <div className="pipeline-header">
        <h2>Citas Pendientes</h2>
        <p>Gestiona las solicitudes de citas que aún no han sido confirmadas.</p>
      </div>

      {loading ? (
        <div className="pipeline-loading">
          {[1,2,3].map(i => (
            <div key={i} className="skeleton-card skeleton-shimmer" />
          ))}
        </div>
      ) : citas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✓</div>
          <h3>Todo al día</h3>
          <p>No tienes citas pendientes por confirmar en este momento.</p>
        </div>
      ) : (
        <div className="pipeline-grid">
          {citas.map(cita => (
            <div 
              key={cita.id} 
              className="pipeline-card" 
              onClick={() => {
                setSelectedCita(cita);
                setIsModalOpen(true);
              }}
            >
              <div className="card-top">
                <span className="card-time">
                  {new Date(cita.fecha_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="card-date">
                  {new Date(cita.fecha_inicio).toLocaleDateString()}
                </span>
              </div>
              <h3 className="card-client">{cita.cliente_nombre}</h3>
              <p className="card-motivo">{cita.motivo}</p>
              <div className="card-footer">
                <span className="card-contact">{cita.cliente_contacto}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <DetailModal 
          cita={selectedCita} 
          onClose={() => setIsModalOpen(false)} 
          onUpdate={handleUpdate}
        />
      )}

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
};

export default Notificaciones;
