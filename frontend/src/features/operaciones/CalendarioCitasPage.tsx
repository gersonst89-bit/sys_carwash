import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { http } from '../../api/http';
import { todayYmd, estadoBadgeClass } from '../../utils/format';

export const CalendarioCitasPage: React.FC = () => {
  const [mes, setMes] = useState(() => todayYmd().slice(0, 7));
  const [eventos, setEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    http
      .get('/citas/eventos', { params: { mes } })
      .then((res) => setEventos(Array.isArray(res.data) ? res.data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [mes]);

  const [year, month] = mes.split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startDow = firstDay.getDay();

  const cells: Array<number | null> = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const byDay: Record<string, any[]> = {};
  eventos.forEach((ev) => {
    const key = ev.d;
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(ev);
  });

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <h4 className="page-title">
            <i className="bi bi-calendar3 me-2 text-primary"></i>Calendario de Citas
          </h4>
          <p className="page-sub small">Vista mensual interactiva de reservas programadas</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <input
            type="month"
            className="form-control form-control-sm"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
          />
          <Link to="/citas" className="btn btn-grad btn-sm">
            <i className="bi bi-list-ul me-1"></i> Administrar Citas
          </Link>
        </div>
      </div>

      <div className="cw-card">
        <div className="card-b">
          {loading ? (
            <div className="text-center py-5 text-muted">Cargando calendario...</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered mb-0" style={{ tableLayout: 'fixed', minWidth: 700 }}>
                <thead>
                  <tr className="text-center">
                    <th>Dom</th>
                    <th>Lun</th>
                    <th>Mar</th>
                    <th>Mié</th>
                    <th>Jue</th>
                    <th>Vie</th>
                    <th>Sáb</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.ceil(cells.length / 7) }).map((_, wi) => (
                    <tr key={wi} style={{ height: 115 }}>
                      {Array.from({ length: 7 }).map((__, di) => {
                        const dayNum = cells[wi * 7 + di];
                        if (!dayNum) return <td key={di} className="bg-light"></td>;
                        const ymd = `${mes}-${String(dayNum).padStart(2, '0')}`;
                        const dayEvs = byDay[ymd] || [];
                        const isToday = ymd === todayYmd();
                        return (
                          <td
                            key={di}
                            className={`align-top p-2 ${isToday ? 'bg-info bg-opacity-10' : ''}`}
                          >
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <span className={`fw-bold small ${isToday ? 'text-primary' : 'text-muted'}`}>
                                {dayNum}
                              </span>
                              {dayEvs.length > 0 && (
                                <span className="badge badge-soft-primary py-0 px-1">
                                  {dayEvs.length}
                                </span>
                              )}
                            </div>
                            <div className="d-flex flex-column gap-1">
                              {dayEvs.map((ev) => (
                                <Link
                                  key={ev.id}
                                  to={`/ordenes/nueva?cita=${ev.id}`}
                                  className="text-decoration-none p-1 rounded border bg-white small d-block text-truncate"
                                  title={`${ev.h} - ${ev.cliente} (${ev.servicio || 'Servicio'})`}
                                >
                                  <span className={estadoBadgeClass(ev.estado)} style={{ padding: '2px 5px' }}>
                                    {ev.h}
                                  </span>{' '}
                                  <b className="text-dark">{ev.cliente}</b>
                                </Link>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
