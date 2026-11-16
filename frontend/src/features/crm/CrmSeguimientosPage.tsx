import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { http, apiErrorMsg } from '../../api/http';
import { CrmNav } from './CrmNav';
import { fdate, whatsappLink } from '../../utils/format';

export const CrmSeguimientosPage: React.FC = () => {
  const [data, setData] = useState<any>({ pend: [], hist: [], clientes: [] });
  const [loading, setLoading] = useState(true);

  const [clienteId, setClienteId] = useState('');
  const [tipo, setTipo] = useState('llamada');
  const [asunto, setAsunto] = useState('');
  const [detalle, setDetalle] = useState('');
  const [seguimientoFecha, setSeguimientoFecha] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await http.get('/crm/seguimientos');
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await http.post('/crm/interacciones', {
        cliente_id: Number(clienteId),
        tipo,
        asunto,
        detalle,
        seguimiento_fecha: seguimientoFecha || undefined,
      });
      setAsunto('');
      setDetalle('');
      setSeguimientoFecha('');
      load();
    } catch (err) {
      alert(apiErrorMsg(err));
    }
  };

  const marcarHecho = async (id: number) => {
    try {
      await http.patch(`/crm/seguimientos/${id}/hecho`);
      load();
    } catch (err) {
      alert(apiErrorMsg(err));
    }
  };

  return (
    <div>
      <div className="mb-2">
        <h4 className="page-title">CRM · Agenda de Seguimientos e Interacciones</h4>
        <p className="page-sub small">Registra llamadas, mensajes y recordatorios de contacto</p>
      </div>

      <CrmNav />

      <div className="row g-3">
        <div className="col-lg-4">
          <form onSubmit={handleSave} className="cw-card">
            <div className="card-h">
              <h6>Nueva Interacción</h6>
            </div>
            <div className="card-b">
              <div className="mb-2">
                <label className="form-label">Cliente *</label>
                <select
                  className="form-select form-select-sm"
                  required
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                >
                  <option value="">-- Seleccionar --</option>
                  {(data.clientes || []).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-2">
                <label className="form-label">Tipo de contacto</label>
                <select
                  className="form-select form-select-sm"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                >
                  <option value="llamada">Llamada</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Correo</option>
                  <option value="visita">Visita</option>
                  <option value="nota">Nota</option>
                </select>
              </div>
              <div className="mb-2">
                <label className="form-label">Asunto *</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  required
                  value={asunto}
                  onChange={(e) => setAsunto(e.target.value)}
                />
              </div>
              <div className="mb-2">
                <label className="form-label">Detalle / Acuerdo</label>
                <textarea
                  className="form-control form-control-sm"
                  rows={2}
                  value={detalle}
                  onChange={(e) => setDetalle(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Programar próximo seguimiento</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={seguimientoFecha}
                  onChange={(e) => setSeguimientoFecha(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-grad w-100 btn-sm">
                Guardar interacción
              </button>
            </div>
          </form>
        </div>

        <div className="col-lg-8">
          <div className="cw-card mb-3">
            <div className="card-h">
              <h6>Seguimientos Pendientes ({(data.pend || []).length})</h6>
            </div>
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Asunto</th>
                    <th className="text-end">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="text-center py-3 text-muted">
                        Cargando...
                      </td>
                    </tr>
                  ) : (data.pend || []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-3 text-muted">
                        No tienes seguimientos pendientes.
                      </td>
                    </tr>
                  ) : (
                    data.pend.map((p: any) => (
                      <tr key={p.id}>
                        <td className="fw-bold text-danger">{fdate(p.seguimiento_fecha)}</td>
                        <td>
                          <Link to={`/clientes/ficha/${p.cliente_id}`} className="fw-semibold text-decoration-none">
                            {p.cliente}
                          </Link>
                        </td>
                        <td>
                          <b>{p.asunto}</b>
                          {p.detalle && <div className="small text-muted">{p.detalle}</div>}
                        </td>
                        <td className="text-end">
                          {p.telefono && (
                            <a
                              href={whatsappLink(p.telefono, `Hola ${p.cliente}, nos comunicamos por: ${p.asunto}`)}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-sm btn-success py-0 me-1"
                            >
                              <i className="bi bi-whatsapp"></i>
                            </a>
                          )}
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary py-0"
                            onClick={() => marcarHecho(p.id)}
                          >
                            Completar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="cw-card">
            <div className="card-h">
              <h6>Historial Reciente de Interacciones</h6>
            </div>
            <div className="card-b">
              <div className="tl">
                {(data.hist || []).map((h: any) => (
                  <div key={h.id} className="tl-i">
                    <div className="d-flex justify-content-between">
                      <span className="small fw-bold">
                        [{h.tipo.toUpperCase()}] {h.cliente} · {h.asunto}
                      </span>
                      <small className="text-muted">{fdate(h.created_at, true)}</small>
                    </div>
                    {h.detalle && <div className="small text-muted">{h.detalle}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
