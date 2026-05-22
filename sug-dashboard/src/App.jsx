import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { LayoutDashboard, MessageSquareWarning, Smile, Lightbulb, Share2, AlertCircle, RefreshCw } from 'lucide-react';
import staticRawData from './data.json';

const COLORS = ['#58cc02', '#1cb0f6', '#ff4b4b', '#ff9600', '#ce82ff'];

// Enlace de Google Sheets por defecto (opcional)
const GOOGLE_SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/1qntKWV5B2871JultSTKFqXiCwhTN4FmP/export?format=csv';


// Función para parsear CSV robustamente
function parseCSV(csvText) {
  const lines = [];
  let row = [""];
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const c = csvText[i];
    const next = csvText[i + 1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push('');
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') {
        i++;
      }
      lines.push(row);
      row = [''];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0] !== '') {
    lines.push(row);
  }

  if (lines.length === 0) return [];

  // Convertir a array de objetos
  const headers = lines[0].map(h => h.replace(/\s+/g, ' '));
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i];
    if (values.length < headers.length) continue;
    const obj = {};
    headers.forEach((header, index) => {
      let val = values[index];
      if (val === undefined || val === null) {
        val = null;
      } else {
        val = val.trim();
        if (val === '' || val === 'null' || val === 'None' || val === '--' || val === '---') {
          val = null;
        } else if (!isNaN(val) && val !== '') {
          val = Number(val);
        }
      }
      // Normalizar saltos de línea en los nombres de las cabeceras
      const cleanHeader = header.replace(/\r?\n|\r/g, ' ');
      obj[cleanHeader] = val;
    });
    data.push(obj);
  }
  return data;
}

export default function App() {
  const [filterMonth, setFilterMonth] = useState('Todos');
  const [filterType, setFilterType] = useState('Todos');

  // Estados para origen de datos
  const [sheetUrl, setSheetUrl] = useState(() => {
    return localStorage.getItem('sug_sheet_url') || GOOGLE_SHEETS_CSV_URL;
  });
  const [tempUrl, setTempUrl] = useState('');
  const [rawData, setRawData] = useState(staticRawData);
  const [dataSourceStatus, setDataSourceStatus] = useState('local'); // 'local' | 'sheets' | 'error'
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cargar datos desde Google Sheets (CSV) si hay una URL activa
  useEffect(() => {
    if (!sheetUrl) {
      setRawData(staticRawData);
      setDataSourceStatus('local');
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetch(sheetUrl)
      .then(res => {
        if (!res.ok) throw new Error('No se pudo descargar el archivo de Google Drive. Verifica que sea accesible.');
        return res.text();
      })
      .then(text => {
        if (!isMounted) return;
        try {
          const parsed = parseCSV(text);
          if (parsed.length === 0) {
            throw new Error('El archivo de Drive está vacío o tiene un formato incorrecto.');
          }
          setRawData(parsed);
          setDataSourceStatus('sheets');
        } catch (e) {
          throw new Error('Error al analizar el contenido: ' + e.message);
        }
      })
      .catch(err => {
        if (!isMounted) return;
        console.error('Error fetching CSV:', err);
        setRawData(staticRawData);
        setDataSourceStatus('error');
        setError(err.message);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [sheetUrl]);

  // Manejar el guardado de la URL
  const handleSaveUrl = () => {
    if (!tempUrl.trim()) return;
    let url = tempUrl.trim();
    
    // Auto-conversión de enlace de Sheets para exportar como CSV directamente
    if (url.includes('docs.google.com/spreadsheets') && !url.includes('output=csv') && !url.includes('format=csv')) {
      const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        url = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
      }
    }

    localStorage.setItem('sug_sheet_url', url);
    setSheetUrl(url);
    setShowUrlInput(false);
  };

  // Restablecer a datos locales
  const handleClearUrl = () => {
    localStorage.removeItem('sug_sheet_url');
    setSheetUrl('');
    setTempUrl('');
    setShowUrlInput(false);
  };

  // Filtrar filas vacías o nulas
  const data = useMemo(() => {
    return rawData.filter(row => row['No. Consecutivo'] !== null && row['Tipo de solicitud']);
  }, [rawData]);

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

  // Gráfica: Por Área
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
      // Intentar leer con salto de línea o limpio
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

        {/* Sección de Conexión a Drive */}
        <h3 style={{ fontSize: '14px', color: 'var(--color-hare)', textTransform: 'uppercase', marginTop: '32px' }}>Datos en Vivo</h3>
        <div className="card-3d" style={{ padding: '12px', fontSize: '13px', background: 'var(--color-white)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 'bold' }}>
            <span style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: dataSourceStatus === 'sheets' ? 'var(--color-green)' : dataSourceStatus === 'error' ? 'var(--color-red)' : '#afafaf',
              display: 'inline-block'
            }}></span>
            {dataSourceStatus === 'sheets' ? 'Conectado a Drive' : dataSourceStatus === 'error' ? 'Error de conexión' : 'Usando datos locales'}
          </div>

          {dataSourceStatus === 'sheets' && (
            <p style={{ fontSize: '11px', color: 'var(--color-hare)', margin: '0 0 10px 0', lineHeight: '1.3' }}>
              Actualizado en vivo desde tu hoja de cálculo.
            </p>
          )}

          {dataSourceStatus === 'error' && (
            <p style={{ fontSize: '11px', color: 'var(--color-red)', margin: '0 0 10px 0', lineHeight: '1.3' }}>
              {error || 'No se pudo cargar la hoja de cálculo. Mostrando datos de respaldo.'}
            </p>
          )}

          {dataSourceStatus === 'local' && (
            <p style={{ fontSize: '11px', color: 'var(--color-hare)', margin: '0 0 10px 0', lineHeight: '1.3' }}>
              Mostrando datos locales de respaldo. Conecta una hoja de cálculo para ver actualizaciones en vivo.
            </p>
          )}

          {showUrlInput ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input 
                type="text" 
                placeholder="Pegar enlace de compartir de Google Sheets"
                value={tempUrl}
                onChange={e => setTempUrl(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '6px 8px', 
                  borderRadius: '10px', 
                  border: '2px solid var(--color-swan)',
                  fontSize: '11px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
              <div style={{ display: 'flex', gap: '6px' }}>
                <button 
                  className="btn-3d primary" 
                  onClick={handleSaveUrl}
                  style={{ flex: 1, padding: '6px', fontSize: '11px' }}
                >
                  Conectar
                </button>
                <button 
                  className="btn-3d" 
                  onClick={() => setShowUrlInput(false)}
                  style={{ padding: '6px', fontSize: '11px' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button 
                className="btn-3d secondary" 
                onClick={() => {
                  setTempUrl(sheetUrl);
                  setShowUrlInput(true);
                }}
                style={{ width: '100%', padding: '8px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Share2 size={12} />
                {sheetUrl ? 'Cambiar Enlace' : 'Conectar Drive'}
              </button>
              {sheetUrl && (
                <button 
                  className="btn-3d danger" 
                  onClick={handleClearUrl}
                  style={{ width: '100%', padding: '6px', fontSize: '10px' }}
                >
                  Volver a datos locales
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <h1 style={{ marginBottom: '8px' }}>Panel de Control SUG</h1>
        <p style={{ color: 'var(--color-hare)', marginBottom: '32px' }}>Analiza quejas, sugerencias y felicitaciones (Estilo Duolingo)</p>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', gap: '16px' }}>
            <RefreshCw className="animate-spin" size={48} style={{ color: 'var(--color-blue)' }} />
            <p style={{ fontWeight: 'bold', color: 'var(--color-hare)' }}>Descargando datos en vivo...</p>
          </div>
        ) : (
          <>
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
                        <td style={{ fontWeight: 'bold', color: (row['Estatus de Resolucion interna'] || row['Estatus de Resolucion\n interna']) === 'RESUELTO' ? 'var(--color-green)' : 'var(--color-orange)' }}>
                          {row['Estatus de Resolucion interna'] || row['Estatus de Resolucion\n interna'] || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
