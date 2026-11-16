import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Doughnut, Bar } from 'react-chartjs-2';
import { http } from '../../api/http';
import { CrmNav } from './CrmNav';
import { money, fdate, whatsappLink } from '../../utils/format';

export const CrmPanelPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    http
      .get('/crm/panel')
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const k = data?.k || {};
  const charts = data?.charts || {};
  const cumples = data?.cumples || [];
  const riesgo = data?.riesgo || [];
  const top = data?.top || [];
  const pend = data?.pend || [];

  return (
    <div>
      <div className="mb-2">
        <h4 className="page-title">
          <i className="bi bi-heart-pulse me-2 text-danger"></i>CRM · Relación y Retención de Clientes
        </h4>
        <p className="page-sub small">Segmentación RFM, fidelización, campañas y satisfacción post-servicio</p>
      </div>

      <CrmNav />

      {loading ? (
        <div className="text-center py-5 text-muted">Cargando panel CRM...</div>
      ) : (
        <>
          <div className="row g-3 mb-4">
            <div className="col-sm-6 col-xl-3">
              <div className="kpi kpi-sky">
                <div className="kpi-ico">
                  <i className="bi bi-people-fill"></i>
                </div>
                <div className="kpi-l">Clientes Activos</div>
                <div className="kpi-v">{k.activos || 0}</div>
                <div className="kpi-f">
                  <span className="kpi-b">+{k.nuevos_mes || 0} este mes</span>
                  <span className="kpi-s">Total: {k.total || 0}</span>
                </div>
              </div>
            </div>

            <div className="col-sm-6 col-xl-3">
              <div className="kpi kpi-teal">
                <div className="kpi-ico">
                  <i className="bi bi-gem"></i>
                </div>
                <div className="kpi-l">Clientes VIP & Recompra</div>
                <div className="kpi-v">{k.vip || 0} VIP</div>
                <div className="kpi-f">
                  <span className="kpi-b">{k.recompra || 0}% recompra</span>
                  <span className="kpi-s">{k.puntos || 0} pts activos</span>
                </div>
              </div>
            </div>

            <div className="col-sm-6 col-xl-3">
              <div className="kpi kpi-amber">
                <div className="kpi-ico">
                  <i className="bi bi-kanban"></i>
                </div>
                <div className="kpi-l">Pipeline Comercial</div>
                <div className="kpi-v">{money(k.op_valor || 0)}</div>
                <div className="kpi-f">
                  <span className="kpi-b">{k.op_abiertas || 0} oportunidades</span>
                  <span className="kpi-s">{k.seg_pend || 0} seguim. hoy</span>
                </div>
              </div>
            </div>

            <div className="col-sm-6 col-xl-3">
              <div className="kpi kpi-rose">
                <div className="kpi-ico">
                  <i className="bi bi-emoji-smile"></i>
                </div>
                <div className="kpi-l">Satisfacción CSAT</div>
                <div className="kpi-v">{k.csat ? `${k.csat} / 5` : '-'}</div>
                <div className="kpi-f">
                  <span className="kpi-b">{k.resp || 0} encuestas</span>
                  <span className="kpi-s">{k.riesgo || 0} en riesgo</span>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-lg-5">
              <div className="cw-card h-100">
                <div className="card-h">
                  <h6>Distribución de Segmentos RFM</h6>
                </div>
                <div className="card-b">
                  <div style={{ height: 240 }}>
                    <Doughnut
                      data={{
                        labels: charts.seg?.labels || [],
                        datasets: [
                          {
                            data: charts.seg?.data || [],
                            backgroundColor: charts.seg?.colors || [
                              '#f59e0b',
                              '#14b8a6',
                              '#0ea5e9',
                              '#8b5cf6',
                              '#f43f5e',
                              '#94a3b8',
                            ],
                          },
                        ],
                      }}
                      options={{ responsive: true, maintainAspectRatio: false }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-7">
              <div className="cw-card h-100">
                <div className="card-h">
                  <h6>Nuevos Clientes por Mes</h6>
                </div>
                <div className="card-b">
                  <div style={{ height: 240 }}>
                    <Bar
                      data={{
                        labels: charts.nuevos?.labels || [],
                        datasets: [
                          {
                            label: 'Nuevos clientes',
                            data: charts.nuevos?.data || [],
                            backgroundColor: '#0ea5e9',
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
            <div className="col-lg-4">
              <div className="cw-card h-100">
                <div className="card-h">
                  <h6>
                    <i className="bi bi-cake2 text-warning me-2"></i>Próximos Cumpleaños (30d)
                  </h6>
                </div>
                <div className="card-b">
                  {cumples.length === 0 ? (
                    <div className="text-muted small">Sin cumpleaños próximos.</div>
                  ) : (
                    <ul className="list-group list-group-flush">
                      {cumples.slice(0, 6).map((c: any) => (
                        <li
                          key={c.id}
                          className="list-group-item px-0 d-flex justify-content-between align-items-center"
                        >
                          <div>
                            <Link to={`/clientes/ficha/${c.id}`} className="fw-bold text-decoration-none">
                              {c.nombre}
                            </Link>
                            <div className="small text-muted">
                              {c.cumple_en === 0 ? '¡Hoy!' : `En ${c.cumple_en} días`}
                            </div>
                          </div>
                          {c.telefono && (
                            <a
                              href={whatsappLink(c.telefono, `¡Feliz cumpleaños ${c.nombre}!`)}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-sm btn-success py-0"
                            >
                              <i className="bi bi-whatsapp"></i>
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <div className="cw-card h-100">
                <div className="card-h">
                  <h6>
                    <i className="bi bi-exclamation-circle text-danger me-2"></i>Clientes en Riesgo
                  </h6>
                </div>
                <div className="card-b">
                  {riesgo.length === 0 ? (
                    <div className="text-muted small">Ningún cliente habitual en riesgo.</div>
                  ) : (
                    <ul className="list-group list-group-flush">
                      {riesgo.slice(0, 6).map((c: any) => (
                        <li
                          key={c.id}
                          className="list-group-item px-0 d-flex justify-content-between align-items-center"
                        >
                          <div>
                            <Link to={`/clientes/ficha/${c.id}`} className="fw-bold text-decoration-none">
                              {c.nombre}
                            </Link>
                            <div className="small text-muted">
                              {c.dias} días sin venir · {money(c.gastado)}
                            </div>
                          </div>
                          {c.telefono && (
                            <a
                              href={whatsappLink(
                                c.telefono,
                                `Hola ${c.nombre}, ¡te extrañamos en nuestro Carwash!`,
                              )}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-sm btn-outline-success py-0"
                            >
                              Recuperar
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <div className="cw-card h-100">
                <div className="card-h">
                  <h6>
                    <i className="bi bi-trophy text-primary me-2"></i>Top Clientes & Seguimientos
                  </h6>
                </div>
                <div className="card-b">
                  {top.slice(0, 5).map((c: any, idx: number) => (
                    <div key={c.id} className="d-flex align-items-center gap-2 mb-2">
                      <span className="rank">{idx + 1}</span>
                      <div className="flex-grow-1">
                        <Link to={`/clientes/ficha/${c.id}`} className="fw-bold small text-decoration-none">
                          {c.nombre}
                        </Link>
                        <div className="small text-muted">{c.visitas} visitas</div>
                      </div>
                      <span className="fw-bold small">{money(c.gastado)}</span>
                    </div>
                  ))}
                  {pend.length > 0 && (
                    <div className="mt-3 pt-2 border-top">
                      <div className="small fw-bold text-muted mb-1">Seguimientos pendientes:</div>
                      {pend.slice(0, 3).map((p: any) => (
                        <div key={p.id} className="small d-flex justify-content-between">
                          <span>{p.cliente}: {p.asunto}</span>
                          <span className="text-danger">{fdate(p.seguimiento_fecha)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
