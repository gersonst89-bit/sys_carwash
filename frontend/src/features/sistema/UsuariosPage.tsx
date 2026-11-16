import React, { useEffect, useState } from 'react';
import { CrudPage } from '../../components/ui/CrudPage';
import { http } from '../../api/http';
import { fdate } from '../../utils/format';

export const UsuariosPage: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = async () => {
    setLoading(true);
    try {
      const { data } = await http.get('/usuarios');
      setRows(data.rows || []);
      setRoles(data.roles || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  return (
    <CrudPage
      title="Usuarios y roles"
      subtitle="Accesos al sistema según rol"
      icon="bi-shield-lock"
      rows={rows}
      loading={loading}
      searchKeys={['nombre', 'usuario', 'rol', 'email']}
      columns={[
        { key: 'nombre', label: 'Nombre', render: (r) => <strong>{r.nombre}</strong> },
        { key: 'usuario', label: 'Usuario' },
        { key: 'rol', label: 'Rol', render: (r) => <span className="badge bg-info text-dark">{r.rol}</span> },
        { key: 'email', label: 'Correo' },
        { key: 'ultimo_acceso', label: 'Último acceso', render: (r) => fdate(r.ultimo_acceso, true) },
        {
          key: 'estado',
          label: 'Estado',
          render: (r) => (
            <span className={`badge ${r.estado ? 'bg-success' : 'bg-secondary'}`}>
              {r.estado ? 'Activo' : 'Inactivo'}
            </span>
          ),
        },
      ]}
      fields={[
        { name: 'nombre', label: 'Nombre completo', required: true, colSpan: 6 },
        { name: 'usuario', label: 'Usuario', required: true, colSpan: 3 },
        {
          name: 'rol_id',
          label: 'Rol',
          type: 'select',
          required: true,
          colSpan: 3,
          options: roles.map((r) => ({ value: r.id, label: r.nombre })),
          defaultValue: 1,
        },
        { name: 'email', label: 'Correo', type: 'email', colSpan: 6 },
        {
          name: 'password',
          label: 'Contraseña (dejar vacío al editar para mantener)',
          type: 'text',
          colSpan: 3,
        },
        { name: 'estado', label: 'Activo', type: 'checkbox', defaultValue: true, colSpan: 3 },
      ]}
      onSave={async (data, id) => {
        if (id) await http.put(`/usuarios/${id}`, data);
        else await http.post('/usuarios', data);
        await cargar();
      }}
      onDelete={async (row) => {
        await http.delete(`/usuarios/${row.id}`);
        await cargar();
      }}
    />
  );
};
