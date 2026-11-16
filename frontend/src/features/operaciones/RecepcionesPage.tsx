import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { http, apiErrorMsg } from '../../api/http';
import { fdate } from '../../utils/format';

const CHECKLIST_ITEMS: Record<string, string> = {
  radio: 'Radio / pantalla',
  gata: 'Gata y llave de ruedas',
  repuesto: 'Llanta de repuesto',
  tapas: 'Tapas de llantas',
  alfombras: 'Alfombras',
  extintor: 'Extintor / botiquín',
  documentos: 'Documentos en el vehículo',
  valores: 'Objetos de valor a la vista',
  antena: 'Antena',
  espejos: 'Espejos completos',
};

const ZONAS: Record<string, string> = {
  parag_del: 'Parachoques delantero',
  capo: 'Capó',
  parabrisas: 'Parabrisas',
  techo: 'Techo',
  puerta_izq: 'Lado izquierdo',
  puerta_der: 'Lado derecho',
  maletera: 'Maletera / luneta',
  parag_tras: 'Parachoques trasero',
  llantas: 'Llantas / aros',
  interior: 'Interior / tapizado',
};

const DANOS: Record<string, string> = {
  '': 'Sin daños',
  rayon: 'Rayón',
  abolladura: 'Abolladura',
  roto: 'Roto / agrietado',
  mancha: 'Mancha / desgaste',
};

export const RecepcionesPage: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [cat, setCat] = useState<{ clientes: any[]; vehiculos: any[] }>({ clientes: [], vehiculos: [] });
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<'list' | 'new' | 'view'>('list');
  const [currentRec, setCurrentRec] = useState<any>(null);

  const [clienteId, setClienteId] = useState('');
  const [vehiculoId, setVehiculoId] = useState('');
  const [placa, setPlaca] = useState('');
  const [combustible, setCombustible] = useState(50);
  const [kilometraje, setKilometraje] = useState('');
  const [check, setCheck] = useState<string[]>(['alfombras', 'espejos']);
  const [danos, setDanos] = useState<Record<string, string>>({});
  const [observaciones, setObservaciones] = useState('');
  const [saving, setSaving] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [recRes, catRes] = await Promise.all([
        http.get('/recepciones', { params: { q: q || undefined } }),
        http.get('/recepciones/catalogos'),
      ]);
      setRows(recRes.data.rows || []);
      setCat({
        clientes: catRes.data.clientes || [],
        vehiculos: catRes.data.vehiculos || [],
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [q]);

  const openView = async (id: number) => {
    try {
      const { data } = await http.get(`/recepciones/${id}`);
      setCurrentRec(data);
      setMode('view');
    } catch (err) {
      alert(apiErrorMsg(err));
    }
  };

  const clearCanvas = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, c.width, c.height);
      setHasSigned(false);
    }
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const rect = c.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
    setHasSigned(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const rect = c.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDraw = () => {
    setIsDrawing(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const firmaData =
        hasSigned && canvasRef.current ? canvasRef.current.toDataURL('image/png') : undefined;
      const { data } = await http.post('/recepciones', {
        cliente_id: clienteId ? Number(clienteId) : null,
        vehiculo_id: vehiculoId ? Number(vehiculoId) : null,
        placa,
        combustible,
        kilometraje: kilometraje ? Number(kilometraje) : null,
        check,
        dano: danos,
        firma: firmaData,
        observaciones,
      });
      await load();
      openView(data.id);
    } catch (err) {
      alert(apiErrorMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Eliminar esta acta de recepción?')) return;
    try {
      await http.delete(`/recepciones/${id}`);
      setMode('list');
      load();
    } catch (err) {
      alert(apiErrorMsg(err));
    }
  };

  if (mode === 'new') {
    return (
      <div>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h4 className="page-title">Nueva Recepción de Vehículo</h4>
            <p className="page-sub small">Inventario físico, daños previos, combustible y firma de conformidad</p>
          </div>
          <button type="button" className="btn btn-light border btn-sm" onClick={() => setMode('list')}>
            Cancelar
          </button>
        </div>

        <form onSubmit={handleSave} className="cw-card">
          <div className="card-b">
            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <label className="form-label">Vehículo registrado</label>
                <select
                  className="form-select"
                  value={vehiculoId}
                  onChange={(e) => {
                    setVehiculoId(e.target.value);
                    const v = cat.vehiculos.find((x) => String(x.id) === e.target.value);
                    if (v) {
                      setPlaca(v.placa);
                      if (v.cliente_id) setClienteId(String(v.cliente_id));
                    }
                  }}
                >
                  <option value="">-- Elegir vehículo o escribir placa --</option>
                  {cat.vehiculos.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.placa} · {v.marca || ''} {v.modelo || ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Placa *</label>
                <input
                  type="text"
                  className="form-control text-uppercase"
                  required
                  value={placa}
                  onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Cliente</label>
                <select
                  className="form-select"
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                >
                  <option value="">-- Opcional --</option>
                  {cat.clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Nivel de Combustible: {combustible}%</label>
                <input
                  type="range"
                  className="form-range"
                  min={0}
                  max={100}
                  step={5}
                  value={combustible}
                  onChange={(e) => setCombustible(Number(e.target.value))}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Kilometraje (km)</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Ej: 45200"
                  value={kilometraje}
                  onChange={(e) => setKilometraje(e.target.value)}
                />
              </div>
            </div>

            <h6 className="fw-bold mb-2">1. Checklist de accesorios presentes (10 puntos)</h6>
            <div className="row g-2 mb-4">
              {Object.entries(CHECKLIST_ITEMS).map(([k, label]) => (
                <div key={k} className="col-sm-6 col-md-4">
                  <label className="d-flex align-items-center gap-2 p-2 rounded-3 border bg-light cursor-pointer">
                    <input
                      type="checkbox"
                      className="form-check-input m-0"
                      checked={check.includes(k)}
                      onChange={(e) => {
                        if (e.target.checked) setCheck([...check, k]);
                        else setCheck(check.filter((x) => x !== k));
                      }}
                    />
                    <span className="small fw-semibold">{label}</span>
                  </label>
                </div>
              ))}
            </div>

            <h6 className="fw-bold mb-2">2. Inspección de daños por zona (10 zonas)</h6>
            <div className="row g-2 mb-4">
              {Object.entries(ZONAS).map(([zk, zLabel]) => (
                <div key={zk} className="col-sm-6 col-md-4">
                  <label className="form-label mb-1">{zLabel}</label>
                  <select
                    className="form-select form-select-sm"
                    value={danos[zk] || ''}
                    onChange={(e) => setDanos({ ...danos, [zk]: e.target.value })}
                  >
                    {Object.entries(DANOS).map(([dk, dLabel]) => (
                      <option key={dk} value={dk}>
                        {dLabel}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Observaciones adicionales</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label m-0">Firma de conformidad del cliente</label>
                  <button type="button" className="btn btn-sm btn-link p-0" onClick={clearCanvas}>
                    Limpiar firma
                  </button>
                </div>
                <canvas
                  ref={canvasRef}
                  width={380}
                  height={130}
                  className="border rounded-3 bg-white w-100"
                  style={{ touchAction: 'none', cursor: 'crosshair' }}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={stopDraw}
                />
              </div>
            </div>

            <div className="mt-4 text-end">
              <button type="submit" className="btn btn-grad px-4" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Acta de Recepción'}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  if (mode === 'view' && currentRec) {
    return (
      <div>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 no-print">
          <div>
            <h4 className="page-title">
              Acta de Recepción #{currentRec.id} · <span className="bd-placa">{currentRec.placa}</span>
            </h4>
            <p className="page-sub small">Registrada el {fdate(currentRec.created_at, true)}</p>
          </div>
          <div className="d-flex gap-2">
            {!currentRec.orden_id ? (
              <button
                type="button"
                className="btn btn-grad btn-sm"
                onClick={() => navigate(`/ordenes/nueva?recepcion=${currentRec.id}`)}
              >
                <i className="bi bi-plus-circle me-1"></i> Generar Orden de Servicio
              </button>
            ) : (
              <Link to={`/ordenes/ver/${currentRec.orden_id}`} className="btn btn-primary btn-sm">
                Ver Orden {currentRec.orden}
              </Link>
            )}
            <button type="button" className="btn btn-light border btn-sm" onClick={() => window.print()}>
              <i className="bi bi-printer me-1"></i> Imprimir Acta
            </button>
            <button type="button" className="btn btn-light border btn-sm" onClick={() => setMode('list')}>
              Volver
            </button>
          </div>
        </div>

        <div className="cw-card">
          <div className="card-b">
            <div className="row g-3 mb-3 border-bottom pb-3">
              <div className="col-sm-3">
                <small className="text-muted d-block">Placa / Vehículo</small>
                <b>{currentRec.placa}</b> {currentRec.marca || ''} {currentRec.modelo || ''}
              </div>
              <div className="col-sm-3">
                <small className="text-muted d-block">Cliente</small>
                <b>{currentRec.cliente || 'Cliente general'}</b>
              </div>
              <div className="col-sm-3">
                <small className="text-muted d-block">Combustible</small>
                <b>{currentRec.combustible}%</b>
              </div>
              <div className="col-sm-3">
                <small className="text-muted d-block">Kilometraje</small>
                <b>{currentRec.kilometraje ? `${currentRec.kilometraje} km` : '-'}</b>
              </div>
            </div>

            <div className="row g-3">
              <div className="col-md-6">
                <h6 className="fw-bold">Checklist de inventario</h6>
                <div className="d-flex flex-wrap gap-2">
                  {Object.entries(CHECKLIST_ITEMS).map(([k, label]) => {
                    const has = (currentRec.check_l || []).includes(k);
                    return (
                      <span
                        key={k}
                        className={`badge ${has ? 'badge-soft-success' : 'badge-soft-secondary'}`}
                      >
                        <i className={`bi ${has ? 'bi-check-lg' : 'bi-dash'} me-1`}></i>
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="col-md-6">
                <h6 className="fw-bold">Daños reportados</h6>
                {Object.keys(currentRec.danos_l || {}).length === 0 ? (
                  <div className="text-muted small">Sin daños preexistentes reportados.</div>
                ) : (
                  <ul className="list-group list-group-flush">
                    {Object.entries(currentRec.danos_l).map(([zk, dk]: any) => (
                      <li key={zk} className="list-group-item px-0 py-1 d-flex justify-content-between">
                        <span>{ZONAS[zk] || zk}</span>
                        <span className="badge badge-soft-danger">{DANOS[dk] || dk}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {currentRec.observaciones && (
                <div className="col-12">
                  <h6 className="fw-bold">Observaciones</h6>
                  <p className="mb-0 small">{currentRec.observaciones}</p>
                </div>
              )}
              {currentRec.firma && (
                <div className="col-12 mt-3">
                  <h6 className="fw-bold">Firma del Cliente</h6>
                  <img
                    src={`/uploads/recepciones/${currentRec.firma}`}
                    alt="Firma"
                    className="border rounded-3 p-2 bg-white"
                    style={{ maxHeight: 120 }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <h4 className="page-title">
            <i className="bi bi-clipboard2-check me-2 text-primary"></i>Recepción de Vehículos
          </h4>
          <p className="page-sub small">Actas de ingreso con checklist, daños previos y firma digital</p>
        </div>
        <button type="button" className="btn btn-grad btn-sm px-3" onClick={() => setMode('new')}>
          <i className="bi bi-plus-lg me-1"></i> Nueva recepción
        </button>
      </div>

      <div className="cw-card">
        <div className="card-h">
          <input
            type="search"
            className="form-control form-control-sm"
            style={{ maxWidth: 280 }}
            placeholder="Buscar por placa o cliente..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <span className="text-muted small">{rows.length} recepciones</span>
        </div>
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Fecha</th>
                <th>Placa</th>
                <th>Cliente</th>
                <th>Combustible</th>
                <th>Orden Vinculada</th>
                <th className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted">
                    Cargando...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted">
                    Sin actas registradas.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td className="fw-bold">#{r.id}</td>
                    <td className="small text-muted">{fdate(r.created_at, true)}</td>
                    <td>
                      <span className="bd-placa">{r.placa}</span>
                    </td>
                    <td>{r.cliente || 'Cliente general'}</td>
                    <td>{r.combustible}%</td>
                    <td>
                      {r.orden_id ? (
                        <Link to={`/ordenes/ver/${r.orden_id}`} className="badge badge-soft-success text-decoration-none">
                          {r.orden}
                        </Link>
                      ) : (
                        <Link to={`/ordenes/nueva?recepcion=${r.id}`} className="btn btn-sm btn-outline-primary py-0">
                          Generar orden
                        </Link>
                      )}
                    </td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-light btn-sm border me-1"
                        onClick={() => openView(r.id)}
                      >
                        <i className="bi bi-eye"></i>
                      </button>
                      <button
                        type="button"
                        className="btn btn-light btn-sm border text-danger"
                        onClick={() => handleDelete(r.id)}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
