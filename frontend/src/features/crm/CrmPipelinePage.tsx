import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { http, apiErrorMsg } from '../../api/http';
import { CrmNav } from './CrmNav';
import { money } from '../../utils/format';

const ETAPAS = [
  { key: 'nuevo', label: 'Nuevos', color: '#0ea5e9' },
  { key: 'contactado', label: 'Contactados', color: '#8b5cf6' },
  { key: 'propuesta', label: 'Propuesta', color: '#f59e0b' },
  { key: 'ganado', label: 'Ganados', color: '#22c55e' },
  { key: 'perdido', label: 'Perdidos', color: '#f43f5e' },
];

export const CrmPipelinePage: React.FC = () => {
  const navigate = useNavigate();
  const [ops, setOps] = useState<Record<string, any[]>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({
    nombre: '',
    telefono: '',
    email: '',
    interes: '',
    origen: 'WhatsApp',
    valor_est: 0,
    notas: '',
  });

  const load = async () => {
    try {
      const { data } = await http.get('/crm/pipeline');
      setOps(data.ops || {});
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
      if (formData.id) await http.put(`/crm/oportunidades/${formData.id}`, formData);
      else await http.post('/crm/oportunidades', formData);
      setModalOpen(false);
      load();
    } catch (err) {
      alert(apiErrorMsg(err));
    }
  };

  const mover = async (id: number, etapa: string) => {
    try {
      await http.patch(`/crm/oportunidades/${id}/mover`, { etapa });
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const convertir = async (id: number) => {
    try {
      const { data } = await http.post(`/crm/oportunidades/${id}/convertir`);
      if (data.cliente_id) navigate(`/clientes/ficha/${data.cliente_id}`);
      else load();
    } catch (err) {
      alert(apiErrorMsg(err));
    }
  };

  const eliminar = async (id: number) => {
    if (!window.confirm('¿Eliminar oportunidad?')) return;
    await http.delete(`/crm/oportunidades/${id}`);
    load();
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div>
          <h4 className="page-title">CRM · Pipeline de Oportunidades (Flotas y Convenios)</h4>
          <p className="page-sub small">Embudo Kanban para prospectos corporativos, membresías y detailing</p>
        </div>
        <button
          type="button"
          className="btn btn-grad btn-sm px-3"
          onClick={() => {
            setFormData({
              nombre: '',
              telefono: '',
              email: '',
              interes: '',
              origen: 'WhatsApp',
              valor_est: 0,
              notas: '',
            });
            setModalOpen(true);
          }}
        >
          <i className="bi bi-plus-lg me-1"></i> Nueva oportunidad
        </button>
      </div>

      <CrmNav />

      <div className="kanban">
        {ETAPAS.map((st) => {
          const list = ops[st.key] || [];
          const sum = list.reduce((s, o) => s + Number(o.valor_est || 0), 0);
          return (
            <div key={st.key} className="kb-col">
              <div className="kb-h" style={{ '--c': st.color } as React.CSSProperties}>
                <div className="d-flex justify-content-between align-items-center">
                  <b className="small">{st.label}</b>
                  <span className="badge bg-white text-dark border">{list.length}</span>
                </div>
                <span>{money(sum)}</span>
              </div>

              {list.map((o: any) => (
                <div key={o.id} className="kb-card">
                  <div className="d-flex justify-content-between">
                    <b className="small">{o.nombre}</b>
                    <span className="fw-bold small text-primary">{money(o.valor_est)}</span>
                  </div>
                  {o.interes && <div className="small text-muted">{o.interes}</div>}
                  {o.telefono && <div className="small text-muted">Tel: {o.telefono}</div>}

                  <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
                    <select
                      className="form-select form-select-sm py-0 px-1"
                      style={{ fontSize: '0.72rem', width: 105, height: 24 }}
                      value={o.etapa}
                      onChange={(e) => mover(o.id, e.target.value)}
                    >
                      {ETAPAS.map((et) => (
                        <option key={et.key} value={et.key}>
                          {et.label}
                        </option>
                      ))}
                    </select>
                    <div className="d-flex gap-1">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-success py-0 px-1"
                        title="Convertir en cliente"
                        onClick={() => convertir(o.id)}
                      >
                        <i className="bi bi-person-check"></i>
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger py-0 px-1"
                        onClick={() => eliminar(o.id)}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <div className="cw-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="cw-modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSave}>
              <div className="cw-modal-header">
                <h5>Nueva Oportunidad Comercial</h5>
                <button type="button" className="btn-close" onClick={() => setModalOpen(false)}></button>
              </div>
              <div className="cw-modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Nombre / Empresa *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Teléfono</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Servicio de interés</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej: Lavado de flota 10 camionetas"
                      value={formData.interes}
                      onChange={(e) => setFormData({ ...formData, interes: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Valor estimado</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={formData.valor_est}
                      onChange={(e) => setFormData({ ...formData, valor_est: e.target.value })}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Notas</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={formData.notas}
                      onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="cw-modal-footer">
                <button type="button" className="btn btn-light" onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-grad">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
