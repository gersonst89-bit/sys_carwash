import React, { useState, useEffect } from 'react';
import { http } from '../../api/http';
import { CrudPage } from '../../components/ui/CrudPage';
import { money } from '../../utils/format';

export const ServiciosPage: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [tipos, setTipos] = useState<any[]>([]);
  const [preciosMap, setPreciosMap] = useState<Record<number, Record<number, number>>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [sRes, cRes, tRes] = await Promise.all([
        http.get('/servicios'),
        http.get('/categorias'),
        http.get('/tiposvehiculo'),
      ]);
      const data = sRes.data;
      setRows(Array.isArray(data) ? data : data.rows || []);
      if (data.precios) setPreciosMap(data.precios);
      setCategorias(Array.isArray(cRes.data) ? cRes.data : cRes.data.rows || []);
      setTipos(Array.isArray(tRes.data) ? tRes.data : tRes.data.rows || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <CrudPage
      title="Catálogo de Servicios de Lavado y Detailing"
      subtitle="Configura tarifas base, duración estimada, comisión y matriz de precios por tipo de vehículo"
      icon="bi-droplet-half"
      rows={rows}
      loading={loading}
      modalLarge
      createLabel="Nuevo servicio"
      searchKeys={['nombre', 'descripcion', 'categoria']}
      columns={[
        {
          key: 'nombre',
          label: 'Servicio',
          render: (r) => (
            <div>
              <div className="fw-bold">{r.nombre}</div>
              {r.descripcion && <small className="text-muted">{r.descripcion}</small>}
            </div>
          ),
        },
        { key: 'categoria', label: 'Categoría', render: (r) => r.categoria || r.categoria_nombre || '-' },
        { key: 'duracion_min', label: 'Duración', render: (r) => `${r.duracion_min || 30} min` },
        { key: 'comision_pct', label: 'Comisión', render: (r) => `${Number(r.comision_pct || 0)}%` },
        {
          key: 'precio',
          label: 'Precio Base',
          align: 'right',
          render: (r) => <b className="text-primary">{money(r.precio)}</b>,
        },
        {
          key: 'estado',
          label: 'Estado',
          render: (r) => (
            <span className={`badge badge-soft-${r.estado ? 'success' : 'secondary'}`}>
              {r.estado ? 'Activo' : 'Inactivo'}
            </span>
          ),
        },
      ]}
      fields={[
        { name: 'nombre', label: 'Nombre del servicio', required: true, colSpan: 8 },
        {
          name: 'categoria_id',
          label: 'Categoría',
          type: 'select',
          colSpan: 4,
          options: categorias.map((c) => ({ value: c.id, label: c.nombre })),
        },
        { name: 'precio', label: 'Precio Base Estándar', type: 'number', step: '0.01', required: true, colSpan: 4 },
        { name: 'duracion_min', label: 'Duración estimada (min)', type: 'number', defaultValue: 30, colSpan: 4 },
        { name: 'comision_pct', label: '% Comisión lavador', type: 'number', step: '0.01', defaultValue: 0, colSpan: 4 },
        { name: 'descripcion', label: 'Descripción', colSpan: 8 },
        { name: 'estado', label: 'Estado', type: 'checkbox', defaultValue: 1, colSpan: 4 },
      ]}
      customModalContent={(formData, setFormData, editingRow) => {
        const currentPrecios =
          formData.precios_tipo ||
          (editingRow && (editingRow.precios_map || preciosMap[editingRow.id])) ||
          {};
        return (
          <div className="mt-3 pt-3 border-top">
            <h6 className="fw-bold small mb-2">
              <i className="bi bi-truck-front me-1 text-primary"></i>
              Matriz de Precios según Tipo de Vehículo (dejar vacío para usar Precio Base)
            </h6>
            <div className="row g-2">
              {tipos.map((t) => (
                <div key={t.id} className="col-sm-4">
                  <label className="form-label mb-1">{t.nombre}</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control form-control-sm"
                    placeholder={String(formData.precio || 'Base')}
                    value={currentPrecios[t.id] ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        precios_tipo: { ...currentPrecios, [t.id]: e.target.value },
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        );
      }}
      onSave={async (data, id) => {
        const payload = {
          ...data,
          precios: data.precios_tipo,
        };
        if (id) await http.put(`/servicios/${id}`, payload);
        else await http.post('/servicios', payload);
        await load();
      }}
      onDelete={async (row) => {
        await http.delete(`/servicios/${row.id}`);
        await load();
      }}
    />
  );
};
