import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { http } from '../../api/http';
import { CrudPage } from '../../components/ui/CrudPage';
import { fdate, whatsappLink } from '../../utils/format';

export const ClientesPage: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await http.get('/clientes');
      setRows(Array.isArray(data) ? data : data.rows || []);
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
      title="Directorio de Clientes"
      subtitle="Gestión de clientes, historial de visitas y acceso a ficha 360°"
      icon="bi-people"
      rows={rows}
      loading={loading}
      createLabel="Nuevo cliente"
      searchKeys={['nombre', 'nro_doc', 'telefono', 'email']}
      columns={[
        {
          key: 'nombre',
          label: 'Cliente',
          render: (r) => (
            <div>
              <Link to={`/clientes/ficha/${r.id}`} className="fw-bold text-decoration-none">
                {r.nombre}
              </Link>
              {r.notas && <div className="small text-muted">{r.notas}</div>}
            </div>
          ),
        },
        {
          key: 'nro_doc',
          label: 'Documento',
          render: (r) => (r.nro_doc ? `${r.tipo_doc || 'DNI'}: ${r.nro_doc}` : '-'),
        },
        {
          key: 'telefono',
          label: 'Teléfono',
          render: (r) =>
            r.telefono ? (
              <a
                href={whatsappLink(r.telefono)}
                target="_blank"
                rel="noreferrer"
                className="text-success text-decoration-none fw-semibold"
              >
                <i className="bi bi-whatsapp me-1"></i>
                {r.telefono}
              </a>
            ) : (
              '-'
            ),
        },
        { key: 'email', label: 'Correo' },
        {
          key: 'fecha_nacimiento',
          label: 'Cumpleaños',
          render: (r) => (r.fecha_nacimiento ? fdate(r.fecha_nacimiento) : '-'),
        },
        {
          key: 'estado',
          label: 'Estado',
          render: (r) =>
            r.estado ? (
              <span className="badge badge-soft-success">Activo</span>
            ) : (
              <span className="badge badge-soft-secondary">Inactivo</span>
            ),
        },
      ]}
      extraRowActions={(r) => (
        <Link
          to={`/clientes/ficha/${r.id}`}
          className="btn btn-light btn-icon border"
          title="Ver Ficha 360°"
        >
          <i className="bi bi-person-vcard text-info"></i>
        </Link>
      )}
      fields={[
        {
          name: 'tipo_doc',
          label: 'Tipo Doc.',
          type: 'select',
          defaultValue: 'DNI',
          options: [
            { value: 'DNI', label: 'DNI' },
            { value: 'RUC', label: 'RUC' },
            { value: 'CE', label: 'Carnet Extranjería' },
          ],
        },
        { name: 'nro_doc', label: 'N° Documento' },
        { name: 'nombre', label: 'Nombre completo / Razón Social', required: true, colSpan: 12 },
        { name: 'telefono', label: 'Teléfono / WhatsApp' },
        { name: 'email', label: 'Correo electrónico', type: 'email' },
        { name: 'direccion', label: 'Dirección', colSpan: 8 },
        { name: 'fecha_nacimiento', label: 'Fecha nacimiento', type: 'date', colSpan: 4 },
        { name: 'notas', label: 'Notas / Preferencias', type: 'textarea', colSpan: 12 },
        { name: 'acepta_marketing', label: 'Acepta promociones', type: 'checkbox', defaultValue: 1 },
        { name: 'estado', label: 'Estado activo', type: 'checkbox', defaultValue: 1 },
      ]}
      onSave={async (data, id) => {
        if (id) await http.put(`/clientes/${id}`, data);
        else await http.post('/clientes', data);
        await load();
      }}
      onDelete={async (row) => {
        await http.delete(`/clientes/${row.id}`);
        await load();
      }}
    />
  );
};
