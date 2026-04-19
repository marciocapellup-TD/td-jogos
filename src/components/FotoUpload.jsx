import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function FotoUpload({ userId, onUploaded }) {
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [erro, setErro] = useState(null);

  const onChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErro(null);

    if (file.size > 8 * 1024 * 1024) {
      setErro('Arquivo acima de 8MB.');
      return;
    }

    setPreview(URL.createObjectURL(file));
    setUploading(true);

    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('postagens')
      .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });

    if (error) {
      setErro(error.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('postagens').getPublicUrl(path);
    setUploading(false);
    onUploaded(data.publicUrl);
  };

  return (
    <div>
      <label className="foto-upload-box">
        {preview ? (
          <img src={preview} alt="preview" style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 3 }} />
        ) : (
          <div style={{
            border: '1px dashed var(--amarelo-dim)',
            borderRadius: 3,
            padding: '40px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            background: 'var(--amarelo-soft)',
          }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>📷</div>
            <div className="label">Toque para anexar foto</div>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onChange}
          style={{ display: 'none' }}
        />
      </label>
      {uploading && <div style={{ marginTop: 8, color: 'var(--amarelo)', fontSize: 12 }}>Enviando...</div>}
      {erro && <div style={{ marginTop: 8, color: 'var(--vermelho)', fontSize: 12 }}>{erro}</div>}
    </div>
  );
}
