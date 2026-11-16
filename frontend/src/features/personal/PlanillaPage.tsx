import React, { useState, useEffect } from 'react';
import { http, apiErrorMsg } from '../../api/http';
import { money, fdate, todayYmd } from '../../utils/format';

export const PlanillaPage: React.FC = () => {
  const [mes, setMes] = useState(todayYmd().slice(0, 7));
  const [data, setData] = useState<any>({ rows: [], adelantos: [] });
  const [loading, setLoading] = useState(true);
  const [boletaModal, setBoletaModal] = useState<any>(null);

  const [empId, setEmpId] = useState('');
  const [montoAd, setMontoAd] = useState('');
  const [motivoAd, setMotivoAd] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await http.get('/planilla', { params: { mes } });
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [mes]);

  const pagar = async (empleado_id?: number) => {
    try {
      await http.post('/planilla/pagar', {
        mes,
        empleado_id: empleado_id || undefined,
      });
      load();
    } catch (err) {
      alert(apiErrorMsg(err));
    }
  };

  const registrarAdelanto = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await http.post('/planilla/adelanto', {
        empleado_id: Number(empId),
        monto: Number(montoAd),
        motivo: motivoAd,
      });
      setMontoAd('');
      setMotivoAd('');
      load();
    } catch (err) {
      alert(apiErrorMsg(err));
    }
  };

  const verBoleta = async (planillaId: number) => {
    const res = await http.get(`/planilla/boleta/${planillaId}`);
    setBoletaModal(res.data);
  };

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <h4 className="page-title">
            <i className="bi bi-cash-stack me-2 text-primary"></i>Planilla Mensual y Adelantos
          </h4>
          <p className="page-sub small">
            Cálculo automático de sueldo base + comisiones - faltas - tardanzas - adelantos
          </p>
        </div>
        <div className="d-flex gap-2">
          <input
            type="month"
            className="form-control form-control-sm"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
          />
          <button type="button" className="btn btn-grad btn-sm" onClick={() => pagar()}>
            Procesar y Pagar Toda la Planilla
          </button>
        </div>
      </div>

      <div className="cw-card mb-4">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th>Empleado</th>
                <th className="text-end">Sueldo Base</th>
                <th className="text-end">+ Comisiones</th>
                <th className="text-end">- Desc. Faltas/Tard.</th>
                <th className="text-end">- Adelantos</th>
                <th className="text-end">Neto a Pagar</th>
                <th>Estado</th>
                <th className="text-end">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-4 text-muted">
                    Calculando planilla...
                  </td>
                </tr>
              ) : (
                (data.rows || []).map((r: any) => (
                  <tr key={r.id}>
                    <td>
                      <div className="fw-bold">{r.nombre}</div>
                      <small className="text-muted">{r.cargo}</small>
                    </td>
                    <td className="text-end">{money(r.sueldo)}</td>
                    <td className="text-end text-success">+{money(r.comisiones || 0)}</td>
                    <td className="text-end text-danger">
                      -{money(Number(r.desc_faltas || 0) + Number(r.desc_tardanza || 0))}
                    </td>
                    <td className="text-end text-danger">-{money(r.adelantos || 0)}</td>
                    <td className="text-end fw-extrabold text-primary fs-6">{money(r.neto)}</td>
                    <td>
                      {r.planilla_id ? (
                        <span className="badge badge-soft-success">Pagada</span>
                      ) : (
                        <span className="badge badge-soft-warning">Pendiente</span>
                      )}
                    </td>
                    <td className="text-end">
                      {r.planilla_id ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-light border"
                          onClick={() => verBoleta(r.planilla_id)}
                        >
                          <i className="bi bi-printer me-1"></i>Boleta
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => pagar(r.id)}
                        >
                          Pagar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-md-5">
          <form onSubmit={registrarAdelanto} className="cw-card">
            <div className="card-h">
              <h6>Registrar Adelanto de Sueldo</h6>
            </div>
            <div className="card-b">
              <div className="mb-2">
                <label className="form-label">Empleado *</label>
                <select
                  className="form-select form-select-sm"
                  required
                  value={empId}
                  onChange={(e) => setEmpId(e.target.value)}
                >
                  <option value="">-- Seleccionar --</option>
                  {(data.rows || []).map((e: any) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-2">
                <label className="form-label">Monto *</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control form-control-sm"
                  required
                  value={montoAd}
                  onChange={(e) => setMontoAd(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Motivo</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={motivoAd}
                  onChange={(e) => setMotivoAd(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-outline-primary btn-sm w-100">
                Registrar Adelanto
              </button>
            </div>
          </form>
        </div>

        <div className="col-md-7">
          <div className="cw-card">
            <div className="card-h">
              <h6>Adelantos del Mes</h6>
            </div>
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Empleado</th>
                    <th>Motivo</th>
                    <th className="text-end">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.adelantos || []).map((a: any) => (
                    <tr key={a.id}>
                      <td>{fdate(a.fecha)}</td>
                      <td className="fw-semibold">{a.empleado}</td>
                      <td>{a.motivo || '-'}</td>
                      <td className="text-end fw-bold">{money(a.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {boletaModal && (
        <div className="cw-modal-backdrop" onClick={() => setBoletaModal(null)}>
          <div className="cw-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cw-modal-header no-print">
              <h5>Boleta de Pago · {boletaModal.p?.periodo || mes}</h5>
              <button type="button" className="btn-close" onClick={() => setBoletaModal(null)}></button>
            </div>
            <div className="cw-modal-body">
              <h5 className="fw-bold">{boletaModal.p?.nombre || boletaModal.empleado}</h5>
              <p className="text-muted small">
                Cargo: {boletaModal.p?.cargo} · Periodo: {boletaModal.p?.periodo}
              </p>
              <table className="table table-sm">
                <tbody>
                  <tr>
                    <td>Sueldo Básico</td>
                    <td className="text-end">{money(boletaModal.p?.sueldo)}</td>
                  </tr>
                  <tr>
                    <td>(+) Comisiones</td>
                    <td className="text-end text-success">{money(boletaModal.p?.comisiones)}</td>
                  </tr>
                  <tr>
                    <td>(-) Descuento por Faltas ({boletaModal.p?.faltas || 0})</td>
                    <td className="text-end text-danger">-{money(boletaModal.p?.desc_faltas)}</td>
                  </tr>
                  <tr>
                    <td>(-) Descuento por Tardanzas</td>
                    <td className="text-end text-danger">-{money(boletaModal.p?.desc_tardanza)}</td>
                  </tr>
                  <tr>
                    <td>(-) Adelantos de sueldo</td>
                    <td className="text-end text-danger">-{money(boletaModal.p?.adelantos)}</td>
                  </tr>
                  <tr className="fw-extrabold fs-5">
                    <td>NETO PAGADO</td>
                    <td className="text-end text-primary">{money(boletaModal.p?.neto)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="cw-modal-footer no-print">
              <button type="button" className="btn btn-light" onClick={() => setBoletaModal(null)}>
                Cerrar
              </button>
              <button type="button" className="btn btn-grad" onClick={() => window.print()}>
                Imprimir Boleta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
