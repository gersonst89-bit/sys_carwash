import React, { useState, useEffect } from 'react';
import { http } from '../../api/http';
import { CrmNav } from './CrmNav';
import { fdate } from '../../utils/format';

export const CrmEncuestasPage: React.FC = () => {
  const [data, setData] = useState<any>({ res: [], st: {}, dist: {}, cand: [] });

  useEffect(() => {
    http
      .get('/crm/encuestas')
      .then((res) => setData(res.data))
      .catch(console.error);
  }, []);

  const st = data.st || {};

  return (
    <div>
      <div className="mb-2">
        <h4 className="page-title">CRM · Encuestas de Satisfacción CSAT / NPS</h4>
        <p className="page-sub small">Mide la calidad percibida por tus clientes tras cada servicio</p>
      </div>

      <CrmNav />

      <div className="row g-3 mb-3">
        <div className="col-md-4">
          <div className="mini-stat">
            <div className="ico bg-amber t-amber">
              <i className="bi bi-star-fill"></i>
            </div>
            <div>
              <div className="l">Calificación Promedio</div>
              <div className="fw-extrabold fs-4">{st.prom || '0.0'} / 5.0</div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="mini-stat">
            <div className="ico bg-teal t-teal">
              <i className="bi bi-chat-heart"></i>
            </div>
            <div>
              <div className="l">Respuestas Recibidas</div>
              <div className="fw-extrabold fs-4">{st.n || 0}</div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="mini-stat">
            <div className="ico bg-green t-green">
              <i className="bi bi-hand-thumbs-up-fill"></i>
            </div>
            <div>
              <div className="l">Clientes Satisfechos (4-5 ★)</div>
              <div className="fw-extrabold fs-4">{st.sat || 0}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-6">
          <div className="cw-card">
            <div className="card-h">
              <h6>Solicitar Encuesta (Órdenes recientes)</h6>
            </div>
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>Orden</th>
                    <th>Cliente</th>
                    <th>Enlace</th>
                    <th className="text-end">WhatsApp</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.cand || []).map((o: any) => (
                    <tr key={o.id}>
                      <td className="fw-bold">{o.codigo}</td>
                      <td>{o.nombre}</td>
                      <td>
                        <a
                          href={`/encuesta/${o.token}`}
                          target="_blank"
                          rel="noreferrer"
                          className="small"
                        >
                          Abrir encuesta
                        </a>
                      </td>
                      <td className="text-end">
                        {o.wa && (
                          <a
                            href={o.wa}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-sm btn-success py-0"
                          >
                            <i className="bi bi-whatsapp me-1"></i>Enviar
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="cw-card">
            <div className="card-h">
              <h6>Últimas Calificaciones Recibidas</h6>
            </div>
            <div className="card-b">
              {(data.res || []).length === 0 ? (
                <div className="text-muted small">Aún no hay encuestas respondidas.</div>
              ) : (
                <ul className="list-group list-group-flush">
                  {data.res.map((r: any) => (
                    <li key={r.id} className="list-group-item px-0">
                      <div className="d-flex justify-content-between">
                        <b>
                          {r.cliente || 'Cliente'} ({r.codigo})
                        </b>
                        <span className="text-warning fw-bold">{'★'.repeat(r.puntaje || 5)}</span>
                      </div>
                      {r.comentario && <div className="small text-muted">{r.comentario}</div>}
                      <small className="text-muted">{fdate(r.respondido_at, true)}</small>
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
