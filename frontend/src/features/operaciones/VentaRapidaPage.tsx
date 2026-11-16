import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { http, apiErrorMsg } from '../../api/http';
import { useAuthStore } from '../../store/auth.store';
import { money, num, fdate } from '../../utils/format';

export const VentaRapidaPage: React.FC = () => {
  const { empresa } = useAuthStore();
  const [productos, setProductos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [hoy, setHoy] = useState<any[]>([]);
  const [tot, setTot] = useState<{ n: number; t: number }>({ n: 0, t: 0 });
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const [cart, setCart] = useState<Array<{ id: number; nombre: string; cant: number; precio: number; stock: number }>>([]);
  const [clienteId, setClienteId] = useState('');
  const [descuento, setDescuento] = useState(0);
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [recibido, setRecibido] = useState('');
  const [referencia, setReferencia] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await http.get('/ventas');
      setProductos(data.productos || []);
      setClientes(data.clientes || []);
      setHoy(data.hoy || []);
      setTot(data.tot || { n: 0, t: 0 });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addProd = (p: any) => {
    setCart((prev) => {
      const ex = prev.find((i) => i.id === p.id);
      if (ex) {
        return prev.map((i) => (i.id === p.id ? { ...i, cant: i.cant + 1 } : i));
      }
      return [
        ...prev,
        { id: p.id, nombre: p.nombre, cant: 1, precio: Number(p.precio_venta), stock: Number(p.stock) },
      ];
    });
  };

  const subtotal = useMemo(
    () => Math.round(cart.reduce((s, i) => s + i.cant * i.precio, 0) * 100) / 100,
    [cart],
  );
  const desc = Math.min(subtotal, Math.max(0, Number(descuento || 0)));
  const base = Math.max(0, subtotal - desc);
  const rate = Number(empresa.impuesto_porcentaje || 18) / 100;
  const total = empresa.precios_incluyen_impuesto ? base : Math.round((base + base * rate) * 100) / 100;
  const vuelto =
    metodoPago === 'efectivo' && Number(recibido || 0) > total
      ? Math.round((Number(recibido) - total) * 100) / 100
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setSaving(true);
    setMsg(null);
    try {
      const { data } = await http.post('/ventas', {
        cliente_id: clienteId ? Number(clienteId) : null,
        descuento: desc,
        metodo_pago: metodoPago,
        recibido: Number(recibido || 0),
        referencia,
        items: cart.map((i) => ({ id: i.id, cant: i.cant })),
      });
      setCart([]);
      setDescuento(0);
      setRecibido('');
      setReferencia('');
      setMsg({
        type: 'success',
        text: `Venta ${data.codigo} registrada por ${money(data.total)}${
          data.vuelto > 0 ? ` · Vuelto: ${money(data.vuelto)}` : ''
        }`,
      });
      load();
    } catch (err) {
      setMsg({ type: 'danger', text: apiErrorMsg(err) });
    } finally {
      setSaving(false);
    }
  };

  const filteredProds = productos.filter((p) => {
    if (!q.trim()) return true;
    const t = q.trim().toLowerCase();
    return (
      String(p.nombre || '').toLowerCase().includes(t) ||
      String(p.codigo || '').toLowerCase().includes(t)
    );
  });

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <h4 className="page-title">
            <i className="bi bi-basket3 me-2 text-primary"></i>Venta Rápida (POS Mostrador)
          </h4>
          <p className="page-sub small">Venta directa de accesorios, aromatizantes, bebidas e insumos</p>
        </div>
        <div className="mini-stat py-1 px-3">
          <span className="small text-muted">Ventas POS hoy:</span>
          <b className="text-primary ms-1">
            {tot.n} ({money(tot.t)})
          </b>
        </div>
      </div>

      {msg && <div className={`alert alert-${msg.type} py-2`}>{msg.text}</div>}

      <div className="row g-3">
        <div className="col-lg-7">
          <div className="cw-card mb-3">
            <div className="card-h">
              <div className="input-ico w-100">
                <i className="bi bi-upc-scan"></i>
                <input
                  type="search"
                  className="form-control ps-5"
                  placeholder="Buscar por nombre o código de barras (Enter para agregar)..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && filteredProds.length === 1) {
                      e.preventDefault();
                      addProd(filteredProds[0]);
                      setQ('');
                    }
                  }}
                />
              </div>
            </div>
            <div className="card-b">
              {loading ? (
                <div className="text-center py-4 text-muted">Cargando productos...</div>
              ) : (
                <div className="row g-2" style={{ maxHeight: 380, overflowY: 'auto' }}>
                  {filteredProds.map((p) => (
                    <div key={p.id} className="col-sm-6">
                      <div
                        className="pos-item d-flex justify-content-between align-items-center"
                        onClick={() => addProd(p)}
                      >
                        <div>
                          <div className="fw-bold small">{p.nombre}</div>
                          <small className="text-muted">
                            {p.codigo ? `[${p.codigo}] · ` : ''}Stock: {num(p.stock)} {p.unidad}
                          </small>
                        </div>
                        <span className="badge badge-soft-success fs-6">{money(p.precio_venta)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="cw-card">
            <div className="card-h">
              <h6>Últimas ventas rápidas de hoy</h6>
            </div>
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Hora</th>
                    <th>Cliente</th>
                    <th>Método</th>
                    <th className="text-end">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {hoy.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-3 text-muted">
                        Sin ventas rápidas hoy.
                      </td>
                    </tr>
                  ) : (
                    hoy.map((v) => (
                      <tr key={v.id}>
                        <td>
                          <Link to={`/ordenes/ver/${v.id}`} className="fw-bold text-decoration-none">
                            {v.codigo}
                          </Link>
                        </td>
                        <td className="small text-muted">{fdate(v.fecha_ingreso, true)}</td>
                        <td>{v.cliente || 'Cliente general'}</td>
                        <td>
                          <span className="badge badge-soft-info text-uppercase">{v.metodo_pago}</span>
                        </td>
                        <td className="text-end fw-bold">{money(v.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <form onSubmit={handleSubmit} className="cw-card">
            <div className="card-h">
              <h6>Carrito de Venta</h6>
              <span className="badge badge-soft-primary">{cart.length} productos</span>
            </div>
            <div className="card-b">
              <div className="mb-3">
                <label className="form-label">Cliente (opcional)</label>
                <select
                  className="form-select form-select-sm"
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                >
                  <option value="">-- Cliente General --</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-4 text-muted border rounded-3 mb-3 bg-light">
                  Selecciona productos de la izquierda
                </div>
              ) : (
                <table className="table table-sm align-middle mb-3">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th style={{ width: 80 }}>Cant.</th>
                      <th className="text-end">Importe</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((it) => (
                      <tr key={it.id}>
                        <td className="small fw-semibold">{it.nombre}</td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            className="form-control form-control-sm text-center"
                            value={it.cant}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              if (val <= 0) setCart(cart.filter((x) => x.id !== it.id));
                              else setCart(cart.map((x) => (x.id === it.id ? { ...x, cant: val } : x)));
                            }}
                          />
                        </td>
                        <td className="text-end fw-bold small">{money(it.cant * it.precio)}</td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm text-danger p-0"
                            onClick={() => setCart(cart.filter((x) => x.id !== it.id))}
                          >
                            <i className="bi bi-x-circle"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label">Método de pago</label>
                  <select
                    className="form-select form-select-sm"
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="yape_plin">Yape / Plin</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label">Descuento</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control form-control-sm"
                    value={descuento}
                    onChange={(e) => setDescuento(Number(e.target.value))}
                  />
                </div>
                {metodoPago === 'efectivo' && (
                  <div className="col-6">
                    <label className="form-label">Efectivo recibido</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control form-control-sm"
                      placeholder={String(total)}
                      value={recibido}
                      onChange={(e) => setRecibido(e.target.value)}
                    />
                  </div>
                )}
                <div className="col-6">
                  <label className="form-label">Referencia</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-3 rounded-3 bg-light border mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="fw-extrabold">TOTAL A COBRAR:</span>
                  <span className="fw-extrabold fs-4 text-primary">{money(total)}</span>
                </div>
                {vuelto > 0 && (
                  <div className="d-flex justify-content-between text-success fw-bold small mt-1">
                    <span>Vuelto a entregar:</span>
                    <span>{money(vuelto)}</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-grad w-100 py-2"
                disabled={saving || cart.length === 0}
              >
                {saving ? 'Cobrando...' : 'Cobrar y Registrar Venta'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
