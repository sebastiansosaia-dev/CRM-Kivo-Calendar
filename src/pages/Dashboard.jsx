import React, { useState, useEffect, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { supabase } from '../lib/supabase';
import DetailModal from '../components/DetailModal';
import Toast from '../components/Toast';
import './Dashboard.css';

const Dashboard = () => {
  const [citas, setCitas] = useState([]);
  const [selectedCita, setSelectedCita] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const fetchCitas = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('citas')
        .select('*');
      if (error) throw error;
      setCitas(data || []);
    } catch (error) {
      console.error('Error fetching citas:', error);
      setToast({ message: 'Error al cargar citas', type: 'error' });
    }
  }, []);

  useEffect(() => {
    fetchCitas();
    
    // Resize listener for mobile scroll optimization
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    
    const channel = supabase.channel('citas-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'citas' }, () => {
        fetchCitas();
      })
      .subscribe();

    return () => {
      window.removeEventListener('resize', handleResize);
      supabase.removeChannel(channel);
    };
  }, [fetchCitas]);

  const handleEventClick = (info) => {
    const citaId = info.event.id;
    const cita = citas.find(c => c.id.toString() === citaId);
    if (cita) {
      setSelectedCita(cita);
      setIsModalOpen(true);
    }
  };

  const getEventsByStatus = (status) => {
    return citas
      .filter(c => status === 'all' || c.status === status)
      .map(c => ({
        id: c.id,
        title: c.cliente_nombre,
        start: c.fecha_inicio,
        end: c.fecha_fin,
        backgroundColor: c.status === 'confirmada' ? '#4CAF50' : c.status === 'pendiente' ? '#F5A623' : '#E53935',
        borderColor: 'transparent',
        extendedProps: { ...c }
      }));
  };

  const stats = {
    total: citas.length,
    pending: citas.filter(c => c.status === 'pendiente').length,
    confirmed: citas.filter(c => c.status === 'confirmada').length,
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header-stats">
        <div className="stat-card">
          <span className="stat-label">Total Citas</span>
          <span className="stat-number">{stats.total}</span>
        </div>
        <div className="stat-card pending">
          <span className="stat-label">Pendientes</span>
          <span className="stat-number">{stats.pending}</span>
        </div>
        <div className="stat-card confirmed">
          <span className="stat-label">Confirmadas</span>
          <span className="stat-number">{stats.confirmed}</span>
        </div>
      </div>

      <div className="calendar-card">
        <div className="calendar-container">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={isMobile ? 'timeGridDay' : 'dayGridMonth'}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: isMobile ? 'timeGridDay,timeGridWeek' : 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            events={getEventsByStatus('all')}
            eventClick={handleEventClick}
            locale="es"
            height={isMobile ? 'auto' : '100%'} // Vital for native page scroll on mobile
            nowIndicator={true}
            allDaySlot={false}
            slotMinTime="08:00:00"
            slotMaxTime="20:00:00"
            expandRows={true}
            stickyHeaderDates={true}
            handleWindowResize={true}
          />
        </div>
      </div>

      {isModalOpen && (
        <DetailModal 
          cita={selectedCita} 
          onClose={() => setIsModalOpen(false)} 
          onUpdate={() => {
            fetchCitas();
            setToast({ message: 'Cita actualizada correctamente', type: 'success' });
          }}
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

export default Dashboard;
