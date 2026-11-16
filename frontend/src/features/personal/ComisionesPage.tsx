import React, { useState, useEffect } from 'react';
import { http, apiErrorMsg } from '../../api/http';
import { money, fdate, firstOfMonthYmd, todayYmd } from '../../utils/format';

export const ComisionesPage: React.FC = () => {
  const [desde, setDesde] = useState(firstOfMonthYmd());
  const [hasta, setHasta] = useState(todayYmd());
  const [data, setData] = useState<any>({ rows: [], pagos: [] });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await http.get('/comisiones', { params: { desde, hasta } });
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [desde, hasta]);

  const liquidar = async (r: any) => {
    const comision = Number(r.comision ?? r.monto_comision ?? 0);
    if (comision <= 0) return;
    if (!window.confirm(`¿Liquidar y pagar ${money(comision)} a ${r.nombre}?`)) return;
    try {
      await http.post('/comisiones/pagar', {
        empleado_id: r.id,
        desde,
        hasta,
        ventas: Number(r.ventas || 0),
        monto: comision,
      });
      load();
    } catch (err) {
      alert(apiErrorMsg(err));
    }
  };

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <h4 className="page-title">
            <i className="bi bi-percent me-2 text-primary"></i>Liquidación de Comisiones
          </h4>
          <p className="page-sub small">Calcula y paga comisiones por servicios atendidos en el periodo</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <input
            type="date"
            className="form-control form-control-sm"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />
          <span className="small text-muted">a</span>
          <input
            type="date"
            className="form-control form-control-sm"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
          />
        </div>
      </div>

      <div className="cw-card mb-4">
        <div className="card-h">
          <h6>Comisiones Generadas en el Periodo</h6>
        </div>
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Cargo</th>
                <th className="text-center">Órdenes Atendidas</th>
                <th className="text-end">Total Ventas</th>
                <th className="text-center">% Comisión</th>
                <th className="text-end">Comisión Calculada</th>
                <th className="text-end">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted">
                    Calculando comisiones...
                  </td>
                </tr>
              ) : (data.rows || []).map((r: any) => {
                  const com = Number(r.comision ?? r.monto_comision ?? 0);
                  return (
                    <tr key={r.id}>
                      <td className="fw-bold">{r.nombre}</td>
                      <td>{r.cargo}</td>
                      <td className="text-center">{r.ordenes || 0}</td>
                      <td className="text-end">{money(r.ventas || 0)}</td>
                      <td className="text-center">{Number(r.comision_pct || 0)}%</td>
                      <td className="text-end fw-extrabold text-primary">{money(com)}</td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-grad"
                          disabled={com <= 0}
                          onClick={() => liquidar(r)}
                        >
                          Liquidar y Pagar
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="cw-card">
        <div className="card-h">
          <h6>Historial de Pagos de Comisiones</h6>
        </div>
        <div className="table-responsive">
          <table className="table table-sm mb-0">
            <thead>
              <tr>
                <th>Fecha Pago</th>
                <th>Empleado</th>
                <th>Periodo Liquidado</th>
                <th className="text-end">Ventas Base</th>
                <th className="text-end">Monto Pagado</th>
              </tr>
            </thead>
            <tbody>
              {(data.pagos || []).map((p: any) => (
                <tr key={p.id}>
                  <td>{fdate(p.created_at, true)}</td>
                  <td className="fw-semibold">{p.empleado}</td>
                  <td className="small text-muted">
                    {fdate(p.desde)} al {fdate(p.hasta)}
                  </td>
                  <td className="text-end">{money(p.ventas)}</td>
                  <td className="text-end fw-bold text-success">{money(p.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
