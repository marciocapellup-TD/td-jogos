import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

// Telefones/tablets usam a câmera nativa (capture); o resto (desktop) usa a
// webcam ao vivo via getUserMedia. Heurística conservadora: na dúvida, NÃO é
// mobile → cai no getUserMedia, que também força captura ao vivo.
const EH_MOBILE = typeof navigator !== 'undefined' && (
  /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent)) // iPadOS finge ser Mac
);

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

export default function FotoUpload({ userId, onUploaded, urlAtual = null, somenteCamera = false }) {
  // Se urlAtual vier (modo edição), usa como preview inicial até o user trocar.
  const [preview, setPreview] = useState(urlAtual || null);
  const [uploading, setUploading] = useState(false);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(false);
  const [trocouFoto, setTrocouFoto] = useState(false);

  const inputCamera = useRef(null);
  const inputGaleria = useRef(null);

  // Webcam ao vivo (desktop + somenteCamera).
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [camAberta, setCamAberta] = useState(false);
  const [camErro, setCamErro] = useState(false);
  const usaWebcam = somenteCamera && !EH_MOBILE;

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

  // --- Webcam ao vivo (desktop) ---
  const pararStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const abrirCamera = async () => {
    setErro(null);
    setCamErro(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setCamAberta(true);
    } catch (e) {
      console.error('[camera]', e);
      setCamErro(true);
      setCamAberta(false);
    }
  };

  // Liga o stream ao <video> quando ele monta.
  useEffect(() => {
    if (camAberta && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [camAberta]);

  // Para o stream ao desmontar.
  useEffect(() => () => pararStream(), []);

  const capturarFoto = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const maxLado = 1280;
    const escala = Math.min(1, maxLado / Math.max(video.videoWidth, video.videoHeight));
    const w = Math.round(video.videoWidth * escala);
    const h = Math.round(video.videoHeight * escala);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(video, 0, 0, w, h);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
    pararStream();
    setCamAberta(false);
    if (blob) await processar(new File([blob], 'camera.jpg', { type: 'image/jpeg' }));
  };

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

      {/* Área de captura — webcam ao vivo (desktop), câmera nativa (mobile) ou câmera+galeria (padrão) */}
      {usaWebcam ? (
        camAberta ? (
          <div>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 3, background: '#000' }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              <button type="button" className="btn btn-primary" onClick={capturarFoto} disabled={uploading} style={{ padding: '14px 10px' }}>
                📸 Capturar
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => { pararStream(); setCamAberta(false); }} disabled={uploading} style={{ padding: '14px 10px' }}>
                Cancelar
              </button>
            </div>
          </div>
        ) : camErro ? (
          <div style={{
            background: 'rgba(192,57,43,0.12)', border: '1px solid rgba(192,57,43,0.4)',
            borderLeft: '3px solid var(--vermelho)', borderRadius: 3, padding: '10px 12px', fontSize: 12,
          }}>
            <div style={{ marginBottom: 8 }}>
              Libere o acesso à <strong>câmera</strong> para registrar fruta, refeição ou água. Esse registro é só por foto tirada na hora — sem galeria.
            </div>
            <button type="button" className="btn btn-ghost" onClick={abrirCamera} style={{ padding: '8px 14px', fontSize: 12 }}>
              Tentar de novo
            </button>
          </div>
        ) : (
          <button
            type="button" className="btn btn-ghost" onClick={abrirCamera} disabled={uploading}
            style={{ width: '100%', padding: '16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <span style={{ fontSize: 20 }}>📷</span>
            <span style={{ fontSize: 12, letterSpacing: 1 }}>{preview ? 'Tirar outra' : 'Abrir câmera'}</span>
          </button>
        )
      ) : somenteCamera ? (
        // Mobile: câmera nativa do aparelho, sem galeria
        <button
          type="button" className="btn btn-ghost" onClick={() => inputCamera.current?.click()} disabled={uploading}
          style={{ width: '100%', padding: '16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <span style={{ fontSize: 20 }}>📷</span>
          <span style={{ fontSize: 12, letterSpacing: 1 }}>{preview ? 'Tirar outra' : 'Tirar foto'}</span>
        </button>
      ) : (
        // Padrão: câmera + galeria
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            type="button" className="btn btn-ghost" onClick={() => inputCamera.current?.click()} disabled={uploading}
            style={{ padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', justifyContent: 'center' }}
          >
            <span style={{ fontSize: 20 }}>📷</span>
            <span style={{ fontSize: 11, letterSpacing: 1 }}>{preview ? 'Tirar outra' : 'Tirar foto'}</span>
          </button>
          <button
            type="button" className="btn btn-ghost" onClick={() => inputGaleria.current?.click()} disabled={uploading}
            style={{ padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', justifyContent: 'center' }}
          >
            <span style={{ fontSize: 20 }}>🖼️</span>
            <span style={{ fontSize: 11, letterSpacing: 1 }}>{preview ? 'Escolher outra' : 'Enviar do dispositivo'}</span>
          </button>
        </div>
      )}

      {!preview && !camAberta && (
        <div style={{
          fontSize: 11, color: 'var(--branco-45)',
          marginTop: 8, textAlign: 'center', letterSpacing: 0.5,
        }}>
          {somenteCamera
            ? 'Só foto pela câmera, tirada na hora — sem galeria.'
            : 'Tire uma foto agora ou envie do celular, notebook ou tablet'}
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
