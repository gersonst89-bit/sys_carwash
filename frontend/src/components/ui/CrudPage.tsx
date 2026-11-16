import React, { useState, useMemo } from 'react';
import { exportToCsv } from '../../utils/format';

export interface CrudField {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'email' | 'date' | 'datetime-local' | 'select' | 'textarea' | 'checkbox';
  required?: boolean;
  step?: string;
  min?: number;
  max?: number;
  placeholder?: string;
  options?: Array<{ value: string | number; label: string }>;
  defaultValue?: any;
  colSpan?: number;
}

export interface CrudColumn<T = any> {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  render?: (row: T) => React.ReactNode;
  csvValue?: (row: T) => any;
}

interface CrudPageProps<T = any> {
  title: string;
  subtitle?: string;
  icon?: string;
  rows: T[];
  loading?: boolean;
  columns: CrudColumn<T>[];
  fields?: CrudField[];
  searchKeys?: string[];
  onSave?: (data: Record<string, any>, editingId: number | null) => Promise<void>;
  onDelete?: (row: T) => Promise<void>;
  extraHeaderActions?: React.ReactNode;
  extraRowActions?: (row: T) => React.ReactNode;
  customModalContent?: (
    formData: Record<string, any>,
    setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>,
    editingRow: T | null,
  ) => React.ReactNode;
  modalLarge?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  createLabel?: string;
}

export function CrudPage<T extends Record<string, any>>({
  title,
  subtitle,
  icon = 'bi-table',
  rows,
  loading = false,
  columns,
  fields = [],
  searchKeys = ['nombre'],
  onSave,
  onDelete,
  extraHeaderActions,
  extraRowActions,
  customModalContent,
  modalLarge = false,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  createLabel = 'Nuevo registro',
}: CrudPageProps<T>) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<T | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      searchKeys.some((k) =>
        String(r[k] ?? '')
          .toLowerCase()
          .includes(term),
      ),
    );
  }, [rows, q, searchKeys]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const openNew = () => {
    const init: Record<string, any> = {};
    fields.forEach((f) => {
      init[f.name] = f.defaultValue !== undefined ? f.defaultValue : f.type === 'checkbox' ? 1 : '';
    });
    setEditingRow(null);
    setFormData(init);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (row: T) => {
    const init: Record<string, any> = { ...row };
    fields.forEach((f) => {
      if (init[f.name] === null || init[f.name] === undefined) {
        init[f.name] = f.defaultValue !== undefined ? f.defaultValue : '';
      } else if (f.type === 'date' && typeof init[f.name] === 'string') {
        init[f.name] = init[f.name].slice(0, 10);
      } else if (f.type === 'datetime-local' && typeof init[f.name] === 'string') {
        init[f.name] = init[f.name].replace(' ', 'T').slice(0, 16);
      }
    });
    setEditingRow(row);
    setFormData(init);
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSave) return;
    setSaving(true);
    setError('');
    try {
      await onSave(formData, editingRow ? Number(editingRow.id) : null);
      setModalOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error al guardar.';
      setError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: T) => {
    if (!onDelete) return;
    if (!window.confirm('¿Estás seguro de eliminar este registro?')) return;
    try {
      await onDelete(row);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'No se pudo eliminar.');
    }
  };

  const handleExport = () => {
    const headers = columns.map((c) => c.label);
    const dataRows = filtered.map((r) =>
      columns.map((c) => (c.csvValue ? c.csvValue(r) : r[c.key] ?? '')),
    );
    exportToCsv(title.toLowerCase().replace(/\s+/g, '_'), headers, dataRows);
  };

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <h4 className="page-title">
            <i className={`bi ${icon} me-2 text-primary`}></i>
            {title}
          </h4>
          {subtitle && <p className="page-sub small">{subtitle}</p>}
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          {extraHeaderActions}
          <button type="button" className="btn btn-light border btn-sm" onClick={handleExport}>
            <i className="bi bi-download me-1"></i> Exportar CSV
          </button>
          {onSave && canCreate && (
            <button type="button" className="btn btn-grad btn-sm px-3" onClick={openNew}>
              <i className="bi bi-plus-lg me-1"></i> {createLabel}
            </button>
          )}
        </div>
      </div>

      <div className="cw-card">
        <div className="card-h">
          <div className="input-ico" style={{ maxWidth: 320, width: '100%' }}>
            <i className="bi bi-search"></i>
            <input
              type="search"
              className="form-control form-control-sm ps-5"
              placeholder="Buscar..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <span className="text-muted small fw-semibold">{filtered.length} registros</span>
        </div>

        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className={c.align === 'right' ? 'text-end' : c.align === 'center' ? 'text-center' : ''}>
                    {c.label}
                  </th>
                ))}
                {(onSave || onDelete || extraRowActions) && <th className="text-end">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length + 1} className="text-center py-4 text-muted">
                    <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                    Cargando registros...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="text-center py-4 text-muted">
                    No se encontraron registros.
                  </td>
                </tr>
              ) : (
                paginated.map((row, idx) => (
                  <tr key={row.id ?? idx}>
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={c.align === 'right' ? 'text-end' : c.align === 'center' ? 'text-center' : ''}
                      >
                        {c.render ? c.render(row) : row[c.key] ?? '-'}
                      </td>
                    ))}
                    {(onSave || onDelete || extraRowActions) && (
                      <td className="text-end whitespace-nowrap">
                        <div className="d-inline-flex gap-1">
                          {extraRowActions && extraRowActions(row)}
                          {onSave && canEdit && (
                            <button
                              type="button"
                              className="btn btn-light btn-icon border"
                              title="Editar"
                              onClick={() => openEdit(row)}
                            >
                              <i className="bi bi-pencil text-primary"></i>
                            </button>
                          )}
                          {onDelete && canDelete && (
                            <button
                              type="button"
                              className="btn btn-light btn-icon border"
                              title="Eliminar"
                              onClick={() => handleDelete(row)}
                            >
                              <i className="bi bi-trash text-danger"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="d-flex align-items-center justify-content-between px-3 py-2 border-top">
            <small className="text-muted">
              Página {page} de {totalPages}
            </small>
            <div className="btn-group btn-group-sm">
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="cw-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className={`cw-modal ${modalLarge ? 'lg' : ''}`} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSubmit}>
              <div className="cw-modal-header">
                <h5>{editingRow ? 'Editar registro' : createLabel}</h5>
                <button type="button" className="btn-close" onClick={() => setModalOpen(false)}></button>
              </div>
              <div className="cw-modal-body">
                {error && <div className="alert alert-danger py-2 small">{error}</div>}
                <div className="row g-3">
                  {fields.map((f) => (
                    <div key={f.name} className={`col-md-${f.colSpan || 6}`}>
                      <label className="form-label">
                        {f.label} {f.required && <span className="text-danger">*</span>}
                      </label>
                      {f.type === 'select' ? (
                        <select
                          className="form-select"
                          required={f.required}
                          value={formData[f.name] ?? ''}
                          onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                        >
                          <option value="">-- Seleccionar --</option>
                          {f.options?.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      ) : f.type === 'textarea' ? (
                        <textarea
                          className="form-control"
                          rows={2}
                          required={f.required}
                          placeholder={f.placeholder}
                          value={formData[f.name] ?? ''}
                          onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                        />
                      ) : f.type === 'checkbox' ? (
                        <div className="form-check form-switch mt-2">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={Boolean(Number(formData[f.name] ?? 1))}
                            onChange={(e) => setFormData({ ...formData, [f.name]: e.target.checked ? 1 : 0 })}
                          />
                          <label className="form-check-label small">Activo / Habilitado</label>
                        </div>
                      ) : (
                        <input
                          type={f.type || 'text'}
                          className="form-control"
                          required={f.required}
                          step={f.step}
                          min={f.min}
                          max={f.max}
                          placeholder={f.placeholder}
                          value={formData[f.name] ?? ''}
                          onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                        />
                      )}
                    </div>
                  ))}
                </div>
                {customModalContent && customModalContent(formData, setFormData, editingRow)}
              </div>
              <div className="cw-modal-footer">
                <button type="button" className="btn btn-light" onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-grad px-4" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
