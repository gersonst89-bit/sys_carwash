import React, { useState, useEffect } from 'react';
import { http } from '../../api/http';
import { CrudPage } from '../../components/ui/CrudPage';
import { money, fdate } from '../../utils/format';

export const EmpleadosPage: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await http.get('/empleados');
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
      title="Personal y Lavadores"
      subtitle="Gestión de empleados, sueldos base y porcentajes de comisión"
      icon="bi-person-badge"
      rows={rows}
      loading={loading}
      createLabel="Nuevo empleado"
      searchKeys={['nombre', 'documento', 'cargo', 'telefono']}
      columns={[
        { key: 'nombre', label: 'Nombre', render: (r) => <b>{r.nombre}</b> },
        { key: 'documento', label: 'DNI / Doc.' },
        { key: 'cargo', label: 'Cargo', render: (r) => <span className="badge badge-soft-info">{r.cargo}</span> },
        { key: 'telefono', label: 'Teléfono' },
        { key: 'sueldo', label: 'Sueldo Base', align: 'right', render: (r) => money(r.sueldo) },
        { key: 'comision_pct', label: 'Comisión Base', align: 'center', render: (r) => `${Number(r.comision_pct || 0)}%` },
        { key: 'fecha_ingreso', label: 'Ingreso', render: (r) => fdate(r.fecha_ingreso) },
      ]}
      fields={[
        { name: 'nombre', label: 'Nombre completo', required: true, colSpan: 8 },
        { name: 'documento', label: 'DNI / Documento', colSpan: 4 },
        { name: 'cargo', label: 'Cargo', defaultValue: 'Lavador' },
        { name: 'telefono', label: 'Teléfono' },
        { name: 'sueldo', label: 'Sueldo Mensual Base', type: 'number', step: '0.01', defaultValue: 1025 },
        { name: 'comision_pct', label: '% Comisión General', type: 'number', step: '0.01', defaultValue: 10 },
        { name: 'fecha_ingreso', label: 'Fecha de ingreso', type: 'date' },
        { name: 'estado', label: 'Activo', type: 'checkbox', defaultValue: 1 },
      ]}
      onSave={async (data, id) => {
        if (id) await http.put(`/empleados/${id}`, data);
        else await http.post('/empleados', data);
        await load();
      }}
      onDelete={async (row) => {
        await http.delete(`/empleados/${row.id}`);
        await load();
      }}
    />
  );
};
