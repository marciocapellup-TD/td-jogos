import { useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

// Comprime/redimensiona a imagem no navegador (canvas, sem lib externa) antes do
// upload: max 1280px no maior lado, JPEG q0.7. Foto de celular (~1,5MB) cai pra
// ~150-300KB, segurando o Storage. Retorna null se não der (HEIC indecodável,
// etc.) → o chamador faz fallback pro arquivo original.
async function comprimirImagem(file, maxLado = 1280, quality = 0.7) {
  try {
    const dataUrl = await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });
    const img = await new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = dataUrl;
    });
    const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
    const w = Math.round(img.width * escala);
    const h = Math.round(img.height * escala);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    return await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
  } catch {
    return null;
  }
}

export default function FotoUpload({ userId, onUploaded, urlAtual = null }) {
  // Se urlAtual vier (modo edição), usa como preview inicial até o user trocar.
  const [preview, setPreview] = useState(urlAtual || null);
  const [uploading, setUploading] = useState(false);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(false);
  const [trocouFoto, setTrocouFoto] = useState(false);

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

    // Comprime antes de subir. Se falhar ou não reduzir, mantém o original.
    let toUpload = file;
    let ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    let contentType = file.type || 'image/jpeg';
    const comprimido = await comprimirImagem(file);
    if (comprimido && comprimido.size < file.size) {
      toUpload = comprimido;
      ext = 'jpg';
      contentType = 'image/jpeg';
    }

    const path = `${userId}/${Date.now()}.${ext || 'jpg'}`;

    const { error } = await supabase.storage
      .from('postagens')
      .upload(path, toUpload, { cacheControl: '3600', upsert: false, contentType });

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
    const publicUrl = data?.publicUrl;

    // Defesa: se getPublicUrl não retornou URL válida, falha visível em vez de
    // deixar o botão "Enviar" preso em estado disabled silencioso (bug histórico
    // que afetou várias usuárias com posts perdidos pela manhã).
    if (!publicUrl || !/^https?:\/\//i.test(publicUrl)) {
      console.error('[upload] publicUrl inválida:', data);
      setErro('Falha ao gerar URL pública da foto. Tente enviar de novo ou troque a foto.');
      setUploading(false);
      return;
    }

    setUploading(false);
    setSucesso(true);
    setTrocouFoto(true);
    onUploaded(publicUrl);
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
          {urlAtual && !trocouFoto && (
            <div style={{
              position: 'absolute',
              top: 8, left: 8,
              background: 'rgba(0,0,0,0.6)', color: '#fff',
              padding: '3px 10px', borderRadius: 3,
              fontSize: 10, fontFamily: 'Rajdhani', fontWeight: 700,
              letterSpacing: 1.5, textTransform: 'uppercase',
            }}>
              foto atual
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
