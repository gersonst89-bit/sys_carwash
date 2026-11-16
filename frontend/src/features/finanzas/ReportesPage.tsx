import React, { useEffect, useState } from 'react';
import { http, apiErrorMsg } from '../../api/http';
import { exportToCsv, fdate, firstOfMonthYmd, money, todayYmd } from '../../utils/format';

export const ReportesPage: React.FC = () => {
  const [desde, setDesde] = useState(firstOfMonthYmd());
  const [hasta, setHasta] = useState(todayYmd());
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState('');

  const cargar = async () => {
    try {
      const res = await http.get('/reportes', { params: { desde, hasta } });
      setData(res.data);
    } catch (e) {
      setErr(apiErrorMsg(e));
    }
  };

  useEffect(() => {
    cargar();
  }, [desde, hasta]);

  const descargarExcelCsv = async (tipo: string) => {
    try {
      const { data: rep } = await http.get('/reportes/exportar', {
        params: { tipo, desde, hasta },
      });
      const rows = (rep.filas || []).map((r: any) => Object.values(r));
      exportToCsv(`${tipo}_${desde}_${hasta}`, rep.columnas || [], rows);
    } catch (e) {
      alert(apiErrorMsg(e));
    }
  };

  const r = data?.r || { ingresos: 0, gastos: 0, utilidad: 0, ordenes: 0, promedio: 0 };

  return (
    <div className="container-fluid py-2">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h4 className="fw-bold mb-0">
            <i className="bi bi-bar-chart-line text-primary me-2"></i>Reportes Financieros y Exportación
          </h4>
          <small className="text-muted">Estado de resultados, métricas y exportación a Excel / CSV</small>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <input
            type="date"
            className="form-control form-control-sm"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />
          <span>a</span>
          <input
            type="date"
            className="form-control form-control-sm"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
          />
          <button className="btn btn-outline-secondary btn-sm" onClick={() => window.print()}>
            <i className="bi bi-printer me-1"></i>Imprimir
          </button>
        </div>
      </div>

      {err && <div className="alert alert-danger">{err}</div>}

      <div className="row g-3 mb-3">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm p-3">
            <div className="text-muted small">Ingresos Totales</div>
            <div className="fs-4 fw-bold text-success">{money(r.ingresos)}</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm p-3">
            <div className="text-muted small">Gastos Operativos</div>
            <div className="fs-4 fw-bold text-danger">{money(r.gastos)}</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm p-3">
            <div className="text-muted small">Utilidad Neta</div>
            <div className="fs-4 fw-bold text-primary">{money(r.utilidad)}</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm p-3">
            <div className="text-muted small">Ticket Promedio ({r.ordenes} órd.)</div>
            <div className="fs-4 fw-bold">{money(r.promedio)}</div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body d-flex flex-wrap gap-2 align-items-center">
          <span className="fw-bold me-2">
            <i className="bi bi-file-earmark-spreadsheet text-success me-1"></i>Exportar a Excel / CSV:
          </span>
          {[
            ['ordenes', 'Órdenes'],
            ['ventas_dia', 'Ventas por día'],
            ['servicios', 'Servicios vendidos'],
            ['cobrar', 'Cuentas por cobrar'],
            ['pagar', 'Cuentas por pagar'],
            ['inventario', 'Inventario'],
            ['clientes', 'Clientes'],
            ['gastos', 'Gastos'],
          ].map(([k, label]) => (
            <button
              key={k}
              className="btn btn-outline-success btn-sm"
              onClick={() => descargarExcelCsv(k)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="row g-3">
        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white fw-bold">Servicios y Productos más vendidos</div>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Concepto</th>
                    <th className="text-end">Cantidad</th>
                    <th className="text-end">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.servicios || []).map((s: any, idx: number) => (
                    <tr key={idx}>
                      <td>{s.n}</td>
                      <td className="text-end">{s.c}</td>
                      <td className="text-end fw-semibold">{money(s.t)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white fw-bold">Ventas por Día</div>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Fecha</th>
                    <th className="text-end">Órdenes</th>
                    <th className="text-end">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.porDia || []).map((d: any, idx: number) => (
                    <tr key={idx}>
                      <td>{fdate(d.d)}</td>
                      <td className="text-end">{d.n}</td>
                      <td className="text-end fw-semibold">{money(d.t)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
