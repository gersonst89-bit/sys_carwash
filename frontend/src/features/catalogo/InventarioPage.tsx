import React, { useState, useEffect } from 'react';
import { http, apiErrorMsg } from '../../api/http';
import { num, fdate } from '../../utils/format';

export const InventarioPage: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [filtroProd, setFiltroProd] = useState('');
  const [loading, setLoading] = useState(true);

  const [productoId, setProductoId] = useState('');
  const [tipo, setTipo] = useState('entrada');
  const [cantidad, setCantidad] = useState('1');
  const [motivo, setMotivo] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [iRes, pRes] = await Promise.all([
        http.get('/inventario', { params: { producto: filtroProd || undefined } }),
        http.get('/productos'),
      ]);
      setRows(Array.isArray(iRes.data) ? iRes.data : iRes.data.rows || []);
      setProductos(Array.isArray(pRes.data) ? pRes.data : pRes.data.rows || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filtroProd]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await http.post('/inventario/registrar', {
        producto_id: Number(productoId),
        tipo,
        cantidad: Number(cantidad),
        motivo,
      });
      setMotivo('');
      setCantidad('1');
      load();
    } catch (err) {
      alert(apiErrorMsg(err));
    }
  };

  return (
    <div>
      <div className="mb-3">
        <h4 className="page-title">
          <i className="bi bi-arrow-left-right me-2 text-primary"></i>Kardex y Movimientos de Inventario
        </h4>
        <p className="page-sub small">Registra entradas, salidas por consumo interno de lavado o ajustes</p>
      </div>

      <div className="row g-3">
        <div className="col-lg-4">
          <form onSubmit={handleSave} className="cw-card">
            <div className="card-h">
              <h6>Registrar Movimiento</h6>
            </div>
            <div className="card-b">
              <div className="mb-2">
                <label className="form-label">Producto / Insumo *</label>
                <select
                  className="form-select form-select-sm"
                  required
                  value={productoId}
                  onChange={(e) => setProductoId(e.target.value)}
                >
                  <option value="">-- Seleccionar --</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} (Stock: {num(p.stock)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="row g-2 mb-2">
                <div className="col-6">
                  <label className="form-label">Tipo</label>
                  <select
                    className="form-select form-select-sm"
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                  >
                    <option value="entrada">Entrada (+)</option>
                    <option value="salida">Salida / Consumo (-)</option>
                    <option value="ajuste">Ajuste stock final (=)</option>
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label">Cantidad *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control form-control-sm"
                    required
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">Motivo / Referencia</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Consumo patio de lavado..."
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-grad btn-sm w-100">
                Guardar movimiento
              </button>
            </div>
          </form>
        </div>

        <div className="col-lg-8">
          <div className="cw-card">
            <div className="card-h">
              <h6>Historial Kardex</h6>
              <select
                className="form-select form-select-sm"
                style={{ width: 220 }}
                value={filtroProd}
                onChange={(e) => setFiltroProd(e.target.value)}
              >
                <option value="">Todos los productos</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Producto</th>
                    <th>Tipo</th>
                    <th className="text-end">Cantidad</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-muted">
                        Cargando...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-muted">
                        Sin movimientos registrados.
                      </td>
                    </tr>
                  ) : (
                    rows.map((m) => (
                      <tr key={m.id}>
                        <td className="small text-muted">{fdate(m.created_at, true)}</td>
                        <td className="fw-semibold">{m.producto || m.producto_nombre}</td>
                        <td>
                          <span
                            className={`badge badge-soft-${
                              m.tipo === 'entrada'
                                ? 'success'
                                : m.tipo === 'salida'
                                ? 'danger'
                                : 'info'
                            }`}
                          >
                            {m.tipo}
                          </span>
                        </td>
                        <td className="text-end fw-bold">{num(m.cantidad)}</td>
                        <td className="small">{m.motivo || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
