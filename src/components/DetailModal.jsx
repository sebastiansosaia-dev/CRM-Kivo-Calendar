import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './DetailModal.css';

const DetailModal = ({ cita, onClose, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [nota, setNota] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (cita?.notas) setNota(cita.notas);
  }, [cita]);

  const handleStatusChange = async (newStatus) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('citas')
        .update({ status: newStatus, notas: nota })
        .eq('id', cita.id);
      
      if (error) throw error;
      onUpdate();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!cita) return null;

  return (
    <div className="modal-overlay" onClick={onClose} aria-label="Cerrar modal">
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Detalles de la Cita</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="info-section">
            <div className="info-group">
              <label>Cliente</label>
              <p>{cita.cliente_nombre}</p>
            </div>
            <div className="info-group">
              <label>Contacto</label>
              <p>{cita.cliente_contacto}</p>
            </div>
            <div className="info-group">
              <label>Fecha</label>
              <p>{new Date(cita.fecha_inicio).toLocaleDateString()} a las {new Date(cita.fecha_inicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
            </div>
          </div>

          <div className="reason-section">
            <label>Motivo</label>
            <p className="reason-text">{cita.motivo || 'No especificado'}</p>
          </div>

          <div className="notes-section">
            <label>Notas de seguimiento</label>
            <textarea 
              placeholder="Escribe detalles adicionales aquí..."
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
          </div>

          {error && <p className="modal-error">{error}</p>}
        </div>

        <div className="modal-footer">
          {cita.status === 'pendiente' ? (
            <>
              <button 
                className="btn btn-danger" 
                onClick={() => handleStatusChange('denegada')}
                disabled={loading}
              >
                Denegar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => handleStatusChange('confirmada')}
                disabled={loading}
              >
                Confirmar Cita
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={onClose}>Cerrar</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DetailModal;
