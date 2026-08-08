-- Script de inicialização do banco de dados com usuário de menor privilégio
-- Executar como superusuário (postgres) antes de rodar a aplicação

-- 1. Cria usuário da aplicação com permissões mínimas
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'pode_deixar_app') THEN
        CREATE ROLE pode_deixar_app WITH LOGIN PASSWORD '{{APP_DB_PASSWORD}}';
    END IF;
END $$;

-- 2. Concede permissões no banco de dados
GRANT CONNECT ON DATABASE pode_deixar TO pode_deixar_app;

-- 3. Concede uso do schema public
GRANT USAGE ON SCHEMA public TO pode_deixar_app;

-- 4. Concede permissões nas tabelas existentes (após migrations)
-- As migrations devem ser executadas pelo superusuário, depois este script
-- concede as permissões necessárias ao usuário da aplicação

-- Tabelas principais - permissões de leitura/escrita
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pode_deixar_app;

-- Sequences (para serial/identity columns)
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO pode_deixar_app;

-- 5. Garante que futuras tabelas também recebam as permissões
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pode_deixar_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO pode_deixar_app;

-- 6. Revoga permissões desnecessárias (princípio do menor privilégio)
REVOKE CREATE ON SCHEMA public FROM pode_deixar_app;
REVOKE CREATE ON DATABASE pode_deixar FROM pode_deixar_app;

-- 7. Comentários de auditoria
COMMENT ON ROLE pode_deixar_app IS 'Usuário da aplicação Pode Deixar - menor privilégio necessário para operação normal';