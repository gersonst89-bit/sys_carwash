import React, { useEffect, useState } from 'react';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { http, apiErrorMsg } from '../../api/http';
import { exportToCsv } from '../../utils/format';

export const AsistenteIaPage: React.FC = () => {
  const [estado, setEstado] = useState<any>(null);
  const [pregunta, setPregunta] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<any>(null);
  const [resumen, setResumen] = useState('');
  const [resumiendo, setResumiendo] = useState(false);

  const [cfgModal, setCfgModal] = useState(false);
  const [cfgForm, setCfgForm] = useState({
    proveedor: 'gemini',
    url: '',
    modelo: '',
    clave: '',
    resumen: true,
  });
  const [testMsg, setTestMsg] = useState('');

  const cargarEstado = async () => {
    try {
      const { data } = await http.get('/ia/asistente/estado');
      setEstado(data);
      if (data.cfg) {
        setCfgForm({
          proveedor: data.cfg.proveedor || 'gemini',
          url: data.cfg.url || '',
          modelo: data.cfg.modelo || '',
          clave: '',
          resumen: Boolean(data.cfg.resumen),
        });
      }
    } catch (e) {
      setError(apiErrorMsg(e));
    }
  };

  useEffect(() => {
    cargarEstado();
  }, []);

  const handlePresetChange = (prov: string) => {
    const preset = estado?.presets?.[prov];
    setCfgForm((prev) => ({
      ...prev,
      proveedor: prov,
      url: preset?.url ?? prev.url,
      modelo: preset?.modelo ?? prev.modelo,
    }));
  };

  const guardarCfg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await http.post('/ia/asistente/config', cfgForm);
      setCfgModal(false);
      cargarEstado();
    } catch (err) {
      alert(apiErrorMsg(err));
    }
  };

  const probarIa = async () => {
    setTestMsg('Probando conexión...');
    try {
      await http.post('/ia/asistente/config', cfgForm);
      const { data } = await http.post('/ia/asistente/probar');
      setTestMsg(`✅ Conectado: ${data.respuesta}`);
      cargarEstado();
    } catch (err) {
      setTestMsg(`❌ ${apiErrorMsg(err)}`);
    }
  };

  const hacerPregunta = async (qText?: string) => {
    const q = (qText ?? pregunta).trim();
    if (!q) return;
    setPregunta(q);
    setLoading(true);
    setError('');
    setResumen('');
    try {
      const previo = resultado?.sql ? { pregunta: resultado.titulo, sql: resultado.sql } : null;
      const { data } = await http.post('/ia/asistente/preguntar', { pregunta: q, previo });
      setResultado(data);
      cargarEstado();
      if (data.id && estado?.cfg?.resumen && data.filas?.length > 0) {
        setResumiendo(true);
        http
          .post('/ia/asistente/resumir', { id: data.id })
          .then((r) => setResumen(r.data.resumen || ''))
          .catch(() => {})
          .finally(() => setResumiendo(false));
      }
    } catch (err) {
      setError(apiErrorMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const ejecutarGuardada = async (id: number) => {
    setLoading(true);
    setError('');
    setResumen('');
    try {
      const { data } = await http.post('/ia/asistente/ejecutar', { id });
      setPregunta(data.pregunta || '');
      setResultado(data);
    } catch (err) {
      setError(apiErrorMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const toggleFav = async (id: number, val: boolean) => {
    await http.post('/ia/asistente/favorito', { id, valor: val });
    if (resultado?.id === id) setResultado({ ...resultado, favorito: val ? 1 : 0 });
    cargarEstado();
  };

  const renderChart = () => {
    if (!resultado?.filas?.length || !resultado?.grafico || resultado.grafico.tipo === 'none') {
      return null;
    }
    const cols: string[] = resultado.columnas || [];
    const xIdx = Math.max(0, cols.indexOf(resultado.grafico.x));
    let yIdx = cols.indexOf(resultado.grafico.y);
    if (yIdx === -1) yIdx = cols.length > 1 ? 1 : 0;

    const labels = resultado.filas.slice(0, 20).map((f: any[]) => String(f[xIdx] ?? ''));
    const values = resultado.filas.slice(0, 20).map((f: any[]) => Number(f[yIdx] ?? 0));

    const chartData = {
      labels,
      datasets: [
        {
          label: cols[yIdx] || 'Valor',
          data: values,
          backgroundColor: [
            '#0ea5e9',
            '#14b8a6',
            '#8b5cf6',
            '#f59e0b',
            '#f43f5e',
            '#16a34a',
            '#6366f1',
            '#ec4899',
          ],
          borderColor: '#0ea5e9',
          borderWidth: 2,
        },
      ],
    };

    return (
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body" style={{ height: 280 }}>
          {resultado.grafico.tipo === 'line' ? (
            <Line data={chartData} options={{ maintainAspectRatio: false }} />
          ) : resultado.grafico.tipo === 'pie' ? (
            <Pie data={chartData} options={{ maintainAspectRatio: false }} />
          ) : (
            <Bar data={chartData} options={{ maintainAspectRatio: false }} />
          )}
        </div>
      </div>
    );
  };

  const sugerencias = [
    '¿Cuáles son los 5 servicios más vendidos este mes?',
    'Ventas cobradas por día de los últimos 15 días',
    'Top 10 mejores clientes por monto total gastado',
    '¿Qué productos tienen stock bajo o agotado?',
    'Producción y ventas cobradas por cada lavador',
    'Ingresos por método de pago',
  ];

  return (
    <div className="container-fluid py-2">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h4 className="fw-bold mb-0">
            <i className="bi bi-stars text-primary me-2"></i>Asistente IA de Reportes
          </h4>
          <small className="text-muted">
            Pregunta en español y obtén tablas, gráficos y resúmenes en tiempo real (Vistas seguras PostgreSQL)
          </small>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className={`badge ${estado?.listo ? 'bg-success' : 'bg-warning text-dark'}`}>
            {estado?.listo ? `IA Lista (${estado?.cfg?.modelo})` : 'Falta configurar API Key'}
          </span>
          <button className="btn btn-outline-primary btn-sm" onClick={() => setCfgModal(true)}>
            <i className="bi bi-gear me-1"></i>Configurar IA
          </button>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-body">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  hacerPregunta();
                }}
                className="d-flex gap-2"
              >
                <input
                  type="text"
                  className="form-control form-control-lg"
                  placeholder="Ej: ¿Cuánto vendimos este mes por servicio?"
                  value={pregunta}
                  onChange={(e) => setPregunta(e.target.value)}
                />
                <button className="btn btn-primary px-4" type="submit" disabled={loading}>
                  {loading ? (
                    <span className="spinner-border spinner-border-sm"></span>
                  ) : (
                    <>
                      <i className="bi bi-send me-1"></i>Preguntar
                    </>
                  )}
                </button>
              </form>
              <div className="d-flex flex-wrap gap-1 mt-2">
                {sugerencias.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="btn btn-light btn-sm border text-secondary"
                    onClick={() => hacerPregunta(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}
          {resultado?.mensaje && <div className="alert alert-info">{resultado.mensaje}</div>}

          {resultado?.columnas && (
            <>
              {(resumen || resumiendo) && (
                <div className="alert alert-primary border-0 shadow-sm d-flex align-items-center gap-2">
                  <i className="bi bi-robot fs-4"></i>
                  <div>{resumiendo ? 'Analizando resultados con IA...' : resumen}</div>
                </div>
              )}

              {renderChart()}

              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
                  <div>
                    <h6 className="fw-bold mb-0">{resultado.titulo}</h6>
                    <small className="text-muted">
                      {resultado.filas?.length || 0} filas · {resultado.ms} ms
                    </small>
                  </div>
                  <div className="d-flex gap-2">
                    {resultado.id && (
                      <button
                        className={`btn btn-sm ${resultado.favorito ? 'btn-warning' : 'btn-outline-secondary'}`}
                        onClick={() => toggleFav(resultado.id, !resultado.favorito)}
                      >
                        <i className="bi bi-star-fill me-1"></i>Favorito
                      </button>
                    )}
                    <button
                      className="btn btn-sm btn-outline-success"
                      onClick={() =>
                        exportToCsv(resultado.titulo || 'reporte_ia', resultado.columnas, resultado.filas)
                      }
                    >
                      <i className="bi bi-download me-1"></i>CSV
                    </button>
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        {resultado.columnas.map((c: string) => (
                          <th key={c}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.filas.map((f: any[], rIdx: number) => (
                        <tr key={rIdx}>
                          {f.map((v: any, cIdx: number) => (
                            <td key={cIdx}>{v === null ? '-' : String(v)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {resultado.sql && (
                  <div className="card-footer bg-light small font-monospace text-muted">
                    SQL: {resultado.sql}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header bg-white fw-bold">
              <i className="bi bi-star-fill text-warning me-2"></i>Consultas Favoritas
            </div>
            <div className="list-group list-group-flush">
              {(estado?.favoritos || []).length === 0 && (
                <div className="p-3 text-muted small">Aún no tienes consultas favoritas.</div>
              )}
              {(estado?.favoritos || []).map((f: any) => (
                <button
                  key={f.id}
                  className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                  onClick={() => ejecutarGuardada(f.id)}
                >
                  <span className="text-truncate">{f.titulo || f.pregunta}</span>
                  <i className="bi bi-play-circle text-primary"></i>
                </button>
              ))}
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white fw-bold">
              <i className="bi bi-clock-history me-2"></i>Historial Reciente
            </div>
            <div className="list-group list-group-flush">
              {(estado?.historial || []).length === 0 && (
                <div className="p-3 text-muted small">Sin consultas recientes.</div>
              )}
              {(estado?.historial || []).map((h: any) => (
                <button
                  key={h.id}
                  className="list-group-item list-group-item-action text-truncate small"
                  onClick={() => ejecutarGuardada(h.id)}
                >
                  {h.titulo || h.pregunta}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {cfgModal && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <form className="modal-content" onSubmit={guardarCfg}>
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Configurar Proveedor de IA</h5>
                <button type="button" className="btn-close" onClick={() => setCfgModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label fw-semibold">Proveedor</label>
                  <select
                    className="form-select"
                    value={cfgForm.proveedor}
                    onChange={(e) => handlePresetChange(e.target.value)}
                  >
                    {Object.entries(estado?.presets || {}).map(([k, v]: any) => (
                      <option key={k} value={k}>
                        {v.nombre}
                      </option>
                    ))}
                  </select>
                  <small className="text-muted">
                    {estado?.presets?.[cfgForm.proveedor]?.ayuda}
                  </small>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">URL Base (OpenAI Compatible)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={cfgForm.url}
                    onChange={(e) => setCfgForm({ ...cfgForm, url: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Modelo</label>
                  <input
                    type="text"
                    className="form-control"
                    value={cfgForm.modelo}
                    onChange={(e) => setCfgForm({ ...cfgForm, modelo: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    API Key {estado?.cfg?.clave_puesta && '(Ya guardada - deja vacío para mantener)'}
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Pega tu clave gratuita de Gemini / Groq..."
                    value={cfgForm.clave}
                    onChange={(e) => setCfgForm({ ...cfgForm, clave: e.target.value })}
                  />
                </div>
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={cfgForm.resumen}
                    onChange={(e) => setCfgForm({ ...cfgForm, resumen: e.target.checked })}
                  />
                  <label className="form-check-label">Generar resumen ejecutivo automático</label>
                </div>
                {testMsg && <div className="alert alert-secondary mt-3 mb-0 py-2 small">{testMsg}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-info" onClick={probarIa}>
                  Probar conexión
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
