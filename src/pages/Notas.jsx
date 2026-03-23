import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import './Pipeline.css'; 

const Notas = () => {
  const { user, role } = useAuth();
  const [notas, setNotas] = useState([]);
  const [nuevaNota, setNuevaNota] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    let active = true;
    
    const fetchNotas = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('notas')
        .select('*')
        .order('created_at', { ascending: true });
        
      if (!error && active) {
        setNotas(data || []);
      }
      if (active) setLoading(false);
    };

    fetchNotas();

    const channel = supabase
      .channel('notas-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notas' },
        (payload) => {
          if (!active) return;
          setNotas(prev => [...prev, payload.new]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notas' },
        (payload) => {
          if (!active) return;
          setNotas(prev => prev.filter(n => n.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    // Update local storage unread marker
    localStorage.setItem('last_notas_visit', new Date().toISOString());
  }, [notas]);

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!nuevaNota.trim() || submitting || !user) return;
    
    setSubmitting(true);
    const payload = {
      user_id: user.id,
      user_email: user.email,
      content: nuevaNota.trim(),
    };

    // Optimistic UI
    const tempId = 'temp-' + Date.now();
    setNotas(prev => [...prev, { ...payload, id: tempId, created_at: new Date().toISOString() }]);
    setNuevaNota('');

    const { error } = await supabase.from('notas').insert([payload]);
    
    if (error) {
      console.error('Error post nota:', error);
      // Remove optimistic note on error
      setNotas(prev => prev.filter(n => n.id !== tempId));
      setNuevaNota(payload.content);
    }
    
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    await supabase.from('notas').delete().eq('id', id);
  };

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' });
  };
  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleDateString('es-HN', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="pipeline-page" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="pipeline-header" style={{ flexShrink: 0 }}>
        <h2>Notas del Equipo</h2>
      </div>

      <div className="pipeline-container" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px 32px 32px 32px' }}>
        <div 
          ref={scrollRef}
          style={{ 
            flexGrow: 1, 
            overflowY: 'auto', 
            background: '#FFFFFF', 
            borderRadius: '12px 12px 0 0', 
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            border: '1px solid #E8E2D9',
            borderBottom: 'none'
          }}
        >
          {loading ? (
            <div className="pipeline-empty-state">Cargando notas...</div>
          ) : notas.length === 0 ? (
            <div className="pipeline-empty-state" style={{ height: '100%', justifyContent: 'center' }}>
               <svg style={{marginBottom: '12px'}} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#E8E2D9" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              <p>No hay notas todavía. ¡Escribe la primera!</p>
            </div>
          ) : (
            notas.map((nota, i) => {
              const isMine = nota.user_id === user?.id;
              const showDateLabel = i === 0 || formatDate(notas[i-1].created_at) !== formatDate(nota.created_at);
              
              return (
                <React.Fragment key={nota.id}>
                  {showDateLabel && (
                    <div style={{ textAlign: 'center', margin: '16px 0', fontSize: '12px', color: '#7C6E65', fontWeight: 600 }}>
                      <span style={{ background: '#F0EDE6', padding: '4px 12px', borderRadius: '12px' }}>{formatDate(nota.created_at)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                    <div style={{ fontSize: '11px', color: '#7C6E65', marginBottom: '4px', padding: '0 4px', display: 'flex', gap: '8px' }}>
                      {!isMine && <span>{nota.user_email?.split('@')[0]}</span>}
                      <span>{formatTime(nota.created_at)}</span>
                    </div>
                    <div className="chat-bubble" style={{ 
                      background: isMine ? '#D97745' : '#F5F0EA', 
                      color: isMine ? '#FFFFFF' : '#1A1411',
                      padding: '12px 16px',
                      borderRadius: '16px',
                      borderBottomRightRadius: isMine ? '4px' : '16px',
                      borderBottomLeftRadius: !isMine ? '4px' : '16px',
                      maxWidth: '80%',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '14px',
                      lineHeight: '1.5',
                      position: 'relative',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {nota.content}
                      {role === 'jefe' && (
                        <button 
                          onClick={() => handleDelete(nota.id)}
                          style={{ position: 'absolute', top: '-8px', right: isMine ? 'auto' : '-8px', left: isMine ? '-8px' : 'auto', background: '#E53935', color: '#FFF', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: 0.5 }}
                          onMouseOver={(e) => e.target.style.opacity = 1}
                          onMouseOut={(e) => e.target.style.opacity = 0.5}
                          title="Eliminar nota"
                        >✕</button>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}
          <div ref={scrollRef} />
        </div>
        
        <div style={{ background: '#FFFFFF', padding: '16px 24px', borderRadius: '0 0 12px 12px', border: '1px solid #E8E2D9', display: 'flex', gap: '12px' }}>
          <input 
            type="text" 
            value={nuevaNota}
            onChange={(e) => setNuevaNota(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            placeholder="Escribe una nota para el equipo..."
            style={{ flexGrow: 1, padding: '12px 16px', borderRadius: '8px', border: '1px solid #E8E2D9', outline: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', background: '#F9F7F4' }}
            disabled={submitting}
          />
          <button 
            onClick={handleSubmit}
            className="btn btn-primary"
            style={{ padding: '0 24px' }}
            disabled={submitting || !nuevaNota.trim()}
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
};

export default Notas;
