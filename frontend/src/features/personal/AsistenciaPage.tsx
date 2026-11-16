import React, { useState, useEffect } from 'react';
import { http, apiErrorMsg } from '../../api/http';
import { todayYmd, estadoBadgeClass, estadoLabel } from '../../utils/format';

export const AsistenciaPage: React.FC = () => {
  const [tab, setTab] = useState<'diaria' | 'mensual' | 'config'>('diaria');
  const [fecha, setFecha] = useState(todayYmd());
  const [mes, setMes] = useState(todayYmd().slice(0, 7));

  const [diaria, setDiaria] = useState<any>({ rows: [], cfg: {} });
  const [mensual, setMensual] = useState<any>({ emps: [], dias: 30, map: {} });
  const [cfg, setCfg] = useState<any>({
    hora_entrada: '08:00',
    hora_salida: '17:00',
    tolerancia: 10,
    dias_mes: 30,
    desc_tardanza: 1,
  });

  const loadDiaria = async () => {
    const { data } = await http.get('/asistencia', { params: { fecha } });
    setDiaria(data);
    if (data.cfg) setCfg(data.cfg);
  };

  const loadMensual = async () => {
    const { data } = await http.get('/asistencia/mes', { params: { mes } });
    setMensual(data);
  };

  useEffect(() => {
    if (tab === 'diaria') loadDiaria();
    else if (tab === 'mensual') loadMensual();
  }, [tab, fecha, mes]);

  const marcar = async (empleado_id: number, accion: string, estado?: string) => {
    try {
      await http.post('/asistencia/marcar', {
        empleado_id,
        fecha,
        accion,
        estado,
      });
      loadDiaria();
    } catch (err) {
      alert(apiErrorMsg(err));
    }
  };

  const cerrarDia = async () => {
    if (!window.confirm('¿Marcar como FALTA a quienes no registraron asistencia hoy?')) return;
    await http.post('/asistencia/cerrar-dia', { fecha });
    loadDiaria();
  };

  const guardarCfg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await http.put('/asistencia/config', cfg);
      alert('Configuración de asistencia guardada.');
    } catch (err) {
      alert(apiErrorMsg(err));
    }
  };

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h4 className="page-title">
            <i className="bi bi-clock-history me-2 text-primary"></i>Control de Asistencia y Horarios
          </h4>
          <p className="page-sub small">Marcación de entrada/salida, tardanzas y matriz mensual</p>
        </div>
        <div className="btn-group btn-group-sm">
          <button
            type="button"
            className={`btn ${tab === 'diaria' ? 'btn-primary' : 'btn-light border'}`}
            onClick={() => setTab('diaria')}
          >
            Marcación Diaria
          </button>
          <button
            type="button"
            className={`btn ${tab === 'mensual' ? 'btn-primary' : 'btn-light border'}`}
            onClick={() => setTab('mensual')}
          >
            Resumen Mensual
          </button>
          <button
            type="button"
            className={`btn ${tab === 'config' ? 'btn-primary' : 'btn-light border'}`}
            onClick={() => setTab('config')}
          >
            Horario y Reglas
          </button>
        </div>
      </div>

      {tab === 'diaria' && (
        <div className="cw-card">
          <div className="card-h">
            <div className="d-flex align-items-center gap-2">
              <input
                type="date"
                className="form-control form-control-sm"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
              <span className="small text-muted">
                Entrada oficial: {diaria.cfg?.hora_entrada || '08:00'} (Tolerancia:{' '}
                {diaria.cfg?.tolerancia || 10} min)
              </span>
            </div>
            <button type="button" className="btn btn-outline-danger btn-sm" onClick={cerrarDia}>
              Cerrar día (marcar faltas)
            </button>
          </div>
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Cargo</th>
                  <th>Entrada</th>
                  <th>Salida</th>
                  <th>Min. Tarde</th>
                  <th>Estado</th>
                  <th className="text-end">Marcación Rápida</th>
                </tr>
              </thead>
              <tbody>
                {(diaria.rows || []).map((r: any) => (
                  <tr key={r.id}>
                    <td className="fw-bold">{r.nombre}</td>
                    <td>{r.cargo}</td>
                    <td>{r.entrada || '-'}</td>
                    <td>{r.salida || '-'}</td>
                    <td>{r.min_tarde ? `${r.min_tarde} min` : '-'}</td>
                    <td>
                      {r.estado ? (
                        <span className={estadoBadgeClass(r.estado)}>{estadoLabel(r.estado)}</span>
                      ) : (
                        <span className="text-muted small">Sin marcar</span>
                      )}
                    </td>
                    <td className="text-end">
                      <div className="d-inline-flex gap-1">
                        {!r.entrada && (
                          <button
                            type="button"
                            className="btn btn-sm btn-success py-0"
                            onClick={() => marcar(r.id, 'entrada')}
                          >
                            Entrada
                          </button>
                        )}
                        {r.entrada && !r.salida && (
                          <button
                            type="button"
                            className="btn btn-sm btn-primary py-0"
                            onClick={() => marcar(r.id, 'salida')}
                          >
                            Salida
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger py-0"
                          onClick={() => marcar(r.id, 'estado', 'falta')}
                        >
                          Falta
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary py-0"
                          onClick={() => marcar(r.id, 'estado', 'descanso')}
                        >
                          Descanso
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'mensual' && (
        <div className="cw-card">
          <div className="card-h">
            <h6>Resumen Mensual de Asistencia</h6>
            <input
              type="month"
              className="form-control form-control-sm"
              style={{ width: 170 }}
              value={mes}
              onChange={(e) => setMes(e.target.value)}
            />
          </div>
          <div className="table-responsive">
            <table className="table table-sm mb-0">
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th className="text-center">Presentes</th>
                  <th className="text-center">Tardanzas</th>
                  <th className="text-center">Faltas</th>
                  <th className="text-center">Min. Tarde Acum.</th>
                </tr>
              </thead>
              <tbody>
                {(mensual.emps || []).map((e: any) => (
                  <tr key={e.id}>
                    <td className="fw-bold">{e.nombre}</td>
                    <td className="text-center text-success fw-bold">{e.presentes || 0}</td>
                    <td className="text-center text-warning fw-bold">{e.tardanzas || 0}</td>
                    <td className="text-center text-danger fw-bold">{e.faltas || 0}</td>
                    <td className="text-center">{e.min_tarde || 0} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'config' && (
        <form onSubmit={guardarCfg} className="cw-card" style={{ maxWidth: 600 }}>
          <div className="card-b">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Hora de entrada</label>
                <input
                  type="time"
                  className="form-control"
                  value={(cfg.hora_entrada || '08:00').slice(0, 5)}
                  onChange={(e) => setCfg({ ...cfg, hora_entrada: e.target.value })}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Hora de salida</label>
                <input
                  type="time"
                  className="form-control"
                  value={(cfg.hora_salida || '17:00').slice(0, 5)}
                  onChange={(e) => setCfg({ ...cfg, hora_salida: e.target.value })}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Tolerancia (minutos)</label>
                <input
                  type="number"
                  className="form-control"
                  value={cfg.tolerancia || 10}
                  onChange={(e) => setCfg({ ...cfg, tolerancia: Number(e.target.value) })}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Días laborales base por mes</label>
                <input
                  type="number"
                  className="form-control"
                  value={cfg.dias_mes || 30}
                  onChange={(e) => setCfg({ ...cfg, dias_mes: Number(e.target.value) })}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-grad mt-3">
              Guardar Horario
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
