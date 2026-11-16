import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { http, apiErrorMsg } from '../../api/http';
import { useAuthStore } from '../../store/auth.store';
import { money, num } from '../../utils/format';

interface OrderItem {
  key: string;
  tipo: 'servicio' | 'producto';
  id: number;
  nombre: string;
  cant: number;
  precio: number;
}

export const NuevaOrdenPage: React.FC = () => {
  const { empresa } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [cat, setCat] = useState<any>({
    servicios: [],
    precios: {},
    productos: [],
    clientes: [],
    vehiculos: [],
    empleados: [],
    tipos: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [clienteId, setClienteId] = useState<string>('');
  const [nuevoCliente, setNuevoCliente] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');
  const [vehiculoId, setVehiculoId] = useState<string>('');
  const [nuevaPlaca, setNuevaPlaca] = useState('');
  const [nuevaMarca, setNuevaMarca] = useState('');
  const [tipoVehiculoId, setTipoVehiculoId] = useState<string>('');
  const [empleadoId, setEmpleadoId] = useState<string>('');

  const [paquetesDisp, setPaquetesDisp] = useState<any[]>([]);
  const [clientePaqueteId, setClientePaqueteId] = useState<string>('');
  const [cuponCodigo, setCuponCodigo] = useState('');
  const [cuponMsg, setCuponMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [descuento, setDescuento] = useState<number>(0);

  const [items, setItems] = useState<OrderItem[]>([]);
  const [searchItem, setSearchItem] = useState('');
  const [tabCatalog, setTabCatalog] = useState<'servicios' | 'productos'>('servicios');
  const [pagado, setPagado] = useState(true);
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [montoPago, setMontoPago] = useState<string>('');
  const [propina, setPropina] = useState<string>('0');
  const [referencia, setReferencia] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const citaParam = searchParams.get('cita') || '';
  const cotizacionParam = searchParams.get('cotizacion') || '';
  const recepcionParam = searchParams.get('recepcion') || '';

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await http.get('/ordenes/catalogos', {
          params: {
            cita: citaParam || undefined,
            cotizacion: cotizacionParam || undefined,
            recepcion: recepcionParam || undefined,
          },
        });
        setCat(data);

        if (data.cita) {
          if (data.cita.cliente_id) setClienteId(String(data.cita.cliente_id));
          if (data.cita.vehiculo_id) setVehiculoId(String(data.cita.vehiculo_id));
          if (data.cita.servicio_id) {
            const s = data.servicios.find((x: any) => x.id === data.cita.servicio_id);
            if (s) {
              setItems([
                {
                  key: `servicio-${s.id}`,
                  tipo: 'servicio',
                  id: s.id,
                  nombre: s.nombre,
                  cant: 1,
                  precio: Number(s.precio),
                },
              ]);
            }
          }
        } else if (data.cotizacion) {
          if (data.cotizacion.cliente_id) setClienteId(String(data.cotizacion.cliente_id));
          if (data.cotizacion.placa) setNuevaPlaca(data.cotizacion.placa);
          if (data.cotizacion.tipo_vehiculo_id) setTipoVehiculoId(String(data.cotizacion.tipo_vehiculo_id));
          if (Array.isArray(data.cotizacion.items)) {
            const initialItems: OrderItem[] = [];
            data.cotizacion.items.forEach((it: any) => {
              if (it.tipo === 'servicio') {
                const s = data.servicios.find((x: any) => x.id === it.id);
                if (s) {
                  const tv = data.cotizacion.tipo_vehiculo_id;
                  const p =
                    tv && data.precios?.[s.id]?.[tv] !== undefined
                      ? Number(data.precios[s.id][tv])
                      : Number(s.precio);
                  initialItems.push({
                    key: `servicio-${s.id}`,
                    tipo: 'servicio',
                    id: s.id,
                    nombre: s.nombre,
                    cant: Number(it.cant || 1),
                    precio: p,
                  });
                }
              } else {
                const pr = data.productos.find((x: any) => x.id === it.id);
                if (pr) {
                  initialItems.push({
                    key: `producto-${pr.id}`,
                    tipo: 'producto',
                    id: pr.id,
                    nombre: pr.nombre,
                    cant: Number(it.cant || 1),
                    precio: Number(pr.precio_venta),
                  });
                }
              }
            });
            setItems(initialItems);
          }
        } else if (data.recepcion) {
          if (data.recepcion.cliente_id) setClienteId(String(data.recepcion.cliente_id));
          if (data.recepcion.vehiculo_id) setVehiculoId(String(data.recepcion.vehiculo_id));
          if (!data.recepcion.vehiculo_id && data.recepcion.placa) setNuevaPlaca(data.recepcion.placa);
        }
      } catch (err) {
        setError(apiErrorMsg(err));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [citaParam, cotizacionParam, recepcionParam]);

  useEffect(() => {
    if (vehiculoId) {
      const v = cat.vehiculos.find((x: any) => String(x.id) === String(vehiculoId));
      if (v?.tipo_vehiculo_id) {
        setTipoVehiculoId(String(v.tipo_vehiculo_id));
      }
      if (v?.cliente_id && !clienteId) {
        setClienteId(String(v.cliente_id));
      }
    }
  }, [vehiculoId, cat.vehiculos]);

  useEffect(() => {
    const tv = Number(tipoVehiculoId || 0);
    setItems((prev) =>
      prev.map((it) => {
        if (it.tipo !== 'servicio') return it;
        const s = cat.servicios.find((x: any) => x.id === it.id);
        if (!s) return it;
        const p =
          tv && cat.precios?.[s.id]?.[tv] !== undefined
            ? Number(cat.precios[s.id][tv])
            : Number(s.precio);
        return { ...it, precio: p };
      }),
    );
  }, [tipoVehiculoId, cat.servicios, cat.precios]);

  useEffect(() => {
    setClientePaqueteId('');
    if (!clienteId) {
      setPaquetesDisp([]);
      return;
    }
    http
      .get(`/paquetes/cliente/${clienteId}`)
      .then((res) => setPaquetesDisp(Array.isArray(res.data) ? res.data : res.data?.rows || []))
      .catch(() => setPaquetesDisp([]));
  }, [clienteId]);

  const getServicePrice = (s: any) => {
    const tv = Number(tipoVehiculoId || 0);
    if (tv && cat.precios?.[s.id]?.[tv] !== undefined) {
      return Number(cat.precios[s.id][tv]);
    }
    return Number(s.precio);
  };

  const addService = (s: any) => {
    const precio = getServicePrice(s);
    const key = `servicio-${s.id}`;
    setItems((prev) => {
      const ex = prev.find((i) => i.key === key);
      if (ex) {
        return prev.map((i) => (i.key === key ? { ...i, cant: i.cant + 1, precio } : i));
      }
      return [...prev, { key, tipo: 'servicio', id: s.id, nombre: s.nombre, cant: 1, precio }];
    });
  };

  const addProduct = (p: any) => {
    const key = `producto-${p.id}`;
    setItems((prev) => {
      const ex = prev.find((i) => i.key === key);
      if (ex) {
        return prev.map((i) => (i.key === key ? { ...i, cant: i.cant + 1 } : i));
      }
      return [
        ...prev,
        { key, tipo: 'producto', id: p.id, nombre: p.nombre, cant: 1, precio: Number(p.precio_venta) },
      ];
    });
  };

  const updateCant = (key: string, cant: number) => {
    if (cant <= 0) {
      setItems((prev) => prev.filter((i) => i.key !== key));
    } else {
      setItems((prev) => prev.map((i) => (i.key === key ? { ...i, cant } : i)));
    }
  };

  const selectedPkg = useMemo(
    () => paquetesDisp.find((p) => String(p.id) === String(clientePaqueteId)),
    [paquetesDisp, clientePaqueteId],
  );

  const subtotal = useMemo(() => {
    let sum = 0;
    let pkgApplied = false;
    for (const it of items) {
      if (selectedPkg && !pkgApplied && it.tipo === 'servicio' && Number(it.id) === Number(selectedPkg.servicio_id)) {
        pkgApplied = true;
        sum += Math.max(0, it.cant - 1) * it.precio;
      } else {
        sum += it.cant * it.precio;
      }
    }
    return Math.round(sum * 100) / 100;
  }, [items, selectedPkg]);

  const desc = Math.min(subtotal, Math.max(0, Number(descuento || 0)));
  const base = Math.max(0, Math.round((subtotal - desc) * 100) / 100);
  const rate = Number(empresa.impuesto_porcentaje || 18) / 100;
  const impuesto = empresa.precios_incluyen_impuesto
    ? Math.round((base - base / (1 + rate)) * 100) / 100
    : Math.round(base * rate * 100) / 100;
  const total = empresa.precios_incluyen_impuesto ? base : Math.round((base + impuesto) * 100) / 100;

  const handleValidarCupon = async () => {
    if (!cuponCodigo.trim()) return;
    setCuponMsg(null);
    try {
      const { data } = await http.get('/crm/cupones/validar', {
        params: {
          codigo: cuponCodigo.trim(),
          cliente_id: clienteId || undefined,
          subtotal,
        },
      });
      if (data.ok) {
        setDescuento(Number(data.descuento || 0));
        setCuponMsg({ ok: true, text: data.msg || 'Cupón aplicado.' });
      } else {
        setCuponMsg({ ok: false, text: data.msg || 'Cupón inválido.' });
      }
    } catch (err) {
      setCuponMsg({ ok: false, text: apiErrorMsg(err) });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setError('Agrega al menos un servicio o producto a la orden.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        cliente_id: clienteId ? Number(clienteId) : null,
        nuevo_cliente: nuevoCliente,
        nuevo_telefono: nuevoTelefono,
        vehiculo_id: vehiculoId ? Number(vehiculoId) : null,
        nueva_placa: nuevaPlaca,
        nueva_marca: nuevaMarca,
        tipo_vehiculo_id: tipoVehiculoId ? Number(tipoVehiculoId) : null,
        empleado_id: empleadoId ? Number(empleadoId) : null,
        cliente_paquete_id: clientePaqueteId ? Number(clientePaqueteId) : null,
        cupon: cuponCodigo.trim() || undefined,
        descuento: desc,
        pagado: pagado ? 1 : 0,
        metodo_pago: metodoPago,
        monto_pago: montoPago !== '' ? montoPago : total,
        propina: Number(propina || 0),
        referencia,
        observaciones,
        cita_id: citaParam ? Number(citaParam) : undefined,
        cotizacion_id: cotizacionParam ? Number(cotizacionParam) : undefined,
        recepcion_id: recepcionParam ? Number(recepcionParam) : undefined,
        items: items.map((i) => ({ tipo: i.tipo, id: i.id, cant: i.cant })),
      };
      const { data } = await http.post('/ordenes', payload);
      navigate(`/ordenes/ver/${data.id}`);
    } catch (err) {
      setError(apiErrorMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const vehiculosFiltrados = useMemo(() => {
    if (!clienteId) return cat.vehiculos;
    return cat.vehiculos.filter((v: any) => String(v.cliente_id) === String(clienteId));
  }, [cat.vehiculos, clienteId]);

  const term = searchItem.trim().toLowerCase();

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h4 className="page-title">
            <i className="bi bi-plus-circle-fill me-2 text-primary"></i>Nueva Orden de Servicio
          </h4>
          <p className="page-sub small">Selecciona el vehículo, agrega servicios o productos y registra el cobro</p>
        </div>
        <Link to="/ordenes" className="btn btn-light border btn-sm">
          <i className="bi bi-arrow-left me-1"></i> Volver a órdenes
        </Link>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="row g-3">

          <div className="col-lg-7">
            <div className="cw-card mb-3">
              <div className="card-h">
                <h6>1. Cliente y Vehículo</h6>
              </div>
              <div className="card-b">
                <div className="row g-2">
                  <div className="col-md-6">
                    <label className="form-label">Cliente registrado</label>
                    <select
                      className="form-select form-select-sm"
                      value={clienteId}
                      onChange={(e) => {
                        setClienteId(e.target.value);
                        setVehiculoId('');
                      }}
                    >
                      <option value="">-- Cliente General / Nuevo --</option>
                      {cat.clientes.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre} {c.nro_doc ? `(${c.nro_doc})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  {!clienteId && (
                    <>
                      <div className="col-md-3">
                        <label className="form-label">O alta rápida nombre</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Nombre cliente"
                          value={nuevoCliente}
                          onChange={(e) => setNuevoCliente(e.target.value)}
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Teléfono</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Celular"
                          value={nuevoTelefono}
                          onChange={(e) => setNuevoTelefono(e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  <div className="col-md-5">
                    <label className="form-label">Vehículo registrado</label>
                    <select
                      className="form-select form-select-sm"
                      value={vehiculoId}
                      onChange={(e) => setVehiculoId(e.target.value)}
                    >
                      <option value="">-- Elegir o escribir placa nueva --</option>
                      {vehiculosFiltrados.map((v: any) => (
                        <option key={v.id} value={v.id}>
                          {v.placa} · {v.marca || ''} {v.modelo || ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {!vehiculoId && (
                    <>
                      <div className="col-md-3">
                        <label className="form-label">Nueva Placa</label>
                        <input
                          type="text"
                          className="form-control form-control-sm text-uppercase"
                          placeholder="ABC-123"
                          value={nuevaPlaca}
                          onChange={(e) => setNuevaPlaca(e.target.value.toUpperCase())}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Marca / Modelo</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Toyota Yaris"
                          value={nuevaMarca}
                          onChange={(e) => setNuevaMarca(e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  <div className="col-md-6">
                    <label className="form-label">Tipo de vehículo (tarifa dinámica)</label>
                    <select
                      className="form-select form-select-sm"
                      value={tipoVehiculoId}
                      onChange={(e) => setTipoVehiculoId(e.target.value)}
                    >
                      <option value="">-- Precio estándar --</option>
                      {cat.tipos.map((t: any) => (
                        <option key={t.id} value={t.id}>
                          {t.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Lavador / Responsable asignado</label>
                    <select
                      className="form-select form-select-sm"
                      value={empleadoId}
                      onChange={(e) => setEmpleadoId(e.target.value)}
                    >
                      <option value="">-- Sin asignar aún --</option>
                      {cat.empleados.map((emp: any) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  {paquetesDisp.length > 0 && (
                    <div className="col-12 mt-2">
                      <div className="p-2 rounded-3 bg-teal bg-opacity-10 border border-info">
                        <label className="form-label mb-1 text-teal">
                          <i className="bi bi-gift-fill me-1"></i>Paquete prepagado disponible del cliente
                        </label>
                        <select
                          className="form-select form-select-sm"
                          value={clientePaqueteId}
                          onChange={(e) => setClientePaqueteId(e.target.value)}
                        >
                          <option value="">-- No usar paquete en esta orden --</option>
                          {paquetesDisp.map((p: any) => (
                            <option key={p.id} value={p.id}>
                              {p.nombre} ({p.usos_restantes} de {p.usos_total} disponibles)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="cw-card">
              <div className="card-h">
                <div className="btn-group btn-group-sm">
                  <button
                    type="button"
                    className={`btn ${tabCatalog === 'servicios' ? 'btn-primary' : 'btn-light border'}`}
                    onClick={() => setTabCatalog('servicios')}
                  >
                    <i className="bi bi-droplet-half me-1"></i> Servicios ({cat.servicios.length})
                  </button>
                  <button
                    type="button"
                    className={`btn ${tabCatalog === 'productos' ? 'btn-primary' : 'btn-light border'}`}
                    onClick={() => setTabCatalog('productos')}
                  >
                    <i className="bi bi-box-seam me-1"></i> Productos ({cat.productos.length})
                  </button>
                </div>
                <input
                  type="search"
                  className="form-control form-control-sm"
                  style={{ maxWidth: 220 }}
                  placeholder="Filtrar catálogo..."
                  value={searchItem}
                  onChange={(e) => setSearchItem(e.target.value)}
                />
              </div>
              <div className="card-b">
                {loading ? (
                  <div className="text-center py-4 text-muted">Cargando catálogo...</div>
                ) : tabCatalog === 'servicios' ? (
                  <div className="row g-2" style={{ maxHeight: 360, overflowY: 'auto' }}>
                    {cat.servicios
                      .filter((s: any) => !term || s.nombre.toLowerCase().includes(term))
                      .map((s: any) => {
                        const p = getServicePrice(s);
                        return (
                          <div key={s.id} className="col-sm-6">
                            <div className="pos-item d-flex justify-content-between align-items-center" onClick={() => addService(s)}>
                              <div>
                                <div className="fw-bold small">{s.nombre}</div>
                                <small className="text-muted">Servicio</small>
                              </div>
                              <span className="badge badge-soft-info fs-6">{money(p)}</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="row g-2" style={{ maxHeight: 360, overflowY: 'auto' }}>
                    {cat.productos
                      .filter((p: any) => !term || p.nombre.toLowerCase().includes(term))
                      .map((p: any) => (
                        <div key={p.id} className="col-sm-6">
                          <div className="pos-item d-flex justify-content-between align-items-center" onClick={() => addProduct(p)}>
                            <div>
                              <div className="fw-bold small">{p.nombre}</div>
                              <small className="text-muted">Stock: {num(p.stock)}</small>
                            </div>
                            <span className="badge badge-soft-success fs-6">{money(p.precio_venta)}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-lg-5">
            <div className="cw-card">
              <div className="card-h">
                <h6>2. Detalle de la Orden</h6>
                <span className="badge badge-soft-primary">{items.length} ítems</span>
              </div>
              <div className="card-b">
                {items.length === 0 ? (
                  <div className="text-center py-4 text-muted border rounded-3 mb-3 bg-light">
                    <i className="bi bi-cart3 fs-3 d-block mb-1"></i>
                    Haz clic en un servicio o producto para agregarlo
                  </div>
                ) : (
                  <div className="table-responsive mb-3">
                    <table className="table table-sm align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Concepto</th>
                          <th style={{ width: 90 }}>Cant.</th>
                          <th className="text-end">Subtotal</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it) => (
                          <tr key={it.key}>
                            <td>
                              <div className="fw-semibold small">{it.nombre}</div>
                              <small className="text-muted">{money(it.precio)} c/u</small>
                            </td>
                            <td>
                              <input
                                type="number"
                                step="1"
                                min="1"
                                className="form-control form-control-sm text-center"
                                value={it.cant}
                                onChange={(e) => updateCant(it.key, Number(e.target.value))}
                              />
                            </td>
                            <td className="text-end fw-bold small">{money(it.cant * it.precio)}</td>
                            <td className="text-end">
                              <button
                                type="button"
                                className="btn btn-sm text-danger p-0"
                                onClick={() => updateCant(it.key, 0)}
                              >
                                <i className="bi bi-x-circle"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="row g-2 mb-3">
                  <div className="col-7">
                    <label className="form-label">Cupón promocional</label>
                    <div className="input-group input-group-sm">
                      <input
                        type="text"
                        className="form-control text-uppercase"
                        placeholder="CÓDIGO"
                        value={cuponCodigo}
                        onChange={(e) => setCuponCodigo(e.target.value.toUpperCase())}
                      />
                      <button type="button" className="btn btn-outline-primary" onClick={handleValidarCupon}>
                        Aplicar
                      </button>
                    </div>
                    {cuponMsg && (
                      <small className={cuponMsg.ok ? 'text-success fw-semibold' : 'text-danger'}>
                        {cuponMsg.text}
                      </small>
                    )}
                  </div>
                  <div className="col-5">
                    <label className="form-label">Descuento manual</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control form-control-sm text-end"
                      value={descuento}
                      onChange={(e) => setDescuento(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-3 bg-light border mb-3">
                  <div className="d-flex justify-content-between small mb-1">
                    <span className="text-muted">Subtotal:</span>
                    <span className="fw-semibold">{money(subtotal)}</span>
                  </div>
                  {desc > 0 && (
                    <div className="d-flex justify-content-between small mb-1 text-danger">
                      <span>Descuento:</span>
                      <span>-{money(desc)}</span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between small mb-2">
                    <span className="text-muted">
                      {empresa.impuesto_nombre} ({empresa.impuesto_porcentaje}%):
                    </span>
                    <span>{money(impuesto)}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center border-top pt-2">
                    <span className="fw-extrabold fs-6">TOTAL A PAGAR:</span>
                    <span className="fw-extrabold fs-4 text-primary">{money(total)}</span>
                  </div>
                </div>

                <div className="form-check form-switch mb-2">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="chkPagado"
                    checked={pagado}
                    onChange={(e) => setPagado(e.target.checked)}
                  />
                  <label className="form-check-label fw-bold" htmlFor="chkPagado">
                    Registrar cobro ahora (total o adelanto)
                  </label>
                </div>

                {pagado && (
                  <div className="row g-2 mb-3 p-2 rounded-3 border bg-white">
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
                      <label className="form-label">Monto a abonar</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control form-control-sm"
                        placeholder={String(total)}
                        value={montoPago}
                        onChange={(e) => setMontoPago(e.target.value)}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Propina (opcional)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-control form-control-sm"
                        value={propina}
                        onChange={(e) => setPropina(e.target.value)}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label">N° Operación / Ref.</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Opcional"
                        value={referencia}
                        onChange={(e) => setReferencia(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label">Observaciones / Notas del vehículo</label>
                  <textarea
                    className="form-control form-control-sm"
                    rows={2}
                    placeholder="Indicaciones especiales..."
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-grad w-100 py-2 fs-6"
                  disabled={saving || items.length === 0}
                >
                  {saving ? 'Procesando orden...' : 'Guardar y Generar Orden'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
