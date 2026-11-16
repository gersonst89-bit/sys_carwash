import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { http, apiErrorMsg } from '../../api/http';

export const EncuestaPublicaPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [enc, setEnc] = useState<any>(null);
  const [puntaje, setPuntaje] = useState(5);
  const [recomendaria, setRecomendaria] = useState(1);
  const [comentario, setComentario] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    http
      .get(`/encuesta/${token}`)
      .then((res) => {
        setEnc(res.data);
        if (res.data?.respondido_at) setDone(true);
      })
      .catch((err) => setError(apiErrorMsg(err, 'Encuesta no encontrada.')));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await http.post(`/encuesta/${token}`, {
        puntaje,
        recomendaria,
        comentario,
      });
      setDone(true);
    } catch (err) {
      setError(apiErrorMsg(err));
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center p-3 bg-light">
      <div className="cw-card p-4" style={{ maxWidth: 460, width: '100%' }}>
        <div className="text-center mb-3">
          <div className="sb-logo mx-auto mb-2">
            <i className="bi bi-droplet-half"></i>
          </div>
          <h5 className="fw-extrabold mb-1">{enc?.empresa?.nombre || 'CarWash Pro'}</h5>
          <p className="text-muted small">Encuesta de satisfacción del servicio</p>
        </div>

        {error ? (
          <div className="alert alert-danger text-center">{error}</div>
        ) : done ? (
          <div className="text-center py-4">
            <i className="bi bi-emoji-Grin text-success display-4 d-block mb-2"></i>
            <h5 className="fw-bold">¡Muchas gracias por tu opinión!</h5>
            <p className="text-muted small">Tus comentarios nos ayudan a seguir mejorando cada día.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-3 text-center">
              <label className="form-label d-block">¿Cómo calificarías nuestro servicio?</label>
              <div className="d-flex justify-content-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`btn ${puntaje >= star ? 'btn-warning text-white' : 'btn-light border'}`}
                    onClick={() => setPuntaje(star)}
                  >
                    ★ {star}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-3 text-center">
              <label className="form-label d-block">¿Nos recomendarías con un amigo?</label>
              <div className="btn-group">
                <button
                  type="button"
                  className={`btn btn-sm ${recomendaria === 1 ? 'btn-success' : 'btn-light border'}`}
                  onClick={() => setRecomendaria(1)}
                >
                  Sí, claro
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${recomendaria === 0 ? 'btn-danger' : 'btn-light border'}`}
                  onClick={() => setRecomendaria(0)}
                >
                  No por ahora
                </button>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Comentario o sugerencia (opcional)</label>
              <textarea
                className="form-control"
                rows={3}
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-grad w-100">
              Enviar Calificación
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
