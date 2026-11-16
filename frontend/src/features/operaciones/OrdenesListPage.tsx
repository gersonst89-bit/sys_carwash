import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { http } from '../../api/http';
import {
  money,
  fdate,
  firstOfMonthYmd,
  todayYmd,
  estadoBadgeClass,
  estadoLabel,
  exportToCsv,
} from '../../utils/format';

export const OrdenesListPage: React.FC = () => {
  const [desde, setDesde] = useState(firstOfMonthYmd());
  const [hasta, setHasta] = useState(todayYmd());
  const [estado, setEstado] = useState('');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [resumen, setResumen] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await http.get('/ordenes', {
        params: { desde, hasta, estado: estado || undefined },
      });
      setRows(data.rows || []);
      setResumen(data.resumen || {});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [desde, hasta, estado]);

  const filtered = rows.filter((r) => {
    if (!q.trim()) return true;
    const t = q.trim().toLowerCase();
    return (
      String(r.codigo || '').toLowerCase().includes(t) ||
      String(r.cliente || '').toLowerCase().includes(t) ||
      String(r.placa || '').toLowerCase().includes(t)
    );
  });

  const handleExport = () => {
    exportToCsv(
      `ordenes_${desde}_${hasta}`,
      ['Código', 'Fecha', 'Cliente', 'Placa', 'Lavador', 'Estado', 'Total', 'Abonado'],
      filtered.map((r) => [
        r.codigo,
        fdate(r.fecha_ingreso, true),
        r.cliente || 'Cliente general',
        r.placa || '-',
        r.empleado || '-',
        r.estado,
        r.total,
        r.abonado,
      ]),
    );
  };

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <h4 className="page-title">
            <i className="bi bi-card-checklist me-2 text-primary"></i>Órdenes de Servicio
          </h4>
          <p className="page-sub small">Historial, estados de lavado y control de pagos</p>
        </div>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-light border btn-sm" onClick={handleExport}>
            <i className="bi bi-download me-1"></i> Exportar CSV
          </button>
          <Link to="/ordenes/nueva" className="btn btn-grad btn-sm px-3">
            <i className="bi bi-plus-lg me-1"></i> Nueva orden
          </Link>
        </div>
      </div>

      <div className="row g-2 mb-3">
        {[
          { k: 'pendiente', l: 'Pendientes hoy', c: 'warning' },
          { k: 'en_proceso', l: 'En proceso hoy', c: 'info' },
          { k: 'terminado', l: 'Terminadas hoy', c: 'primary' },
          { k: 'entregado', l: 'Entregadas hoy', c: 'success' },
        ].map((st) => (
          <div key={st.k} className="col-6 col-md-3">
            <div className="mini-stat py-2">
              <span className={`badge badge-soft-${st.c} fs-6`}>{resumen[st.k] || 0}</span>
              <span className="small fw-bold text-muted">{st.l}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="cw-card">
        <div className="card-h">
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <input
              type="date"
              className="form-control form-control-sm"
              style={{ width: 145 }}
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
            <span className="text-muted small">a</span>
            <input
              type="date"
              className="form-control form-control-sm"
              style={{ width: 145 }}
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
            <select
              className="form-select form-select-sm"
              style={{ width: 155 }}
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="en_proceso">En proceso</option>
              <option value="terminado">Terminado</option>
              <option value="entregado">Entregado</option>
              <option value="cancelado">Cancelado</option>
            </select>
            <input
              type="search"
              className="form-control form-control-sm"
              style={{ width: 210 }}
              placeholder="Buscar código, placa, cliente..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <span className="text-muted small fw-semibold">{filtered.length} órdenes</span>
        </div>

        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th>Código</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Vehículo</th>
                <th>Lavador</th>
                <th>Estado</th>
                <th>Pago</th>
                <th className="text-end">Total</th>
                <th className="text-end">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-4 text-muted">
                    Cargando órdenes...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-4 text-muted">
                    No hay órdenes en este rango de fechas.
                  </td>
                </tr>
              ) : (
                filtered.map((o) => {
                  const saldo = Math.max(0, Number(o.total) - Number(o.abonado || 0));
                  return (
                    <tr key={o.id}>
                      <td>
                        <Link to={`/ordenes/ver/${o.id}`} className="fw-bold text-decoration-none">
                          {o.codigo}
                        </Link>
                      </td>
                      <td className="small text-muted">{fdate(o.fecha_ingreso, true)}</td>
                      <td className="fw-semibold">{o.cliente || 'Cliente general'}</td>
                      <td>{o.placa ? <span className="bd-placa">{o.placa}</span> : '-'}</td>
                      <td className="small">{o.empleado || '-'}</td>
                      <td>
                        <span className={estadoBadgeClass(o.estado)}>{estadoLabel(o.estado)}</span>
                      </td>
                      <td>
                        {o.pagado ? (
                          <span className="badge badge-soft-success">Pagado</span>
                        ) : saldo < Number(o.total) ? (
                          <span className="badge badge-soft-info">Adelanto ({money(o.abonado)})</span>
                        ) : (
                          <span className="badge badge-soft-warning">Pendiente</span>
                        )}
                      </td>
                      <td className="text-end fw-bold">{money(o.total)}</td>
                      <td className="text-end">
                        <Link to={`/ordenes/ver/${o.id}`} className="btn btn-light btn-sm border">
                          <i className="bi bi-eye me-1"></i>Ver
                        </Link>
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
