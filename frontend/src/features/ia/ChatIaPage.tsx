import React, { useState, useEffect } from 'react';
import { http, apiErrorMsg } from '../../api/http';

export const ChatIaPage: React.FC = () => {
  const [estado, setEstado] = useState<any>(null);
  const [mensajes, setMensajes] = useState<Array<{ role: 'user' | 'bot'; texto: string; tabla?: any }>>([
    {
      role: 'bot',
      texto: '¡Hola! Soy el asistente de CarWash Pro. Pregúntame sobre ventas, órdenes, clientes, stock o cómo usar cualquier módulo.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    http.get('/ia/chat/estado').then((r) => setEstado(r.data)).catch(() => {});
  }, []);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');
    const nextHist = [...mensajes, { role: 'user' as const, texto: msg }];
    setMensajes(nextHist);
    setLoading(true);
    try {
      const historial = [];
      for (let i = 1; i < mensajes.length; i += 2) {
        if (mensajes[i]?.role === 'user' && mensajes[i + 1]?.role === 'bot') {
          historial.push({ q: mensajes[i].texto, a: mensajes[i + 1].texto });
        }
      }
      const { data } = await http.post('/ia/chat/enviar', { mensaje: msg, historial });
      setMensajes([...nextHist, { role: 'bot', texto: data.texto, tabla: data.tabla }]);
    } catch (err) {
      setMensajes([...nextHist, { role: 'bot', texto: `⚠️ ${apiErrorMsg(err)}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid py-2">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="fw-bold mb-0">
            <i className="bi bi-chat-dots text-primary me-2"></i>Chat IA Conversacional
          </h4>
          <small className="text-muted">
            Proveedor activo: {estado?.proveedor || 'Gemini / Groq'}
          </small>
        </div>
        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={() =>
            setMensajes([
              {
                role: 'bot',
                texto: 'Conversación reiniciada. ¿En qué puedo ayudarte hoy?',
              },
            ])
          }
        >
          <i className="bi bi-trash me-1"></i>Limpiar chat
        </button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body" style={{ height: '62vh', overflowY: 'auto' }}>
          {mensajes.map((m, idx) => (
            <div
              key={idx}
              className={`d-flex mb-3 ${m.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
            >
              <div
                className={`p-3 rounded-3 shadow-sm ${
                  m.role === 'user' ? 'bg-primary text-white' : 'bg-light text-dark'
                }`}
                style={{ maxWidth: '78%' }}
              >
                <div style={{ whiteSpace: 'pre-wrap' }}>{m.texto}</div>
                {m.tabla?.columnas && m.tabla.filas?.length > 0 && (
                  <div className="table-responsive mt-2 bg-white rounded p-1">
                    <table className="table table-sm table-bordered mb-0 small">
                      <thead>
                        <tr>
                          {m.tabla.columnas.map((c: string) => (
                            <th key={c}>{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {m.tabla.filas.map((f: any[], rIdx: number) => (
                          <tr key={rIdx}>
                            {f.map((v: any, cIdx: number) => (
                              <td key={cIdx}>{v ?? '-'}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && <div className="text-muted small">Escribiendo respuesta...</div>}
        </div>
        <div className="card-footer bg-white">
          <form onSubmit={enviar} className="d-flex gap-2">
            <input
              type="text"
              className="form-control"
              placeholder="Escribe tu consulta sobre el negocio o cómo usar el sistema..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button className="btn btn-primary px-4" type="submit" disabled={loading}>
              Enviar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
