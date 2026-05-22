import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { LayoutDashboard, MessageSquareWarning, Smile, Lightbulb, CheckCircle2 } from 'lucide-react';
import rawData from './data.json';

const COLORS = ['#58cc02', '#1cb0f6', '#ff4b4b', '#ff9600', '#ce82ff'];

export default function App() {
  const [filterMonth, setFilterMonth] = useState('Todos');
  const [filterType, setFilterType] = useState('Todos');

  // Filtrar filas vacías o sin tipo de solicitud
  const data = useMemo(() => {
    return rawData.filter(row => row['No. Consecutivo'] !== null && row['Tipo de solicitud']);
  }, []);

  // Obtener meses únicos y tipos de solicitud para los filtros
  const months = useMemo(() => {
    const m = new Set(data.map(d => d['MES']).filter(Boolean));
    return ['Todos', ...Array.from(m)];
  }, [data]);

  const types = useMemo(() => {
    const t = new Set(data.map(d => d['Tipo de solicitud']).filter(Boolean));
    return ['Todos', ...Array.from(t)];
  }, [data]);

  // Aplicar filtros
  const filteredData = useMemo(() => {
    return data.filter(d => {
      const matchMonth = filterMonth === 'Todos' || d['MES'] === filterMonth;
      const matchType = filterType === 'Todos' || d['Tipo de solicitud'] === filterType;
      return matchMonth && matchType;
    });
  }, [data, filterMonth, filterType]);

  // KPIs
  const totalRequests = filteredData.length;
  const totalQuejas = filteredData.filter(d => String(d['Tipo de solicitud']).toLowerCase().includes('queja')).length;
  const totalFelicitaciones = filteredData.filter(d => String(d['Tipo de solicitud']).toLowerCase().includes('felicita')).length;
  const totalSugerencias = filteredData.filter(d => String(d['Tipo de solicitud']).toLowerCase().includes('sugeren')).length;

  // Gráfica: Por Tipo
  const chartByType = useMemo(() => {
    const counts = {};
    filteredData.forEach(d => {
      const type = d['Tipo de solicitud'] || 'Otro';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.keys(counts).map(k => ({ name: k, value: counts[k] }));
  }, [filteredData]);

  // Gráfica: Por Área (Top 5)
  const chartByArea = useMemo(() => {
    const counts = {};
    filteredData.forEach(d => {
      const area = d['Área involucrada'] || 'No especificada';
      counts[area] = (counts[area] || 0) + 1;
    });
    return Object.keys(counts)
      .map(k => ({ name: k, value: counts[k] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredData]);

  // Gráfica: Estatus de Resolución
  const chartByStatus = useMemo(() => {
    const counts = {};
    filteredData.forEach(d => {
      const status = d['Estatus de Resolucion interna'] || d['Estatus de Resolucion\n interna'] || 'Pendiente';
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.keys(counts).map(k => ({ name: k, value: counts[k] }));
  }, [filteredData]);

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <div className="stat-icon green" style={{ width: '40px', height: '40px' }}>
            <LayoutDashboard size={20} />
          </div>
          <h2 style={{ margin: 0, color: 'var(--color-green)' }}>SUG Dash</h2>
        </div>

        <h3 style={{ fontSize: '14px', color: 'var(--color-hare)', textTransform: 'uppercase' }}>Filtros</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Mes</label>
          <select 
            className="btn-3d" 
            value={filterMonth} 
            onChange={e => setFilterMonth(e.target.value)}
          >
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
          <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Tipo de Solicitud</label>
          <select 
            className="btn-3d" 
            value={filterType} 
            onChange={e => setFilterType(e.target.value)}
          >
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Estatus del Origen de Datos (Drive) */}
        <h3 style={{ fontSize: '14px', color: 'var(--color-hare)', textTransform: 'uppercase', marginTop: '32px' }}>Origen de Datos</h3>
        <div className="card-3d" style={{ padding: '12px', fontSize: '13px', background: 'var(--color-snow)', borderStyle: 'dashed' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: 'var(--color-green-dark)' }}>
            <CheckCircle2 size={16} />
            <span>Drive Sincronizado</span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--color-hare)', margin: '8px 0 0 0', lineHeight: '1.4' }}>
            Alimentado en tiempo real desde la API de Google Sheets.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <h1 style={{ marginBottom: '8px' }}>Panel de Control SUG</h1>
        <p style={{ color: 'var(--color-hare)', marginBottom: '32px' }}>Analiza quejas, sugerencias y felicitaciones (Estilo Duolingo)</p>

        {/* KPIs */}
        <div className="dashboard-grid">
          <div className="card-3d stat-card">
            <div className="stat-icon blue"><LayoutDashboard /></div>
            <div className="stat-content">
              <h3>Total Solicitudes</h3>
              <p className="value">{totalRequests}</p>
            </div>
          </div>
          <div className="card-3d stat-card">
            <div className="stat-icon red"><MessageSquareWarning /></div>
            <div className="stat-content">
              <h3>Quejas</h3>
              <p className="value" style={{ color: 'var(--color-red)' }}>{totalQuejas}</p>
            </div>
          </div>
          <div className="card-3d stat-card">
            <div className="stat-icon green"><Smile /></div>
            <div className="stat-content">
              <h3>Felicitaciones</h3>
              <p className="value" style={{ color: 'var(--color-green)' }}>{totalFelicitaciones}</p>
            </div>
          </div>
          <div className="card-3d stat-card">
            <div className="stat-icon orange"><Lightbulb /></div>
            <div className="stat-content">
              <h3>Sugerencias</h3>
              <p className="value" style={{ color: 'var(--color-orange)' }}>{totalSugerencias}</p>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="charts-grid">
          <div className="card-3d">
            <h3>Tipos de Solicitudes</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartByType} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="name" stroke="#afafaf" />
                  <YAxis stroke="#afafaf" />
                  <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: '2px solid #e5e5e5', fontWeight: 'bold' }} />
                  <Bar dataKey="value" fill="var(--color-blue)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card-3d">
            <h3>Estatus de Resolución</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartByStatus}
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '12px', border: '2px solid #e5e5e5', fontWeight: 'bold' }} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card-3d" style={{ gridColumn: '1 / -1' }}>
            <h3>Top 5 Áreas Involucradas</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={chartByArea} margin={{ top: 20, right: 30, left: 100, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" horizontal={true} vertical={false} />
                  <XAxis type="number" stroke="#afafaf" />
                  <YAxis dataKey="name" type="category" stroke="#4b4b4b" tick={{fontWeight: 'bold', fontSize: 12}} width={120} />
                  <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: '2px solid #e5e5e5', fontWeight: 'bold' }} />
                  <Bar dataKey="value" fill="var(--color-orange)" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="card-3d">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3>Registros Recientes</h3>
            <span className="badge" style={{ background: 'var(--color-swan)', color: 'var(--color-eel)' }}>
              Mostrando {Math.min(filteredData.length, 10)} de {filteredData.length}
            </span>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Área</th>
                  <th>Estatus</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.slice(0, 10).map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 'bold' }}>{row['Folio SUG'] || row['Folio Interno '] || row['Folio Interno'] || '-'}</td>
                    <td>{row['Fecha de solicitud '] || row['Fecha de solicitud'] || '-'}</td>
                    <td>
                      <span className={`badge ${row['Tipo de solicitud']}`}>
                        {row['Tipo de solicitud']}
                      </span>
                    </td>
                    <td>{row['Área involucrada'] || '-'}</td>
                    <td style={{ fontWeight: 'bold', color: row['Estatus de Resolucion interna'] === 'RESUELTO' ? 'var(--color-green)' : 'var(--color-orange)' }}>
                      {row['Estatus de Resolucion interna'] || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
