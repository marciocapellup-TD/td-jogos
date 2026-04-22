import { useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function FotoUpload({ userId, onUploaded }) {
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(false);

  const inputCamera = useRef(null);
  const inputGaleria = useRef(null);

  const processar = async (file) => {
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

  const onChangeCamera  = (e) => processar(e.target.files?.[0]);
  const onChangeGaleria = (e) => processar(e.target.files?.[0]);

  return (
    <div>
      {/* Inputs escondidos — um força câmera, outro file picker padrão */}
      <input
        ref={inputCamera}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onChangeCamera}
        style={{ display: 'none' }}
      />
      <input
        ref={inputGaleria}
        type="file"
        accept="image/*"
        onChange={onChangeGaleria}
        style={{ display: 'none' }}
      />

      {/* Preview da foto escolhida */}
      {preview && (
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <img
            src={preview}
            alt="preview"
            style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 3 }}
          />
          {sucesso && (
            <div style={{
              position: 'absolute',
              top: 8, right: 8,
              background: 'var(--verde)', color: '#fff',
              padding: '3px 10px', borderRadius: 3,
              fontSize: 10, fontFamily: 'Rajdhani', fontWeight: 700,
              letterSpacing: 1.5, textTransform: 'uppercase',
            }}>
              ✓ Enviada
            </div>
          )}
        </div>
      )}

      {/* 2 botões explícitos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => inputCamera.current?.click()}
          disabled={uploading}
          style={{ padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', justifyContent: 'center' }}
        >
          <span style={{ fontSize: 20 }}>📷</span>
          <span style={{ fontSize: 11, letterSpacing: 1 }}>
            {preview ? 'Tirar outra' : 'Tirar foto'}
          </span>
        </button>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => inputGaleria.current?.click()}
          disabled={uploading}
          style={{ padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', justifyContent: 'center' }}
        >
          <span style={{ fontSize: 20 }}>🖼️</span>
          <span style={{ fontSize: 11, letterSpacing: 1 }}>
            {preview ? 'Escolher outra' : 'Enviar do dispositivo'}
          </span>
        </button>
      </div>

      {!preview && (
        <div style={{
          fontSize: 11, color: 'var(--branco-45)',
          marginTop: 8, textAlign: 'center', letterSpacing: 0.5,
        }}>
          Tire uma foto agora ou envie do celular, notebook ou tablet
        </div>
      )}

      {uploading && (
        <div style={{ marginTop: 10, color: 'var(--amarelo)', fontSize: 12, textAlign: 'center' }}>
          Enviando...
        </div>
      )}
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
