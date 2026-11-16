import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { http } from '../../api/http';
import { CrmNav } from './CrmNav';
import { money, fdate, exportToCsv, whatsappLink } from '../../utils/format';

const SEGS = [
  { key: 'todos', label: 'Todos', icon: 'bi-people', color: '#0ea5e9' },
  { key: 'vip', label: 'VIP', icon: 'bi-gem', color: '#f59e0b' },
  { key: 'frecuente', label: 'Frecuentes', icon: 'bi-heart-fill', color: '#14b8a6' },
  { key: 'nuevo', label: 'Nuevos', icon: 'bi-stars', color: '#38bdf8' },
  { key: 'ocasional', label: 'Ocasionales', icon: 'bi-person-check', color: '#8b5cf6' },
  { key: 'en_riesgo', label: 'En Riesgo', icon: 'bi-exclamation-triangle', color: '#f43f5e' },
  { key: 'inactivo', label: 'Inactivos', icon: 'bi-moon', color: '#64748b' },
];

export const CrmSegmentosPage: React.FC = () => {
  const [seg, setSeg] = useState('todos');
  const [q, setQ] = useState('');
  const [data, setData] = useState<any>({ rows: [], count: {}, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    http
      .get('/crm/segmentos', { params: { seg, q: q || undefined } })
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [seg, q]);

  const rows = data.rows || [];
  const count = data.count || {};

  const handleExport = () => {
    exportToCsv(
      `segmento_${seg}`,
      ['Cliente', 'Teléfono', 'Correo', 'Segmento', 'Visitas', 'Gastado', 'Última visita', 'Puntos'],
      rows.map((r: any) => [
        r.nombre,
        r.telefono || '',
        r.email || '',
        r.segLabel || r.segmento,
        r.visitas,
        r.gastado,
        fdate(r.ultima),
        r.puntos,
      ]),
    );
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div>
          <h4 className="page-title">CRM · Segmentación Inteligente RFM</h4>
          <p className="page-sub small">Clasificación automática según frecuencia, gasto y antigüedad</p>
        </div>
        <button type="button" className="btn btn-light border btn-sm" onClick={handleExport}>
          <i className="bi bi-download me-1"></i> Exportar segmento CSV
        </button>
      </div>

      <CrmNav />

      <div className="row g-2 mb-3">
        {SEGS.map((s) => (
          <div key={s.key} className="col-6 col-md-3 col-lg">
            <div
              className={`seg-pill ${seg === s.key ? 'on' : ''}`}
              style={{ '--c': s.color } as React.CSSProperties}
              onClick={() => setSeg(s.key)}
            >
              <i className={`bi ${s.icon}`}></i>
              <b>{s.key === 'todos' ? data.total || 0 : count[s.key] || 0}</b>
              <span>{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="cw-card">
        <div className="card-h">
          <input
            type="search"
            className="form-control form-control-sm"
            style={{ maxWidth: 280 }}
            placeholder="Buscar cliente o teléfono..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <span className="text-muted small">{rows.length} clientes</span>
        </div>
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contacto</th>
                <th>Segmento</th>
                <th className="text-center">Visitas</th>
                <th className="text-end">Total Gastado</th>
                <th>Última Visita</th>
                <th className="text-center">Puntos</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted">
                    Cargando...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted">
                    No hay clientes en este segmento.
                  </td>
                </tr>
              ) : (
                rows.map((c: any) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/clientes/ficha/${c.id}`} className="fw-bold text-decoration-none">
                        {c.nombre}
                      </Link>
                    </td>
                    <td>
                      {c.telefono ? (
                        <a
                          href={whatsappLink(c.telefono)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-success text-decoration-none small fw-semibold"
                        >
                          <i className="bi bi-whatsapp me-1"></i>
                          {c.telefono}
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <span
                        className="seg-badge"
                        style={{ '--c': c.segColor || '#0ea5e9' } as React.CSSProperties}
                      >
                        {c.segLabel || c.segmento}
                      </span>
                    </td>
                    <td className="text-center fw-bold">{c.visitas}</td>
                    <td className="text-end fw-bold">{money(c.gastado)}</td>
                    <td className="small text-muted">
                      {c.ultima ? `${fdate(c.ultima)} (${c.dias}d)` : 'Sin visitas'}
                    </td>
                    <td className="text-center">
                      <span className="badge badge-soft-warning">{c.puntos} pts</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
