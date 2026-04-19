-- TD Jogos — seed inicial
-- Rodar depois de schema.sql e policies.sql

-- =====================================================
-- Grupos
-- =====================================================
insert into groups (id, nome, cor) values
  (1, 'Grupo 1', '#F4CC04'),
  (2, 'Grupo 2', '#3B82F6'),
  (3, 'Grupo 3', '#10B981'),
  (4, 'Grupo 4', '#8B5CF6'),
  (5, 'Grupo 5', '#F97316')
on conflict (id) do nothing;

-- =====================================================
-- Pending claims (participantes) — preencher email quando possível
-- =====================================================
-- Dica: depois que descobrir o email @tributodevido.com.br de cada um,
-- rodar UPDATE pending_claims SET email='nome@tributodevido.com.br' WHERE nome_exibicao='...'

insert into pending_claims (nome_exibicao, email, group_id, role) values
  -- Grupo 1
  ('Larissa',           null, 1, 'user'),
  ('André Lima',        null, 1, 'user'),
  ('Ellen Claudino',    null, 1, 'user'),
  ('Caruso',            null, 1, 'user'),
  ('Marcio',            'marcio.capellup@tributodevido.com.br', 1, 'superadmin'),
  ('Manu',              null, 1, 'user'),
  -- Grupo 2
  ('Luiz Felipe',       null, 2, 'user'),
  ('Ariane',            null, 2, 'user'),
  ('Leonardo Bagni',    null, 2, 'user'),
  ('Richard Motzkus',   null, 2, 'user'),
  ('Mariane Brandão',   null, 2, 'user'),
  -- Grupo 3
  ('Bruno de Almeida',  null, 3, 'user'),
  ('Stefany Roveda',    null, 3, 'user'),
  ('Gabriel Lima',      null, 3, 'user'),
  ('Pedro Folster',     null, 3, 'user'),
  ('Hugo',              null, 3, 'user'),
  -- Grupo 4
  ('Mayara',            null, 4, 'user'),
  ('Daniel',            null, 4, 'user'),
  ('Rafael Lopes',      null, 4, 'user'),
  ('Erick',             null, 4, 'user'),
  ('Jhenni Quaresma',   null, 4, 'user'),
  -- Grupo 5
  ('Thayse Schutz',     null, 5, 'user'),
  ('Torben',            null, 5, 'user'),
  ('Israel',            null, 5, 'user'),
  ('Vitor Pires',       null, 5, 'user'),
  ('Igor',              null, 5, 'user');
