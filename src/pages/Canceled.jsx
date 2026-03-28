import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import DetailModal from '../components/DetailModal';
import './Pipeline.css'; // Reusing pipeline styles for consistency

const Canceled = () => {
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCita, setSelectedCita] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchCanceled = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('citas')
        .select('*')
        .in('status', ['cancelada', 'denegada'])
        .order('fecha_inicio', { ascending: false });
      if (error) throw error;
      setCitas(data || []);
    } catch (error) {
      console.error('Error fetching canceled:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCanceled();
  }, []);

  return (
    <div className="pipeline-page">
      <div className="pipeline-header">
        <h2>Citas Canceladas / Denegadas</h2>
        <p>Historial de solicitudes que no fueron concretadas.</p>
      </div>

      {loading ? (
        <div className="pipeline-loading">
          {[1,2,3].map(i => (
            <div key={i} className="skeleton-card skeleton-shimmer" />
          ))}
        </div>
      ) : citas.length === 0 ? (
        <div className="empty-state">
          <h3>No hay cancelaciones</h3>
          <p>Tu historial está limpio por ahora.</p>
        </div>
      ) : (
        <div className="pipeline-grid">
          {citas.map(cita => (
            <div 
              key={cita.id} 
              className="pipeline-card" 
              style={{ borderLeft: '4px solid #E53935' }}
              onClick={() => {
                setSelectedCita(cita);
                setIsModalOpen(true);
              }}
            >
              <div className="card-top">
                <span className="card-time" style={{ color: '#E53935' }}>
                  {cita.status.toUpperCase()}
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
          onUpdate={fetchCanceled}
        />
      )}
    </div>
  );
};

export default Canceled;
