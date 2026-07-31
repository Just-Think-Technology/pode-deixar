-- Seed data para desenvolvimento e demonstração
-- Todas as senhas: "Senha123@" (argon2)

-- ==================== USUÁRIOS ====================
INSERT INTO "users" ("id", "complete_name", "email", "password", "role", "phone", "postal_code", "email_verified", "created_at", "updated_at") VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Ana Silva', 'ana@email.com', '$argon2id$v=19$m=65536,t=3,p=4$XukHxfUIlDOhXRXVRjJytw$TyVxGTfyOq3GJ6OBON1bIMmnrav1jB7t0bktl1uS+6Y', 'CLIENT', '(11) 99999-0001', '01310-000', TRUE, NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000002', 'Carlos Oliveira', 'carlos@email.com', '$argon2id$v=19$m=65536,t=3,p=4$XukHxfUIlDOhXRXVRjJytw$TyVxGTfyOq3GJ6OBON1bIMmnrav1jB7t0bktl1uS+6Y', 'CLIENT', '(11) 99999-0002', '04547-000', TRUE, NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000003', 'Mariana Costa', 'mariana@email.com', '$argon2id$v=19$m=65536,t=3,p=4$XukHxfUIlDOhXRXVRjJytw$TyVxGTfyOq3GJ6OBON1bIMmnrav1jB7t0bktl1uS+6Y', 'PROVIDER', '(11) 99999-0003', '02012-000', TRUE, NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000004', 'João Santos', 'joao@email.com', '$argon2id$v=19$m=65536,t=3,p=4$XukHxfUIlDOhXRXVRjJytw$TyVxGTfyOq3GJ6OBON1bIMmnrav1jB7t0bktl1uS+6Y', 'PROVIDER', '(11) 99999-0004', '05010-000', TRUE, NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000005', 'Pedro Almeida', 'pedro@email.com', '$argon2id$v=19$m=65536,t=3,p=4$XukHxfUIlDOhXRXVRjJytw$TyVxGTfyOq3GJ6OBON1bIMmnrav1jB7t0bktl1uS+6Y', 'PROVIDER', '(11) 99999-0005', '03015-000', TRUE, NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000006', 'Lucia Fernandes', 'lucia@email.com', '$argon2id$v=19$m=65536,t=3,p=4$XukHxfUIlDOhXRXVRjJytw$TyVxGTfyOq3GJ6OBON1bIMmnrav1jB7t0bktl1uS+6Y', 'PROVIDER', '(11) 99999-0006', '01525-000', TRUE, NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000007', 'Roberto Lima', 'roberto@email.com', '$argon2id$v=19$m=65536,t=3,p=4$XukHxfUIlDOhXRXVRjJytw$TyVxGTfyOq3GJ6OBON1bIMmnrav1jB7t0bktl1uS+6Y', 'PROVIDER', '(11) 99999-0007', '05415-000', TRUE, NOW(), NOW());

-- ==================== PERFIS ====================
INSERT INTO "client_profiles" ("id", "user_id", "created_at", "updated_at") VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', NOW(), NOW()),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', NOW(), NOW());

INSERT INTO "provider_profiles" ("id", "user_id", "bio", "hourly_rate", "skills", "rating", "total_reviews", "is_available", "created_at", "updated_at") VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'Eletricista há 8 anos, especialista em instalações e reparos residenciais', 80.00, ARRAY['ELETRICA', 'HIDRAULICA'], 4.8, 15, TRUE, NOW(), NOW()),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 'Pintor residencial com mais de 10 anos de experiência', 60.00, ARRAY['PINTURA', 'REFORMA'], 4.5, 22, TRUE, NOW(), NOW()),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 'Encanador profissional, serviços de hidráulica em geral', 75.00, ARRAY['HIDRAULICA'], 4.2, 8, TRUE, NOW(), NOW()),
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000006', 'Jardinagem e paisagismo, transformo seu jardim', 50.00, ARRAY['JARDINAGEM'], 4.9, 31, TRUE, NOW(), NOW()),
  ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000007', 'Marceneiro artesão, móveis planejados e restauração', 90.00, ARRAY['MARCENARIA'], 4.7, 18, TRUE, NOW(), NOW());

-- ==================== SERVIÇOS DOS PRESTADORES ====================
INSERT INTO "provider_services" ("id", "provider_profile_id", "title", "description", "fixed_price", "category_id", "is_active", "created_at", "updated_at")
SELECT
  'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
  'Instalação de chuveiro elétrico', 'Instalação completa de chuveiro elétrico, incluindo fiação e disjuntor', 150.00, "id", TRUE, NOW(), NOW()
FROM "categories" WHERE "slug" = 'eletrica';

INSERT INTO "provider_services" ("id", "provider_profile_id", "title", "description", "fixed_price", "category_id", "is_active", "created_at", "updated_at")
SELECT
  'd0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001',
  'Troca de fiação elétrica', 'Troca completa da fiação elétrica de um cômodo', 200.00, "id", TRUE, NOW(), NOW()
FROM "categories" WHERE "slug" = 'eletrica';

INSERT INTO "provider_services" ("id", "provider_profile_id", "title", "description", "fixed_price", "category_id", "is_active", "created_at", "updated_at")
SELECT
  'd0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002',
  'Pintura de parede interna', 'Pintura completa de paredes internas com tinta acrílica de qualidade', 80.00, "id", TRUE, NOW(), NOW()
FROM "categories" WHERE "slug" = 'pintura';

INSERT INTO "provider_services" ("id", "provider_profile_id", "title", "description", "fixed_price", "category_id", "is_active", "created_at", "updated_at")
SELECT
  'd0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000002',
  'Pintura de fachada', 'Pintura externa predial com preparação da superfície', 300.00, "id", TRUE, NOW(), NOW()
FROM "categories" WHERE "slug" = 'pintura';

INSERT INTO "provider_services" ("id", "provider_profile_id", "title", "description", "fixed_price", "category_id", "is_active", "created_at", "updated_at")
SELECT
  'd0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000003',
  'Desentupimento de pia', 'Desentupimento de pia de cozinha ou banheiro', 100.00, "id", TRUE, NOW(), NOW()
FROM "categories" WHERE "slug" = 'hidraulica';

INSERT INTO "provider_services" ("id", "provider_profile_id", "title", "description", "fixed_price", "category_id", "is_active", "created_at", "updated_at")
SELECT
  'd0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000003',
  'Troca de sifão e conexões', 'Substituição de sifão e conexões hidráulicas', 120.00, "id", TRUE, NOW(), NOW()
FROM "categories" WHERE "slug" = 'hidraulica';

INSERT INTO "provider_services" ("id", "provider_profile_id", "title", "description", "fixed_price", "category_id", "is_active", "created_at", "updated_at")
SELECT
  'd0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000004',
  'Manutenção de jardim semanal', 'Corte de grama, poda de arbustos e limpeza geral', 120.00, "id", TRUE, NOW(), NOW()
FROM "categories" WHERE "slug" = 'jardinagem';

INSERT INTO "provider_services" ("id", "provider_profile_id", "title", "description", "fixed_price", "category_id", "is_active", "created_at", "updated_at")
SELECT
  'd0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000004',
  'Projeto de paisagismo', 'Elaboração de projeto paisagístico personalizado', 250.00, "id", TRUE, NOW(), NOW()
FROM "categories" WHERE "slug" = 'jardinagem';

INSERT INTO "provider_services" ("id", "provider_profile_id", "title", "description", "fixed_price", "category_id", "is_active", "created_at", "updated_at")
SELECT
  'd0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000005',
  'Armário planejado para cozinha', 'Fabricação e instalação de armário planejado sob medida', 1200.00, "id", TRUE, NOW(), NOW()
FROM "categories" WHERE "slug" = 'marcenaria';

INSERT INTO "provider_services" ("id", "provider_profile_id", "title", "description", "fixed_price", "category_id", "is_active", "created_at", "updated_at")
SELECT
  'd0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000005',
  'Restauração de móveis antigos', 'Restauração completa de móveis de madeira', 400.00, "id", TRUE, NOW(), NOW()
FROM "categories" WHERE "slug" = 'marcenaria';

-- ==================== PEDIDOS DE SERVIÇO ====================
INSERT INTO "service_orders" ("id", "client_id", "title", "description", "category_id", "budget_min", "budget_max", "address", "status", "created_at", "updated_at")
SELECT
  'e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
  'Trocar chuveiro elétrico', 'Meu chuveiro elétrico queimou e preciso trocar urgente. É um chuveiro de 5500W.',
  "id", 100.00, 250.00,
  '{"street": "Rua Augusta", "number": "500", "neighborhood": "Consolação", "city": "São Paulo", "state": "SP", "postalCode": "01305-000"}',
  'OPEN', NOW(), NOW()
FROM "categories" WHERE "slug" = 'eletrica';

INSERT INTO "service_orders" ("id", "client_id", "title", "description", "category_id", "budget_min", "budget_max", "address", "status", "created_at", "updated_at")
SELECT
  'e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
  'Pintar sala e 2 quartos', 'Preciso pintar sala (30m²) e dois quartos (20m² cada). Tinta já foi comprada.',
  "id", 200.00, 500.00,
  '{"street": "Rua Oscar Freire", "number": "200", "neighborhood": "Pinheiros", "city": "São Paulo", "state": "SP", "postalCode": "01426-001"}',
  'OPEN', NOW(), NOW()
FROM "categories" WHERE "slug" = 'pintura';

INSERT INTO "service_orders" ("id", "client_id", "title", "description", "category_id", "budget_min", "budget_max", "address", "status", "created_at", "updated_at")
SELECT
  'e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002',
  'Pia da cozinha entupida', 'A pia da cozinha não está escoando água. Já tentei desentupidor mas não resolveu.',
  "id", 80.00, 150.00,
  '{"street": "Av. Paulista", "number": "1000", "neighborhood": "Bela Vista", "city": "São Paulo", "state": "SP", "postalCode": "01310-100"}',
  'OPEN', NOW(), NOW()
FROM "categories" WHERE "slug" = 'hidraulica';

INSERT INTO "service_orders" ("id", "client_id", "title", "description", "category_id", "budget_min", "budget_max", "address", "status", "created_at", "updated_at")
SELECT
  'e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002',
  'Manutenção de jardim mensal', 'Preciso de manutenção mensal no jardim de casa (100m²). Incluir corte de grama e poda.',
  "id", 80.00, 130.00,
  '{"street": "Rua dos Pinheiros", "number": "350", "neighborhood": "Pinheiros", "city": "São Paulo", "state": "SP", "postalCode": "05422-000"}',
  'OPEN', NOW(), NOW()
FROM "categories" WHERE "slug" = 'jardinagem';

INSERT INTO "service_orders" ("id", "client_id", "provider_id", "title", "description", "category_id", "budget_min", "budget_max", "address", "status", "created_at", "updated_at")
SELECT
  'e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003',
  'Instalação de tomada USB', 'Preciso instalar 2 tomadas USB na sala. Já comprei o material.',
  "id", 50.00, 100.00,
  '{"street": "Alameda Santos", "number": "700", "neighborhood": "Cerqueira César", "city": "São Paulo", "state": "SP", "postalCode": "01418-000"}',
  'OPEN', NOW(), NOW()
FROM "categories" WHERE "slug" = 'eletrica';

-- ==================== PROPOSTAS ====================
INSERT INTO "proposals" ("id", "service_order_id", "provider_id", "price", "description", "estimated_duration", "status", "created_at", "updated_at") VALUES
  ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 180.00, 'Faço a instalação completa do chuveiro, incluindo verificação da fiação existente e instalação de disjuntor específico se necessário. Garantia de 3 meses.', '2 horas', 'PENDING', NOW(), NOW()),
  ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 120.00, 'Vou desentupir a pia com equipamento profissional. Inclui verificação de todo o sistema de esgoto da cozinha.', '1 hora', 'PENDING', NOW(), NOW()),
  ('f0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 350.00, 'Pintura com preparação da superfície (massa corrida em pontos necessários). Tinta aplicada com rolo profissional. Prazo de 2 dias.', '2 dias', 'PENDING', NOW(), NOW()),
  ('f0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000006', 100.00, 'Corte de grama, poda de árvores e limpeza geral do jardim. Incluso remoção de entulho.', '3 horas', 'PENDING', NOW(), NOW()),
  ('f0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', 75.00, 'Instalação de 2 tomadas USB com padrão novo. Material já incluso? Se precisar de material, acréscimo de R$ 30.', '1 hora', 'PENDING', NOW(), NOW());
