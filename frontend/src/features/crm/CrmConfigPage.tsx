import React, { useState, useEffect } from 'react';
import { http, apiErrorMsg } from '../../api/http';
import { CrmNav } from './CrmNav';

export const CrmConfigPage: React.FC = () => {
  const [cfg, setCfg] = useState<any>({
    programa_activo: 1,
    monto_por_punto: 10,
    valor_punto: 0.5,
    puntos_minimo: 50,
    vip_visitas: 10,
    vip_monto: 1000,
    dias_riesgo: 45,
    dias_inactivo: 90,
    prefijo_pais: '51',
    msg_cumple: '',
    msg_riesgo: '',
    msg_encuesta: '',
  });
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null);

  useEffect(() => {
    http
      .get('/crm/config')
      .then((res) => setCfg(res.data?.cfg || res.data))
      .catch(console.error);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await http.put('/crm/config', cfg);
      setMsg({ type: 'success', text: 'Configuración CRM guardada correctamente.' });
    } catch (err) {
      setMsg({ type: 'danger', text: apiErrorMsg(err) });
    }
  };

  return (
    <div>
      <div className="mb-2">
        <h4 className="page-title">CRM · Reglas de Segmentación y Fidelización</h4>
        <p className="page-sub small">Configura los umbrales RFM, puntos y plantillas de WhatsApp</p>
      </div>

      <CrmNav />

      {msg && <div className={`alert alert-${msg.type} py-2`}>{msg.text}</div>}

      <form onSubmit={handleSave} className="cw-card">
        <div className="card-b">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Monto por 1 punto</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                value={cfg.monto_por_punto || 10}
                onChange={(e) => setCfg({ ...cfg, monto_por_punto: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Valor de cada punto en canje</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                value={cfg.valor_punto || 0.5}
                onChange={(e) => setCfg({ ...cfg, valor_punto: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Puntos mínimos para canjear</label>
              <input
                type="number"
                className="form-control"
                value={cfg.puntos_minimo || 50}
                onChange={(e) => setCfg({ ...cfg, puntos_minimo: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Prefijo telefónico país</label>
              <input
                type="text"
                className="form-control"
                value={cfg.prefijo_pais || '51'}
                onChange={(e) => setCfg({ ...cfg, prefijo_pais: e.target.value })}
              />
            </div>

            <div className="col-md-3">
              <label className="form-label">Visitas para ser VIP</label>
              <input
                type="number"
                className="form-control"
                value={cfg.vip_visitas || 10}
                onChange={(e) => setCfg({ ...cfg, vip_visitas: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Gasto acumulado VIP</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                value={cfg.vip_monto || 1000}
                onChange={(e) => setCfg({ ...cfg, vip_monto: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Días sin venir = En Riesgo</label>
              <input
                type="number"
                className="form-control"
                value={cfg.dias_riesgo || 45}
                onChange={(e) => setCfg({ ...cfg, dias_riesgo: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Días sin venir = Inactivo</label>
              <input
                type="number"
                className="form-control"
                value={cfg.dias_inactivo || 90}
                onChange={(e) => setCfg({ ...cfg, dias_inactivo: e.target.value })}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Plantilla Cumpleaños</label>
              <textarea
                className="form-control"
                rows={3}
                value={cfg.msg_cumple || ''}
                onChange={(e) => setCfg({ ...cfg, msg_cumple: e.target.value })}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Plantilla Cliente en Riesgo</label>
              <textarea
                className="form-control"
                rows={3}
                value={cfg.msg_riesgo || ''}
                onChange={(e) => setCfg({ ...cfg, msg_riesgo: e.target.value })}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Plantilla Encuesta ({'{enlace}'})</label>
              <textarea
                className="form-control"
                rows={3}
                value={cfg.msg_encuesta || ''}
                onChange={(e) => setCfg({ ...cfg, msg_encuesta: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-3 text-end">
            <button type="submit" className="btn btn-grad px-4">
              Guardar Configuración CRM
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
