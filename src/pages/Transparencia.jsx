import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CATEGORIAS } from '../lib/scoring';
import { METAS_ETAPA3 } from '../lib/weeks';

const fmtHora = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});
const dataHora = (iso) => (iso ? fmtHora.format(new Date(iso)) : '—');

// regra de pontos por pilar (espelha METAS_ETAPA3 — determinística, não digitada)
const M = METAS_ETAPA3;
const REGRA = {
  energia: `${M.energia.pts_por_fruta} pt por fruta`,
  salada: `${M.salada.pts} pt por registro`,
  hidratacao: `${M.hidratacao.pts} pt por registro`,
  movimento: `${M.movimento.pts_por_bloco} pts a cada ${M.movimento.bloco_min} min`,
  mental: `${M.mental.pts_por_bloco} pts a cada ${M.mental.bloco_min} min · teto ${M.mental.max_pts_dia}/dia`,
  cultura: `${M.cultura.pts} pts · máx ${M.cultura.max_dia}/dia`,
};

function Stat({ valor, label, cor }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '14px 10px' }}>
      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 28, fontWeight: 700, color: cor || 'var(--amarelo)' }}>{valor}</div>
      <div style={{ fontSize: 11, color: 'var(--branco-45)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function Transparencia() {
  const [d, setD] = useState(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc('transparencia_resumo');
      if (error || !data) setErro(true);
      else setD(data);
    })();
  }, []);

  const org = d?.organizador;
  const fotoPct = d ? Math.round((d.fotos.com_foto / Math.max(1, d.fotos.aprovados)) * 100) : 0;

  return (
    <div>
      <h1 style={{ marginBottom: 4 }}>Transparência & Auditoria</h1>
      <p style={{ color: 'var(--branco-70)', fontSize: 13, marginBottom: 22, maxWidth: 720 }}>
        Página gerada ao vivo a partir do banco, para qualquer participante conferir que a pontuação não é
        manipulada. No desafio de bem-estar não existe "placar oficial" externo, então a garantia vem de três
        coisas: <strong>fórmula fixa de pontos</strong>, <strong>quem aprova é registrado</strong> e
        <strong> tudo fica logado</strong>.
      </p>

      {erro && <div className="card" style={{ color: 'var(--branco-70)' }}>Não foi possível carregar os dados agora. Tente recarregar.</div>}

      {/* 1. Pontuação determinística */}
      <h3 style={{ marginBottom: 10 }}>🧮 Pontos saem de fórmula fixa (ninguém digita ponto)</h3>
      <p style={{ color: 'var(--branco-70)', fontSize: 12.5, marginBottom: 12, maxWidth: 720 }}>
        Quando um registro é aprovado, o <strong>próprio sistema calcula</strong> os pontos pela regra abaixo —
        o aprovador só decide se a evidência é válida, não o quanto vale. Os tetos (mental, cultura) também são
        aplicados automaticamente.
      </p>
      <div className="card" style={{ marginBottom: 26 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <tbody>
            {Object.entries(CATEGORIAS).map(([key, c]) => (
              <tr key={key} style={{ borderBottom: '1px solid var(--borda, rgba(255,255,255,0.08))' }}>
                <td style={{ padding: '8px 6px' }}>{c.emoji} <strong>{c.label}</strong></td>
                <td style={{ padding: '8px 6px', color: 'var(--branco-70)' }}>{REGRA[key] || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 2. Números de aprovação */}
      <h3 style={{ marginBottom: 10 }}>👀 Quem aprova, e com que evidência</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 10 }}>
        <Stat valor={d ? d.posts.aprovados : '…'} label="registros aprovados" />
        <Stat valor={d ? `${fotoPct}%` : '…'} label="com foto de evidência" cor="var(--verde, #10B981)" />
        <Stat valor={d ? d.posts.pendentes : '…'} label="aguardando aprovação" />
        <Stat valor={d ? d.posts.rejeitados : '…'} label="rejeitados" />
      </div>
      <div className="card" style={{ marginBottom: 26 }}>
        <div className="label" style={{ marginBottom: 8 }}>Aprovações por revisor</div>
        {d?.revisores?.map((r) => (
          <div key={r.nome} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 13 }}>
            <span>{r.nome}</span>
            <strong style={{ fontFamily: 'Rajdhani, sans-serif' }}>{r.n}</strong>
          </div>
        ))}
        <p style={{ fontSize: 11.5, color: 'var(--branco-45)', marginTop: 10, marginBottom: 0 }}>
          A maior parte das aprovações é feita por uma pessoa que <strong>não é o organizador</strong>. Cada
          atividade exige foto tirada na hora como evidência (cobertura de {fotoPct}% nos aprovados).
        </p>
      </div>

      {/* 3. Sobre o organizador */}
      {org && (
        <div className="card" style={{ marginBottom: 26, border: '1px solid rgba(244,204,4,0.35)' }}>
          <h3 style={{ marginBottom: 8 }}>Sobre o organizador também competir</h3>
          <p style={{ fontSize: 12.5, color: 'var(--branco-70)', lineHeight: 1.7, marginBottom: 10 }}>
            O organizador (<strong>{org.nome}</strong>) participa como qualquer um. Os números dele, abertos:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
            <Stat valor={org.posts} label="registros" />
            <Stat valor={org.pontos} label="pontos (pela fórmula)" />
            <Stat valor={org.aprovados - org.auto_aprovados} label="aprovados por OUTRA pessoa" cor="var(--verde, #10B981)" />
            <Stat valor={org.auto_aprovados} label="auto-aprovados" cor={org.auto_aprovados > 10 ? 'var(--vermelho, #e74c3c)' : 'var(--branco-70)'} />
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--branco-45)', marginTop: 10, marginBottom: 0 }}>
            Mostramos inclusive o que pega mal: {org.auto_aprovados} dos {org.posts} registros dele foram aprovados
            por ele mesmo. Mesmo nesses, os pontos vieram da fórmula fixa (ele não escolhe o valor), e a ação
            ficou no log de auditoria abaixo.
          </p>
        </div>
      )}

      {/* 4. Log */}
      <h3 style={{ marginBottom: 10 }}>📜 Log imutável de alterações ({d ? d.audit_total : '…'})</h3>
      <p style={{ color: 'var(--branco-70)', fontSize: 12.5, marginBottom: 12, maxWidth: 720 }}>
        Toda criação, aprovação, edição ou exclusão é registrada com autor e horário, sem como apagar. Últimas ações:
      </p>
      <div className="card" style={{ padding: '6px 12px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 420 }}>
          <thead>
            <tr style={{ color: 'var(--branco-45)', textAlign: 'left' }}>
              <th style={{ padding: '6px' }}>Quando</th>
              <th style={{ padding: '6px' }}>Tabela</th>
              <th style={{ padding: '6px' }}>Ação</th>
              <th style={{ padding: '6px' }}>Autor</th>
            </tr>
          </thead>
          <tbody>
            {(d?.ultimas_auditorias || []).map((a, i) => (
              <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <td style={{ padding: '6px', color: 'var(--branco-45)', whiteSpace: 'nowrap' }}>{dataHora(a.created_at)}</td>
                <td style={{ padding: '6px' }}>{a.tabela}</td>
                <td style={{ padding: '6px' }}>{a.operacao}</td>
                <td style={{ padding: '6px' }}>{a.ator || '🤖 sistema'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 10.5, color: 'var(--branco-45)', textAlign: 'center', marginTop: 18 }}>
        Dados ao vivo do banco de dados · atualizado em {dataHora(new Date().toISOString())}
      </p>
    </div>
  );
}
