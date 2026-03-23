import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import Toast from './Toast';
import './DetailModal.css';

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

const DetailModal = ({ isOpen, cita, onClose, onAccept, onDeny, actionLoading, buttonState, onRescheduleSuccess }) => {
  const { role } = useAuth();

  // Reschedule state
  const [showReschedule, setShowReschedule] = useState(false);
  const [newFechaInicio, setNewFechaInicio] = useState('');
  const [razon, setRazon] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleSuccess, setRescheduleSuccess] = useState(false);

  // Deny reason state
  const [showDenyForm, setShowDenyForm] = useState(false);
  const [denyReason, setDenyReason] = useState('');
  const [denyLoading, setDenyLoading] = useState(false);

  const [toast, setToast] = useState({ show: false, message: '' });

  // Transition management
  const [internalCita, setInternalCita] = useState(cita);
  const [isRendered, setIsRendered] = useState(isOpen);
  const rescheduleRef = useRef(null);
  const denyFormRef = useRef(null);

  useEffect(() => {
    if (isOpen && cita) {
      setInternalCita(cita);
      setIsRendered(true);
    } else if (!isOpen) {
      const timer = setTimeout(() => setIsRendered(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, cita]);

  // Reset internal state when modal opens fresh
  useEffect(() => {
    if (isOpen) {
      setShowDenyForm(false);
      setDenyReason('');
      setDenyLoading(false);
      setShowReschedule(false);
    }
  }, [isOpen]);

  // Auto-close modal after accept/deny feedback
  useEffect(() => {
    if (isOpen && (buttonState === 'accepted' || buttonState === 'denied')) {
      const timer = setTimeout(() => {
        onClose();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [buttonState, isOpen]);

  // Scroll to reschedule form when opened
  useEffect(() => {
    if (showReschedule && rescheduleRef.current) {
      setTimeout(() => {
        rescheduleRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
    }
  }, [showReschedule]);

  // Scroll to deny form when opened
  useEffect(() => {
    if (showDenyForm && denyFormRef.current) {
      setTimeout(() => {
        denyFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
    }
  }, [showDenyForm]);

  if (!isRendered) return null;
  const currentCita = isOpen ? cita : internalCita;

  const handleOpenReschedule = () => {
    if (currentCita?.fecha_inicio) {
      const inicio = new Date(currentCita.fecha_inicio);
      setNewFechaInicio(inicio.toISOString().slice(0, 16));
    }
    setRazon('');
    setShowReschedule(true);
    setRescheduleSuccess(false);
    setShowDenyForm(false);
  };

  const handleReschedule = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newFechaInicio) return;

    const dInicio = new Date(newFechaInicio);
    const dFin = new Date(dInicio.getTime() + (2 * 60 * 60 * 1000));

    setRescheduleLoading(true);
    try {
      const payload = {
        cita_id: currentCita.id,
        nueva_fecha_inicio: dInicio.toISOString(),
        nueva_fecha_fin: dFin.toISOString(),
        razon: razon || '',
        cliente_nombre: currentCita.cliente_nombre || '',
        cliente_contacto: currentCita.cliente_contacto || '',
        chatwoot_conv_id: currentCita.chatwoot_conv_id || ''
      };

      await fetch('https://n8n.srv1306518.hstgr.cloud/webhook/reprogramar_cita', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      setRescheduleSuccess(true);
      setToast({ show: true, message: 'Cita reprogramada correctamente' });
      setRescheduleLoading(false);

      setTimeout(() => {
        setShowReschedule(false);
        setRescheduleSuccess(false);
        setToast({ show: false, message: '' });

        if (onRescheduleSuccess) {
          onRescheduleSuccess({
            id: currentCita.id,
            nueva_fecha_inicio: dInicio.toISOString(),
            nueva_fecha_fin: dFin.toISOString()
          });
        }

        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error rescheduling:', error);
      setToast({ show: true, message: 'Error al reprogramar la cita' });
      setRescheduleLoading(false);
    }
  };

  const handleOpenDenyForm = () => {
    setDenyReason('');
    setShowDenyForm(true);
    setShowReschedule(false);
  };

  const handleConfirmDeny = async () => {
    if (!denyReason.trim()) return;
    setDenyLoading(true);
    try {
      await onDeny(currentCita, denyReason.trim());
    } finally {
      setDenyLoading(false);
    }
  };

  const handleClose = () => {
    setShowReschedule(false);
    setRescheduleSuccess(false);
    setRescheduleLoading(false);
    setShowDenyForm(false);
    setDenyReason('');
    setDenyLoading(false);
    setToast({ show: false, message: '' });
    onClose();
  };

  // Computed visual End Date
  const dInicioVisual = newFechaInicio ? new Date(newFechaInicio) : null;
  let dFinISO = '';
  if (dInicioVisual && !isNaN(dInicioVisual)) {
    const dFinVisual = new Date(dInicioVisual.getTime() + (2 * 60 * 60 * 1000));
    dFinISO = formatDisplay(dFinVisual.toISOString());
  }

  const isDenyAction = currentCita?.status === 'pendiente' ? 'Denegación' : 'Cancelación';
  const isDenyDisabled = !denyReason.trim() || denyLoading;

  return (
    <div className={`modal-overlay ${isOpen ? 'show' : ''}`} onClick={(e) => { if (e.target.className.includes('modal-overlay')) handleClose(); }}>
      <div className={`modal-card ${isOpen ? 'show' : ''}`}>
        <div className="modal-header">
          <div className="modal-title-group">
            <h2 className="modal-title">{currentCita?.cliente_nombre}</h2>
            <span className={`modal-status-badge ${currentCita?.status}`}>{currentCita?.status}</span>
          </div>
          <button className="modal-close-icon" onClick={handleClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="modal-row">
            <span className="modal-label">Contacto:</span>
            <span>{currentCita?.cliente_contacto}</span>
          </div>
          <div className="modal-row">
            <span className="modal-label">Inicia:</span>
            <span className="capitalize">{currentCita ? formatDisplay(currentCita.fecha_inicio) : ''}</span>
          </div>
          <div className="modal-row">
            <span className="modal-label">Finaliza:</span>
            <span className="capitalize">{currentCita ? formatDisplay(currentCita.fecha_fin) : ''}</span>
          </div>
          {currentCita?.motivo && (
            <div className="modal-row reason">
              <span className="modal-label">Motivo:</span>
              <p>{currentCita.motivo}</p>
            </div>
          )}

          {/* Deny Reason Section */}
          {showDenyForm && (
            <div className="reschedule-section" ref={denyFormRef}>
              <h4 className="reschedule-title">Razón de {isDenyAction}</h4>
              <div className="reschedule-fields">
                <div className="reschedule-field">
                  <label htmlFor="deny-reason">Motivo (requerido)</label>
                  <textarea
                    id="deny-reason"
                    name="deny-reason"
                    autoComplete="off"
                    value={denyReason}
                    onChange={(e) => setDenyReason(e.target.value)}
                    className="reschedule-input textarea"
                    placeholder="Escribe el motivo de la denegación..."
                    rows="3"
                  />
                </div>
              </div>
              <div className="reschedule-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowDenyForm(false)}
                  disabled={denyLoading}
                >
                  Volver
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleConfirmDeny}
                  disabled={isDenyDisabled}
                >
                  {denyLoading ? '...' : `Confirmar ${isDenyAction}`}
                </button>
              </div>
            </div>
          )}

          {/* Reschedule Section */}
          {showReschedule && (
            <div className="reschedule-section" ref={rescheduleRef}>
              <h4 className="reschedule-title">Reprogramar Cita</h4>
              <div className="reschedule-fields">
                <div className="reschedule-field">
                  <label htmlFor="reschedule-fecha">Nueva fecha inicio</label>
                  <input
                    id="reschedule-fecha"
                    name="reschedule-fecha"
                    autoComplete="off"
                    type="datetime-local"
                    value={newFechaInicio}
                    onChange={(e) => setNewFechaInicio(e.target.value)}
                    max="9999-12-31T23:59"
                    className="reschedule-input"
                  />
                  {dFinISO && <div style={{ fontSize: '11px', color: '#7C6E65', marginTop: '6px' }}>Finaliza: <span className="capitalize">{dFinISO}</span> (Auto)</div>}
                </div>
                <div className="reschedule-field">
                  <label htmlFor="reschedule-razon">Razón de reprogramación</label>
                  <textarea
                    id="reschedule-razon"
                    name="reschedule-razon"
                    autoComplete="off"
                    value={razon}
                    onChange={(e) => setRazon(e.target.value)}
                    className="reschedule-input textarea"
                    placeholder="Opcional..."
                    rows="2"
                  />
                </div>
              </div>
              <div className="reschedule-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowReschedule(false)}
                  disabled={rescheduleLoading}
                >
                  Cancelar
                </button>
                <button
                  className={`btn btn-primary ${rescheduleSuccess ? 'confirmed' : ''}`}
                  onClick={handleReschedule}
                  disabled={rescheduleLoading || rescheduleSuccess || !newFechaInicio}
                >
                  {rescheduleLoading ? '...' : rescheduleSuccess ? '✓ Reprogramado' : 'Confirmar'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {/* Reprogramar button — for non-deny-form states */}
          {(currentCita?.status === 'pendiente' || currentCita?.status === 'confirmada' || currentCita?.status === 'cancelada') && role === 'jefe' && !showReschedule && !showDenyForm && (
            <button
              className="btn btn-secondary"
              onClick={handleOpenReschedule}
              style={{ marginRight: 'auto' }}
              disabled={actionLoading !== null}
            >
              ↻ Reprogramar
            </button>
          )}

          {currentCita?.status === 'pendiente' && role === 'jefe' && !showDenyForm && !showReschedule ? (
            <>
              <button
                className={`btn btn-danger ${buttonState === 'denied' ? 'denied' : ''}`}
                onClick={handleOpenDenyForm}
                disabled={actionLoading !== null}
              >
                {buttonState === 'denied' ? '✕ Denegado' : '✕ Denegar'}
              </button>
              <button
                className={`btn btn-primary ${buttonState === 'accepted' ? 'confirmed' : ''}`}
                onClick={() => onAccept(currentCita)}
                disabled={actionLoading !== null}
              >
                {buttonState === 'accepted' ? '✓ Aceptado' : '✓ Aceptar'}
              </button>
            </>
          ) : currentCita?.status === 'confirmada' && role === 'jefe' && !showDenyForm && !showReschedule ? (
            <>
              <button
                className={`btn btn-danger ${buttonState === 'denied' ? 'denied' : ''}`}
                onClick={handleOpenDenyForm}
                disabled={actionLoading !== null}
              >
                {buttonState === 'denied' ? 'Cancelado...' : '✕ Cancelar'}
              </button>
              <button className="btn btn-secondary" onClick={handleClose}>Cerrar</button>
            </>
          ) : !showDenyForm && !showReschedule ? (
            <button className="btn btn-secondary" onClick={handleClose}>Cerrar</button>
          ) : null}
        </div>
      </div>

      <Toast
        show={toast.show}
        message={toast.message}
        onClose={() => setToast({ show: false, message: '' })}
      />
    </div>
  );
};

export default DetailModal;
