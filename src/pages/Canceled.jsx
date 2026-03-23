import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import DetailModal from '../components/DetailModal';
import '../pages/Pipeline.css';

const formatDisplay = (date) => {
  const dt = new Date(date);
  const options = { timeZone: 'America/Tegucigalpa' };
  const formatter = new Intl.DateTimeFormat('es-HN', {
    ...options, weekday: 'long', day: 'numeric', month: 'long',
    hour: 'numeric', minute: '2-digit', hour12: true
  });
  return formatter.format(dt).toString() + ' (UTC-6)';
};

const Canceled = () => {
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCita, setSelectedCita] = useState(null);

  const fetchCitas = async () => {
    try {
      const { data, error } = await supabase
        .from('citas')
        .select('*')
        .in('status', ['cancelada', 'denegada'])
        .order('fecha_inicio', { ascending: false });

      if (error) throw error;
      if (data) setCitas(data);
    } catch (error) {
      console.error('Error fetching canceled citas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCitas();

    const channel = supabase
      .channel('citas-changes-canceled')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'citas'
      }, () => {
        fetchCitas();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  return (
    <div className="pipeline-page">
      <div className="pipeline-header">
        <h2 className="hide-mobile">Canceladas & Rechazadas</h2>
        <span className="count-badge" style={{ background: 'rgba(198, 93, 93, 0.12)', color: '#C65D5D' }}>{citas.length}</span>
      </div>
      
      <div className="pipeline-container">
        {loading && citas.length === 0 ? (
          <div className="pipeline-empty">Cargando...</div>
        ) : citas.length === 0 ? (
          <div className="pipeline-empty">No hay citas canceladas recientemente.</div>
        ) : (
          citas.map(cita => (
            <div key={cita.id} className="kanban-card pattern-denied">
              <div className="card-click-area" onClick={() => setSelectedCita(cita)}>
                <div className="card-header">
                  <h3 className="client-name" style={{ opacity: 0.8 }}>{cita.cliente_nombre}</h3>
                  <span className="status-indicator" style={{ background: '#C65D5D' }}></span>
                </div>
                
                <div className="card-details" style={{ opacity: 0.75 }}>
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
                  <div className="detail-row">
                    <span className="detail-label">Estado final:</span>
                    <strong style={{ color: '#C65D5D' }}>{cita.status.toUpperCase()}</strong>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      <DetailModal 
        isOpen={!!selectedCita} 
        cita={selectedCita} 
        onClose={() => setSelectedCita(null)} 
        // We pass empty handlers ensuring no mutate buttons render against canceled states
        onAccept={() => {}}
        onDeny={() => {}}
        actionLoading={null}
        buttonState="hidden"
        onRescheduleSuccess={fetchCitas}
      />
    </div>
  );
};

export default Canceled;
