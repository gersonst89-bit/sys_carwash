import React, { useEffect, useState } from 'react';
import { http, apiErrorMsg } from '../../api/http';

export const RespaldoDemoPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [resetForm, setResetForm] = useState({ confirmacion: '', password: '' });

  const cargar = async () => {
    try {
      const res = await http.get('/respaldo');
      setData(res.data);
    } catch (e) {
      setErr(apiErrorMsg(e));
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const cargarDemo = async () => {
    setLoading(true);
    setMsg('');
    setErr('');
    try {
      const { data: r } = await http.post('/demo/cargar', {});
      setMsg(`Datos de demostración cargados (${r.clientes} clientes, ${r.ordenes} órdenes).`);
      cargar();
    } catch (e) {
      setErr(apiErrorMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const quitarDemo = async () => {
    setLoading(true);
    setMsg('');
    setErr('');
    try {
      await http.post('/demo/quitar', {});
      setMsg('Datos de demostración eliminados correctamente.');
      cargar();
    } catch (e) {
      setErr(apiErrorMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const resetear = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setErr('');
    try {
      await http.post('/respaldo/resetear', resetForm);
      setMsg('Sistema reseteado exitosamente para nueva empresa.');
      setResetForm({ confirmacion: '', password: '' });
      cargar();
    } catch (error) {
      setErr(apiErrorMsg(error));
    }
  };

  return (
    <div className="container-fluid py-2">
      <h4 className="fw-bold mb-3">
        <i className="bi bi-database-check text-primary me-2"></i>Base de Datos, Datos Demo y Reset
      </h4>
      {msg && <div className="alert alert-success">{msg}</div>}
      {err && <div className="alert alert-danger">{err}</div>}

      <div className="row g-3">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h6 className="fw-bold">Estado de PostgreSQL</h6>
              <p className="text-muted small">Motor activo con Prisma ORM</p>
              <div className="d-flex justify-content-between py-2 border-bottom">
                <span>Tablas del esquema</span>
                <strong>{data?.stats?.tablas ?? 38}</strong>
              </div>
              <div className="d-flex justify-content-between py-2 border-bottom">
                <span>Registros principales</span>
                <strong>{data?.stats?.registros ?? 0}</strong>
              </div>
              <div className="d-flex justify-content-between py-2">
                <span>Motor</span>
                <span className="badge bg-primary">PostgreSQL 16+</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h6 className="fw-bold">Generador de Datos de Ejemplo ([DEMO])</h6>
              <p className="text-muted small">
                Pobla el sistema con clientes, vehículos, órdenes y gastos de prueba para explorar el Dashboard y CRM.
              </p>
              <div className="mb-3 small">
                <div>Clientes Demo: <b>{data?.demo?.clientes ?? 0}</b></div>
                <div>Órdenes Demo: <b>{data?.demo?.ordenes ?? 0}</b></div>
                <div>Gastos Demo: <b>{data?.demo?.gastos ?? 0}</b></div>
              </div>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-primary btn-sm"
                  disabled={loading}
                  onClick={cargarDemo}
                >
                  <i className="bi bi-magic me-1"></i>Cargar Datos Demo
                </button>
                <button
                  className="btn btn-outline-danger btn-sm"
                  disabled={loading || !data?.demo?.ordenes}
                  onClick={quitarDemo}
                >
                  <i className="bi bi-trash me-1"></i>Quitar Demo
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm border-danger h-100">
            <div className="card-body">
              <h6 className="fw-bold text-danger">Resetear para Empresa Nueva</h6>
              <p className="text-muted small">
                Vacía órdenes, clientes, caja y movimientos conservando tu catálogo y configuración.
              </p>
              <form onSubmit={resetear}>
                <input
                  className="form-control form-control-sm mb-2"
                  placeholder="Escribe RESETEAR"
                  value={resetForm.confirmacion}
                  onChange={(e) => setResetForm({ ...resetForm, confirmacion: e.target.value })}
                  required
                />
                <input
                  type="password"
                  className="form-control form-control-sm mb-2"
                  placeholder="Tu contraseña de administrador"
                  value={resetForm.password}
                  onChange={(e) => setResetForm({ ...resetForm, password: e.target.value })}
                  required
                />
                <button className="btn btn-danger btn-sm w-100" type="submit">
                  Confirmar Reset
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
