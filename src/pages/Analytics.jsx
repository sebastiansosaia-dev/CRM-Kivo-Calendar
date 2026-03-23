import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import './Analytics.css';

const STATUS_COLORS = {
  confirmada: '#4CAF50',
  pendiente: '#FFC107',
  cancelada: '#F44336',
  denegada: '#D32F2F'
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="tooltip-item" style={{ color: entry.color }}>
            {entry.name}: <strong>{entry.value}</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const Analytics = () => {
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchCitas = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('citas')
        .select('*')
        .order('fecha_inicio', { ascending: false });

      if (!error && active) {
        setCitas(data || []);
      }
      if (active) setLoading(false);
    };

    fetchCitas();

    return () => { active = false; };
  }, []);

  const totalCitas = citas.length;
  const statusValues = citas.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});

  const statusData = Object.keys(statusValues).map(key => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: statusValues[key],
    statusKey: key
  }));

  const monthValues = citas.reduce((acc, c) => {
    if (!c.fecha_inicio) return acc;
    const date = new Date(c.fecha_inicio);
    if (!isNaN(date)) {
      const month = date.toLocaleString('es-HN', { month: 'short' });
      acc[month] = acc[month] || { name: month, Confirmadas: 0, Pendientes: 0, Canceladas: 0, Denegadas: 0 };
      if (c.status === 'confirmada') acc[month].Confirmadas += 1;
      else if (c.status === 'pendiente') acc[month].Pendientes += 1;
      else if (c.status === 'cancelada') acc[month].Canceladas += 1;
      else if (c.status === 'denegada') acc[month].Denegadas += 1;
    }
    return acc;
  }, {});

  const monthData = Object.values(monthValues);

  const topClients = citas.reduce((acc, c) => {
    if (c.cliente_nombre) {
      acc[c.cliente_nombre] = (acc[c.cliente_nombre] || 0) + 1;
    }
    return acc;
  }, {});
  
  const topClientsList = Object.keys(topClients)
    .map(name => ({ name, count: topClients[name] }))
    .sort((a,b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <h2>Analytics (Demo)</h2>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card metric-card">
          <div className="metric-header">Total de Citas (Histórico)</div>
          <div className="metric-value">{loading ? '...' : totalCitas}</div>
        </div>
        
        <div className="analytics-card metric-card">
          <div className="metric-header">Tasa de Confirmación</div>
          <div className="metric-value" style={{ color: '#4CAF50' }}>
            {loading ? '...' : totalCitas > 0 ? Math.round(((statusValues.confirmada || 0) / totalCitas) * 100) + '%' : '0%'}
          </div>
        </div>

        <div className="analytics-card metric-card">
          <div className="metric-header">Citas Canceladas</div>
          <div className="metric-value" style={{ color: '#F44336' }}>
            {loading ? '...' : ((statusValues.cancelada || 0) + (statusValues.denegada || 0))}
          </div>
        </div>
      </div>

      <div className="analytics-main-grid">
        <div className="analytics-card chart-card">
          <h3 className="chart-title">Distribución por Estado</h3>
          {loading ? (
            <div className="chart-loading skeleton-shimmer"></div>
          ) : citas.length === 0 ? (
            <div className="chart-empty">No hay datos</div>
          ) : (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.statusKey] || '#E8E2D9'} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="analytics-card chart-card">
          <h3 className="chart-title">Reserva de Citas por Mes</h3>
          {loading ? (
            <div className="chart-loading skeleton-shimmer"></div>
          ) : monthData.length === 0 ? (
            <div className="chart-empty">No hay datos</div>
          ) : (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1EDE7" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#7C6E65', fontSize: 13 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#7C6E65', fontSize: 13 }} />
                  <Tooltip cursor={{ fill: '#F9F7F4' }} content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="Confirmadas" stackId="a" fill={STATUS_COLORS.confirmada} radius={[0, 0, 4, 4]} barSize={32} />
                  <Bar dataKey="Pendientes" stackId="a" fill={STATUS_COLORS.pendiente} />
                  <Bar dataKey="Canceladas" stackId="a" fill={STATUS_COLORS.cancelada} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="analytics-card list-card">
          <h3 className="chart-title">Top Clientes</h3>
          {loading ? (
            <div className="list-loading">
              <div className="skeleton-shimmer" style={{ height: '40px', marginBottom: '8px', borderRadius: '8px' }}></div>
              <div className="skeleton-shimmer" style={{ height: '40px', marginBottom: '8px', borderRadius: '8px' }}></div>
              <div className="skeleton-shimmer" style={{ height: '40px', borderRadius: '8px' }}></div>
            </div>
          ) : topClientsList.length === 0 ? (
             <div className="chart-empty">No hay datos</div>
          ) : (
            <div className="client-list">
              {topClientsList.map((client, index) => (
                <div key={index} className="client-list-item">
                  <div className="client-avatar">{client.name.charAt(0).toUpperCase()}</div>
                  <div className="client-info">
                    <span className="client-name">{client.name}</span>
                    <span className="client-count">{client.count} citas programadas</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
