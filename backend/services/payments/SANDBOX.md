# Sandbox — Mercado Pago (Guia de configuração para testes)

Este guia cobre a configuração do ambiente **sandbox** do Mercado Pago para o
microsserviço de pagamentos.

> O modo sandbox usa as **credenciais de teste** (access token começando com
> `TEST-`). Nenhuma cobrança real é gerada — apenas transações simuladas.

---

## 1. Criar conta e credenciais de teste

1. Crie uma conta no [Mercado Pago Developers](https://www.mercadopago.com.br/developers)
2. Acesse **Suas integrações → Criar aplicação** (`payments` é o produto)
3. No painel da aplicação, abra **Credenciais de teste** (ou aba "Teste")
4. Copie:
   - **Access token de teste** (formato `TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxx`)
   - **Public key de teste** (formato `TEST-xxxxxxxx-...`) — usada no frontend no futuro

## 2. Configurar variáveis de ambiente

No `.env.staging` (e `.env` para dev local) do projeto:

```dotenv
MERCADO_PAGO_ACCESS_TOKEN="TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxx"
MERCADO_PAGO_WEBHOOK_SECRET=""          # opcional durante testes (ver seção 4)
MERCADO_PAGO_NOTIFICATION_URL=""        # URL pública do webhook (ver seção 3)
MERCADO_PAGO_PAYER_EMAIL="teste@pode-deixar.com"
```

> `MERCADO_PAGO_PAYER_EMAIL` é o email do pagador usado nas cobranças de teste.
> Em produção será substituído pelo email do cliente autenticado.

## 3. Webhook de notificações (cobranças PIX)

O Mercado Pago só consegue notificar via **URL pública acessível pela internet**.

**Em produção/homologação:** configure a URL

```
https://<seu-dominio>/api/payments/webhook/mercadopago
```

**Em dev local:** use um túnel (ex: `ngrok http 8080`) e configure

```
http://<tunel>.ngrok.io/api/payments/webhook/mercadopago
```

A cobrança é criada com o `notification_url` do body — o valor atual de
`MERCADO_PAGO_NOTIFICATION_URL` é usado automaticamente em cada cobrança.

## 4. Validar assinatura do webhook (opcional)

Para validar que as notificações vêm do Mercado Pago, configure um secret da
aplicação no painel **Webhooks** e preencha `MERCADO_PAGO_WEBHOOK_SECRET`.
Sem o secret configurado, o endpoint aceita notificações sem validação (útil
apenas em dev).

## 5. Testar com valores reais do sandbox

### Fluxo PIX

1. `POST /payments` — registra pagamento (`method: "PIX"`)
2. `POST /payments/:paymentId/charge` — gera cobrança PIX real. A resposta
   contém `pixCopiaECola` (copia-e-cola) e `qrCodeBase64` (QR code)
3. Pague com o app do pagador de teste (ou use a API de produção do sandbox)
4. O Mercado Pago chama `POST /payments/webhook/mercadopago` e o status vira `PAID`
5. `GET /payments/:paymentId/status` confirma o status

### Cartões de teste do Mercado Pago (sandbox)

| Bandeira | Número | CVV | Validade |
|----------|--------|-----|----------|
| Mastercard | `5031 4332 1540 6351` | `123` | `11/25` |
| Visa | `4235 6477 2802 5682` | `123` | `11/25` |
| American Express | `3753 6512 1114 0026` | `1234` | `11/25` |

> Vale o proveito: cartão de teste NÃO é aceito no webhook PIX. O PIX de teste
> é pago com 2 app de teste do Mercado Pago (usuário vendedor + usuário comprador).

## 6. Sair do modo sandbox

Quando tiver as credenciais de produção (`APP_USR-...`), apenas troque
`MERCADO_PAGO_ACCESS_TOKEN` no `.env` de produção. **Nunca use credenciais de
teste em produção** — o serviço detecta `TEST-` para habilitar o real, mas o
ideal é validar por ambiente.

## Pontos de atenção

- O valor de `amount` informado no `POST /payments` é gravado como `Decimal`
- O `external_reference` do MP é o nosso `paymentId` (vínculo via `externalRef`)
- O webhook MP só altera pagamentos que tenham `externalRef` igual ao ID do MP
- A integração de cartão de crédito **ainda não gera cobrança real** — quando
  o gateway está configurado, PIX usa o MP; cartão continua com mock enquanto
  o fluxo de cartão (card token no frontend) não for definido