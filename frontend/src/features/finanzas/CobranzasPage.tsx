import React, { useEffect, useState } from 'react';
import { http, apiErrorMsg } from '../../api/http';
import { fdate, money, whatsappLink } from '../../utils/format';

export const CobranzasPage: React.FC = () => {
  const [k, setK] = useState<any>({ total: 0, ordenes: 0, v0: 0, v7: 0, v30: 0, clientes: 0 });
  const [por, setPor] = useState<any[]>([]);
  const [detalle, setDetalle] = useState<any>(null);
  const [abono, setAbono] = useState({ monto: '', metodo_pago: 'efectivo', referencia: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const cargar = async () => {
    try {
      const { data } = await http.get('/cobranzas');
      setK(data.k || {});
      setPor(data.por || []);
    } catch (e) {
      setErr(apiErrorMsg(e));
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const verCliente = async (id: number) => {
    if (!id) return;
    try {
      const { data } = await http.get(`/cobranzas/cliente/${id}`);
      setDetalle(data);
      setAbono({ monto: String(data.deuda || ''), metodo_pago: 'efectivo', referencia: '' });
    } catch (e) {
      alert(apiErrorMsg(e));
    }
  };

  const registrarAbono = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detalle?.c?.id) return;
    try {
      const { data } = await http.post('/cobranzas/abonar', {
        cliente_id: detalle.c.id,
        ...abono,
      });
      setMsg(`Abono de ${money(data.monto)} registrado (${data.cerradas} órdenes saldadas).`);
      verCliente(detalle.c.id);
      cargar();
    } catch (error) {
      alert(apiErrorMsg(error));
    }
  };

  return (
    <div className="container-fluid py-2">
      <h4 className="fw-bold mb-3">
        <i className="bi bi-receipt-cutoff text-primary me-2"></i>Cuentas por Cobrar
      </h4>

      {msg && <div className="alert alert-success py-2">{msg}</div>}
      {err && <div className="alert alert-danger py-2">{err}</div>}

      <div className="row g-3 mb-3">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm p-3">
            <div className="text-muted small">Deuda Total</div>
            <div className="fs-4 fw-bold text-danger">{money(k.total)}</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm p-3">
            <div className="text-muted small">0 - 7 días</div>
            <div className="fs-4 fw-bold text-success">{money(k.v0)}</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm p-3">
            <div className="text-muted small">8 - 30 días</div>
            <div className="fs-4 fw-bold text-warning">{money(k.v7)}</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm p-3">
            <div className="text-muted small">+30 días (Vencido)</div>
            <div className="fs-4 fw-bold text-danger">{money(k.v30)}</div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white fw-bold">Saldos por Cliente</div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Cliente</th>
                    <th className="text-center">Órdenes</th>
                    <th className="text-center">Antigüedad</th>
                    <th className="text-end">Deuda</th>
                    <th className="text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {por.map((r) => (
                    <tr key={r.id}>
                      <td className="fw-semibold">{r.cliente}</td>
                      <td className="text-center">{r.n}</td>
                      <td className="text-center">{r.dias} días</td>
                      <td className="text-end fw-bold text-danger">{money(r.deuda)}</td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          {r.telefono && (
                            <a
                              href={whatsappLink(
                                r.telefono,
                                `Hola ${r.cliente}, te recordamos que tienes un saldo pendiente de ${money(r.deuda)} en nuestro Carwash.`,
                              )}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-outline-success"
                            >
                              <i className="bi bi-whatsapp"></i>
                            </a>
                          )}
                          {r.id > 0 && (
                            <button
                              className="btn btn-primary"
                              onClick={() => verCliente(r.id)}
                            >
                              Abonar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          {detalle ? (
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white fw-bold d-flex justify-content-between">
                <span>Estado de Cuenta: {detalle.c.nombre}</span>
                <span className="text-danger">{money(detalle.deuda)}</span>
              </div>
              <div className="card-body">
                <form onSubmit={registrarAbono} className="row g-2 mb-3">
                  <div className="col-5">
                    <input
                      type="number"
                      step="0.01"
                      className="form-control form-control-sm"
                      placeholder="Monto a abonar"
                      value={abono.monto}
                      onChange={(e) => setAbono({ ...abono, monto: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-4">
                    <select
                      className="form-select form-select-sm"
                      value={abono.metodo_pago}
                      onChange={(e) => setAbono({ ...abono, metodo_pago: e.target.value })}
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="yape_plin">Yape / Plin</option>
                      <option value="tarjeta">Tarjeta</option>
                      <option value="transferencia">Transferencia</option>
                    </select>
                  </div>
                  <div className="col-3">
                    <button className="btn btn-success btn-sm w-100" type="submit">
                      Cobrar
                    </button>
                  </div>
                </form>

                <h6 className="fw-bold small">Órdenes Pendientes (FIFO)</h6>
                <ul className="list-group list-group-flush small">
                  {(detalle.ord || []).map((o: any) => (
                    <li key={o.id} className="list-group-item d-flex justify-content-between px-0">
                      <span>
                        <b>{o.codigo}</b> ({fdate(o.fecha_ingreso)}) · {o.placa || '-'}
                      </span>
                      <span className="fw-bold text-danger">{money(o.saldo)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="card border-0 shadow-sm p-4 text-center text-muted">
              Selecciona un cliente para ver su estado de cuenta y registrar abonos.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
