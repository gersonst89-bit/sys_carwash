import React, { useState } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { http, apiErrorMsg } from '../../api/http';

export const PerfilPage: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const [nombre, setNombre] = useState(user?.nombre || '');
  const [email, setEmail] = useState(user?.email || '');
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const { data } = await http.put('/auth/perfil', {
        nombre,
        email,
        actual: actual || undefined,
        nueva: nueva || undefined,
        confirmar: confirmar || undefined,
      });
      if (data.user) {
        setUser(data.user, data.token);
      }
      setActual('');
      setNueva('');
      setConfirmar('');
      setMsg({ type: 'success', text: data.message || 'Perfil actualizado correctamente.' });
    } catch (err) {
      setMsg({ type: 'danger', text: apiErrorMsg(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 680 }}>
      <div className="mb-3">
        <h4 className="page-title">
          <i className="bi bi-person-gear me-2 text-primary"></i>Mi Perfil
        </h4>
        <p className="page-sub small">Actualiza tus datos personales y contraseña de acceso</p>
      </div>

      {msg && <div className={`alert alert-${msg.type} py-2`}>{msg.text}</div>}

      <form onSubmit={handleSubmit} className="cw-card">
        <div className="card-b">
          <div className="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom">
            <div className="avatar" style={{ width: 56, height: 56, fontSize: '1.4rem' }}>
              {(user?.nombre || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <h5 className="m-0 fw-bold">{user?.nombre}</h5>
              <div className="text-muted small">
                Usuario: <b>{user?.usuario}</b> · Rol: <span className="badge badge-soft-info">{user?.rol}</span>
              </div>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Nombre completo *</label>
              <input
                type="text"
                className="form-control"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Correo electrónico</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="col-12 mt-4">
              <h6 className="fw-bold mb-1">Cambiar contraseña (opcional)</h6>
              <small className="text-muted">Déjalo en blanco si no deseas cambiar tu contraseña actual.</small>
            </div>

            <div className="col-md-4">
              <label className="form-label">Contraseña actual</label>
              <input
                type="password"
                className="form-control"
                value={actual}
                onChange={(e) => setActual(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Nueva contraseña</label>
              <input
                type="password"
                className="form-control"
                value={nueva}
                onChange={(e) => setNueva(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Confirmar nueva</label>
              <input
                type="password"
                className="form-control"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 text-end">
            <button type="submit" className="btn btn-grad px-4" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
