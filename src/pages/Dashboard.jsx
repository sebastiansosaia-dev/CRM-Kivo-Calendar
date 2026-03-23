import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import DetailModal from '../components/DetailModal';
import './Dashboard.css';

const TABS = { WEEK: 'week', MONTH: 'month' };

const Dashboard = () => {
  const { role } = useAuth();
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [activeTab, setActiveTab] = useState(TABS.WEEK);
  const calendarRef = useRef(null);
  const [buttonStates, setButtonStates] = useState({});

  useEffect(() => {
    let active = true;

    const fetchCitas = async () => {
      setLoading(true);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('citas')
        .select('*')
        .or(`status.eq.confirmada,and(status.eq.pendiente,fecha_inicio.gte.${startOfToday.toISOString()})`);

      if (!error && active) setCitas(data || []);
      if (active) setLoading(false);
    };

    fetchCitas();

    const channel = supabase
      .channel('dashboard-citas')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'citas' },
        (payload) => {
          if (!active) return;
          const { eventType, new: newRec, old: oldRec } = payload;
          setCitas(prev => {
            if (eventType === 'INSERT') {
              if (newRec.status === 'confirmada' || newRec.status === 'pendiente') return [...prev, newRec];
            } else if (eventType === 'UPDATE') {
              if (newRec.status === 'cancelada' || newRec.status === 'denegada') {
                return prev.filter(c => c.id !== newRec.id);
              }
              const exists = prev.find(c => c.id === newRec.id);
              if (exists) return prev.map(c => c.id === newRec.id ? newRec : c);
              if (newRec.status === 'confirmada' || newRec.status === 'pendiente') return [...prev, newRec];
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

  const handleEventClick = (info) => {
    const cita = citas.find(c => c.id === info.event.id);
    if (cita) {
      setSelectedEvent(cita);
      setIsModalOpen(true);
      setButtonStates(prev => ({ ...prev, [cita.id]: null }));
    }
  };

  const handleDateClick = (info) => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.changeView('timeGridDay', info.date);
      setActiveTab('day');
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
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const onDeny = async (cita, reason) => {
    setActionLoading(cita.id);
    const webhookUrl = cita.status === 'pendiente' 
      ? 'https://n8n.srv1306518.hstgr.cloud/webhook/cita-denegar'
      : 'https://n8n.srv1306518.hstgr.cloud/webhook/cita-cancelar';
    const payload = {
      cita_id: cita.id,
      chatwoot_conv_id: cita.chatwoot_conv_id || '',
      cliente_nombre: cita.cliente_nombre || '',
      cliente_contacto: cita.cliente_contacto || '',
      fecha_inicio: cita.fecha_inicio,
      motivo_cancelacion: reason || 'Cancelado por administración'
    };
    try {
      await fetch(webhookUrl, {
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

  const onRescheduleSuccess = (updatedEvent) => {
    setCitas(prev => prev.map(c => c.id === updatedEvent.id ? { ...c, ...updatedEvent } : c));
  };

  const mapToFullCalendarEvents = () => {
    return citas.map(c => {
      const isPending = c.status === 'pendiente';
      return {
        id: c.id,
        title: `${c.cliente_nombre} - ${c.status.toUpperCase()}`,
        start: c.fecha_inicio,
        end: c.fecha_fin,
        backgroundColor: isPending ? 'var(--color-pending)' : 'var(--color-confirmed)',
        borderColor: isPending ? 'var(--color-pending)' : 'var(--color-confirmed)',
        textColor: '#FFFFFF',
        extendedProps: { ...c }
      };
    });
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.changeView(tab === TABS.WEEK ? 'timeGridWeek' : 'dayGridMonth');
    }
  };

  const eventContent = (arg) => {
    const timeText = arg.timeText;
    const isPending = arg.event.extendedProps.status === 'pendiente';
    return (
      <div className="fc-event-main-content">
        {timeText && <div className="fc-event-time">{timeText}</div>}
        <div className="fc-event-title-wrap">
          <div className={`fc-event-status-indicator ${isPending ? 'pending' : 'confirmed'}`}></div>
          <div className="fc-event-title">{arg.event.title}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard">
      <div className="dashboard-content">
        <div className="calendar-header">
          <h1 className="page-title">Bienvenido de Vuelta</h1>
          <div className="calendar-view-toggle hide-mobile">
            <button 
              className={`toggle-btn ${activeTab === TABS.WEEK ? 'active' : ''}`}
              onClick={() => handleTabChange(TABS.WEEK)}
            >
              Semana
            </button>
            <button 
              className={`toggle-btn ${activeTab === TABS.MONTH ? 'active' : ''}`}
              onClick={() => handleTabChange(TABS.MONTH)}
            >
              Mes
            </button>
          </div>
        </div>
        
        <div className="dashboard-grid">
          <div className="calendar-container">
            {loading ? (
              <div className="calendar-loading skeleton-shimmer"></div>
            ) : (
              <div className="calendar-wrapper">
                <FullCalendar
                  ref={calendarRef}
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  initialView={window.innerWidth < 768 ? 'timeGridDay' : 'timeGridWeek'}
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: window.innerWidth < 768 ? 'timeGridDay,timeGridWeek,dayGridMonth' : '' 
                  }}
                  events={mapToFullCalendarEvents()}
                  eventClick={handleEventClick}
                  dateClick={handleDateClick}
                  height="100%"
                  slotMinTime="06:00:00"
                  slotMaxTime="20:00:00"
                  allDaySlot={false}
                  eventContent={eventContent}
                  nowIndicator={true}
                  locale="es"
                  buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día' }}
                  dayHeaderFormat={window.innerWidth < 768 && activeTab === TABS.WEEK ? { day: 'numeric', month: 'numeric' } : { weekday: 'short', month: 'numeric', day: 'numeric', omitCommas: true }}
                />
              </div>
            )}
          </div>
          
          <div className="appointments-sidebar">
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '22px', marginBottom: '24px', letterSpacing: '-0.5px' }}>Próximas Citas</h2>
            <div className="appointments-list">
              {loading ? (
                <>
                  <div className="appointment-card skeleton-shimmer" style={{height: '100px'}} />
                  <div className="appointment-card skeleton-shimmer" style={{height: '100px'}} />
                  <div className="appointment-card skeleton-shimmer" style={{height: '100px'}} />
                </>
              ) : citas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#7C6E65', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#E8E2D9" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '14px' }}>No hay citas próximas programadas.</p>
                </div>
              ) : (
                citas
                  .filter(c => c.status === 'confirmada' && new Date(c.fecha_inicio) > new Date())
                  .sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio))
                  .slice(0, 5)
                  .map(cita => (
                    <div 
                      key={cita.id} 
                      className="appointment-card"
                      onClick={() => { setSelectedEvent(cita); setIsModalOpen(true); }}
                    >
                      <div className="appointment-time">
                        <span className="time">{new Date(cita.fecha_inicio).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="date">{new Date(cita.fecha_inicio).toLocaleDateString('es-HN', { day: '2-digit', month: 'short' })}</span>
                      </div>
                      <div className="appointment-info">
                        <strong>{cita.cliente_nombre}</strong>
                        <span className="service">Servicio General</span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
      
      <DetailModal 
        isOpen={isModalOpen}
        cita={selectedEvent}
        onClose={closeModal}
        onAccept={onAccept}
        onDeny={onDeny}
        actionLoading={actionLoading}
        buttonState={selectedEvent ? buttonStates[selectedEvent.id] : null}
        onRescheduleSuccess={onRescheduleSuccess}
      />
    </div>
  );
};

export default Dashboard;
