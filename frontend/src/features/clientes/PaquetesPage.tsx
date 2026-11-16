import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { http, apiErrorMsg } from '../../api/http';
import { CrudPage } from '../../components/ui/CrudPage';
import { money, fdate } from '../../utils/format';

export const PaquetesPage: React.FC = () => {
  const location = useLocation();
  const isVendidosView = location.pathname.includes('/vendidos');

  const [paquetes, setPaquetes] = useState<any[]>([]);
  const [vendidos, setVendidos] = useState<any[]>([]);
  const [servicios, setServicios] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [sellModal, setSellModal] = useState(false);
  const [selPkgId, setSelPkgId] = useState('');
  const [selCliId, setSelCliId] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');

  const load = async () => {
    setLoading(true);
    try {
      const [pRes, vRes, sRes, cRes] = await Promise.all([
        http.get('/paquetes'),
        http.get('/paquetes/vendidos'),
        http.get('/servicios'),
        http.get('/clientes'),
      ]);
      setPaquetes(Array.isArray(pRes.data) ? pRes.data : pRes.data.rows || []);
      setVendidos(Array.isArray(vRes.data) ? vRes.data : vRes.data.rows || []);
      setServicios(Array.isArray(sRes.data) ? sRes.data : sRes.data.rows || []);
      setClientes(Array.isArray(cRes.data) ? cRes.data : cRes.data.rows || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleVender = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await http.post('/paquetes/vender', {
        paquete_id: Number(selPkgId),
        cliente_id: Number(selCliId),
        metodo_pago: metodoPago,
      });
      setSellModal(false);
      load();
    } catch (err) {
      alert(apiErrorMsg(err));
    }
  };

  if (isVendidosView) {
    return (
      <div>
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <div>
            <h4 className="page-title">
              <i className="bi bi-bag-check me-2 text-primary"></i>Paquetes Vendidos a Clientes
            </h4>
            <p className="page-sub small">Control de membresías prepagadas y lavados restantes</p>
          </div>
          <div className="d-flex gap-2">
            <Link to="/paquetes" className="btn btn-light border btn-sm">
              Catálogo de paquetes
            </Link>
            <button type="button" className="btn btn-grad btn-sm" onClick={() => setSellModal(true)}>
              <i className="bi bi-cart-plus me-1"></i> Vender paquete
            </button>
          </div>
        </div>

        <div className="cw-card">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Paquete</th>
                  <th>Lavados Restantes</th>
                  <th>Compra</th>
                  <th>Vencimiento</th>
                  <th className="text-end">Pagado</th>
                </tr>
              </thead>
              <tbody>
                {vendidos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted">
                      Sin paquetes vendidos.
                    </td>
                  </tr>
                ) : (
                  vendidos.map((v) => (
                    <tr key={v.id}>
                      <td className="fw-bold">{v.cliente || v.cliente_nombre}</td>
                      <td>{v.nombre}</td>
                      <td>
                        <span
                          className={`badge badge-soft-${
                            v.usos_restantes > 0 ? 'success' : 'secondary'
                          }`}
                        >
                          {v.usos_restantes} de {v.usos_total} disponibles
                        </span>
                      </td>
                      <td>{fdate(v.fecha_compra)}</td>
                      <td>{fdate(v.fecha_vence)}</td>
                      <td className="text-end fw-bold">{money(v.precio_pagado)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <CrudPage
        title="Paquetes y Membresías Prepagadas"
        subtitle="Configura combos de lavados prepagados para fidelizar clientes"
        icon="bi-gift"
        rows={paquetes}
        loading={loading}
        createLabel="Nuevo paquete"
        extraHeaderActions={
          <>
            <Link to="/paquetes/vendidos" className="btn btn-light border btn-sm">
              Ver vendidos ({vendidos.length})
            </Link>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={() => setSellModal(true)}
            >
              <i className="bi bi-cart-plus me-1"></i> Vender a Cliente
            </button>
          </>
        }
        columns={[
          { key: 'nombre', label: 'Paquete', render: (r) => <b>{r.nombre}</b> },
          { key: 'servicio', label: 'Servicio Incluido', render: (r) => r.servicio || r.servicio_nombre || '-' },
          {
            key: 'usos',
            label: 'Lavados Incluidos',
            align: 'center',
            render: (r) => <span className="badge badge-soft-info">{r.usos} usos</span>,
          },
          { key: 'vigencia_dias', label: 'Vigencia', render: (r) => `${r.vigencia_dias} días` },
          {
            key: 'precio',
            label: 'Precio Paquete',
            align: 'right',
            render: (r) => <b className="text-primary">{money(r.precio)}</b>,
          },
        ]}
        fields={[
          { name: 'nombre', label: 'Nombre del paquete', required: true, colSpan: 12 },
          {
            name: 'servicio_id',
            label: 'Servicio incluido',
            type: 'select',
            required: true,
            options: servicios.map((s) => ({ value: s.id, label: `${s.nombre} (${money(s.precio)})` })),
          },
          { name: 'usos', label: 'Cantidad de lavados', type: 'number', defaultValue: 4, required: true },
          { name: 'precio', label: 'Precio total del paquete', type: 'number', step: '0.01', required: true },
          { name: 'vigencia_dias', label: 'Vigencia (días)', type: 'number', defaultValue: 90 },
          { name: 'descripcion', label: 'Descripción', colSpan: 12 },
        ]}
        onSave={async (data, id) => {
          if (id) await http.put(`/paquetes/${id}`, data);
          else await http.post('/paquetes', data);
          await load();
        }}
        onDelete={async (row) => {
          await http.delete(`/paquetes/${row.id}`);
          await load();
        }}
      />

      {sellModal && (
        <div className="cw-modal-backdrop" onClick={() => setSellModal(false)}>
          <div className="cw-modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleVender}>
              <div className="cw-modal-header">
                <h5>Vender Paquete a Cliente</h5>
                <button type="button" className="btn-close" onClick={() => setSellModal(false)}></button>
              </div>
              <div className="cw-modal-body">
                <div className="mb-3">
                  <label className="form-label">Cliente *</label>
                  <select
                    className="form-select"
                    required
                    value={selCliId}
                    onChange={(e) => setSelCliId(e.target.value)}
                  >
                    <option value="">-- Seleccionar cliente --</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Paquete *</label>
                  <select
                    className="form-select"
                    required
                    value={selPkgId}
                    onChange={(e) => setSelPkgId(e.target.value)}
                  >
                    <option value="">-- Seleccionar paquete --</option>
                    {paquetes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} - {p.usos} lavados ({money(p.precio)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-2">
                  <label className="form-label">Método de pago</label>
                  <select
                    className="form-select"
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="yape_plin">Yape / Plin</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>
              </div>
              <div className="cw-modal-footer">
                <button type="button" className="btn btn-light" onClick={() => setSellModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-grad">
                  Registrar Venta de Paquete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
