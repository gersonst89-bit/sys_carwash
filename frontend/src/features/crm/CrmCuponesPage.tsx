import React, { useState, useEffect } from 'react';
import { http, apiErrorMsg } from '../../api/http';
import { CrmNav } from './CrmNav';
import { money, fdate } from '../../utils/format';

export const CrmCuponesPage: React.FC = () => {
  const [data, setData] = useState<any>({ rows: [], clientes: [] });
  const [codigo, setCodigo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipo, setTipo] = useState('porcentaje');
  const [valor, setValor] = useState('10');
  const [clienteId, setClienteId] = useState('');
  const [vigenteHasta, setVigenteHasta] = useState('');
  const [usosMax, setUsosMax] = useState('1');

  const load = async () => {
    try {
      const res = await http.get('/crm/cupones');
      setData(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await http.post('/crm/cupones', {
        codigo,
        descripcion,
        tipo,
        valor: Number(valor),
        cliente_id: clienteId ? Number(clienteId) : null,
        vigente_hasta: vigenteHasta || null,
        usos_max: Number(usosMax),
      });
      setCodigo('');
      setDescripcion('');
      load();
    } catch (err) {
      alert(apiErrorMsg(err));
    }
  };

  const toggle = async (id: number) => {
    await http.patch(`/crm/cupones/${id}/toggle`);
    load();
  };

  return (
    <div>
      <div className="mb-2">
        <h4 className="page-title">CRM · Cupones Promocionales</h4>
        <p className="page-sub small">Crea códigos de descuento por porcentaje o monto fijo</p>
      </div>

      <CrmNav />

      <div className="row g-3">
        <div className="col-lg-4">
          <form onSubmit={handleSave} className="cw-card">
            <div className="card-h">
              <h6>Crear Cupón</h6>
            </div>
            <div className="card-b">
              <div className="mb-2">
                <label className="form-label">Código (vacío = autogenerar)</label>
                <input
                  type="text"
                  className="form-control form-control-sm text-uppercase"
                  placeholder="PROMO20"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                />
              </div>
              <div className="row g-2 mb-2">
                <div className="col-6">
                  <label className="form-label">Tipo</label>
                  <select
                    className="form-select form-select-sm"
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                  >
                    <option value="porcentaje">Porcentaje (%)</option>
                    <option value="monto">Monto fijo</option>
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label">Valor *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control form-control-sm"
                    required
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                  />
                </div>
              </div>
              <div className="mb-2">
                <label className="form-label">Descripción</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
              </div>
              <div className="mb-2">
                <label className="form-label">Exclusivo para cliente (opcional)</label>
                <select
                  className="form-select form-select-sm"
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                >
                  <option value="">-- Cualquier cliente --</option>
                  {(data.clientes || []).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="row g-2 mb-3">
                <div className="col-7">
                  <label className="form-label">Vence el</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={vigenteHasta}
                    onChange={(e) => setVigenteHasta(e.target.value)}
                  />
                </div>
                <div className="col-5">
                  <label className="form-label">Usos máx (0=ilim)</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={usosMax}
                    onChange={(e) => setUsosMax(e.target.value)}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-grad btn-sm w-100">
                Guardar cupón
              </button>
            </div>
          </form>
        </div>

        <div className="col-lg-8">
          <div className="cw-card">
            <div className="card-h">
              <h6>Cupones Registrados ({(data.rows || []).length})</h6>
            </div>
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Beneficio</th>
                    <th>Cliente</th>
                    <th>Usos</th>
                    <th>Vigencia</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(data.rows || []).map((k: any) => (
                    <tr key={k.id}>
                      <td>
                        <span className="bd-placa text-primary border-primary">{k.codigo}</span>
                        {k.descripcion && <div className="small text-muted">{k.descripcion}</div>}
                      </td>
                      <td className="fw-bold">
                        {k.tipo === 'porcentaje' ? `${Number(k.valor)}%` : money(k.valor)}
                      </td>
                      <td className="small">{k.cliente || 'Público'}</td>
                      <td className="small">
                        {k.usos} / {k.usos_max || '∞'}
                      </td>
                      <td className="small">{k.vigente_hasta ? fdate(k.vigente_hasta) : 'Sin venc.'}</td>
                      <td>
                        <span className={`badge badge-soft-${k.estado ? 'success' : 'secondary'}`}>
                          {k.estado ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-light border"
                          onClick={() => toggle(k.id)}
                        >
                          {k.estado ? 'Desactivar' : 'Activar'}
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
    </div>
  );
};
