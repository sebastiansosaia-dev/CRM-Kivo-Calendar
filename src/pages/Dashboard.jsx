import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { supabase } from '../lib/supabase';
import ChatbotPanel from '../components/ChatbotPanel';
import DetailModal from '../components/DetailModal';
import Toast from '../components/Toast';
import './Dashboard.css';

const mapToCalendarEvent = (cita) => ({
  id: String(cita.id),
  title: cita.cliente_nombre,
  start: cita.fecha_inicio,
  end: cita.fecha_fin,
  backgroundColor: cita.status === 'confirmada' ? '#2d7a4f' : '#D97745',
  borderColor: cita.status === 'confirmada' ? '#2d7a4f' : '#D97745',
  extendedProps: {
    contacto: cita.cliente_contacto,
    motivo: cita.motivo,
    status: cita.status,
    chatwoot_conv_id: cita.chatwoot_conv_id
  }
});

const formatEventTime = (startStr, endStr) => {
  const options = { timeZone: 'America/Tegucigalpa', hour: '2-digit', minute: '2-digit' };
  const startTime = new Date(startStr).toLocaleTimeString('es-HN', options);
  const endTime = new Date(endStr).toLocaleTimeString('es-HN', options);
  return `${startTime} - ${endTime}`;
};

const Dashboard = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [cardActionStates, setCardActionStates] = useState({});
  const [toast, setToast] = useState({ show: false, message: '' });
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const calendarRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (calendarRef.current) {
      calendarRef.current.getApi().changeView(isMobile ? 'timeGridDay' : 'timeGridWeek');
    }
  }, [isMobile]);

  const fetchCitas = async () => {
    const fallbackTimer = setTimeout(() => {
      setLoading(false);
    }, 5000);
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('citas')
        .select('*')
        .in('status', ['confirmada', 'pendiente'])
        .order('fecha_inicio', { ascending: true });
        
      if (error) throw error;
      if (data) setEvents(data.map(mapToCalendarEvent));
    } catch (error) {
      console.error('Error fetching dashboard items:', error);
    } finally {
      clearTimeout(fallbackTimer);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCitas();

    const channel = supabase
      .channel('citas-changes-dashboard')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'citas'
      }, () => {
        fetchCitas(); // refetch confirmed appointments on change
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
      
      // Optimistic calendar update: render green immediately
      setEvents(prev => prev.map(e => 
        e.id === String(cita.id) 
          ? { 
              ...e, 
              backgroundColor: '#2d7a4f', 
              borderColor: '#2d7a4f', 
              extendedProps: { ...e.extendedProps, status: 'confirmada' } 
            }
          : e
      ));

      setTimeout(() => {
        setSelectedEvent(null);
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
      // Optimistic calendar update: remove event instantly
      setEvents(prev => prev.filter(e => e.id !== String(cita.id)));

      setTimeout(() => {
        setSelectedEvent(null);
        setActionLoading(null);
      }, 600);
    } catch (error) {
      console.error('Error denying:', error);
      setActionLoading(null);
      setCardActionStates(prev => ({ ...prev, [cita.id]: null }));
    }
  };

  const now = new Date();
  const upcomingEvents = events
    .filter(e => e.extendedProps.status === 'confirmada' && new Date(e.start) >= now)
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .slice(0, 3);

  return (
    <div className="dashboard-page">
      <div className="upcoming-events-sidebar">
        <h1 className="hide-mobile" style={{ fontFamily: '"DM Serif Display", serif', color: '#D97745', fontSize: '20px', marginBottom: '8px', marginTop: 0 }}>KIVO Calendar</h1>
        <h2 className="upcoming-title">Próximas Citas</h2>
        <div className="upcoming-list">
          {loading ? (
            <>
              <div className="upcoming-card skeleton-shimmer" style={{ height: '90px', padding: 0 }}></div>
              <div className="upcoming-card skeleton-shimmer" style={{ height: '90px', padding: 0 }}></div>
              <div className="upcoming-card skeleton-shimmer" style={{ height: '90px', padding: 0 }}></div>
            </>
          ) : upcomingEvents.length === 0 ? (
            <div className="upcoming-empty-state">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, marginBottom: '8px' }}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <p>No tienes citas <br/> próximas para hoy</p>
            </div>
          ) : (
            upcomingEvents.map(event => (
              <div 
                key={event.id} 
                className="upcoming-card click-card"
                onClick={() => setSelectedEvent({
                  id: event.id,
                  cliente_nombre: event.title,
                  fecha_inicio: event.start,
                  fecha_fin: event.end,
                  cliente_contacto: event.extendedProps.contacto,
                  motivo: event.extendedProps.motivo,
                  status: event.extendedProps.status,
                  chatwoot_conv_id: event.extendedProps.chatwoot_conv_id
                })}
              >
                <div className="upcoming-header">
                  <span className="upcoming-dot"></span>
                  <h3 className="upcoming-client">{event.title}</h3>
                </div>
                {event.extendedProps.motivo && (
                  <p className="upcoming-reason">{event.extendedProps.motivo}</p>
                )}
                <span className="upcoming-time">
                  {formatEventTime(event.start, event.end)} (UTC-6)
                </span>
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="calendar-container">
        {loading && events.length === 0 ? (
          <div className="skeleton-shimmer" style={{ width: '100%', height: '100%', borderRadius: '14px' }}></div>
        ) : (
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={isMobile ? 'timeGridDay' : 'timeGridWeek'}
            views={{
              timeGridWeek: {
                dayHeaderFormat: isMobile ? { day: 'numeric', month: 'numeric' } : undefined
              }
            }}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: ''
            }}
            footerToolbar={{
              left: '',
              center: '',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            events={events}
            height="100%"
            slotMinTime="08:00:00"
            slotMaxTime="18:00:00"
            allDaySlot={false}
            locale="es"
            eventClick={(info) => {
              setSelectedEvent({
                id: info.event.id,
                cliente_nombre: info.event.title,
                fecha_inicio: info.event.startStr,
                fecha_fin: info.event.endStr,
                cliente_contacto: info.event.extendedProps.contacto,
                motivo: info.event.extendedProps.motivo,
                status: info.event.extendedProps.status,
                chatwoot_conv_id: info.event.extendedProps.chatwoot_conv_id
              });
            }}
          />
        )}
      </div>
      <ChatbotPanel />
      
      <DetailModal 
        isOpen={!!selectedEvent} 
        cita={selectedEvent} 
        onClose={() => setSelectedEvent(null)} 
        onAccept={handleAceptar}
        onDeny={handleDenegar}
        actionLoading={actionLoading}
        buttonState={selectedEvent ? cardActionStates[selectedEvent.id] : null}
        onRescheduleSuccess={(updatedCita) => {
          if (updatedCita) {
            setEvents(prev => prev.map(e => 
              e.id === String(updatedCita.id)
                ? { ...e, start: updatedCita.nueva_fecha_inicio, end: updatedCita.nueva_fecha_fin }
                : e
            ));
          }
          fetchCitas();
        }}
      />
      
      <Toast 
        show={toast.show} 
        message={toast.message} 
        onClose={() => setToast({ show: false, message: '' })} 
      />
    </div>
  );
};

export default Dashboard;
