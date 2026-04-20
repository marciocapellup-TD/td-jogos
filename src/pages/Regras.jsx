import { METAS } from '../lib/weeks';
import { CATEGORIAS } from '../lib/scoring';

export default function Regras() {
  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <div className="label">Como funciona</div>
      <h1 style={{ marginBottom: 18 }}>Regras do desafio</h1>

      {/* Visão geral */}
      <div className="card" style={{ marginBottom: 22 }}>
        <div className="label" style={{ marginBottom: 8 }}>Visão geral</div>
        <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--branco-70)' }}>
          Desafio de <strong style={{ color: 'var(--amarelo)' }}>21 dias</strong> (20/04 a 10/05),
          dividido em <strong style={{ color: 'var(--amarelo)' }}>3 semanas</strong>, com metas
          crescentes. São <strong style={{ color: 'var(--amarelo)' }}>26 participantes em 5 grupos</strong>.
          Quanto mais você participar, mais pontos soma para o seu time.
        </p>
      </div>

      {/* 3 categorias */}
      <h3 style={{ marginBottom: 12 }}>As 3 categorias</h3>
      <div className="grid-cards" style={{ marginBottom: 28 }}>
        <CategoriaCard
          emoji="🍎"
          cor={CATEGORIAS.energia.cor}
          titulo="Energia"
          pontos="+1 ponto por fruta"
          descricao="Foto de fruta consumida no horário de trabalho"
          limite="Máximo 2 frutas por dia (até +2 pts)"
          minutos={null}
        />
        <CategoriaCard
          emoji="🏃"
          cor={CATEGORIAS.movimento.cor}
          titulo="Movimento"
          pontos="+3 pontos por dia"
          descricao="Print do Strava ou outro app de exercício"
          limite="1 registro por dia"
          minutos={METAS.movimento}
        />
        <CategoriaCard
          emoji="🧠"
          cor={CATEGORIAS.mental.cor}
          titulo="Controle mental"
          pontos="+2 pontos por dia"
          descricao="Print do Calm, Headspace ou app de meditação/respiração"
          limite="1 registro por dia"
          minutos={METAS.mental}
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
              <th style={{ padding: 10 }}>🍎 Energia</th>
            </tr>
          </thead>
          <tbody>
            <LinhaSemana n={1} periodo="20/04 a 26/04" mov={METAS.movimento[1]} men={METAS.mental[1]} />
            <LinhaSemana n={2} periodo="27/04 a 03/05" mov={METAS.movimento[2]} men={METAS.mental[2]} />
            <LinhaSemana n={3} periodo="04/05 a 10/05" mov={METAS.movimento[3]} men={METAS.mental[3]} />
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
          <li>Na Home, clica no card da categoria (🍎 / 🏃 / 🧠)</li>
          <li>Informa a quantidade de frutas <strong>OU</strong> os minutos registrados no app</li>
          <li>Anexa foto comprovando (câmera ou galeria do celular)</li>
          <li>Envia para aprovação</li>
          <li>Admin aprova (ou reprova com motivo) — só aí os pontos contam</li>
          <li>Você acompanha em <strong>"Meus posts"</strong> o status de cada envio</li>
        </ol>
      </div>

      {/* Regras importantes */}
      <h3 style={{ marginBottom: 12 }}>Regras importantes</h3>
      <div className="grid-cards" style={{ marginBottom: 28 }}>
        <Regra emoji="📆" titulo="Só dias úteis">
          Posts em <strong>sábado, domingo ou feriado</strong> são aceitos mas ganham <strong>0 pts</strong>. Feriados no período: <strong>21/04 (Tiradentes)</strong> e <strong>01/05 (Trabalho)</strong>.
        </Regra>
        <Regra emoji="📅" titulo="Sem backfill">
          O post é registrado com a <strong>data de hoje</strong>. Esqueceu ontem? Não dá pra recuperar.
        </Regra>
        <Regra emoji="🔥" titulo="Aquecimento">
          Pode postar no fim de semana anterior (18-19/04) mas <strong>os pontos só contam a partir de segunda 20/04</strong>.
        </Regra>
        <Regra emoji="🚫" titulo="Limite diário">
          <strong>1 movimento</strong> + <strong>1 mental</strong> + até <strong>2 frutas</strong> por dia. Tentar ultrapassar é bloqueado.
        </Regra>
        <Regra emoji="✅" titulo="Aprovação manual">
          Todo post fica <strong>pendente</strong> até o admin aprovar. Pontos só entram no placar depois da aprovação.
        </Regra>
        <Regra emoji="❌" titulo="Posts podem ser reprovados">
          Se a foto não comprovar (ex: print sem minutos visíveis, foto duplicada, atividade fora do horário), o admin pode reprovar com motivo.
        </Regra>
        <Regra emoji="🏆" titulo="Placar do grupo">
          Pontuação é somada ao <strong>seu grupo</strong>. Quanto mais você participa, mais o seu time se destaca.
        </Regra>
      </div>

      {/* Dias úteis detalhados */}
      <h3 style={{ marginBottom: 12 }}>Calendário do desafio</h3>
      <div className="card" style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--branco-70)' }}>
          <div style={{ marginBottom: 10 }}>
            Total: <strong style={{ color: 'var(--amarelo)' }}>21 dias corridos</strong> · <strong style={{ color: 'var(--amarelo)' }}>15 dias úteis</strong> que pontuam.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div style={{ padding: 10, background: 'rgba(16,185,129,0.1)', borderLeft: '3px solid var(--verde)', borderRadius: 3 }}>
              <div className="label">Semana 1</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>20/04 a 26/04</div>
              <div style={{ fontSize: 11, color: 'var(--branco-45)', marginTop: 4 }}>
                4 dias úteis (21/04 feriado)
              </div>
            </div>
            <div style={{ padding: 10, background: 'rgba(59,130,246,0.1)', borderLeft: '3px solid var(--azul-grupo)', borderRadius: 3 }}>
              <div className="label">Semana 2</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>27/04 a 03/05</div>
              <div style={{ fontSize: 11, color: 'var(--branco-45)', marginTop: 4 }}>
                4 dias úteis (01/05 feriado)
              </div>
            </div>
            <div style={{ padding: 10, background: 'rgba(139,92,246,0.1)', borderLeft: '3px solid var(--violeta)', borderRadius: 3 }}>
              <div className="label">Semana 3</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>04/05 a 10/05</div>
              <div style={{ fontSize: 11, color: 'var(--branco-45)', marginTop: 4 }}>
                5 dias úteis
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pontuação máxima teórica */}
      <div className="card" style={{
        borderTopColor: 'var(--amarelo)',
        background: 'linear-gradient(135deg, rgba(244,204,4,0.08), transparent)',
      }}>
        <div className="label" style={{ marginBottom: 8 }}>Pontuação máxima</div>
        <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--branco-70)' }}>
          <div style={{ fontSize: 11, color: 'var(--branco-45)', marginBottom: 8 }}>
            Considerando 15 dias úteis (exclui fins de semana e feriados)
          </div>
          <div>
            🍎 <strong>2 frutas × 15 dias úteis</strong> = até <strong style={{ color: 'var(--amarelo)' }}>30 pts</strong>
          </div>
          <div>
            🏃 <strong>1 movimento × 15 dias × 3 pts</strong> = até <strong style={{ color: 'var(--amarelo)' }}>45 pts</strong>
          </div>
          <div>
            🧠 <strong>1 mental × 15 dias × 2 pts</strong> = até <strong style={{ color: 'var(--amarelo)' }}>30 pts</strong>
          </div>
          <div style={{
            marginTop: 12, paddingTop: 12,
            borderTop: '1px solid rgba(244,204,4,0.2)',
            fontSize: 15,
          }}>
            Total máximo por pessoa: <strong style={{ color: 'var(--amarelo)', fontSize: 18 }}>105 pts</strong>
          </div>
        </div>
      </div>
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
      <td style={{ padding: 10 }}>≥ {mov} min · <span style={{ color: 'var(--amarelo)' }}>+3 pts</span></td>
      <td style={{ padding: 10 }}>≥ {men} min · <span style={{ color: 'var(--amarelo)' }}>+2 pts</span></td>
      <td style={{ padding: 10 }}>máx 2/dia · <span style={{ color: 'var(--amarelo)' }}>+1 pt cada</span></td>
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
