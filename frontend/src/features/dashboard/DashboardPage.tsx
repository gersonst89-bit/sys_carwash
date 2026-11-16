import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { http } from '../../api/http';
import { money, num, fdate, estadoBadgeClass, estadoLabel } from '../../utils/format';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

export const DashboardPage: React.FC = () => {
  const [dias, setDias] = useState(7);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async (d: number) => {
    setLoading(true);
    try {
      const res = await http.get('/dashboard', { params: { dias: d } });
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(dias);
  }, [dias]);

  const k = data?.k || {};
  const charts = data?.charts || {};
  const ultimas = data?.ultimas || [];
  const stockBajo = data?.stockBajo || [];
  const citasHoy = data?.citasHoy || [];

  const diffHoy =
    k.ventas_ayer > 0
      ? Math.round(((k.ventas_hoy - k.ventas_ayer) / k.ventas_ayer) * 100)
      : k.ventas_hoy > 0
      ? 100
      : 0;
  const diffMes =
    k.ventas_mes_ant > 0
      ? Math.round(((k.ventas_mes - k.ventas_mes_ant) / k.ventas_mes_ant) * 100)
      : k.ventas_mes > 0
      ? 100
      : 0;
  const utilidadMes = (k.ventas_mes || 0) - (k.gastos_mes || 0);

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <h4 className="page-title">Panel de Control</h4>
          <p className="page-sub small">Resumen operativo y financiero en tiempo real</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className="btn-group btn-group-sm bg-white rounded-3 border p-1">
            {[7, 15, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                className={`btn btn-sm ${dias === d ? 'btn-primary' : 'btn-light border-0'}`}
                onClick={() => setDias(d)}
              >
                {d} días
              </button>
            ))}
          </div>
          <Link to="/tablero" className="btn btn-light border btn-sm">
            <i className="bi bi-activity me-1 text-teal"></i> Tablero en vivo
          </Link>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-sm-6 col-xl-3">
          <div className="kpi kpi-sky">
            <div className="kpi-ico">
              <i className="bi bi-cash-stack"></i>
            </div>
            <div className="kpi-l">Ventas de hoy</div>
            <div className="kpi-v">{money(k.ventas_hoy || 0)}</div>
            <div className="kpi-f">
              <span className="kpi-b">
                <i className={`bi ${diffHoy >= 0 ? 'bi-arrow-up-right' : 'bi-arrow-down-right'}`}></i>
                {diffHoy >= 0 ? `+${diffHoy}%` : `${diffHoy}%`}
              </span>
              <span className="kpi-s">Ayer: {money(k.ventas_ayer || 0)}</span>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="kpi kpi-teal">
            <div className="kpi-ico">
              <i className="bi bi-car-front-fill"></i>
            </div>
            <div className="kpi-l">Órdenes de hoy</div>
            <div className="kpi-v">{k.ordenes_hoy || 0}</div>
            <div className="kpi-f">
              <span className="kpi-b">
                <i className="bi bi-hourglass-split"></i> {k.en_proceso || 0} en atención
              </span>
              <span className="kpi-s">{k.cobradas_hoy || 0} cobradas hoy</span>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="kpi kpi-amber">
            <div className="kpi-ico">
              <i className="bi bi-graph-up-arrow"></i>
            </div>
            <div className="kpi-l">Ventas del mes</div>
            <div className="kpi-v">{money(k.ventas_mes || 0)}</div>
            <div className="kpi-f">
              <span className="kpi-b">
                {diffMes >= 0 ? `+${diffMes}%` : `${diffMes}%`} vs mes ant.
              </span>
              <span className="kpi-s">Gastos: {money(k.gastos_mes || 0)}</span>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="kpi kpi-rose">
            <div className="kpi-ico">
              <i className="bi bi-wallet2"></i>
            </div>
            <div className="kpi-l">Utilidad neta mes</div>
            <div className="kpi-v">{money(utilidadMes)}</div>
            <div className="kpi-f">
              <span className="kpi-b">
                <i className="bi bi-people-fill"></i> {k.clientes || 0} clientes
              </span>
              <span className="kpi-s">Por cobrar: {money(k.por_cobrar || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="mini-stat">
            <div className="ico bg-blue t-blue">
              <i className="bi bi-receipt-cutoff"></i>
            </div>
            <div className="flex-grow-1">
              <div className="l">Cuentas por cobrar pendientes</div>
              <div className="fw-extrabold fs-5">{money(k.por_cobrar || 0)}</div>
            </div>
            <Link to="/cobranzas" className="btn btn-sm btn-light border">
              Ver cobranzas
            </Link>
          </div>
        </div>
        <div className="col-md-6">
          <div className="mini-stat">
            <div className="ico bg-teal t-teal">
              <i className="bi bi-people"></i>
            </div>
            <div className="flex-grow-1">
              <div className="l">Clientes activos registrados</div>
              <div className="fw-extrabold fs-5">{k.clientes || 0} clientes</div>
            </div>
            <Link to="/crm" className="btn btn-sm btn-light border">
              Ir al CRM
            </Link>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-lg-7">
          <div className="cw-card h-100">
            <div className="card-h">
              <h6>
                <i className="bi bi-bar-chart-fill text-primary me-2"></i>
                Evolución de Ventas (últimos {dias} días)
              </h6>
            </div>
            <div className="card-b">
              <div className="chart-box">
                <Line
                  data={{
                    labels: charts.dias || [],
                    datasets: [
                      {
                        label: 'Ventas',
                        data: charts.ventas7 || [],
                        borderColor: '#0ea5e9',
                        backgroundColor: 'rgba(14, 165, 233, 0.14)',
                        fill: true,
                        tension: 0.35,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="cw-card h-100">
            <div className="card-h">
              <h6>
                <i className="bi bi-layers-fill text-teal me-2"></i>
                Ingresos vs Gastos (12 meses)
              </h6>
            </div>
            <div className="card-b">
              <div className="chart-box">
                <Bar
                  data={{
                    labels: charts.meses || [],
                    datasets: [
                      {
                        label: 'Ingresos',
                        data: charts.ventasM || [],
                        backgroundColor: '#14b8a6',
                        borderRadius: 6,
                      },
                      {
                        label: 'Gastos',
                        data: charts.gastosM || [],
                        backgroundColor: '#f43f5e',
                        borderRadius: 6,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-lg-4">
          <div className="cw-card h-100">
            <div className="card-h">
              <h6>Top Servicios ({dias}d)</h6>
            </div>
            <div className="card-b">
              <div style={{ height: 240 }}>
                <Bar
                  data={{
                    labels: (charts.topServ || []).map((s: any) => s.n),
                    datasets: [
                      {
                        label: 'Importe',
                        data: (charts.topServ || []).map((s: any) => Number(s.t)),
                        backgroundColor: '#0ea5e9',
                        borderRadius: 6,
                      },
                    ],
                  }}
                  options={{
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="cw-card h-100">
            <div className="card-h">
              <h6>Métodos de Pago (30d)</h6>
            </div>
            <div className="card-b">
              <div style={{ height: 240 }}>
                <Doughnut
                  data={{
                    labels: (charts.pagos || []).map((p: any) => String(p.m).toUpperCase()),
                    datasets: [
                      {
                        data: (charts.pagos || []).map((p: any) => Number(p.t)),
                        backgroundColor: ['#0ea5e9', '#14b8a6', '#8b5cf6', '#f59e0b', '#f43f5e'],
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="cw-card h-100">
            <div className="card-h">
              <h6>Top Lavadores / Personal (30d)</h6>
            </div>
            <div className="card-b">
              <div style={{ height: 240 }}>
                <Bar
                  data={{
                    labels: (charts.emps || []).map((e: any) => e.n),
                    datasets: [
                      {
                        label: 'Total generado',
                        data: (charts.emps || []).map((e: any) => Number(e.t)),
                        backgroundColor: '#6366f1',
                        borderRadius: 6,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-7">
          <div className="cw-card h-100">
            <div className="card-h">
              <h6>Últimas Órdenes Registradas</h6>
              <Link to="/ordenes" className="btn btn-sm btn-light border">
                Ver todas
              </Link>
            </div>
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Cliente / Placa</th>
                    <th>Estado</th>
                    <th className="text-end">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-muted">
                        Cargando...
                      </td>
                    </tr>
                  ) : ultimas.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-muted">
                        Sin órdenes recientes.
                      </td>
                    </tr>
                  ) : (
                    ultimas.map((o: any) => (
                      <tr key={o.id}>
                        <td>
                          <Link to={`/ordenes/ver/${o.id}`} className="fw-bold text-decoration-none">
                            {o.codigo}
                          </Link>
                          <div className="small text-muted">{fdate(o.fecha_ingreso, true)}</div>
                        </td>
                        <td>
                          <div className="fw-semibold">{o.cliente || 'Cliente general'}</div>
                          {o.placa && <span className="bd-placa small">{o.placa}</span>}
                        </td>
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
        </div>

        <div className="col-lg-5">
          <div className="cw-card mb-3">
            <div className="card-h">
              <h6>
                <i className="bi bi-exclamation-triangle-fill text-warning me-2"></i>
                Alerta de Stock Bajo
              </h6>
              <Link to="/productos" className="small text-decoration-none">
                Inventario
              </Link>
            </div>
            <div className="card-b pt-2">
              {stockBajo.length === 0 ? (
                <div className="text-muted small py-2">Todo el inventario tiene stock saludable.</div>
              ) : (
                <ul className="list-group list-group-flush">
                  {stockBajo.map((p: any, i: number) => (
                    <li
                      key={i}
                      className="list-group-item px-0 d-flex justify-content-between align-items-center"
                    >
                      <span>{p.nombre}</span>
                      <span className="badge badge-soft-danger">
                        {num(p.stock)} / mín {num(p.stock_minimo)} {p.unidad}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="cw-card">
            <div className="card-h">
              <h6>
                <i className="bi bi-calendar-event text-primary me-2"></i>
                Citas Programadas Hoy
              </h6>
              <Link to="/citas" className="small text-decoration-none">
                Agenda
              </Link>
            </div>
            <div className="card-b pt-2">
              {citasHoy.length === 0 ? (
                <div className="text-muted small py-2">No hay citas pendientes para hoy.</div>
              ) : (
                <ul className="list-group list-group-flush">
                  {citasHoy.map((c: any) => (
                    <li
                      key={c.id}
                      className="list-group-item px-0 d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <div className="fw-bold small">{c.cliente}</div>
                        <small className="text-muted">{c.servicio || 'Servicio general'}</small>
                      </div>
                      <div className="text-end">
                        <span className="badge badge-soft-info">{fdate(c.fecha_hora, true)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
