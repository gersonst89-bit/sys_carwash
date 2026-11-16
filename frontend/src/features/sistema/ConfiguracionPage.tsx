import React, { useEffect, useState } from 'react';
import { http, apiErrorMsg } from '../../api/http';
import { useAuthStore } from '../../store/auth.store';

export const ConfiguracionPage: React.FC = () => {
  const { setEmpresa } = useAuthStore();
  const [form, setForm] = useState<any>({
    nombre: 'CarWash Pro',
    razon_social: '',
    ruc: '',
    direccion: '',
    telefono: '',
    email: '',
    web: '',
    moneda_codigo: 'PEN',
    moneda_simbolo: 'S/',
    simbolo_posicion: 'antes',
    decimales: 2,
    sep_decimal: '.',
    sep_miles: ',',
    impuesto_nombre: 'IGV',
    impuesto_porcentaje: 18,
    precios_incluyen_impuesto: 1,
    zona_horaria: 'America/Lima',
    formato_fecha: 'd/m/Y',
    prefijo_orden: 'OS-',
    pie_ticket: 'Gracias por su preferencia',
  });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    http.get('/configuracion').then((r) => setForm(r.data)).catch(() => {});
  }, []);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setErr('');
    try {
      const { data } = await http.put('/configuracion', form);
      setForm(data);
      setEmpresa(data);
      setMsg('Configuración de empresa guardada correctamente.');
    } catch (error) {
      setErr(apiErrorMsg(error));
    }
  };

  return (
    <div className="container-fluid py-2">
      <h4 className="fw-bold mb-3">
        <i className="bi bi-gear text-primary me-2"></i>Configuración de la Empresa
      </h4>
      {msg && <div className="alert alert-success">{msg}</div>}
      {err && <div className="alert alert-danger">{err}</div>}

      <form className="card border-0 shadow-sm" onSubmit={guardar}>
        <div className="card-body row g-3">
          <div className="col-md-4">
            <label className="form-label fw-semibold">Nombre Comercial</label>
            <input
              className="form-control"
              value={form.nombre || ''}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label fw-semibold">Razón Social</label>
            <input
              className="form-control"
              value={form.razon_social || ''}
              onChange={(e) => setForm({ ...form, razon_social: e.target.value })}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label fw-semibold">RUC / NIT</label>
            <input
              className="form-control"
              value={form.ruc || ''}
              onChange={(e) => setForm({ ...form, ruc: e.target.value })}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Dirección</label>
            <input
              className="form-control"
              value={form.direccion || ''}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label fw-semibold">Teléfono</label>
            <input
              className="form-control"
              value={form.telefono || ''}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label fw-semibold">Correo</label>
            <input
              className="form-control"
              value={form.email || ''}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <hr className="my-2" />
          <div className="col-md-2">
            <label className="form-label fw-semibold">Código Moneda</label>
            <input
              className="form-control"
              value={form.moneda_codigo || 'PEN'}
              onChange={(e) => setForm({ ...form, moneda_codigo: e.target.value })}
            />
          </div>
          <div className="col-md-2">
            <label className="form-label fw-semibold">Símbolo</label>
            <input
              className="form-control"
              value={form.moneda_simbolo || 'S/'}
              onChange={(e) => setForm({ ...form, moneda_simbolo: e.target.value })}
            />
          </div>
          <div className="col-md-2">
            <label className="form-label fw-semibold">Impuesto</label>
            <input
              className="form-control"
              value={form.impuesto_nombre || 'IGV'}
              onChange={(e) => setForm({ ...form, impuesto_nombre: e.target.value })}
            />
          </div>
          <div className="col-md-2">
            <label className="form-label fw-semibold">% Impuesto</label>
            <input
              type="number"
              step="0.01"
              className="form-control"
              value={form.impuesto_porcentaje ?? 18}
              onChange={(e) => setForm({ ...form, impuesto_porcentaje: Number(e.target.value) })}
            />
          </div>
          <div className="col-md-4 d-flex align-items-end">
            <div className="form-check form-switch mb-2">
              <input
                className="form-check-input"
                type="checkbox"
                checked={Boolean(form.precios_incluyen_impuesto)}
                onChange={(e) =>
                  setForm({ ...form, precios_incluyen_impuesto: e.target.checked ? 1 : 0 })
                }
              />
              <label className="form-check-label">Los precios ya incluyen impuesto</label>
            </div>
          </div>

          <div className="col-md-3">
            <label className="form-label fw-semibold">Prefijo de Orden</label>
            <input
              className="form-control"
              value={form.prefijo_orden || 'OS-'}
              onChange={(e) => setForm({ ...form, prefijo_orden: e.target.value })}
            />
          </div>
          <div className="col-md-9">
            <label className="form-label fw-semibold">Mensaje en pie de Ticket</label>
            <input
              className="form-control"
              value={form.pie_ticket || ''}
              onChange={(e) => setForm({ ...form, pie_ticket: e.target.value })}
            />
          </div>
        </div>
        <div className="card-footer bg-white text-end">
          <button className="btn btn-primary px-4" type="submit">
            <i className="bi bi-check2-circle me-1"></i>Guardar Cambios
          </button>
        </div>
      </form>
    </div>
  );
};
