-- Remoção dos dados demo de desenvolvimento (seed 20260731010000_seed_data).
-- A seed continha credenciais conhecidas ("Senha123@" p/ todos os usuários) e
-- não deve existir em nenhum ambiente migrado a partir daqui. Remove SOMENTE
-- as linhas com os IDs determinísticos da seed (a000.../b000.../c000.../d000.../
-- e000.../f000...), nunca dados criados por usuários reais.
-- Ordem FK-segura: filhos antes dos pais (proposals → service_orders →
-- provider_services → client_profiles/provider_profiles → users).

-- Propostas demo (filhas de service_orders)
DELETE FROM "proposals" WHERE "id" IN (
  'f0000000-0000-0000-0000-000000000001',
  'f0000000-0000-0000-0000-000000000002',
  'f0000000-0000-0000-0000-000000000003',
  'f0000000-0000-0000-0000-000000000004',
  'f0000000-0000-0000-0000-000000000005'
);

-- Pedidos de serviço demo
DELETE FROM "service_orders" WHERE "id" IN (
  'e0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000002',
  'e0000000-0000-0000-0000-000000000003',
  'e0000000-0000-0000-0000-000000000004',
  'e0000000-0000-0000-0000-000000000005'
);

-- Serviços dos prestadores demo (filhos de provider_profiles)
DELETE FROM "provider_services" WHERE "id" IN (
  'd0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000002',
  'd0000000-0000-0000-0000-000000000003',
  'd0000000-0000-0000-0000-000000000004',
  'd0000000-0000-0000-0000-000000000005',
  'd0000000-0000-0000-0000-000000000006',
  'd0000000-0000-0000-0000-000000000007',
  'd0000000-0000-0000-0000-000000000008',
  'd0000000-0000-0000-0000-000000000009',
  'd0000000-0000-0000-0000-000000000010'
);

-- Perfis demo (filhos de users)
DELETE FROM "client_profiles" WHERE "id" IN (
  'b0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000002'
);

DELETE FROM "provider_profiles" WHERE "id" IN (
  'c0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000002',
  'c0000000-0000-0000-0000-000000000003',
  'c0000000-0000-0000-0000-000000000004',
  'c0000000-0000-0000-0000-000000000005'
);

-- Usuários demo (pais; por último)
DELETE FROM "users" WHERE "id" IN (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000007'
);
