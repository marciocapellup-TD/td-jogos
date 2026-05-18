import { useState } from 'react';
import { METAS_ETAPA2, METAS_ETAPA1, MAX_PONTOS_DIA_PESSOA, MAX_PONTOS_CICLO } from '../lib/weeks';
import { CATEGORIAS } from '../lib/scoring';

export default function Regras() {
  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <div className="label">Como funciona</div>
      <h1 style={{ marginBottom: 18 }}>Regras do desafio · Etapa 2</h1>

      {/* Visão geral */}
      <div className="card" style={{ marginBottom: 22 }}>
        <div className="label" style={{ marginBottom: 8 }}>Visão geral</div>
        <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--branco-70)' }}>
          Segunda etapa do desafio de saúde mental. <strong style={{ color: 'var(--amarelo)' }}>21 dias corridos</strong> (18/05 a 07/06),
          em <strong style={{ color: 'var(--amarelo)' }}>3 semanas</strong> com metas crescentes.
          Agora todos os <strong style={{ color: 'var(--amarelo)' }}>26 participantes competem individualmente</strong>.
          <strong>Todos os dias pontuam</strong> — incluindo sábados, domingos e feriados. Cada ponto conta.
        </p>
      </div>

      {/* Premiação */}
      <h3 style={{ marginBottom: 12 }}>
        <span className="premio-emoji-bounce" style={{ marginRight: 6 }}>🏆</span>
        Premiação
      </h3>
      <div className="grid-cards" style={{ marginBottom: 28 }}>
        <Premio
          ordem={1}
          emoji="🥇"
          posicao="Campeão"
          premio="Kit Alta Performance"
          detalhes="Whey · Creatina · Complexo B · Coenzima Q10 · Magnésio"
          cor="#F4CC04"
        />
        <Premio
          ordem={2}
          emoji="🥈"
          posicao="2º Lugar"
          premio="Whey Protein"
          detalhes=""
          cor="#C0C0C0"
        />
        <Premio
          ordem={3}
          emoji="🥉"
          posicao="3º Lugar"
          premio="Creatina"
          detalhes=""
          cor="#CD7F32"
        />
      </div>
      <div className="card" style={{
        marginBottom: 28,
        background: 'rgba(244,204,4,0.05)',
        borderLeft: '3px solid var(--amarelo)',
      }}>
        <div style={{ fontSize: 13, color: 'var(--branco-70)', lineHeight: 1.6 }}>
          Premiação indicada pelo <strong>Dr. Fabrício</strong>. Em caso de empate, há critérios de desempate definidos.
          Pode chegar confiante — só um grande vencedor será coroado. 🏆
        </div>
      </div>

      {/* 4 categorias */}
      <h3 style={{ marginBottom: 12 }}>As 4 categorias</h3>
      <div className="grid-cards" style={{ marginBottom: 28 }}>
        <CategoriaCard
          emoji="🍎🥗"
          cor={CATEGORIAS.energia.cor}
          titulo="Energia"
          pontos="até +3 pts/dia"
          descricao="2 frutas (+1 cada) + 1 vegetal/salada no almoço ou janta (+1)"
          limite="Frutas: até 2/dia, em 1 ou 2 posts · Vegetal: 1/dia"
        />
        <CategoriaCard
          emoji="💧"
          cor={CATEGORIAS.hidratacao.cor}
          titulo="Hidratação"
          pontos="até +3 pts/dia"
          descricao="3 registros distintos com a garrafinha: manhã, tarde e noite (+1 cada)"
          limite="1 registro por horário"
        />
        <CategoriaCard
          emoji="🏃"
          cor={CATEGORIAS.movimento.cor}
          titulo="Movimento"
          pontos="+4 pts/dia"
          descricao="Print do Strava ou outro app de exercício"
          limite="1 registro por dia · meta cresce +5 min/semana"
          minutos={METAS_ETAPA2.movimento}
        />
        <CategoriaCard
          emoji="🧠"
          cor={CATEGORIAS.mental.cor}
          titulo="Mental"
          pontos="+2 pts/dia"
          descricao="Print Calm, Headspace ou app de meditação/respiração"
          limite="1 registro por dia · meta cresce +1 min/semana"
          minutos={METAS_ETAPA2.mental}
        />
      </div>

      {/* Progressão por semana */}
      <h3 style={{ marginBottom: 12 }}>Progressão das metas</h3>
      <div className="card" style={{ marginBottom: 28, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{
              textAlign: 'left', color: 'var(--amarelo)',
              fontFamily: 'Rajdhani', letterSpacing: 1.5, textTransform: 'uppercase', fontSize: 11,
              borderBottom: '1px solid rgba(244,204,4,0.3)',
            }}>
              <th style={{ padding: 10 }}>Semana</th>
              <th style={{ padding: 10 }}>Período</th>
              <th style={{ padding: 10 }}>🏃 Movimento</th>
              <th style={{ padding: 10 }}>🧠 Mental</th>
              <th style={{ padding: 10 }}>🍎🥗 Energia / 💧 Hidratação</th>
            </tr>
          </thead>
          <tbody>
            <LinhaSemana n={1} periodo="18/05 a 24/05 (seg a dom)" mov={METAS_ETAPA2.movimento[1]} men={METAS_ETAPA2.mental[1]} />
            <LinhaSemana n={2} periodo="25/05 a 31/05 (seg a dom)" mov={METAS_ETAPA2.movimento[2]} men={METAS_ETAPA2.mental[2]} />
            <LinhaSemana n={3} periodo="01/06 a 07/06 (seg a dom)" mov={METAS_ETAPA2.movimento[3]} men={METAS_ETAPA2.mental[3]} />
          </tbody>
        </table>
        <div style={{ fontSize: 11, color: 'var(--branco-45)', marginTop: 10, fontStyle: 'italic' }}>
          Se você não bater o mínimo de minutos da semana, o post pode ser aprovado mas ganha 0 pts.
        </div>
      </div>

      {/* Como postar */}
      <h3 style={{ marginBottom: 12 }}>Como postar</h3>
      <div className="card" style={{ marginBottom: 28 }}>
        <ol style={{ paddingLeft: 20, fontSize: 13, lineHeight: 1.8, color: 'var(--branco-70)' }}>
          <li>Na Home, clica no card da categoria (🍎🥗 / 💧 / 🏃 / 🧠)</li>
          <li>Em <strong>Energia</strong>: escolhe Frutas (quantas) ou Vegetal/Salada</li>
          <li>Em <strong>Hidratação</strong>: escolhe o horário (Manhã / Tarde / Noite)</li>
          <li>Em <strong>Movimento</strong>/<strong>Mental</strong>: informa minutos registrados no app</li>
          <li>Anexa foto comprovando (câmera ou galeria do celular)</li>
          <li>Envia para aprovação</li>
          <li>Admin aprova (ou reprova com motivo) — só aí os pontos contam</li>
          <li>Acompanha em <strong>"Meus posts"</strong> o status de cada envio</li>
        </ol>
      </div>

      {/* Regras importantes */}
      <h3 style={{ marginBottom: 12 }}>Regras importantes</h3>
      <div className="grid-cards" style={{ marginBottom: 28 }}>
        <Regra emoji="📅" titulo="Sem backfill">
          O post é registrado com a <strong>data de hoje</strong>. Esqueceu ontem? Não dá pra recuperar.
        </Regra>
        <Regra emoji="🚫" titulo="Limite diário por pessoa">
          <strong>2 frutas</strong> + <strong>1 vegetal</strong> + <strong>3 hidratações</strong> (1 por horário) + <strong>1 movimento</strong> + <strong>1 mental</strong>. Máximo de <strong>{MAX_PONTOS_DIA_PESSOA} pts/dia</strong>.
        </Regra>
        <Regra emoji="🎉" titulo="Bateu a meta do dia?">
          Quando você somar <strong>{MAX_PONTOS_DIA_PESSOA} pts no dia</strong>, aparece uma mensagem de parabéns e <strong>você não precisa postar mais</strong> — pode descansar.
        </Regra>
        <Regra emoji="✅" titulo="Aprovação manual">
          Todo post fica <strong>pendente</strong> até o admin aprovar. Pontos só entram no placar depois da aprovação.
        </Regra>
        <Regra emoji="❌" titulo="Posts podem ser reprovados">
          Se a foto não comprovar (ex: print sem minutos visíveis, foto duplicada, hidratação sem horário visível), o admin pode reprovar com motivo.
        </Regra>
        <Regra emoji="🏆" titulo="Competição individual">
          Cada participante compete por si. Pontuação <strong>não soma mais por grupo</strong> — o foco é a sua evolução pessoal.
        </Regra>
        <Regra emoji="⚖️" titulo="Critério de desempate">
          Em caso de empate nos pontos, quem <strong>postou primeiro</strong> fica na frente. Considera a hora do <em>envio do post pelo usuário</em> — não a hora da aprovação do admin. Em caso de empate, há critérios de desempate definidos. Pode chegar confiante — só um grande vencedor será coroado. 🏆
        </Regra>
      </div>

      {/* Ordenação do ranking */}
      <h3 style={{ marginBottom: 12 }}>Como o ranking é calculado</h3>
      <div className="card" style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 13, lineHeight: 1.75, color: 'var(--branco-70)' }}>
          <div style={{ marginBottom: 10 }}>
            <strong style={{ color: 'var(--amarelo)' }}>1º critério:</strong> total de pontos acumulados (decrescente).
          </div>
          <div style={{ marginBottom: 10 }}>
            <strong style={{ color: 'var(--amarelo)' }}>2º critério (desempate):</strong> quem chegou aos pontos primeiro. Comparamos a <strong>hora do post</strong> mais recente que contribuiu com pontos.
          </div>
          <div style={{ marginBottom: 10 }}>
            <strong style={{ color: 'var(--amarelo)' }}>3º critério:</strong> quem ainda não pontuou fica por último.
          </div>
          <div style={{
            marginTop: 14, paddingTop: 12,
            borderTop: '1px solid rgba(255,255,255,0.05)',
            fontSize: 11, color: 'var(--branco-45)', fontStyle: 'italic',
          }}>
            A hora considerada é quando <strong>você envia</strong> o post, não quando o admin aprova. Se o admin demora pra avaliar, isso não te prejudica no desempate.
          </div>
        </div>
      </div>

      {/* Pontuação máxima teórica */}
      <div className="card" style={{
        borderTopColor: 'var(--amarelo)',
        background: 'linear-gradient(135deg, rgba(244,204,4,0.08), transparent)',
        marginBottom: 28,
      }}>
        <div className="label" style={{ marginBottom: 8 }}>Pontuação máxima</div>
        <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--branco-70)' }}>
          <div style={{ fontSize: 11, color: 'var(--branco-45)', marginBottom: 8 }}>
            Considerando os 21 dias do desafio (18/05 a 07/06)
          </div>
          <div>🍎 <strong>2 frutas/dia × 21</strong> = <strong style={{ color: 'var(--amarelo)' }}>42 pts</strong></div>
          <div>🥗 <strong>1 vegetal/dia × 21</strong> = <strong style={{ color: 'var(--amarelo)' }}>21 pts</strong></div>
          <div>💧 <strong>3 hidratações/dia × 21</strong> = <strong style={{ color: 'var(--amarelo)' }}>63 pts</strong></div>
          <div>🏃 <strong>1 movimento × 21 × 4 pts</strong> = <strong style={{ color: 'var(--amarelo)' }}>84 pts</strong></div>
          <div>🧠 <strong>1 mental × 21 × 2 pts</strong> = <strong style={{ color: 'var(--amarelo)' }}>42 pts</strong></div>
          <div style={{
            marginTop: 12, paddingTop: 12,
            borderTop: '1px solid rgba(244,204,4,0.2)',
            fontSize: 15,
          }}>
            Total máximo no ciclo: <strong style={{ color: 'var(--amarelo)', fontSize: 18 }}>{MAX_PONTOS_CICLO} pts</strong>
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--branco-45)' }}>
            Máximo por dia: <strong>{MAX_PONTOS_DIA_PESSOA} pts</strong>.
          </div>
        </div>
      </div>

      {/* Histórico Etapa 1 */}
      <HistoricoEtapa1 />
    </div>
  );
}

function HistoricoEtapa1() {
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
          {aberto ? '▼' : '▶'} Regras da Etapa 1 (20/04 → 10/05 · encerrada)
        </span>
      </button>
      {aberto && (
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--branco-70)', lineHeight: 1.7 }}>
          <p>
            <strong>Etapa 1:</strong> 21 dias em <strong>5 grupos</strong> de 5–6 pessoas. Máximo 7 pts/dia por pessoa, 35 pts/dia por grupo.
          </p>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li>🍎 <strong>Energia:</strong> +1 pt por fruta · máx 2/dia</li>
            <li>🏃 <strong>Movimento:</strong> +3 pts · semanas {METAS_ETAPA1.movimento[1]}/{METAS_ETAPA1.movimento[2]}/{METAS_ETAPA1.movimento[3]} min</li>
            <li>🧠 <strong>Mental:</strong> +2 pts · semanas {METAS_ETAPA1.mental[1]}/{METAS_ETAPA1.mental[2]}/{METAS_ETAPA1.mental[3]} min</li>
          </ul>
          <p style={{ marginTop: 10, fontStyle: 'italic', color: 'var(--branco-45)' }}>
            O Dashboard mostra o resultado histórico no toggle "Etapa 1".
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

function CategoriaCard({ emoji, cor, titulo, pontos, descricao, limite, minutos }) {
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
      {minutos && (
        <div style={{
          marginTop: 10, padding: '8px 10px',
          background: 'rgba(255,255,255,0.03)',
          borderLeft: `2px solid ${cor}`,
          fontSize: 11, color: 'var(--branco-70)',
        }}>
          <div>Semana 1: <strong>{minutos[1]} min/dia</strong></div>
          <div>Semana 2: <strong>{minutos[2]} min/dia</strong></div>
          <div>Semana 3: <strong>{minutos[3]} min/dia</strong></div>
        </div>
      )}
    </div>
  );
}

function LinhaSemana({ n, periodo, mov, men }) {
  return (
    <tr style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <td style={{ padding: 10, fontWeight: 600, color: 'var(--amarelo)', fontFamily: 'Rajdhani', fontSize: 16 }}>
        {n}
      </td>
      <td style={{ padding: 10, color: 'var(--branco-70)' }}>{periodo}</td>
      <td style={{ padding: 10 }}>≥ {mov} min · <span style={{ color: 'var(--amarelo)' }}>+4 pts</span></td>
      <td style={{ padding: 10 }}>≥ {men} min · <span style={{ color: 'var(--amarelo)' }}>+2 pts</span></td>
      <td style={{ padding: 10, fontSize: 11 }}>até +3 pts cada</td>
    </tr>
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
