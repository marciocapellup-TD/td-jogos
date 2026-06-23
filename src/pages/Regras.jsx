import { useState } from 'react';
import { METAS_ETAPA2, METAS_ETAPA1 } from '../lib/weeks';
import { PREMIOS_ETAPA3 } from '../lib/premios';

export default function Regras() {
  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <div className="label">Como funciona</div>
      <h1 style={{ marginBottom: 18 }}>Regras do desafio · Etapa 3</h1>

      {/* Visão geral */}
      <div className="card" style={{ marginBottom: 22 }}>
        <div className="label" style={{ marginBottom: 8 }}>Visão geral</div>
        <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--branco-70)' }}>
          Terceira e penúltima etapa do desafio. <strong style={{ color: 'var(--amarelo)' }}>30 dias corridos</strong> (22/06 a 21/07),
          todos competindo <strong style={{ color: 'var(--amarelo)' }}>individualmente</strong>. Agora as metas são <strong>planas</strong> (não mudam por semana) —
          o foco é a <strong style={{ color: 'var(--amarelo)' }}>constância</strong>. E o melhor: <strong style={{ color: 'var(--amarelo)' }}>não há pontuação máxima</strong> —
          quanto mais você faz, mais pontos conquista. Os pontos de cada pilar são a <strong>meta mínima diária</strong> de referência.
        </p>
      </div>

      {/* Premiação */}
      <h3 style={{ marginBottom: 12 }}>
        <span className="premio-emoji-bounce" style={{ marginRight: 6 }}>🏆</span>
        Premiação
      </h3>
      <div className="grid-cards" style={{ marginBottom: 28 }}>
        {PREMIOS_ETAPA3.map((p) => (
          <Premio key={p.ordem} {...p} />
        ))}
      </div>
      <div className="card" style={{
        marginBottom: 28,
        background: 'rgba(244,204,4,0.05)',
        borderLeft: '3px solid var(--amarelo)',
      }}>
        <div style={{ fontSize: 13, color: 'var(--branco-70)', lineHeight: 1.6 }}>
          Pilar Cultura acrescentado junto com o <strong>Dr. Fabrício</strong>: saúde vai além do corpo — aprender, explorar e criar também cuida da mente.
          Em caso de empate, há critérios de desempate definidos. Pode chegar confiante. 🏆
        </div>
      </div>

      {/* 6 pilares */}
      <h3 style={{ marginBottom: 12 }}>Os 6 pilares</h3>
      <div className="grid-cards" style={{ marginBottom: 28 }}>
        <CategoriaCard emoji="🍎" cor="#10B981" titulo="Energia" pontos="1 pt / fruta"
          descricao="Foto tirada na hora (câmera). Comeu 5? Ganha 5 pontos." limite="Tempo real · sem galeria · meta 3/dia" />
        <CategoriaCard emoji="🥗" cor="#22C55E" titulo="Salada e Vegetais" pontos="1 pt / refeição"
          descricao="Salada/vegetal no almoço e na janta, foto tirada na hora." limite="Tempo real · sem galeria · meta 2/dia" />
        <CategoriaCard emoji="💧" cor="#06B6D4" titulo="Hidratação" pontos="1 pt / registro"
          descricao="Garrafinha + horário, foto tirada na hora (sem galeria)." limite="Tempo real · sem galeria · meta 3/dia" />
        <CategoriaCard emoji="🏃" cor="#3B82F6" titulo="Movimento" pontos="5 pts / 50 min"
          descricao="Print do Strava ou Adidas Running com data, horário e duração da atividade." limite="Sem teto · 100 min = 10 pts" />
        <CategoriaCard emoji="🧠" cor="#8B5CF6" titulo="Mental" pontos="4 pts / 10 min"
          descricao="Print Calm, Headspace ou app de meditação." limite="Máx 20 min/dia (8 pts) · Dr. Fabrício" />
        <CategoriaCard emoji="🎭" cor="#F59E0B" titulo="Cultura" pontos="3 pts / atividade"
          descricao="Ler um livro, ouvir um podcast, hobby/arte ou exposição." limite="Mínimo 1 · máximo 2 por dia" />
      </div>

      {/* Sem teto */}
      <div className="card" style={{
        borderTopColor: 'var(--amarelo)',
        background: 'linear-gradient(135deg, rgba(244,204,4,0.08), transparent)',
        marginBottom: 28,
      }}>
        <div className="label" style={{ marginBottom: 8 }}>🚀 Quanto mais constância, mais pontos</div>
        <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--branco-70)' }}>
          Frutas, salada, hidratação e movimento <strong>não têm teto</strong> — quanto mais hábitos saudáveis
          na sua rotina, mais pontos conquista:
          <div style={{ marginTop: 8 }}>🍎 5 frutas no dia = <strong style={{ color: 'var(--amarelo)' }}>5 pts</strong></div>
          <div>🥗 salada no almoço e na janta = <strong style={{ color: 'var(--amarelo)' }}>2 pts</strong></div>
          <div>🏃 musculação de manhã + vôlei à noite (2×50 min) = <strong style={{ color: 'var(--amarelo)' }}>10 pts</strong></div>
          <div style={{ marginTop: 10, color: 'var(--branco-45)' }}>
            🧠 Mental e 🎭 Cultura têm <strong>limite saudável</strong>: até 20 min/dia de mental (8 pts) e no máximo 2 atividades culturais por dia.
          </div>
        </div>
      </div>

      {/* Como postar */}
      <h3 style={{ marginBottom: 12 }}>Como postar</h3>
      <div className="card" style={{ marginBottom: 28 }}>
        <ol style={{ paddingLeft: 20, fontSize: 13, lineHeight: 1.8, color: 'var(--branco-70)' }}>
          <li>Na Home, clica no card do pilar (🍎 / 🥗 / 💧 / 🏃 / 🧠 / 🎭)</li>
          <li>Em <strong>Energia</strong>: informa quantas frutas comeu</li>
          <li>Em <strong>Cultura</strong>: escolhe a atividade (livro, podcast, hobby ou exposição)</li>
          <li>Em <strong>Movimento</strong>/<strong>Mental</strong>: informa os minutos registrados no app</li>
          <li>Anexa a foto comprovando (câmera ou galeria)</li>
          <li>Envia para aprovação — pode registrar quantas vezes quiser no dia</li>
          <li>Admin aprova (ou reprova com motivo) — só aí os pontos contam</li>
        </ol>
      </div>

      {/* Regras importantes */}
      <h3 style={{ marginBottom: 12 }}>Regras importantes</h3>
      <div className="grid-cards" style={{ marginBottom: 28 }}>
        <Regra emoji="📅" titulo="Sem backfill">
          O post é registrado com a <strong>data de hoje</strong>. Esqueceu ontem? Não dá pra recuperar.
        </Regra>
        <Regra emoji="🚀" titulo="Sem teto de pontos">
          Não há máximo diário. Cada registro aprovado <strong>soma</strong> na sua pontuação — quanto mais constância, mais pontos.
        </Regra>
        <Regra emoji="✅" titulo="Aprovação manual">
          Todo post fica <strong>pendente</strong> até o admin aprovar. Pontos só entram no placar depois da aprovação.
        </Regra>
        <Regra emoji="❌" titulo="Posts podem ser reprovados">
          Se a foto não comprovar (ex: print sem minutos visíveis, foto duplicada), o admin pode reprovar com motivo. Você pode postar de novo.
        </Regra>
        <Regra emoji="🏆" titulo="Competição individual">
          Cada participante compete por si. O foco é a sua evolução pessoal e a constância nos 30 dias.
        </Regra>
        <Regra emoji="⚖️" titulo="Critério de desempate">
          Em caso de empate nos pontos, quem <strong>chegou primeiro à pontuação</strong> fica na frente (hora do envio do post, não da aprovação).
        </Regra>
      </div>

      {/* Histórico */}
      <HistoricoEtapas />
    </div>
  );
}

function HistoricoEtapas() {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="card" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className="btn btn-ghost"
        style={{ width: '100%', textAlign: 'left', padding: '6px 0' }}
      >
        <span style={{ fontFamily: 'Rajdhani', letterSpacing: 1, fontSize: 12, textTransform: 'uppercase' }}>
          {aberto ? '▼' : '▶'} Etapas anteriores (1 e 2 · encerradas)
        </span>
      </button>
      {aberto && (
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--branco-70)', lineHeight: 1.7 }}>
          <p>
            <strong>Etapa 2</strong> (18/05 → 07/06): individual, 21 dias com metas crescentes por semana e teto de 12 pts/dia (252 no ciclo).
            Energia (fruta/vegetal), hidratação (3 horários), movimento ({METAS_ETAPA2.movimento[1]}/{METAS_ETAPA2.movimento[2]}/{METAS_ETAPA2.movimento[3]} min) e mental.
          </p>
          <p style={{ marginTop: 10 }}>
            <strong>Etapa 1</strong> (20/04 → 10/05): 5 grupos, máx 7 pts/dia por pessoa.
            Energia +1/fruta, movimento +3 ({METAS_ETAPA1.movimento[1]}/{METAS_ETAPA1.movimento[2]}/{METAS_ETAPA1.movimento[3]} min) e mental +2.
          </p>
          <p style={{ marginTop: 10, fontStyle: 'italic', color: 'var(--branco-45)' }}>
            O Dashboard mostra o resultado histórico das duas no seletor de etapas.
          </p>
        </div>
      )}
    </div>
  );
}

function Premio({ ordem = 1, emoji, posicao, premio, detalhes, cor }) {
  return (
    <div
      className={`card premio-pulse premio-pulse-${ordem}`}
      style={{ borderTopColor: cor, textAlign: 'center', position: 'relative', overflow: 'hidden' }}
    >
      <div style={{ fontSize: 50, marginBottom: 4 }} className="premio-emoji-bounce">{emoji}</div>
      <div className="label" style={{ color: cor, letterSpacing: 1.5 }}>{posicao}</div>
      <div style={{
        fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 700,
        color: 'var(--amarelo)', marginTop: 4, lineHeight: 1.15,
      }}>
        {premio}
      </div>
      {detalhes && (
        <div style={{ fontSize: 11, color: 'var(--branco-70)', marginTop: 6, lineHeight: 1.5 }}>
          {detalhes}
        </div>
      )}
    </div>
  );
}

function CategoriaCard({ emoji, cor, titulo, pontos, descricao, limite }) {
  return (
    <div className="card" style={{ borderTopColor: cor }}>
      <div style={{ fontSize: 32 }}>{emoji}</div>
      <div className="label" style={{ color: cor, marginTop: 4 }}>{titulo}</div>
      <div style={{
        fontFamily: 'Rajdhani', fontSize: 18, fontWeight: 700,
        color: 'var(--amarelo)', marginTop: 2,
      }}>
        {pontos}
      </div>
      <div style={{ fontSize: 12, color: 'var(--branco-70)', marginTop: 6, lineHeight: 1.5 }}>
        {descricao}
      </div>
      <div style={{ fontSize: 11, color: 'var(--branco-45)', marginTop: 6, fontStyle: 'italic' }}>
        {limite}
      </div>
    </div>
  );
}

function Regra({ emoji, titulo, children }) {
  return (
    <div className="card">
      <div style={{ fontSize: 24, marginBottom: 4 }}>{emoji}</div>
      <div className="label" style={{ marginBottom: 6 }}>{titulo}</div>
      <div style={{ fontSize: 12, color: 'var(--branco-70)', lineHeight: 1.6 }}>
        {children}
      </div>
    </div>
  );
}
