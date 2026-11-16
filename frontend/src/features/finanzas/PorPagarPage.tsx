import React, { useEffect, useState } from 'react';
import { http, apiErrorMsg } from '../../api/http';
import { fdate, money } from '../../utils/format';

export const PorPagarPage: React.FC = () => {
  const [k, setK] = useState<any>({ total: 0, vencido: 0, prox7: 0, compras: 0 });
  const [por, setPor] = useState<any[]>([]);
  const [detalle, setDetalle] = useState<any>(null);
  const [abono, setAbono] = useState({ monto: '', metodo: 'efectivo', referencia: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const cargar = async () => {
    try {
      const { data } = await http.get('/porpagar');
      setK(data.k || {});
      setPor(data.por || []);
    } catch (e) {
      setErr(apiErrorMsg(e));
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const verProveedor = async (id: number) => {
    if (!id) return;
    try {
      const { data } = await http.get(`/porpagar/proveedor/${id}`);
      setDetalle(data);
      setAbono({ monto: String(data.deuda || ''), metodo: 'efectivo', referencia: '' });
    } catch (e) {
      alert(apiErrorMsg(e));
    }
  };

  const registrarAbono = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detalle?.p?.id) return;
    try {
      const { data } = await http.post('/porpagar/abonar', {
        proveedor_id: detalle.p.id,
        ...abono,
      });
      setMsg(`Pago de ${money(data.monto)} registrado y cargado a Gastos.`);
      verProveedor(detalle.p.id);
      cargar();
    } catch (error) {
      alert(apiErrorMsg(error));
    }
  };

  return (
    <div className="container-fluid py-2">
      <h4 className="fw-bold mb-3">
        <i className="bi bi-credit-card-2-front text-primary me-2"></i>Cuentas por Pagar (Proveedores)
      </h4>

      {msg && <div className="alert alert-success py-2">{msg}</div>}
      {err && <div className="alert alert-danger py-2">{err}</div>}

      <div className="row g-3 mb-3">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm p-3">
            <div className="text-muted small">Deuda Total a Proveedores</div>
            <div className="fs-4 fw-bold text-danger">{money(k.total)}</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm p-3">
            <div className="text-muted small">Vencido</div>
            <div className="fs-4 fw-bold text-danger">{money(k.vencido)}</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm p-3">
            <div className="text-muted small">Vence en próximos 7 días</div>
            <div className="fs-4 fw-bold text-warning">{money(k.prox7)}</div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white fw-bold">Saldos por Proveedor</div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Proveedor</th>
                    <th className="text-center">Compras</th>
                    <th>Próx. Vencimiento</th>
                    <th className="text-end">Deuda</th>
                    <th className="text-end">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {por.map((r) => (
                    <tr key={r.id}>
                      <td className="fw-semibold">{r.proveedor}</td>
                      <td className="text-center">{r.n}</td>
                      <td>{fdate(r.vence)}</td>
                      <td className="text-end fw-bold text-danger">{money(r.deuda)}</td>
                      <td className="text-end">
                        {r.id > 0 && (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => verProveedor(r.id)}
                          >
                            Pagar
                          </button>
                        )}
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
                <span>Proveedor: {detalle.p.nombre}</span>
                <span className="text-danger">{money(detalle.deuda)}</span>
              </div>
              <div className="card-body">
                <form onSubmit={registrarAbono} className="row g-2 mb-3">
                  <div className="col-5">
                    <input
                      type="number"
                      step="0.01"
                      className="form-control form-control-sm"
                      placeholder="Monto a pagar"
                      value={abono.monto}
                      onChange={(e) => setAbono({ ...abono, monto: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-4">
                    <select
                      className="form-select form-select-sm"
                      value={abono.metodo}
                      onChange={(e) => setAbono({ ...abono, metodo: e.target.value })}
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="yape_plin">Yape / Plin</option>
                      <option value="tarjeta">Tarjeta</option>
                    </select>
                  </div>
                  <div className="col-3">
                    <button className="btn btn-success btn-sm w-100" type="submit">
                      Pagar
                    </button>
                  </div>
                </form>

                <h6 className="fw-bold small">Compras al Crédito Pendientes</h6>
                <ul className="list-group list-group-flush small">
                  {(detalle.ord || []).map((c: any) => (
                    <li key={c.id} className="list-group-item d-flex justify-content-between px-0">
                      <span>
                        <b>Compra #{c.id}</b> (Vence: {fdate(c.vence)})
                      </span>
                      <span className="fw-bold text-danger">{money(c.saldo)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="card border-0 shadow-sm p-4 text-center text-muted">
              Selecciona un proveedor para ver sus facturas pendientes y registrar pagos.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
