import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { http, apiErrorMsg } from '../../api/http';
import { money, fdate, estadoBadgeClass, estadoLabel, whatsappLink } from '../../utils/format';

export const CotizacionesPage: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [cat, setCat] = useState<any>({ servicios: [], productos: [], clientes: [], tipos: [] });
  const [estado, setEstado] = useState('');
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'list' | 'new' | 'view'>('list');
  const [currentCot, setCurrentCot] = useState<any>(null);

  const [clienteId, setClienteId] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [placa, setPlaca] = useState('');
  const [tipoVehiculoId, setTipoVehiculoId] = useState('');
  const [validez, setValidez] = useState(7);
  const [descuento, setDescuento] = useState(0);
  const [observaciones, setObservaciones] = useState('');
  const [items, setItems] = useState<Array<{ tipo: 'servicio' | 'producto'; id: number; nombre: string; cant: number; precio: number }>>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [cRes, catRes] = await Promise.all([
        http.get('/cotizaciones', { params: { estado: estado || undefined } }),
        http.get('/cotizaciones/catalogos'),
      ]);
      setRows(cRes.data.rows || []);
      setCat(catRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [estado]);

  const openView = async (id: number) => {
    try {
      const { data } = await http.get(`/cotizaciones/${id}`);
      setCurrentCot(data);
      setMode('view');
    } catch (err) {
      alert(apiErrorMsg(err));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('Agrega al menos un servicio o producto.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await http.post('/cotizaciones', {
        cliente_id: clienteId ? Number(clienteId) : null,
        nombre,
        telefono,
        placa,
        tipo_vehiculo_id: tipoVehiculoId ? Number(tipoVehiculoId) : null,
        validez,
        descuento,
        observaciones,
        items: items.map((i) => ({ tipo: i.tipo, id: i.id, cant: i.cant })),
      });
      await load();
      openView(data.id);
    } catch (err) {
      alert(apiErrorMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const cambiarEstado = async (id: number, est: string) => {
    try {
      await http.patch(`/cotizaciones/${id}/estado`, { estado: est });
      openView(id);
      load();
    } catch (err) {
      alert(apiErrorMsg(err));
    }
  };

  const subtotal = items.reduce((s, i) => s + i.cant * i.precio, 0);
  const total = Math.max(0, subtotal - descuento);

  if (mode === 'new') {
    return (
      <div>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h4 className="page-title">Nueva Cotización</h4>
            <p className="page-sub small">Prepara una proforma para enviar por WhatsApp o convertir en orden</p>
          </div>
          <button type="button" className="btn btn-light border btn-sm" onClick={() => setMode('list')}>
            Cancelar
          </button>
        </div>

        <form onSubmit={handleSave} className="cw-card">
          <div className="card-b">
            <div className="row g-3 mb-3">
              <div className="col-md-4">
                <label className="form-label">Cliente registrado</label>
                <select
                  className="form-select"
                  value={clienteId}
                  onChange={(e) => {
                    setClienteId(e.target.value);
                    const c = cat.clientes.find((x: any) => String(x.id) === e.target.value);
                    if (c) {
                      setNombre(c.nombre);
                      setTelefono(c.telefono || '');
                    }
                  }}
                >
                  <option value="">-- O escribir prospecto --</option>
                  {(cat.clientes || []).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Nombre / Empresa *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Teléfono WhatsApp</label>
                <input
                  type="text"
                  className="form-control"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Placa referencial</label>
                <input
                  type="text"
                  className="form-control text-uppercase"
                  value={placa}
                  onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Tipo de vehículo</label>
                <select
                  className="form-select"
                  value={tipoVehiculoId}
                  onChange={(e) => setTipoVehiculoId(e.target.value)}
                >
                  <option value="">-- Estándar --</option>
                  {(cat.tipos || []).map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Validez (días)</label>
                <input
                  type="number"
                  className="form-control"
                  value={validez}
                  onChange={(e) => setValidez(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="row g-3">
              <div className="col-md-6">
                <h6 className="fw-bold">Agregar Servicio / Producto</h6>
                <div className="row g-2" style={{ maxHeight: 280, overflowY: 'auto' }}>
                  {(cat.servicios || []).map((s: any) => (
                    <div key={`s-${s.id}`} className="col-12">
                      <div
                        className="pos-item d-flex justify-content-between align-items-center py-2"
                        onClick={() =>
                          setItems([
                            ...items,
                            { tipo: 'servicio', id: s.id, nombre: s.nombre, cant: 1, precio: Number(s.precio) },
                          ])
                        }
                      >
                        <span className="small fw-semibold">{s.nombre}</span>
                        <span className="badge badge-soft-info">{money(s.precio)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="col-md-6">
                <h6 className="fw-bold">Líneas de la Cotización</h6>
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Concepto</th>
                      <th style={{ width: 70 }}>Cant.</th>
                      <th className="text-end">Subtotal</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="small">{it.nombre}</td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            className="form-control form-control-sm"
                            value={it.cant}
                            onChange={(e) => {
                              const c = Number(e.target.value);
                              setItems(items.map((x, i) => (i === idx ? { ...x, cant: c } : x)));
                            }}
                          />
                        </td>
                        <td className="text-end fw-bold small">{money(it.cant * it.precio)}</td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm text-danger p-0"
                            onClick={() => setItems(items.filter((_, i) => i !== idx))}
                          >
                            <i className="bi bi-x-circle"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="d-flex justify-content-between align-items-center p-2 bg-light rounded border">
                  <span className="fw-bold">TOTAL COTIZADO:</span>
                  <span className="fw-extrabold fs-5 text-primary">{money(total)}</span>
                </div>
                <button type="submit" className="btn btn-grad w-100 mt-3" disabled={saving}>
                  Guardar Cotización
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    );
  }

  if (mode === 'view' && currentCot) {
    const waUrl = currentCot.telefono
      ? whatsappLink(
          currentCot.telefono,
          `Hola ${currentCot.nombre || ''}, te enviamos la cotización *${currentCot.codigo}* por un total de *${money(currentCot.total)}* (válida hasta ${fdate(currentCot.vence)}).`,
        )
      : '';

    return (
      <div>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 no-print">
          <div>
            <h4 className="page-title">
              Cotización <span className="text-primary">{currentCot.codigo}</span>{' '}
              <span className={estadoBadgeClass(currentCot.estado)}>{estadoLabel(currentCot.estado)}</span>
            </h4>
            <p className="page-sub small">Vence: {fdate(currentCot.vence)}</p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            {currentCot.estado !== 'convertida' && (
              <>
                <button
                  type="button"
                  className="btn btn-grad btn-sm"
                  onClick={() => navigate(`/ordenes/nueva?cotizacion=${currentCot.id}`)}
                >
                  <i className="bi bi-arrow-right-circle me-1"></i> Convertir en Orden
                </button>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => cambiarEstado(currentCot.id, 'aceptada')}
                >
                  Marcar Aceptada
                </button>
              </>
            )}
            {waUrl && (
              <a href={waUrl} target="_blank" rel="noreferrer" className="btn btn-success btn-sm">
                <i className="bi bi-whatsapp me-1"></i> Enviar por WhatsApp
              </a>
            )}
            <button type="button" className="btn btn-light border btn-sm" onClick={() => window.print()}>
              <i className="bi bi-printer me-1"></i> Imprimir
            </button>
            <button type="button" className="btn btn-light border btn-sm" onClick={() => setMode('list')}>
              Volver
            </button>
          </div>
        </div>

        <div className="cw-card">
          <div className="card-b">
            <div className="row g-3 mb-3">
              <div className="col-sm-4">
                <small className="text-muted d-block">Cliente / Destinatario</small>
                <b>{currentCot.nombre || 'Cliente'}</b>
              </div>
              <div className="col-sm-4">
                <small className="text-muted d-block">Teléfono</small>
                <b>{currentCot.telefono || '-'}</b>
              </div>
              <div className="col-sm-4">
                <small className="text-muted d-block">Placa / Tipo</small>
                <b>
                  {currentCot.placa || '-'} {currentCot.tipo_veh ? `(${currentCot.tipo_veh})` : ''}
                </b>
              </div>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th className="text-center">Cant.</th>
                  <th className="text-end">Precio</th>
                  <th className="text-end">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(currentCot.items || []).map((it: any) => (
                  <tr key={it.id}>
                    <td>{it.descripcion}</td>
                    <td className="text-center">{Number(it.cantidad)}</td>
                    <td className="text-end">{money(it.precio)}</td>
                    <td className="text-end fw-bold">{money(it.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="text-end fw-extrabold">
                    TOTAL:
                  </td>
                  <td className="text-end fw-extrabold fs-5 text-primary">{money(currentCot.total)}</td>
                </tr>
              </tfoot>
            </table>
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
            <i className="bi bi-file-earmark-text me-2 text-primary"></i>Cotizaciones y Proformas
          </h4>
          <p className="page-sub small">Crea presupuestos y conviértelos en órdenes de servicio con 1 clic</p>
        </div>
        <button type="button" className="btn btn-grad btn-sm px-3" onClick={() => setMode('new')}>
          <i className="bi bi-plus-lg me-1"></i> Nueva cotización
        </button>
      </div>

      <div className="cw-card">
        <div className="card-h">
          <select
            className="form-select form-select-sm"
            style={{ width: 180 }}
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="borrador">Borrador</option>
            <option value="enviada">Enviada</option>
            <option value="aceptada">Aceptada</option>
            <option value="convertida">Convertida</option>
            <option value="rechazada">Rechazada</option>
          </select>
          <span className="text-muted small">{rows.length} cotizaciones</span>
        </div>
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th>Código</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Placa</th>
                <th>Vence</th>
                <th>Estado</th>
                <th className="text-end">Total</th>
                <th className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-4 text-muted">
                    Cargando...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-4 text-muted">
                    No hay cotizaciones registradas.
                  </td>
                </tr>
              ) : (
                rows.map((q) => (
                  <tr key={q.id}>
                    <td className="fw-bold">{q.codigo}</td>
                    <td className="small text-muted">{fdate(q.created_at)}</td>
                    <td className="fw-semibold">{q.nombre || q.cliente || '-'}</td>
                    <td>{q.placa ? <span className="bd-placa">{q.placa}</span> : '-'}</td>
                    <td className="small">{fdate(q.vence)}</td>
                    <td>
                      <span className={estadoBadgeClass(q.estado)}>{estadoLabel(q.estado)}</span>
                    </td>
                    <td className="text-end fw-bold">{money(q.total)}</td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-light btn-sm border me-1"
                        onClick={() => openView(q.id)}
                      >
                        <i className="bi bi-eye me-1"></i>Ver
                      </button>
                      {q.estado !== 'convertida' && (
                        <Link
                          to={`/ordenes/nueva?cotizacion=${q.id}`}
                          className="btn btn-sm btn-outline-primary"
                        >
                          A Orden
                        </Link>
                      )}
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
