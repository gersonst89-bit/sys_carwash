import React, { useState, useEffect } from 'react';
import { http, apiErrorMsg } from '../../api/http';
import { money, fdate, todayYmd } from '../../utils/format';

export const ComprasPage: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'list' | 'new' | 'view'>('list');
  const [currentCompra, setCurrentCompra] = useState<any>(null);

  const [proveedorId, setProveedorId] = useState('');
  const [fecha, setFecha] = useState(todayYmd());
  const [nroDoc, setNroDoc] = useState('');
  const [condicion, setCondicion] = useState('contado');
  const [vence, setVence] = useState('');
  const [adelanto, setAdelanto] = useState('0');
  const [notas, setNotas] = useState('');
  const [items, setItems] = useState<Array<{ producto_id: number; nombre: string; cantidad: number; costo: number }>>([]);

  const load = async () => {
    setLoading(true);
    try {
      const [cRes, prRes, pRes] = await Promise.all([
        http.get('/compras'),
        http.get('/proveedores'),
        http.get('/productos'),
      ]);
      setRows(Array.isArray(cRes.data) ? cRes.data : cRes.data.rows || []);
      setProveedores(Array.isArray(prRes.data) ? prRes.data : prRes.data.rows || []);
      setProductos(Array.isArray(pRes.data) ? pRes.data : pRes.data.rows || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const verCompra = async (id: number) => {
    const { data } = await http.get(`/compras/${id}`);
    setCurrentCompra(data);
    setMode('view');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('Agrega al menos un producto a la compra.');
      return;
    }
    try {
      await http.post('/compras', {
        proveedor_id: proveedorId ? Number(proveedorId) : null,
        fecha,
        nro_doc: nroDoc,
        condicion,
        vence: vence || null,
        adelanto: Number(adelanto || 0),
        notas,
        items,
      });
      setItems([]);
      setMode('list');
      load();
    } catch (err) {
      alert(apiErrorMsg(err));
    }
  };

  const total = items.reduce((s, i) => s + i.cantidad * i.costo, 0);

  if (mode === 'new') {
    return (
      <div>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h4 className="page-title">Registrar Compra de Mercadería / Insumos</h4>
            <p className="page-sub small">Incrementa automáticamente el stock y actualiza el costo</p>
          </div>
          <button type="button" className="btn btn-light border btn-sm" onClick={() => setMode('list')}>
            Cancelar
          </button>
        </div>

        <form onSubmit={handleSave} className="cw-card">
          <div className="card-b">
            <div className="row g-3 mb-3">
              <div className="col-md-4">
                <label className="form-label">Proveedor</label>
                <select
                  className="form-select"
                  value={proveedorId}
                  onChange={(e) => setProveedorId(e.target.value)}
                >
                  <option value="">-- Proveedor varios --</option>
                  {proveedores.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Fecha compra</label>
                <input
                  type="date"
                  className="form-control"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">N° Factura / Doc.</label>
                <input
                  type="text"
                  className="form-control"
                  value={nroDoc}
                  onChange={(e) => setNroDoc(e.target.value)}
                />
              </div>
              <div className="col-md-2">
                <label className="form-label">Condición</label>
                <select
                  className="form-select"
                  value={condicion}
                  onChange={(e) => setCondicion(e.target.value)}
                >
                  <option value="contado">Contado</option>
                  <option value="credito">Crédito</option>
                </select>
              </div>
              {condicion === 'credito' && (
                <>
                  <div className="col-md-4">
                    <label className="form-label">Fecha vencimiento</label>
                    <input
                      type="date"
                      className="form-control"
                      value={vence}
                      onChange={(e) => setVence(e.target.value)}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Abono inicial</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={adelanto}
                      onChange={(e) => setAdelanto(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="row g-3">
              <div className="col-md-5">
                <h6 className="fw-bold">Elegir Producto</h6>
                <div className="row g-2" style={{ maxHeight: 280, overflowY: 'auto' }}>
                  {productos.map((p) => (
                    <div key={p.id} className="col-12">
                      <div
                        className="pos-item d-flex justify-content-between py-2"
                        onClick={() =>
                          setItems([
                            ...items,
                            {
                              producto_id: p.id,
                              nombre: p.nombre,
                              cantidad: 1,
                              costo: Number(p.precio_compra || 0),
                            },
                          ])
                        }
                      >
                        <span className="small fw-semibold">{p.nombre}</span>
                        <span className="badge badge-soft-info">{money(p.precio_compra)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="col-md-7">
                <h6 className="fw-bold">Detalle de Compra</h6>
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th style={{ width: 90 }}>Cantidad</th>
                      <th style={{ width: 110 }}>Costo Unit.</th>
                      <th className="text-end">Subtotal</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="small">{it.nombre}</td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className="form-control form-control-sm"
                            value={it.cantidad}
                            onChange={(e) =>
                              setItems(
                                items.map((x, i) =>
                                  i === idx ? { ...x, cantidad: Number(e.target.value) } : x,
                                ),
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className="form-control form-control-sm"
                            value={it.costo}
                            onChange={(e) =>
                              setItems(
                                items.map((x, i) =>
                                  i === idx ? { ...x, costo: Number(e.target.value) } : x,
                                ),
                              )
                            }
                          />
                        </td>
                        <td className="text-end fw-bold small">{money(it.cantidad * it.costo)}</td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm text-danger p-0"
                            onClick={() => setItems(items.filter((_, i) => i !== idx))}
                          >
                            <i className="bi bi-x-circle"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="d-flex justify-content-between p-2 bg-light rounded border">
                  <span className="fw-bold">TOTAL COMPRA:</span>
                  <span className="fw-extrabold fs-5 text-primary">{money(total)}</span>
                </div>
                <button type="submit" className="btn btn-grad w-100 mt-3">
                  Guardar Compra e Ingresar Stock
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    );
  }

  if (mode === 'view' && currentCompra) {
    const c = currentCompra.c || currentCompra;
    const det = currentCompra.det || currentCompra.detalles || [];
    return (
      <div>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="page-title">Compra #{c.id}</h4>
          <button type="button" className="btn btn-light border btn-sm" onClick={() => setMode('list')}>
            Volver
          </button>
        </div>
        <div className="cw-card">
          <div className="card-b">
            <p className="small text-muted">
              Proveedor: <b>{c.proveedor || '-'}</b> · Doc: <b>{c.nro_doc || '-'}</b> · Fecha:{' '}
              {fdate(c.fecha)}
            </p>
            <table className="table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th className="text-end">Costo</th>
                  <th className="text-end">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {det.map((d: any) => (
                  <tr key={d.id}>
                    <td>{d.producto || d.producto_nombre}</td>
                    <td>{Number(d.cantidad)}</td>
                    <td className="text-end">{money(d.costo)}</td>
                    <td className="text-end fw-bold">{money(d.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="page-title">
            <i className="bi bi-bag-plus me-2 text-primary"></i>Compras a Proveedores
          </h4>
          <p className="page-sub small">Abastecimiento de almacén al contado o crédito</p>
        </div>
        <button type="button" className="btn btn-grad btn-sm px-3" onClick={() => setMode('new')}>
          <i className="bi bi-plus-lg me-1"></i> Nueva compra
        </button>
      </div>

      <div className="cw-card">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Fecha</th>
                <th>Proveedor</th>
                <th>Documento</th>
                <th>Condición</th>
                <th className="text-end">Pagado</th>
                <th className="text-end">Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-4 text-muted">
                    Cargando...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-4 text-muted">
                    Sin compras registradas.
                  </td>
                </tr>
              ) : (
                rows.map((c) => (
                  <tr key={c.id}>
                    <td>#{c.id}</td>
                    <td>{fdate(c.fecha)}</td>
                    <td className="fw-bold">{c.proveedor || 'Proveedor varios'}</td>
                    <td>{c.nro_doc || '-'}</td>
                    <td>
                      <span
                        className={`badge badge-soft-${
                          c.condicion === 'credito' ? 'warning' : 'success'
                        }`}
                      >
                        {c.condicion}
                      </span>
                    </td>
                    <td className="text-end">{money(c.pagado)}</td>
                    <td className="text-end fw-bold">{money(c.total)}</td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-light border"
                        onClick={() => verCompra(c.id)}
                      >
                        Ver
                      </button>
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
