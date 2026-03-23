import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import './Pipeline.css';

const Notas = () => {
  const { user } = useAuth();
  const [notas, setNotas] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const fetchNotas = async () => {
    try {
      const { data, error } = await supabase
        .from('notas')
        .select('*')
        .order('created_at', { ascending: true }); // bottom-to-top execution

      if (error) throw error;
      if (data) setNotas(data);
    } catch (error) {
      console.error('Error fetching notas:', error);
    } finally {
      setLoading(false);
      localStorage.setItem('last_notas_visit', new Date().toISOString());
    }
  };

  useEffect(() => {
    fetchNotas();

    const channel = supabase
      .channel('notas-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notas' }, (payload) => {
        fetchNotas();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [notas]);
  
  // Track last visit upon Unmounting implicitly keeping unread tracking accurate globally
  useEffect(() => {
    return () => {
      localStorage.setItem('last_notas_visit', new Date().toISOString());
    };
  }, []);

  const getDisplayName = (email) => {
    if (!email) return 'Usuario';
    const name = email.split('@')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!mensaje.trim() || !user?.email) return;

    try {
      const { error } = await supabase
        .from('notas')
        .insert([{ mensaje: mensaje.trim(), usuario_email: user.email }]);
        
      if (error) throw error;
      setMensaje('');
    } catch (error) {
      console.error('Error sending mensaje:', error);
    }
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="pipeline-page" style={{ height: '100%', display: 'flex', flexDirection: 'column', paddingBottom: 0, overflow: 'hidden' }}>
      <div className="pipeline-header hide-mobile">
        <h2>Notas del Equipo</h2>
      </div>
      
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '0 12px 0 12px' }}>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column' }}>
          {loading ? (
             <div className="pipeline-empty">Cargando notas...</div>
          ) : notas.length === 0 ? (
             <div className="pipeline-empty">No hay notas en el sistema.</div>
          ) : (
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
              {notas.map((n) => {
                const isMine = n.usuario_email === user?.email;
                return (
                  <div key={n.id} style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                     <div style={{ fontSize: '11px', fontWeight: '600', color: isMine ? '#C2622A' : '#7C6E65', marginBottom: '4px', paddingLeft: isMine ? 0 : '4px', paddingRight: isMine ? '4px' : 0, textAlign: isMine ? 'right' : 'left', letterSpacing: '0.3px' }}>
                       {isMine ? 'Tú' : getDisplayName(n.usuario_email)}
                     </div>
                     <div style={{ 
                        padding: '10px 14px', 
                        borderRadius: '14px', 
                        backgroundColor: isMine ? '#D97745' : '#F5F0EA',
                        color: isMine ? '#FFFFFF' : '#1A1411',
                        borderBottomRightRadius: isMine ? '4px' : '14px',
                        borderBottomLeftRadius: !isMine ? '4px' : '14px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                     }}>
                       <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5' }}>{n.mensaje}</p>
                     </div>
                     <div style={{ fontSize: '10px', color: '#A09891', marginTop: '3px', textAlign: isMine ? 'right' : 'left' }}>
                       {formatTime(n.created_at)}
                     </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div style={{ padding: '12px 0', flexShrink: 0 }}>
          <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Escribe una nota para el equipo..."
              style={{ 
                flexGrow: 1, 
                padding: '10px 14px', 
                borderRadius: '8px', 
                border: '1px solid #E8E2D9',
                outline: 'none',
                fontFamily: '"DM Sans", sans-serif',
                fontSize: '13px'
              }}
            />
            <button type="submit" disabled={!mensaje.trim() || !user} className="btn btn-primary" style={{ padding: '0 16px', borderRadius: '8px', fontSize: '13px' }}>
              Enviar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Notas;
