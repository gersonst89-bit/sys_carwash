import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { http, apiErrorMsg } from '../../api/http';
import { money, fdate, estadoBadgeClass, estadoLabel, whatsappLink } from '../../utils/format';

const ESTADOS = [
  { key: 'pendiente', label: 'Pendiente', icon: 'bi-clock' },
  { key: 'en_proceso', label: 'En proceso', icon: 'bi-droplet-half' },
  { key: 'terminado', label: 'Terminado', icon: 'bi-check2-circle' },
  { key: 'entregado', label: 'Entregado', icon: 'bi-car-front-fill' },
];

export const OrdenVerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [o, setO] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null);

  const [montoPago, setMontoPago] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [propina, setPropina] = useState('0');
  const [referencia, setReferencia] = useState('');

  const [compTipo, setCompTipo] = useState('boleta');
  const [docTipo, setDocTipo] = useState('DNI');
  const [docNumero, setDocNumero] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [direccion, setDireccion] = useState('');

  const [ticketModal, setTicketModal] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await http.get(`/ordenes/${id}`);
      setO(data);
      setMontoPago(String(data.saldo || 0));
      if (data.cli) {
        setDocTipo(data.cli.tipo_doc || 'DNI');
        setDocNumero(data.cli.nro_doc || '');
        setRazonSocial(data.cli.nombre || '');
        setDireccion(data.cli.direccion || '');
      }
    } catch (err) {
      setMsg({ type: 'danger', text: apiErrorMsg(err) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const cambiarEstado = async (nuevoEstado: string) => {
    if (nuevoEstado === 'cancelado' && !window.confirm('¿Seguro de anular/cancelar esta orden?')) return;
    try {
      await http.patch(`/ordenes/${id}/estado`, { estado: nuevoEstado });
      setMsg({ type: 'success', text: `Estado actualizado a ${estadoLabel(nuevoEstado)}.` });
      load();
    } catch (err) {
      setMsg({ type: 'danger', text: apiErrorMsg(err) });
    }
  };

  const registrarCobro = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await http.post(`/ordenes/${id}/pagos`, {
        monto: montoPago,
        metodo_pago: metodoPago,
        propina: Number(propina || 0),
        referencia,
      });
      setMsg({ type: 'success', text: data.message || 'Pago registrado.' });
      setReferencia('');
      setPropina('0');
      load();
    } catch (err) {
      setMsg({ type: 'danger', text: apiErrorMsg(err) });
    }
  };

  const emitirComprobante = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await http.post('/comprobantes/emitir', {
        orden_id: Number(id),
        tipo: compTipo,
        doc_tipo: docTipo,
        doc_numero: docNumero,
        razon_social: razonSocial,
        direccion,
      });
      setMsg({ type: 'success', text: 'Comprobante emitido correctamente.' });
      load();
    } catch (err) {
      setMsg({ type: 'danger', text: apiErrorMsg(err) });
    }
  };

  if (loading) return <div className="text-center py-5 text-muted">Cargando orden...</div>;
  if (!o) return <div className="alert alert-danger">Orden no encontrada.</div>;

  const waUrl = o.telefono
    ? whatsappLink(
        o.telefono,
        `Hola ${o.cliente || ''}, tu vehículo ${o.placa || ''} (Orden ${o.codigo}) se encuentra en estado: *${estadoLabel(o.estado)}*. Total: ${money(o.total)}.`,
      )
    : '';

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3 no-print">
        <div>
          <h4 className="page-title">
            Orden <span className="text-primary">{o.codigo}</span>{' '}
            <span className={estadoBadgeClass(o.estado)}>{estadoLabel(o.estado)}</span>
          </h4>
          <p className="page-sub small">
            Registrada el {fdate(o.fecha_ingreso, true)} por {o.cajero || 'Sistema'}
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="btn btn-light border btn-sm" onClick={() => setTicketModal(true)}>
            <i className="bi bi-printer me-1"></i> Ticket Térmico
          </button>
          {waUrl && (
            <a href={waUrl} target="_blank" rel="noreferrer" className="btn btn-success btn-sm">
              <i className="bi bi-whatsapp me-1"></i> Notificar WhatsApp
            </a>
          )}
          <Link to="/ordenes/nueva" className="btn btn-grad btn-sm">
            <i className="bi bi-plus-lg me-1"></i> Nueva orden
          </Link>
          <Link to="/ordenes" className="btn btn-light border btn-sm">
            Volver
          </Link>
        </div>
      </div>

      {msg && <div className={`alert alert-${msg.type} py-2 no-print`}>{msg.text}</div>}

      {o.estado !== 'cancelado' && (
        <div className="cw-card mb-3 no-print">
          <div className="card-b d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div className="d-flex flex-wrap gap-2">
              {ESTADOS.map((st) => {
                const active = o.estado === st.key;
                return (
                  <button
                    key={st.key}
                    type="button"
                    className={`btn btn-sm ${active ? 'btn-primary' : 'btn-light border'}`}
                    onClick={() => cambiarEstado(st.key)}
                  >
                    <i className={`bi ${st.icon} me-1`}></i>
                    {st.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={() => cambiarEstado('cancelado')}
            >
              <i className="bi bi-x-circle me-1"></i> Anular orden
            </button>
          </div>
        </div>
      )}

      <div className="row g-3">

        <div className="col-lg-7">
          <div className="cw-card mb-3">
            <div className="card-h">
              <h6>Datos del Cliente y Vehículo</h6>
            </div>
            <div className="card-b">
              <div className="row g-3">
                <div className="col-sm-6">
                  <div className="text-muted small">Cliente</div>
                  <div className="fw-bold">
                    {o.cliente_id ? (
                      <Link to={`/clientes/ficha/${o.cliente_id}`} className="text-decoration-none">
                        {o.cliente}
                      </Link>
                    ) : (
                      o.cliente || 'Cliente general'
                    )}
                  </div>
                  {o.telefono && <small className="text-muted">Tel: {o.telefono}</small>}
                </div>
                <div className="col-sm-6">
                  <div className="text-muted small">Vehículo</div>
                  <div>
                    {o.placa ? <span className="bd-placa me-2">{o.placa}</span> : '-'}
                    <span className="fw-semibold">
                      {o.marca || ''} {o.modelo || ''} {o.color ? `(${o.color})` : ''}
                    </span>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="text-muted small">Lavador / Responsable</div>
                  <div className="fw-semibold">{o.empleado || 'Sin asignar'}</div>
                </div>
                <div className="col-sm-6">
                  <div className="text-muted small">Observaciones</div>
                  <div className="small">{o.observaciones || '-'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="cw-card">
            <div className="card-h">
              <h6>Servicios y Productos</h6>
            </div>
            <div className="table-responsive">
              <table className="table mb-0">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Descripción</th>
                    <th className="text-center">Cant.</th>
                    <th className="text-end">Precio</th>
                    <th className="text-end">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(o.items || []).map((it: any) => (
                    <tr key={it.id}>
                      <td>
                        <span className={`badge badge-soft-${it.tipo === 'servicio' ? 'info' : 'success'}`}>
                          {it.tipo}
                        </span>
                      </td>
                      <td className="fw-semibold">{it.descripcion}</td>
                      <td className="text-center">{Number(it.cantidad)}</td>
                      <td className="text-end">{money(it.precio)}</td>
                      <td className="text-end fw-bold">{money(it.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="text-end text-muted">
                      Subtotal:
                    </td>
                    <td className="text-end fw-semibold">{money(o.subtotal)}</td>
                  </tr>
                  {Number(o.descuento) > 0 && (
                    <tr>
                      <td colSpan={4} className="text-end text-danger">
                        Descuento:
                      </td>
                      <td className="text-end text-danger">-{money(o.descuento)}</td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan={4} className="text-end text-muted">
                      Impuesto:
                    </td>
                    <td className="text-end">{money(o.impuesto)}</td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="text-end fw-extrabold fs-6">
                      TOTAL:
                    </td>
                    <td className="text-end fw-extrabold fs-5 text-primary">{money(o.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <div className="col-lg-5 no-print">
          <div className="cw-card mb-3">
            <div className="card-h">
              <h6>Pagos y Abonos</h6>
              {o.pagado ? (
                <span className="badge badge-soft-success">Pagada al 100%</span>
              ) : (
                <span className="badge badge-soft-warning">Saldo: {money(o.saldo)}</span>
              )}
            </div>
            <div className="card-b">
              {(o.pagos || []).length > 0 && (
                <ul className="list-group list-group-flush mb-3">
                  {o.pagos.map((p: any) => (
                    <li
                      key={p.id}
                      className={`list-group-item px-0 d-flex justify-content-between align-items-center ${
                        p.anulado ? 'text-decoration-line-through text-muted' : ''
                      }`}
                    >
                      <div>
                        <span className="fw-bold text-uppercase small">{p.metodo}</span>
                        {p.referencia && <small className="text-muted ms-2">Ref: {p.referencia}</small>}
                        <div className="small text-muted">{fdate(p.fecha, true)}</div>
                      </div>
                      <div className="text-end">
                        <div className="fw-bold">{money(p.monto)}</div>
                        {Number(p.propina) > 0 && (
                          <small className="text-success">+Propina {money(p.propina)}</small>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {!o.pagado && o.estado !== 'cancelado' && (
                <form onSubmit={registrarCobro} className="p-3 rounded-3 bg-light border">
                  <h6 className="fw-bold small mb-2">Registrar pago / completar saldo</h6>
                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label">Monto</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control form-control-sm"
                        required
                        value={montoPago}
                        onChange={(e) => setMontoPago(e.target.value)}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Método</label>
                      <select
                        className="form-select form-select-sm"
                        value={metodoPago}
                        onChange={(e) => setMetodoPago(e.target.value)}
                      >
                        <option value="efectivo">Efectivo</option>
                        <option value="yape_plin">Yape / Plin</option>
                        <option value="tarjeta">Tarjeta</option>
                        <option value="transferencia">Transferencia</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label">Propina</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control form-control-sm"
                        value={propina}
                        onChange={(e) => setPropina(e.target.value)}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Referencia</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={referencia}
                        onChange={(e) => setReferencia(e.target.value)}
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-grad btn-sm w-100 mt-2">
                    Registrar cobro
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="cw-card">
            <div className="card-h">
              <h6>Comprobante de Pago</h6>
            </div>
            <div className="card-b">
              {o.comprobante ? (
                <div className="p-3 rounded-3 bg-light border d-flex justify-content-between align-items-center">
                  <div>
                    <span className="badge badge-soft-primary text-uppercase me-2">
                      {o.comprobante.tipo}
                    </span>
                    <b className="fs-6">
                      {o.comprobante.serie}-{String(o.comprobante.numero).padStart(6, '0')}
                    </b>
                    <div className="small text-muted mt-1">
                      {o.comprobante.razon_social || 'Cliente'} · {fdate(o.comprobante.fecha, true)}
                    </div>
                  </div>
                  <Link to="/comprobantes" className="btn btn-sm btn-outline-primary">
                    Ver comprobantes
                  </Link>
                </div>
              ) : (
                <form onSubmit={emitirComprobante}>
                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label">Tipo comprobante</label>
                      <select
                        className="form-select form-select-sm"
                        value={compTipo}
                        onChange={(e) => {
                          setCompTipo(e.target.value);
                          if (e.target.value === 'factura') setDocTipo('RUC');
                        }}
                      >
                        <option value="boleta">Boleta de Venta</option>
                        <option value="factura">Factura</option>
                        <option value="nota_venta">Nota de Venta</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label">Tipo / N° Doc</label>
                      <div className="input-group input-group-sm">
                        <select
                          className="form-select"
                          style={{ maxWidth: 80 }}
                          value={docTipo}
                          onChange={(e) => setDocTipo(e.target.value)}
                        >
                          <option value="DNI">DNI</option>
                          <option value="RUC">RUC</option>
                          <option value="CE">CE</option>
                        </select>
                        <input
                          type="text"
                          className="form-control"
                          value={docNumero}
                          onChange={(e) => setDocNumero(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label">Nombre / Razón Social</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={razonSocial}
                        onChange={(e) => setRazonSocial(e.target.value)}
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-outline-primary btn-sm w-100 mt-2">
                    <i className="bi bi-file-earmark-check me-1"></i> Emitir Comprobante
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {ticketModal && (
        <div className="cw-modal-backdrop" onClick={() => setTicketModal(false)}>
          <div className="cw-modal" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <div className="cw-modal-header no-print">
              <h5>Ticket Térmico 80mm</h5>
              <button type="button" className="btn-close" onClick={() => setTicketModal(false)}></button>
            </div>
            <div className="cw-modal-body">
              <div className="thermal-ticket">
                <div className="text-center">
                  <b className="fs-6">{o.empresa?.nombre || 'Mi Carwash'}</b>
                  {o.empresa?.ruc && <div>RUC: {o.empresa.ruc}</div>}
                  {o.empresa?.direccion && <div>{o.empresa.direccion}</div>}
                  {o.empresa?.telefono && <div>Tel: {o.empresa.telefono}</div>}
                </div>
                <hr />
                <div>
                  <b>ORDEN: {o.codigo}</b>
                  <div>Fecha: {fdate(o.fecha_ingreso, true)}</div>
                  <div>Cliente: {o.cliente || 'Cliente general'}</div>
                  {o.placa && <div>Placa: {o.placa}</div>}
                </div>
                <hr />
                <table className="w-100">
                  <thead>
                    <tr>
                      <th className="text-start">Cant / Desc</th>
                      <th className="text-end">Imp.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(o.items || []).map((it: any) => (
                      <tr key={it.id}>
                        <td>
                          {Number(it.cantidad)}x {it.descripcion}
                        </td>
                        <td className="text-end">{money(it.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <hr />
                <div className="d-flex justify-content-between">
                  <span>SUBTOTAL:</span>
                  <span>{money(o.subtotal)}</span>
                </div>
                {Number(o.descuento) > 0 && (
                  <div className="d-flex justify-content-between">
                    <span>DESCUENTO:</span>
                    <span>-{money(o.descuento)}</span>
                  </div>
                )}
                <div className="d-flex justify-content-between fw-bold fs-6 mt-1">
                  <span>TOTAL:</span>
                  <span>{money(o.total)}</span>
                </div>
                <hr />
                <div className="text-center small">
                  {o.empresa?.pie_ticket || '¡Gracias por su preferencia!'}
                </div>
              </div>
            </div>
            <div className="cw-modal-footer no-print">
              <button type="button" className="btn btn-light" onClick={() => setTicketModal(false)}>
                Cerrar
              </button>
              <button type="button" className="btn btn-grad" onClick={() => window.print()}>
                <i className="bi bi-printer me-1"></i> Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
