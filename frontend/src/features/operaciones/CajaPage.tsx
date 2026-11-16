import React, { useState, useEffect } from 'react';
import { http, apiErrorMsg } from '../../api/http';
import { money, fdate, estadoBadgeClass, estadoLabel } from '../../utils/format';

export const CajaPage: React.FC = () => {
  const [data, setData] = useState<any>({ abierta: null, res: null, hist: [] });
  const [loading, setLoading] = useState(true);
  const [montoInicial, setMontoInicial] = useState('0');
  const [montoFinal, setMontoFinal] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await http.get('/caja');
      setData(res.data);
      if (res.data.res?.esperado !== undefined) {
        setMontoFinal(String(res.data.res.esperado));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const abrirCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await http.post('/caja/abrir', { monto_inicial: Number(montoInicial || 0) });
      setMsg({ type: 'success', text: 'Turno de caja abierto correctamente.' });
      load();
    } catch (err) {
      setMsg({ type: 'danger', text: apiErrorMsg(err) });
    }
  };

  const cerrarCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm('¿Confirmas el arqueo y cierre del turno de caja actual?')) return;
    setMsg(null);
    try {
      await http.post('/caja/cerrar', {
        monto_final: Number(montoFinal || 0),
        observaciones,
      });
      setObservaciones('');
      setMsg({ type: 'success', text: 'Caja cerrada correctamente.' });
      load();
    } catch (err) {
      setMsg({ type: 'danger', text: apiErrorMsg(err) });
    }
  };

  const { abierta, res, hist } = data;

  return (
    <div>
      <div className="mb-3">
        <h4 className="page-title">
          <i className="bi bi-cash-coin me-2 text-primary"></i>Control y Arqueo de Caja
        </h4>
        <p className="page-sub small">Apertura de turno, ingresos por medio de pago, egresos y cierre</p>
      </div>

      {msg && <div className={`alert alert-${msg.type} py-2`}>{msg.text}</div>}

      {loading ? (
        <div className="text-center py-5 text-muted">Cargando estado de caja...</div>
      ) : !abierta ? (
        <div className="cw-card mb-4" style={{ maxWidth: 480 }}>
          <div className="card-h">
            <h6>Aperturar Nuevo Turno de Caja</h6>
          </div>
          <div className="card-b">
            <form onSubmit={abrirCaja}>
              <div className="mb-3">
                <label className="form-label">Fondo sencillo / Monto inicial en efectivo</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-control"
                  required
                  value={montoInicial}
                  onChange={(e) => setMontoInicial(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-grad w-100">
                <i className="bi bi-unlock-fill me-1"></i> Abrir Caja Ahora
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="row g-3 mb-4">
          <div className="col-lg-7">
            <div className="cw-card h-100">
              <div className="card-h">
                <h6>
                  Turno Abierto #{abierta.id} · <span className="badge badge-soft-success">En curso</span>
                </h6>
                <small className="text-muted">Apertura: {fdate(abierta.fecha_apertura, true)}</small>
              </div>
              <div className="card-b">
                <div className="row g-2 mb-3">
                  <div className="col-sm-4">
                    <div className="p-3 rounded-3 bg-light border">
                      <div className="small text-muted">Fondo Inicial</div>
                      <div className="fw-extrabold fs-5">{money(abierta.monto_inicial)}</div>
                    </div>
                  </div>
                  <div className="col-sm-4">
                    <div className="p-3 rounded-3 bg-light border">
                      <div className="small text-muted">Ingresos Totales</div>
                      <div className="fw-extrabold fs-5 text-success">{money(res?.total || 0)}</div>
                    </div>
                  </div>
                  <div className="col-sm-4">
                    <div className="p-3 rounded-3 bg-light border">
                      <div className="small text-muted">Efectivo Esperado</div>
                      <div className="fw-extrabold fs-5 text-primary">{money(res?.esperado || 0)}</div>
                    </div>
                  </div>
                </div>

                <h6 className="fw-bold small text-uppercase text-muted mb-2">
                  Desglose por Método de Pago en este turno
                </h6>
                <table className="table table-sm mb-0">
                  <thead>
                    <tr>
                      <th>Método</th>
                      <th className="text-center">Operaciones</th>
                      <th className="text-end">Propinas</th>
                      <th className="text-end">Total Cobrado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['efectivo', 'yape_plin', 'tarjeta', 'transferencia'].map((m) => {
                      const row = res?.porMetodo?.[m] || { n: 0, prop: 0, t: 0 };
                      return (
                        <tr key={m}>
                          <td className="fw-semibold text-uppercase">{m.replace('_', ' / ')}</td>
                          <td className="text-center">{row.n}</td>
                          <td className="text-end">{money(row.prop)}</td>
                          <td className="text-end fw-bold">{money(row.t)}</td>
                        </tr>
                      );
                    })}
                    <tr className="text-danger">
                      <td colSpan={3}>(-) Gastos registrados durante el turno</td>
                      <td className="text-end fw-bold">-{money(res?.gastos || 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="col-lg-5">
            <div className="cw-card h-100">
              <div className="card-h">
                <h6>Arqueo y Cierre de Turno</h6>
              </div>
              <div className="card-b">
                <form onSubmit={cerrarCaja}>
                  <div className="mb-3">
                    <label className="form-label">Efectivo físico contado en gaveta *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control"
                      required
                      value={montoFinal}
                      onChange={(e) => setMontoFinal(e.target.value)}
                    />
                    <small className="text-muted">
                      Diferencia:{' '}
                      <b>{money(Number(montoFinal || 0) - Number(res?.esperado || 0))}</b>
                    </small>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Observaciones de cierre</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-danger w-100">
                    <i className="bi bi-lock-fill me-1"></i> Cerrar Caja y Guardar Arqueo
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="cw-card">
        <div className="card-h">
          <h6>Historial de Cierres de Caja</h6>
        </div>
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Responsable</th>
                <th>Apertura</th>
                <th>Cierre</th>
                <th className="text-end">Inicial</th>
                <th className="text-end">Esperado</th>
                <th className="text-end">Contado</th>
                <th className="text-end">Diferencia</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {(hist || []).length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-4 text-muted">
                    Sin cierres anteriores.
                  </td>
                </tr>
              ) : (
                hist.map((c: any) => {
                  const dif = Number(c.monto_final || 0) - Number(c.monto_esperado || 0);
                  return (
                    <tr key={c.id}>
                      <td>#{c.id}</td>
                      <td className="fw-semibold">{c.usuario || '-'}</td>
                      <td className="small">{fdate(c.fecha_apertura, true)}</td>
                      <td className="small">{fdate(c.fecha_cierre, true)}</td>
                      <td className="text-end">{money(c.monto_inicial)}</td>
                      <td className="text-end">{money(c.monto_esperado)}</td>
                      <td className="text-end fw-bold">{money(c.monto_final)}</td>
                      <td className={`text-end fw-bold ${dif < 0 ? 'text-danger' : 'text-success'}`}>
                        {money(dif)}
                      </td>
                      <td>
                        <span className={estadoBadgeClass(c.estado)}>{estadoLabel(c.estado)}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
