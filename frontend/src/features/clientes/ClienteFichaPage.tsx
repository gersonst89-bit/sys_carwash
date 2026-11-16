import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { http, apiErrorMsg } from '../../api/http';
import { money, fdate, estadoBadgeClass, estadoLabel, whatsappLink } from '../../utils/format';

export const ClienteFichaPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'ordenes' | 'vehiculos' | 'crm' | 'fidelidad'>('ordenes');

  const [tipoInt, setTipoInt] = useState('llamada');
  const [asunto, setAsunto] = useState('');
  const [detalle, setDetalle] = useState('');
  const [segFecha, setSegFecha] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await http.get(`/clientes/${id}/ficha`);
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const addInteraccion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await http.post('/crm/interacciones', {
        cliente_id: Number(id),
        tipo: tipoInt,
        asunto,
        detalle,
        seguimiento_fecha: segFecha || undefined,
      });
      setAsunto('');
      setDetalle('');
      setSegFecha('');
      load();
    } catch (err) {
      alert(apiErrorMsg(err));
    }
  };

  if (loading) return <div className="text-center py-5 text-muted">Cargando ficha 360°...</div>;
  if (!data?.c && !data?.cliente) return <div className="alert alert-danger">Cliente no encontrado.</div>;

  const c = data.c || data.cliente;
  const rfm = data.rfm || {};
  const vehiculos = data.vehiculos || [];
  const ordenes = data.ordenes || [];
  const paquetes = data.paquetes || [];
  const puntos = data.puntos ?? rfm.puntos ?? 0;
  const cupones = data.cupones || [];
  const interacciones = data.interacciones || [];

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div className="d-flex align-items-center gap-3">
          <div className="avatar" style={{ width: 52, height: 52, fontSize: '1.35rem' }}>
            {(c.nombre || 'C').charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className="page-title d-flex align-items-center gap-2">
              {c.nombre}
              {rfm.segLabel && (
                <span
                  className="seg-badge"
                  style={{ '--c': rfm.segColor || '#0ea5e9' } as React.CSSProperties}
                >
                  {rfm.segLabel}
                </span>
              )}
            </h4>
            <p className="page-sub small">
              {c.tipo_doc}: {c.nro_doc || '-'} · Tel: {c.telefono || '-'} · Email: {c.email || '-'}
            </p>
          </div>
        </div>
        <div className="d-flex gap-2">
          {c.telefono && (
            <a
              href={whatsappLink(c.telefono, `Hola ${c.nombre}, te saludamos de CarWash Pro.`)}
              target="_blank"
              rel="noreferrer"
              className="btn btn-success btn-sm"
            >
              <i className="bi bi-whatsapp me-1"></i> WhatsApp
            </a>
          )}
          <Link to="/ordenes/nueva" className="btn btn-grad btn-sm">
            <i className="bi bi-plus-lg me-1"></i> Nueva orden
          </Link>
          <Link to="/clientes" className="btn btn-light border btn-sm">
            Volver
          </Link>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-6 col-md-3">
          <div className="mini-stat">
            <div className="ico bg-blue t-blue">
              <i className="bi bi-cash-coin"></i>
            </div>
            <div>
              <div className="l">Total gastado</div>
              <div className="fw-extrabold fs-5">{money(rfm.gastado ?? data.gastado ?? 0)}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="mini-stat">
            <div className="ico bg-teal t-teal">
              <i className="bi bi-car-front"></i>
            </div>
            <div>
              <div className="l">Visitas / Órdenes</div>
              <div className="fw-extrabold fs-5">{rfm.visitas ?? ordenes.length}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="mini-stat">
            <div className="ico bg-amber t-amber">
              <i className="bi bi-award"></i>
            </div>
            <div>
              <div className="l">Puntos Fidelidad</div>
              <div className="fw-extrabold fs-5">{puntos} pts</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="mini-stat">
            <div className="ico bg-violet t-violet">
              <i className="bi bi-clock-history"></i>
            </div>
            <div>
              <div className="l">Última visita</div>
              <div className="fw-bold small">{fdate(rfm.ultima || ordenes[0]?.fecha_ingreso)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="crm-tabs mb-3">
        <a
          href="#ordenes"
          className={tab === 'ordenes' ? 'on' : ''}
          onClick={(e) => {
            e.preventDefault();
            setTab('ordenes');
          }}
        >
          <i className="bi bi-card-checklist"></i> Historial de Órdenes ({ordenes.length})
        </a>
        <a
          href="#vehiculos"
          className={tab === 'vehiculos' ? 'on' : ''}
          onClick={(e) => {
            e.preventDefault();
            setTab('vehiculos');
          }}
        >
          <i className="bi bi-car-front"></i> Vehículos y Paquetes ({vehiculos.length})
        </a>
        <a
          href="#crm"
          className={tab === 'crm' ? 'on' : ''}
          onClick={(e) => {
            e.preventDefault();
            setTab('crm');
          }}
        >
          <i className="bi bi-telephone-outbound"></i> Seguimientos CRM ({interacciones.length})
        </a>
        <a
          href="#fidelidad"
          className={tab === 'fidelidad' ? 'on' : ''}
          onClick={(e) => {
            e.preventDefault();
            setTab('fidelidad');
          }}
        >
          <i className="bi bi-ticket-perforated"></i> Cupones y Puntos ({cupones.length})
        </a>
      </div>

      {tab === 'ordenes' && (
        <div className="cw-card">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Fecha</th>
                  <th>Vehículo</th>
                  <th>Estado</th>
                  <th className="text-end">Total</th>
                </tr>
              </thead>
              <tbody>
                {ordenes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-muted">
                      Sin órdenes registradas.
                    </td>
                  </tr>
                ) : (
                  ordenes.map((o: any) => (
                    <tr key={o.id}>
                      <td>
                        <Link to={`/ordenes/ver/${o.id}`} className="fw-bold text-decoration-none">
                          {o.codigo}
                        </Link>
                      </td>
                      <td>{fdate(o.fecha_ingreso, true)}</td>
                      <td>{o.placa ? <span className="bd-placa">{o.placa}</span> : '-'}</td>
                      <td>
                        <span className={estadoBadgeClass(o.estado)}>{estadoLabel(o.estado)}</span>
                      </td>
                      <td className="text-end fw-bold">{money(o.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'vehiculos' && (
        <div className="row g-3">
          <div className="col-md-6">
            <div className="cw-card h-100">
              <div className="card-h">
                <h6>Vehículos del Cliente</h6>
                <Link to="/vehiculos" className="btn btn-sm btn-light border">
                  Gestionar
                </Link>
              </div>
              <div className="card-b">
                {vehiculos.length === 0 ? (
                  <div className="text-muted small">Sin vehículos registrados.</div>
                ) : (
                  <ul className="list-group list-group-flush">
                    {vehiculos.map((v: any) => (
                      <li key={v.id} className="list-group-item px-0 d-flex justify-content-between">
                        <div>
                          <span className="bd-placa me-2">{v.placa}</span>
                          <b>
                            {v.marca || ''} {v.modelo || ''}
                          </b>
                        </div>
                        <small className="text-muted">{v.color || ''}</small>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="cw-card h-100">
              <div className="card-h">
                <h6>Paquetes Prepagados Adquiridos</h6>
                <Link to="/paquetes" className="btn btn-sm btn-light border">
                  Vender paquete
                </Link>
              </div>
              <div className="card-b">
                {paquetes.length === 0 ? (
                  <div className="text-muted small">Sin paquetes activos.</div>
                ) : (
                  <ul className="list-group list-group-flush">
                    {paquetes.map((p: any) => (
                      <li key={p.id} className="list-group-item px-0 d-flex justify-content-between">
                        <div>
                          <b>{p.nombre}</b>
                          <div className="small text-muted">Vence: {fdate(p.fecha_vence)}</div>
                        </div>
                        <span className="badge badge-soft-info">
                          {p.usos_restantes} / {p.usos_total} disp.
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'crm' && (
        <div className="row g-3">
          <div className="col-md-5">
            <form onSubmit={addInteraccion} className="cw-card">
              <div className="card-h">
                <h6>Registrar Interacción / Seguimiento</h6>
              </div>
              <div className="card-b">
                <div className="mb-2">
                  <label className="form-label">Canal</label>
                  <select
                    className="form-select form-select-sm"
                    value={tipoInt}
                    onChange={(e) => setTipoInt(e.target.value)}
                  >
                    <option value="llamada">Llamada</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Correo</option>
                    <option value="visita">Visita</option>
                    <option value="nota">Nota interna</option>
                  </select>
                </div>
                <div className="mb-2">
                  <label className="form-label">Asunto *</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    required
                    value={asunto}
                    onChange={(e) => setAsunto(e.target.value)}
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label">Detalle</label>
                  <textarea
                    className="form-control form-control-sm"
                    rows={2}
                    value={detalle}
                    onChange={(e) => setDetalle(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Próximo seguimiento (opcional)</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={segFecha}
                    onChange={(e) => setSegFecha(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-grad btn-sm w-100">
                  Guardar interacción
                </button>
              </div>
            </form>
          </div>
          <div className="col-md-7">
            <div className="cw-card">
              <div className="card-h">
                <h6>Línea de Tiempo CRM</h6>
              </div>
              <div className="card-b">
                {interacciones.length === 0 ? (
                  <div className="text-muted small">Sin interacciones registradas.</div>
                ) : (
                  <div className="tl">
                    {interacciones.map((it: any) => (
                      <div key={it.id} className="tl-i">
                        <div className="d-flex justify-content-between">
                          <b className="small">
                            [{it.tipo.toUpperCase()}] {it.asunto}
                          </b>
                          <small className="text-muted">{fdate(it.created_at, true)}</small>
                        </div>
                        {it.detalle && <div className="small text-muted">{it.detalle}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'fidelidad' && (
        <div className="cw-card">
          <div className="card-h">
            <h6>Cupones del Cliente</h6>
            <Link to="/crm/fidelidad" className="btn btn-sm btn-outline-primary">
              Canjear puntos ({puntos} pts)
            </Link>
          </div>
          <div className="card-b">
            {cupones.length === 0 ? (
              <div className="text-muted small">Sin cupones asignados.</div>
            ) : (
              <div className="row g-2">
                {cupones.map((cp: any) => (
                  <div key={cp.id} className="col-md-4">
                    <div className="p-3 rounded-3 border bg-light">
                      <div className="fw-extrabold text-primary">{cp.codigo}</div>
                      <div className="small">{cp.descripcion || 'Descuento'}</div>
                      <small className="text-muted">
                        Usos: {cp.usos}/{cp.usos_max} · Vence: {fdate(cp.vigente_hasta)}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
