import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './Analytics.css';

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const Analytics = () => {
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCitas = async () => {
      try {
        const { data, error } = await supabase
          .from('citas')
          .select('*')
          .order('fecha_inicio', { ascending: true });
        if (error) throw error;
        if (data) setCitas(data);
      } catch (error) {
        console.error('Error fetching citas for analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCitas();
  }, []);

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="analytics-loading">Cargando analytics...</div>
      </div>
    );
  }

  // === METRIC CALCULATIONS ===
  const total = citas.length;
  const confirmadas = citas.filter(c => c.status === 'confirmada').length;
  const pendientes = citas.filter(c => c.status === 'pendiente').length;
  const canceladas = citas.filter(c => c.status === 'cancelada' || c.status === 'denegada').length;

  // === MONTHLY TRENDS ===
  const monthlyMap = {};
  citas.forEach(c => {
    const d = new Date(c.fecha_inicio);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
    monthlyMap[key] = (monthlyMap[key] || 0) + 1;
  });
  
  const sortedMonths = Object.keys(monthlyMap).sort();
  const recentMonths = sortedMonths.slice(-6);
  const maxMonthly = Math.max(...recentMonths.map(k => monthlyMap[k]), 1);

  // === TOP CLIENTS ===
  const clientMap = {};
  citas.forEach(c => {
    const name = c.cliente_nombre || 'Desconocido';
    clientMap[name] = (clientMap[name] || 0) + 1;
  });
  const topClients = Object.entries(clientMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxClientCount = topClients.length > 0 ? topClients[0][1] : 1;

  // === TIME SLOTS ===
  const hourMap = {};
  citas.forEach(c => {
    const hour = new Date(c.fecha_inicio).getHours();
    hourMap[hour] = (hourMap[hour] || 0) + 1;
  });
  const timeSlots = Object.entries(hourMap)
    .map(([h, count]) => ({ hour: parseInt(h), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .sort((a, b) => a.hour - b.hour);
  const maxSlotCount = timeSlots.length > 0 ? Math.max(...timeSlots.map(s => s.count)) : 1;

  // === DONUT CHART ===
  const donutData = [
    { label: 'Confirmadas', count: confirmadas, color: '#4CAF50' },
    { label: 'Pendientes', count: pendientes, color: '#F5A623' },
    { label: 'Canceladas', count: canceladas, color: '#C65D5D' },
  ];
  const donutTotal = donutData.reduce((s, d) => s + d.count, 0) || 1;
  
  // Build donut arcs
  const donutRadius = 60;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let donutOffset = 0;
  const donutArcs = donutData.map(d => {
    const pct = d.count / donutTotal;
    const dashLength = pct * donutCircumference;
    const arc = {
      ...d,
      dashArray: `${dashLength} ${donutCircumference - dashLength}`,
      dashOffset: -donutOffset,
      pct: Math.round(pct * 100),
    };
    donutOffset += dashLength;
    return arc;
  });

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <h2 className="hide-mobile">Analytics</h2>
        <p>Resumen de actividad basado en todas las citas registradas.</p>
      </div>

      {/* Summary Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'rgba(217, 119, 69, 0.1)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97745" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div className="metric-value">{total}</div>
          <div className="metric-label">Total Citas</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'rgba(76, 175, 80, 0.1)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div className="metric-value">{confirmadas}</div>
          <div className="metric-label">Confirmadas</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'rgba(245, 166, 35, 0.1)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div className="metric-value">{pendientes}</div>
          <div className="metric-label">Pendientes</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'rgba(198, 93, 93, 0.1)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C65D5D" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <div className="metric-value">{canceladas}</div>
          <div className="metric-label">Canceladas</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-grid">
        {/* Monthly Trends */}
        <div className="chart-card">
          <h3>Tendencia Mensual</h3>
          <div className="bar-chart-container">
            <div className="chart-grid">
              <div className="grid-line" />
              <div className="grid-line" />
              <div className="grid-line" />
              <div className="grid-line" />
              <div className="grid-line" />
            </div>
            <div className="bar-chart">
              {recentMonths.map(key => {
                const count = monthlyMap[key];
                const heightPct = (count / maxMonthly) * 100;
                return (
                  <div key={key} className="bar-group">
                    <span className="bar-value">{count}</span>
                    <div
                      className="bar"
                      style={{
                        height: `${heightPct}%`,
                        backgroundColor: '#D97745',
                      }}
                    />
                  </div>
                );
              })}
              {recentMonths.length === 0 && (
                <div style={{ width: '100%', textAlign: 'center', color: '#A09891', fontSize: '14px', alignSelf: 'center', position: 'relative', zIndex: 2 }}>
                  Sin datos suficientes
                </div>
              )}
            </div>
            {recentMonths.length > 0 && (
              <div className="bar-label-container">
                {recentMonths.map(key => {
                  const [, month] = key.split('-');
                  return <span key={`lbl-${key}`} className="bar-label">{MONTHS_ES[parseInt(month)]}</span>;
                })}
              </div>
            )}
          </div>
        </div>

        {/* Donut Chart */}
        <div className="chart-card">
          <h3>Distribución</h3>
          <div className="donut-container">
            <svg width="150" height="150" viewBox="0 0 150 150">
              {donutArcs.map((arc, i) => (
                <circle
                  key={i}
                  cx="75"
                  cy="75"
                  r={donutRadius}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth="20"
                  strokeDasharray={arc.dashArray}
                  strokeDashoffset={arc.dashOffset}
                  transform="rotate(-90 75 75)"
                  style={{ transition: 'stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease' }}
                />
              ))}
              <text x="75" y="72" textAnchor="middle" fontFamily="DM Serif Display, serif" fontSize="24" fill="#1A1411">
                {total}
              </text>
              <text x="75" y="88" textAnchor="middle" fontFamily="DM Sans, sans-serif" fontSize="11" fill="#A09891">
                Total
              </text>
            </svg>
            <div className="donut-legend">
              {donutArcs.map((arc, i) => (
                <div key={i} className="legend-item">
                  <span className="legend-dot" style={{ background: arc.color }} />
                  {arc.label}
                  <span className="legend-count">({arc.count})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="bottom-grid">
        {/* Top Clients */}
        <div className="chart-card">
          <h3>Clientes Frecuentes</h3>
          <div className="client-list">
            {topClients.length === 0 ? (
              <div style={{ color: '#A09891', fontSize: '14px' }}>Sin datos de clientes</div>
            ) : (
              topClients.map(([name, count], i) => (
                <div key={name} className="client-row">
                  <span className="client-rank">{i + 1}</span>
                  <div className="client-info">
                    <span className="client-name-text">{name}</span>
                    <div className="client-bar-container">
                      <div className="client-bar-fill" style={{ width: `${(count / maxClientCount) * 100}%` }} />
                    </div>
                  </div>
                  <span className="client-count">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Popular Time Slots */}
        <div className="chart-card">
          <h3>Horarios Populares</h3>
          <div className="timeslot-list">
            {timeSlots.length === 0 ? (
              <div style={{ color: '#A09891', fontSize: '14px' }}>Sin datos de horarios</div>
            ) : (
              timeSlots.map(slot => (
                <div key={slot.hour} className="timeslot-row">
                  <span className="timeslot-label">{`${String(slot.hour).padStart(2, '0')}:00`}</span>
                  <div className="timeslot-bar-container">
                    <div
                      className="timeslot-bar-fill"
                      style={{
                        width: `${(slot.count / maxSlotCount) * 100}%`,
                        backgroundColor: '#D97745',
                      }}
                    >
                      <span className="timeslot-count">{slot.count}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
