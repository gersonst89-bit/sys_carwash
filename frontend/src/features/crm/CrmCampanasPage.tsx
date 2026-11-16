import React, { useState, useEffect } from 'react';
import { http, apiErrorMsg } from '../../api/http';
import { CrmNav } from './CrmNav';
import { fdate } from '../../utils/format';

export const CrmCampanasPage: React.FC = () => {
  const [data, setData] = useState<any>({ rows: [], count: {} });
  const [selectedCamp, setSelectedCamp] = useState<any>(null);

  const [nombre, setNombre] = useState('');
  const [segmento, setSegmento] = useState('todos');
  const [canal, setCanal] = useState('whatsapp');
  const [mensaje, setMensaje] = useState(
    'Hola {nombre}, en {empresa} tenemos una promoción especial para ti. Usa el cupón {cupon} en tu próxima visita.',
  );
  const [cuponPct, setCuponPct] = useState('15');
  const [cuponDias, setCuponDias] = useState('30');

  const load = async () => {
    try {
      const res = await http.get('/crm/campanas');
      setData(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const verCampana = async (id: number) => {
    try {
      const res = await http.get(`/crm/campanas/${id}`);
      setSelectedCamp(res.data);
    } catch (err) {
      alert(apiErrorMsg(err));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await http.post('/crm/campanas', {
        nombre,
        segmento,
        canal,
        mensaje,
        cupon_pct: Number(cuponPct || 0),
        cupon_dias: Number(cuponDias || 30),
      });
      setNombre('');
      await load();
      if (res.data?.id) verCampana(res.data.id);
    } catch (err) {
      alert(apiErrorMsg(err));
    }
  };

  const marcarEnviado = async (envioId: number) => {
    await http.patch(`/crm/campanas/envio/${envioId}`);
    if (selectedCamp?.c?.id) verCampana(selectedCamp.c.id);
    load();
  };

  return (
    <div>
      <div className="mb-2">
        <h4 className="page-title">CRM · Campañas de Marketing (WhatsApp / Correo)</h4>
        <p className="page-sub small">Envía promociones segmentadas con variables dinámicas y cupones</p>
      </div>

      <CrmNav />

      {selectedCamp ? (
        <div className="cw-card">
          <div className="card-h">
            <h6>
              Campaña: {selectedCamp.c?.nombre} ({selectedCamp.c?.canal})
            </h6>
            <button
              type="button"
              className="btn btn-sm btn-light border"
              onClick={() => setSelectedCamp(null)}
            >
              Volver a campañas
            </button>
          </div>
          <div className="card-b">
            <div className="p-2 rounded bg-light border small mb-3">
              <b>Mensaje plantilla:</b> {selectedCamp.c?.mensaje}
            </div>
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Contacto</th>
                    <th>Estado</th>
                    <th className="text-end">Enviar</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedCamp.env || []).map((e: any) => (
                    <tr key={e.id}>
                      <td className="fw-semibold">{e.nombre}</td>
                      <td>{e.telefono || e.email}</td>
                      <td>
                        {e.enviado ? (
                          <span className="badge badge-soft-success">Enviado</span>
                        ) : (
                          <span className="badge badge-soft-warning">Pendiente</span>
                        )}
                      </td>
                      <td className="text-end">
                        <a
                          href={e.link}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm btn-success py-0"
                          onClick={() => marcarEnviado(e.id)}
                        >
                          <i className="bi bi-send me-1"></i>Enviar ahora
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="row g-3">
          <div className="col-lg-5">
            <form onSubmit={handleCreate} className="cw-card">
              <div className="card-h">
                <h6>Nueva Campaña</h6>
              </div>
              <div className="card-b">
                <div className="mb-2">
                  <label className="form-label">Nombre de campaña *</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    required
                    placeholder="Ej: Promo Fin de Mes"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                  />
                </div>
                <div className="row g-2 mb-2">
                  <div className="col-7">
                    <label className="form-label">Audiencia / Segmento</label>
                    <select
                      className="form-select form-select-sm"
                      value={segmento}
                      onChange={(e) => setSegmento(e.target.value)}
                    >
                      <option value="todos">Todos ({data.count?.todos || 0})</option>
                      <option value="vip">VIP ({data.count?.vip || 0})</option>
                      <option value="frecuente">Frecuentes ({data.count?.frecuente || 0})</option>
                      <option value="en_riesgo">En riesgo ({data.count?.en_riesgo || 0})</option>
                      <option value="cumple_mes">Cumpleañeros del mes ({data.count?.cumple_mes || 0})</option>
                    </select>
                  </div>
                  <div className="col-5">
                    <label className="form-label">Canal</label>
                    <select
                      className="form-select form-select-sm"
                      value={canal}
                      onChange={(e) => setCanal(e.target.value)}
                    >
                      <option value="whatsapp">WhatsApp</option>
                      <option value="email">Correo</option>
                    </select>
                  </div>
                </div>
                <div className="mb-2">
                  <label className="form-label">
                    Mensaje (usa {'{nombre}'}, {'{puntos}'}, {'{cupon}'})
                  </label>
                  <textarea
                    className="form-control form-control-sm"
                    rows={3}
                    required
                    value={mensaje}
                    onChange={(e) => setMensaje(e.target.value)}
                  />
                </div>
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label">Cupón auto % (0=no)</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={cuponPct}
                      onChange={(e) => setCuponPct(e.target.value)}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Vigencia días</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={cuponDias}
                      onChange={(e) => setCuponDias(e.target.value)}
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-grad btn-sm w-100">
                  Crear campaña y generar lista
                </button>
              </div>
            </form>
          </div>

          <div className="col-lg-7">
            <div className="cw-card">
              <div className="card-h">
                <h6>Campañas Creadas</h6>
              </div>
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Campaña</th>
                      <th>Segmento</th>
                      <th>Canal</th>
                      <th>Progreso</th>
                      <th>Fecha</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.rows || []).map((c: any) => (
                      <tr key={c.id}>
                        <td className="fw-bold">{c.nombre}</td>
                        <td>
                          <span className="badge badge-soft-info">{c.segmento}</span>
                        </td>
                        <td className="text-uppercase small">{c.canal}</td>
                        <td>
                          {c.enviados} / {c.total}
                        </td>
                        <td className="small text-muted">{fdate(c.created_at)}</td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-light border"
                            onClick={() => verCampana(c.id)}
                          >
                            Abrir envíos
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
