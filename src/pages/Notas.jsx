import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import './Pipeline.css'; // Base styles

const Notas = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef(null);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('notas')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setMessages(data || []);
      
      // Mark as read when viewing
      const unreadIds = (data || []).filter(m => !m.is_read).map(m => m.id);
      if (unreadIds.length > 0) {
        await supabase.from('notas').update({ is_read: true }).in('id', unreadIds);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const channel = supabase.channel('notas-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notas' }, fetchMessages)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('notas')
        .insert([{ content: newMessage, is_read: false }]);
      if (error) throw error;
      setNewMessage('');
      fetchMessages();
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pipeline-page" style={{ position: 'relative', display: 'flex', flexDirection: column, height: 'auto' }}>
      <div className="pipeline-header">
        <h2>Notas del Equipo</h2>
        <p>Conversación interna y recordatorios generales.</p>
      </div>

      <div className="chat-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 100 }}>
        {loading ? (
          <p>Cargando mensajes...</p>
        ) : messages.length === 0 ? (
          <p style={{ color: '#A09891', textAlign: 'center', marginTop: 40 }}>No hay notas compartidas aún.</p>
        ) : (
          messages.map(msg => (
            <div 
              key={msg.id} 
              className="chat-bubble-row" 
              style={{ display: 'flex', flexDirection: 'column', alignSelf: 'flex-start', maxWidth: '80%' }}
            >
              <div 
                className="chat-bubble" 
                style={{ 
                  background: 'white', 
                  padding: '12px 16px', 
                  borderRadius: '12px 12px 12px 4px', 
                  boxShadow: 'var(--shadow)',
                  fontSize: '14px'
                }}
              >
                {msg.content}
              </div>
              <span style={{ fontSize: '10px', color: '#A09891', marginTop: 4, marginLeft: 4 }}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
      </div>

      {/* STICKY INPUT AT THE BOTTOM OF THE PAGE VIEW */}
      <form 
        onSubmit={handleSendMessage} 
        style={{ 
          position: 'sticky', 
          bottom: 20, 
          left: 0, 
          right: 0, 
          background: 'white', 
          padding: '16px', 
          borderRadius: '12px', 
          display: 'flex', 
          gap: 12, 
          boxShadow: '0 -4px 20px rgba(0,0,0,0.05)',
          marginTop: 'auto',
          zIndex: 5
        }}
      >
        <input 
          type="text" 
          placeholder="Escribe una nota..." 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          style={{ 
            flex: 1, 
            border: '1px solid #E8E2D9', 
            borderRadius: '8px', 
            padding: '10px 16px',
            outline: 'none'
          }}
        />
        <button 
          type="submit" 
          disabled={!newMessage.trim() || isSubmitting}
          className="btn btn-primary"
        >
          {isSubmitting ? '...' : 'Enviar'}
        </button>
      </form>
    </div>
  );
};

export default Notas;
