import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { apiErrorMsg } from '../../api/http';

export const LoginPage: React.FC = () => {
  const { user, empresa, login, refreshMe, loading } = useAuthStore();
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    refreshMe();
  }, []);

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(usuario, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(apiErrorMsg(err, 'Credenciales inválidas.'));
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-hero">
        <div
          className="bubble"
          style={{ width: 90, height: 90, left: '12%', animationDuration: '14s' }}
        />
        <div
          className="bubble"
          style={{ width: 60, height: 60, left: '42%', animationDuration: '11s' }}
        />
        <div
          className="bubble"
          style={{ width: 130, height: 130, left: '75%', animationDuration: '18s' }}
        />
        <div className="d-flex align-items-center gap-3 mb-4">
          <div className="sb-logo" style={{ width: 56, height: 56, fontSize: '1.75rem' }}>
            {empresa.logo ? (
              <img src={`/uploads/${empresa.logo}`} alt="" />
            ) : (
              <i className="bi bi-droplet-half"></i>
            )}
          </div>
          <div>
            <h4 className="m-0 fw-extrabold">{empresa.nombre}</h4>
            <small className="opacity-75">CarWash Pro · Enterprise Edition</small>
          </div>
        </div>
        <h1>Gestiona tu Carwash con precisión y rapidez.</h1>
        <p className="mt-2 opacity-90 fs-6">
          Control total de órdenes de lavado, recepción digital con firma, tablero en vivo, CRM,
          fidelización, inventario, planilla e Inteligencia Artificial.
        </p>
        <div className="mt-3">
          <div className="feat">
            <i className="bi bi-activity"></i>
            <span>Tablero Kanban en vivo y recepción con checklist y firma</span>
          </div>
          <div className="feat">
            <i className="bi bi-heart-pulse"></i>
            <span>CRM 360°, puntos de fidelidad, cupones y encuestas CSAT</span>
          </div>
          <div className="feat">
            <i className="bi bi-stars"></i>
            <span>Asistente IA con análisis de datos y gráficos automáticos</span>
          </div>
        </div>
      </div>

      <div className="login-form-side">
        <div className="login-box">
          <div className="text-center mb-4">
            <div
              className="sb-logo mx-auto mb-3 d-lg-none"
              style={{ width: 54, height: 54, fontSize: '1.6rem' }}
            >
              <i className="bi bi-droplet-half"></i>
            </div>
            <h3 className="fw-extrabold mb-1">Bienvenido de nuevo</h3>
            <p className="text-muted small">Ingresa tus credenciales para acceder al panel</p>
          </div>

          {error && (
            <div className="alert alert-danger py-2 small d-flex align-items-center gap-2">
              <i className="bi bi-exclamation-triangle-fill"></i>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="cw-card p-4">
            <div className="mb-3">
              <label className="form-label">Usuario</label>
              <div className="input-ico">
                <i className="bi bi-person"></i>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Tu usuario"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Contraseña</label>
              <div className="input-ico">
                <i className="bi bi-lock"></i>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="form-control pe-5"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="toggle-pass"
                  onClick={() => setShowPass(!showPass)}
                  tabIndex={-1}
                >
                  <i className={`bi ${showPass ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-grad w-100 py-2 mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Ingresando...
                </>
              ) : (
                <>
                  Ingresar al sistema <i className="bi bi-arrow-right ms-1"></i>
                </>
              )}
            </button>

            <div className="mt-3 p-2 rounded-3 bg-light border text-center small text-muted">
              <i className="bi bi-key me-1 text-primary"></i>
              Demo: <b>admin</b> / <b>admin123</b>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
