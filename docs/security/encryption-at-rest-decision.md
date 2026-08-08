# Decisão: Criptografia em Repouso (Encryption at Rest)

## Contexto
A checklist de segurança requer "Criptografia em repouso quando necessária". Este documento registra a análise e decisão para o projeto Pode Deixar.

## Análise de Dados Sensíveis

### Dados que NÃO armazenamos (PCI-DSS)
- **PAN (Primary Account Number)**: Número completo do cartão de crédito
- **CVV/CVC**: Código de segurança do cartão
- **PIN/Senha do cartão**
- **Track data** (dados da tarja magnética/chip)
- **Dados de autenticação 3D Secure** (cavv, xid, eci)

### Dados que ARMAZENAMOS
| Tabela | Campos | Classificação |
|--------|--------|---------------|
| `users` | email, password (hash), phone, postal_code | PII (Dados Pessoais) |
| `payments` | amount, currency, method, externalRef, idempotencyKey | Dados Transacionais |
| `payment_webhook_events` | payload (JSON com dados do gateway) | Dados de Auditoria/Transacionais |
| `payment_status_history` | status transitions, actor, motivo | Auditoria |
| `service_orders` | title, description, address (JSON) | Dados do Pedido |

## Decisão

### Criptografia em Repouso: **NÃO OBRIGATÓRIA** (camada de aplicação)

**Justificativa:**
1. **Nenhum dado de cartão (PAN/CVV) é persistido** - Conforme política PCI-DSS documentada em `AGENTS.md` e implementada no fluxo de pagamentos (tokenização via gateway, checkout hospedado)
2. **Dados sensíveis existentes são protegidos por outras camadas:**
   - Senhas: Armazenadas como hash bcrypt (não reversível)
   - Tokens JWT: Assinados, não criptografados (stateless), refresh tokens em hash
   - Dados PII: Acesso controlado por RBAC + ownership validation
2. **Infraestrutura provê criptografia em repouso:**
   - Volumes Docker (`postgres_data`) em hosts com LUKS/dm-crypt (responsabilidade da infra/ops)
   - Backups comprimidos (`.sql.gz`) armazenados em volume separado com permissões restritas
   - Rede isolada (Docker network) + TLS em trânsito (Caddy)
3. **Risco residual aceitável:** Dados transacionais e de auditoria não expõem risco financeiro direto sem PAN/CVV

### Medidas Complementares Implementadas
- **Sanitização de logs:** Interceptor remove tokens, senhas, dados de cartão dos logs
- **Validação de ownership:** Todos os endpoints validam posse do recurso (403 se não owner)
- **Auditoria imutável:** `payment_status_history` e `payment_webhook_events` registram todas as alterações
- **Backups criptografados:** Script de backup comprime com gzip; em produção, adicionar `gpg --encrypt` ou usar storage criptografado (S3 SSE, etc.)

### Revisão Futura
Reavaliar se:
- Passar a armazenar qualquer dado de cartão (ex: tokenizado localmente)
- Regulamentação exigir criptografia de PII em repouso (LGPD Art. 46)
- Migração para banco gerenciado com TDE (Transparent Data Encryption) nativo

---

**Decisão registrada em:** 2026-08-08  
**Responsável:** Equipe de Segurança/Backend  
**Próxima revisão:** 2027-02-08 ou conforme mudança regulatória