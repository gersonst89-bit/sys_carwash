import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { http } from '../../api/http';
import { money } from '../../utils/format';

const COLS = [
  { key: 'pendiente', title: 'En cola', color: '#f59e0b', next: 'en_proceso', nextLabel: 'Iniciar lavado' },
  { key: 'en_proceso', title: 'En proceso', color: '#0ea5e9', next: 'terminado', nextLabel: 'Terminar' },
  { key: 'terminado', title: 'Listos para entregar', color: '#8b5cf6', next: 'entregado', nextLabel: 'Entregar' },
  { key: 'entregado', title: 'Entregados hoy', color: '#16a34a', next: null, nextLabel: '' },
];

export const TableroVivoPage: React.FC = () => {
  const [data, setData] = useState<any>({
    cols: { pendiente: [], en_proceso: [], terminado: [], entregado: [] },
    atrasadas: 0,
    prom: null,
    ahora: '',
    emps: [],
  });
  const [loading, setLoading] = useState(true);
  const [draggedId, setDraggedId] = useState<number | null>(null);

  const load = async () => {
    try {
      const res = await http.get('/tablero');
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, []);

  const mover = async (id: number, estado: string) => {
    try {
      await http.post('/tablero/mover', { id, estado });
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const asignar = async (id: number, empleadoId: string) => {
    try {
      await http.post('/tablero/asignar', {
        id,
        empleado_id: empleadoId ? Number(empleadoId) : null,
      });
      load();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <h4 className="page-title">
            <i className="bi bi-activity me-2 text-teal"></i>Tablero en Vivo (Patio de Lavado)
          </h4>
          <p className="page-sub small">
            Arrastra tarjetas o usa los botones para avanzar estados · Actualizado {data.ahora}
          </p>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          {data.prom !== null && (
            <span className="badge badge-soft-info">
              <i className="bi bi-stopwatch me-1"></i>Promedio hoy: {data.prom} min
            </span>
          )}
          {data.atrasadas > 0 && (
            <span className="badge badge-soft-danger">
              <i className="bi bi-exclamation-triangle-fill me-1"></i>
              {data.atrasadas} con demora
            </span>
          )}
          <button type="button" className="btn btn-light border btn-sm" onClick={load}>
            <i className="bi bi-arrow-clockwise me-1"></i> Actualizar
          </button>
          <Link to="/ordenes/nueva" className="btn btn-grad btn-sm">
            <i className="bi bi-plus-lg me-1"></i> Nueva orden
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5 text-muted">Cargando tablero en vivo...</div>
      ) : (
        <div className="board">
          {COLS.map((col) => {
            const items = data.cols?.[col.key] || [];
            return (
              <div
                key={col.key}
                className="bd-col"
                style={{ '--c': col.color } as React.CSSProperties}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggedId) {
                    mover(draggedId, col.key);
                    setDraggedId(null);
                  }
                }}
              >
                <div className="bd-h">
                  <span className="fw-extrabold">{col.title}</span>
                  <span className="bd-n">{items.length}</span>
                </div>

                {items.length === 0 ? (
                  <div className="bd-empty">Sin vehículos en esta etapa</div>
                ) : (
                  items.map((o: any) => {
                    const pct = Math.min(100, Math.round(((o.mins || 0) / (o.dur || 30)) * 100));
                    return (
                      <div
                        key={o.id}
                        draggable
                        onDragStart={() => setDraggedId(o.id)}
                        className={`bd-card lv-${o.nivel}`}
                      >
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          {o.placa ? (
                            <span className="bd-placa">{o.placa}</span>
                          ) : (
                            <span className="fw-bold small">{o.codigo}</span>
                          )}
                          <Link
                            to={`/ordenes/ver/${o.id}`}
                            className="small text-muted text-decoration-none fw-bold"
                          >
                            {o.codigo}
                          </Link>
                        </div>

                        <div className="small fw-bold text-dark">
                          {o.marca || ''} {o.modelo || ''} · {o.cliente || 'Cliente general'}
                        </div>
                        <div className="small text-muted mb-2">{o.servicios || 'Servicios varios'}</div>

                        {col.key !== 'entregado' && (
                          <div className="mb-2">
                            <div className="d-flex justify-content-between small mb-1">
                              <span className={`bd-t ${o.nivel}`}>
                                <i className="bi bi-clock me-1"></i>
                                {o.mins} min / est. {o.dur} min
                              </span>
                              <span className="fw-bold">{money(o.total)}</span>
                            </div>
                            <div className="progress" style={{ height: 5 }}>
                              <div className="progress-bar" style={{ width: `${pct}%` }}></div>
                            </div>
                          </div>
                        )}

                        <div className="d-flex align-items-center justify-content-between gap-2 mt-2 pt-2 border-top">
                          <select
                            className="form-select form-select-sm py-0 px-2"
                            style={{ fontSize: '0.76rem', height: 26 }}
                            value={o.empleado_id || ''}
                            onChange={(e) => asignar(o.id, e.target.value)}
                          >
                            <option value="">-- Lavador --</option>
                            {(data.emps || []).map((emp: any) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.nombre}
                              </option>
                            ))}
                          </select>

                          {col.next && (
                            <button
                              type="button"
                              className="btn btn-sm btn-primary py-0 px-2 whitespace-nowrap"
                              style={{ fontSize: '0.76rem', height: 26 }}
                              onClick={() => mover(o.id, col.next!)}
                            >
                              {col.nextLabel} <i className="bi bi-chevron-right"></i>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
