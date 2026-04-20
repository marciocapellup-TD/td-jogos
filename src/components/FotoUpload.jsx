import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function FotoUpload({ userId, onUploaded }) {
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(false);

  const onChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErro(null);
    setSucesso(false);

    if (file.size > 8 * 1024 * 1024) {
      setErro('Arquivo acima de 8 MB. Tenta uma foto menor.');
      return;
    }

    setPreview(URL.createObjectURL(file));
    setUploading(true);

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${userId}/${Date.now()}.${ext || 'jpg'}`;

    const { error } = await supabase.storage
      .from('postagens')
      .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });

    if (error) {
      console.error('[upload] erro:', error);
      let mensagem = error.message;
      if (/bucket.*(not.*found|not.*exist)/i.test(mensagem)) {
        mensagem = 'Bucket "postagens" não foi criado no Supabase Storage. Fala com o admin.';
      } else if (/row-level security|rls|policy/i.test(mensagem)) {
        mensagem = 'Permissão de upload negada. Policies de storage podem estar faltando.';
      }
      setErro(mensagem);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('postagens').getPublicUrl(path);
    setUploading(false);
    setSucesso(true);
    onUploaded(data.publicUrl);
  };

  return (
    <div>
      <label className="foto-upload-box" style={{ display: 'block', cursor: 'pointer' }}>
        {preview ? (
          <div style={{ position: 'relative' }}>
            <img src={preview} alt="preview" style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 3 }} />
            {sucesso && (
              <div style={{
                position: 'absolute',
                top: 8, right: 8,
                background: 'var(--verde)',
                color: '#fff',
                padding: '3px 10px',
                borderRadius: 3,
                fontSize: 10,
                fontFamily: 'Rajdhani',
                fontWeight: 700,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
              }}>
                ✓ Enviada
              </div>
            )}
            <div style={{
              position: 'absolute', bottom: 8, right: 8,
              background: 'rgba(0,0,0,0.6)', color: '#fff',
              padding: '4px 10px', borderRadius: 3, fontSize: 10, fontFamily: 'Rajdhani', letterSpacing: 1,
            }}>
              Toque para trocar
            </div>
          </div>
        ) : (
          <div style={{
            border: '1px dashed var(--amarelo-dim)',
            borderRadius: 3,
            padding: '40px 16px',
            textAlign: 'center',
            background: 'var(--amarelo-soft)',
          }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>📷</div>
            <div className="label">Toque para anexar foto</div>
            <div style={{ fontSize: 10, color: 'var(--branco-45)', marginTop: 6, letterSpacing: 1 }}>
              Câmera ou galeria
            </div>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={onChange}
          style={{ display: 'none' }}
        />
      </label>
      {uploading && <div style={{ marginTop: 8, color: 'var(--amarelo)', fontSize: 12 }}>Enviando...</div>}
      {erro && (
        <div style={{
          marginTop: 10,
          background: 'rgba(192,57,43,0.15)',
          border: '1px solid rgba(192,57,43,0.4)',
          borderLeft: '3px solid var(--vermelho)',
          color: '#fff',
          padding: '8px 12px',
          borderRadius: 3,
          fontSize: 12,
        }}>
          {erro}
        </div>
      )}
    </div>
  );
}
