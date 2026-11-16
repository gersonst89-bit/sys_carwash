import React, { useState, useEffect } from 'react';
import { http, apiErrorMsg } from '../../api/http';
import { CrmNav } from './CrmNav';
import { money, fdate } from '../../utils/format';

export const CrmFidelidadPage: React.FC = () => {
  const [data, setData] = useState<any>({ cfg: {}, rank: [], mov: [], cl: [] });
  const [clienteId, setClienteId] = useState('');
  const [puntos, setPuntos] = useState('50');
  const [ajClienteId, setAjClienteId] = useState('');
  const [ajPuntos, setAjPuntos] = useState('');
  const [ajDetalle, setAjDetalle] = useState('');
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null);

  const load = async () => {
    try {
      const res = await http.get('/crm/fidelidad');
      setData(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const canjear = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await http.post('/crm/fidelidad/canjear', {
        cliente_id: Number(clienteId),
        puntos: Number(puntos),
      });
      setMsg({
        type: 'success',
        text: res.data.message || `Canje exitoso: Cupón ${res.data.codigo} generado.`,
      });
      load();
    } catch (err) {
      setMsg({ type: 'danger', text: apiErrorMsg(err) });
    }
  };

  const ajustar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await http.post('/crm/fidelidad/ajustar', {
        cliente_id: Number(ajClienteId),
        puntos: Number(ajPuntos),
        detalle: ajDetalle,
      });
      setAjPuntos('');
      setAjDetalle('');
      setMsg({ type: 'success', text: 'Ajuste de puntos registrado.' });
      load();
    } catch (err) {
      setMsg({ type: 'danger', text: apiErrorMsg(err) });
    }
  };

  return (
    <div>
      <div className="mb-2">
        <h4 className="page-title">CRM · Programa de Puntos y Fidelización</h4>
        <p className="page-sub small">
          Cada {money(data.cfg?.monto_por_punto || 10)} en compras otorga 1 punto · Valor de canje:{' '}
          {money(data.cfg?.valor_punto || 0.5)} por punto
        </p>
      </div>

      <CrmNav />

      {msg && <div className={`alert alert-${msg.type} py-2`}>{msg.text}</div>}

      <div className="row g-3">
        <div className="col-lg-5">
          <form onSubmit={canjear} className="cw-card mb-3">
            <div className="card-h">
              <h6>Canjear Puntos por Cupón de Descuento</h6>
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
                  {(data.cl || []).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} ({c.puntos} pts)
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">
                  Puntos a canjear (mín. {data.cfg?.puntos_minimo || 50})
                </label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  required
                  value={puntos}
                  onChange={(e) => setPuntos(e.target.value)}
                />
                <small className="text-muted">
                  Equivale a un cupón de{' '}
                  <b>{money(Number(puntos || 0) * Number(data.cfg?.valor_punto || 0.5))}</b>
                </small>
              </div>
              <button type="submit" className="btn btn-grad btn-sm w-100">
                Canjear y Generar Cupón
              </button>
            </div>
          </form>

          <form onSubmit={ajustar} className="cw-card">
            <div className="card-h">
              <h6>Ajuste Manual de Puntos (+/-)</h6>
            </div>
            <div className="card-b">
              <div className="mb-2">
                <label className="form-label">Cliente *</label>
                <select
                  className="form-select form-select-sm"
                  required
                  value={ajClienteId}
                  onChange={(e) => setAjClienteId(e.target.value)}
                >
                  <option value="">-- Seleccionar --</option>
                  {(data.cl || []).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="row g-2 mb-3">
                <div className="col-5">
                  <label className="form-label">Puntos (+/-)</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    placeholder="Ej: 100 o -20"
                    required
                    value={ajPuntos}
                    onChange={(e) => setAjPuntos(e.target.value)}
                  />
                </div>
                <div className="col-7">
                  <label className="form-label">Motivo</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Bono bienvenida..."
                    value={ajDetalle}
                    onChange={(e) => setAjDetalle(e.target.value)}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-outline-primary btn-sm w-100">
                Registrar Ajuste
              </button>
            </div>
          </form>
        </div>

        <div className="col-lg-7">
          <div className="cw-card mb-3">
            <div className="card-h">
              <h6>Ranking de Clientes con Más Puntos</h6>
            </div>
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Cliente</th>
                    <th className="text-center">Visitas</th>
                    <th className="text-end">Puntos Disponibles</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.rank || []).map((c: any, i: number) => (
                    <tr key={c.id}>
                      <td>
                        <span className="rank">{i + 1}</span>
                      </td>
                      <td className="fw-semibold">{c.nombre}</td>
                      <td className="text-center">{c.visitas}</td>
                      <td className="text-end">
                        <span className="badge badge-soft-warning fs-6">{c.puntos} pts</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="cw-card">
            <div className="card-h">
              <h6>Últimos Movimientos de Puntos</h6>
            </div>
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Detalle</th>
                    <th className="text-end">Puntos</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.mov || []).map((m: any) => (
                    <tr key={m.id}>
                      <td className="small text-muted">{fdate(m.created_at, true)}</td>
                      <td className="fw-semibold">{m.cliente}</td>
                      <td className="small">{m.detalle}</td>
                      <td
                        className={`text-end fw-bold ${
                          Number(m.puntos) >= 0 ? 'text-success' : 'text-danger'
                        }`}
                      >
                        {Number(m.puntos) >= 0 ? `+${m.puntos}` : m.puntos}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
