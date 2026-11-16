import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { http, apiErrorMsg } from '../../api/http';
import { fdate, firstOfMonthYmd, money, todayYmd } from '../../utils/format';

export const ComprobantesPage: React.FC = () => {
  const [desde, setDesde] = useState(firstOfMonthYmd());
  const [hasta, setHasta] = useState(todayYmd());
  const [rows, setRows] = useState<any[]>([]);
  const [tot, setTot] = useState<any>({ n: 0, total: 0, anulados: 0 });
  const [printComp, setPrintComp] = useState<any>(null);
  const [err, setErr] = useState('');

  const cargar = async () => {
    try {
      const { data } = await http.get('/comprobantes', { params: { desde, hasta } });
      setRows(data.rows || []);
      setTot(data.tot || { n: 0, total: 0, anulados: 0 });
    } catch (e) {
      setErr(apiErrorMsg(e));
    }
  };

  useEffect(() => {
    cargar();
  }, [desde, hasta]);

  const verImprimir = async (id: number) => {
    try {
      const { data } = await http.get(`/comprobantes/${id}`);
      setPrintComp(data);
    } catch (e) {
      alert(apiErrorMsg(e));
    }
  };

  const anular = async (id: number) => {
    if (!window.confirm('¿Anular este comprobante? Su correlativo no se reutilizará.')) return;
    try {
      await http.post(`/comprobantes/${id}/anular`, {});
      cargar();
    } catch (e) {
      alert(apiErrorMsg(e));
    }
  };

  return (
    <div className="container-fluid py-2">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h4 className="fw-bold mb-0">
            <i className="bi bi-file-earmark-ruled text-primary me-2"></i>Comprobantes Internos
          </h4>
          <small className="text-muted">Boletas (B001), Facturas (F001) y Notas de Venta (NV01)</small>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <input
            type="date"
            className="form-control form-control-sm"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />
          <span>a</span>
          <input
            type="date"
            className="form-control form-control-sm"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
          />
        </div>
      </div>

      {err && <div className="alert alert-danger">{err}</div>}

      <div className="row g-3 mb-3">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm p-3">
            <div className="text-muted small">Comprobantes Activos</div>
            <div className="fs-4 fw-bold">{tot.n}</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm p-3">
            <div className="text-muted small">Total Emitido</div>
            <div className="fs-4 fw-bold text-success">{money(tot.total)}</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm p-3">
            <div className="text-muted small">Anulados</div>
            <div className="fs-4 fw-bold text-danger">{tot.anulados}</div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Comprobante</th>
                <th>Tipo</th>
                <th>Fecha</th>
                <th>Orden</th>
                <th>Cliente / Razón Social</th>
                <th className="text-end">Total</th>
                <th>Estado</th>
                <th className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="fw-bold">
                    {r.serie}-{String(r.numero).padStart(8, '0')}
                  </td>
                  <td className="text-uppercase small">{r.tipo}</td>
                  <td>{fdate(r.fecha, true)}</td>
                  <td>
                    <Link to={`/ordenes/ver/${r.orden_id}`}>{r.orden}</Link>
                  </td>
                  <td>
                    {r.razon_social || 'Cliente General'}{' '}
                    {r.doc_numero && <small className="text-muted">({r.doc_numero})</small>}
                  </td>
                  <td className="text-end fw-semibold">{money(r.total)}</td>
                  <td>
                    <span className={`badge ${r.anulado ? 'bg-danger' : 'bg-success'}`}>
                      {r.anulado ? 'Anulado' : 'Emitido'}
                    </span>
                  </td>
                  <td className="text-end">
                    <div className="btn-group btn-group-sm">
                      <button className="btn btn-outline-primary" onClick={() => verImprimir(r.id)}>
                        <i className="bi bi-printer"></i>
                      </button>
                      {!r.anulado && (
                        <button className="btn btn-outline-danger" onClick={() => anular(r.id)}>
                          <i className="bi bi-x-circle"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {printComp && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {printComp.k.serie}-{String(printComp.k.numero).padStart(8, '0')}
                </h5>
                <button type="button" className="btn-close" onClick={() => setPrintComp(null)}></button>
              </div>
              <div className="modal-body">
                <div className="d-flex justify-content-between border-bottom pb-3 mb-3">
                  <div>
                    <h5 className="fw-bold mb-0">{printComp.emp?.nombre}</h5>
                    <div className="small text-muted">{printComp.emp?.direccion}</div>
                  </div>
                  <div className="border p-2 text-center rounded">
                    <div className="fw-bold text-uppercase">{printComp.k.tipo}</div>
                    <div className="fw-bold text-primary">
                      {printComp.k.serie}-{String(printComp.k.numero).padStart(8, '0')}
                    </div>
                  </div>
                </div>
                <div className="mb-3 small">
                  <div>
                    <strong>Cliente:</strong> {printComp.k.razon_social || printComp.o?.cliente || 'Cliente General'}
                  </div>
                  {printComp.k.doc_numero && (
                    <div>
                      <strong>Documento:</strong> {printComp.k.doc_tipo} {printComp.k.doc_numero}
                    </div>
                  )}
                </div>
                <table className="table table-sm table-bordered">
                  <thead className="table-light">
                    <tr>
                      <th>Descripción</th>
                      <th className="text-end">Cant.</th>
                      <th className="text-end">P. Unit</th>
                      <th className="text-end">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(printComp.items || []).map((it: any) => (
                      <tr key={it.id}>
                        <td>{it.descripcion}</td>
                        <td className="text-end">{it.cantidad}</td>
                        <td className="text-end">{money(it.precio)}</td>
                        <td className="text-end">{money(it.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th colSpan={3} className="text-end">
                        Subtotal
                      </th>
                      <th className="text-end">{money(printComp.k.subtotal)}</th>
                    </tr>
                    <tr>
                      <th colSpan={3} className="text-end">
                        Impuesto
                      </th>
                      <th className="text-end">{money(printComp.k.impuesto)}</th>
                    </tr>
                    <tr className="table-light">
                      <th colSpan={3} className="text-end">
                        TOTAL
                      </th>
                      <th className="text-end">{money(printComp.k.total)}</th>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="modal-footer">
                <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
                  <i className="bi bi-printer me-1"></i>Imprimir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
