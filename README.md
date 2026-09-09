# Pode Deixar

> A forma simples e segura de contratar serviços: clientes publicam o que precisam, prestadores enviam propostas e a plataforma cuida do resto, do orçamento ao pagamento e à avaliação.

## Sumário

- [O problema que resolvemos](#o-problema-que-resolvemos)
- [O que o sistema faz](#o-que-o-sistema-faz)
- [Como funciona](#como-funciona)
- [Confiança e segurança](#confiança-e-segurança)
- [Como rodar](#como-rodar)

---

## O problema que resolvemos

Contratar um serviço hoje costuma ser informal e arriscado: indicação por mensagem sem garantia, orçamento combinado no boca a boca, pagamento adiantado sem proteção, nenhum histórico do que foi acordado e nenhuma forma confiável de saber se o profissional é bom antes de contratar. Para o prestador, o cenário se inverte, mas a dor é parecida: agenda desorganizada, propostas perdidas em conversas, dificuldade para comprovar reputação e para gerenciar recebimentos.

O Pode Deixar organiza essa relação inteira em um só lugar, com regras claras, dinheiro protegido e reputação visível.

## O que o sistema faz

**Para quem contrata:**
- Publica o pedido com fotos do local, categoria, orçamento esperado e agendamento.
- Recebe propostas de prestadores, compara preços e negocia por contrapropostas.
- Acompanha cada etapa: pedido aberto, proposta aceita, serviço em andamento, concluído e pago.
- Paga com segurança pela plataforma e só libera quando o serviço é confirmado.
- Avalia o serviço e consulta avaliações e histórico antes da próxima contratação.

**Para quem executa:**
- Monta perfil profissional público com serviços, preços fixos, portfólio e disponibilidade.
- Recebe solicitações abertas ou direcionadas e responde com propostas em poucos cliques.
- Gerencia a agenda de serviços e acompanha solicitações recebidas.
- Acompanha o financeiro: bruto, taxa da plataforma, líquido, lançamentos por status e evolução por mês.
- Constrói reputação: cada avaliação conta para o rating exibido no perfil.

## Como funciona

**Fluxo do cliente:** cadastro com verificação de email e login, criação do perfil, publicação do pedido, recebimento de propostas, aceite da melhor, acompanhamento da execução, pagamento via PIX com confirmação, avaliação do serviço.

**Fluxo do prestador:** cadastro, perfil profissional, cadastro de serviços com preço fixo, recebimento de solicitações, envio de propostas, execução, conclusão, recebimento do líquido e construção da reputação.

## Confiança e segurança

- Identidade verificada por email e perfis vinculados a cada negociação.
- O dinheiro passa pela plataforma, com confirmação e rastreabilidade total.
- Avaliações vinculadas a serviços realmente concluídos e pagos, sem notas avulsas.
- Dados de cartão nunca tocam nossos servidores: pagamento real só via tokenização do gateway.
- Proteção contra abusos com limites de uso, bloqueio anti-força-bruta e registros auditáveis.

## Como rodar

```bash
# Local com hot-reload (dia a dia): front :3000, API :8080, Postgres local
docker compose -f docker-compose.dev.yml up -d --build

# Atalho que sobe e mostra onde cada coisa está:
scripts/stack-up dev        # ou: staging | production
```

| Ambiente | Comando | Banco |
|---|---|---|
| Local hot-reload | `docker compose -f docker-compose.dev.yml up -d --build` | Postgres local |
| Local (imagens) | `docker compose up -d --build` | Postgres local |
| Staging (VPS) | `docker compose -f docker-compose.staging.yml up -d --build` | Neon staging |
| Produção (VPS) | `docker compose -f docker-compose.production.yml up -d --build` | Neon prod |

Detalhes (envs, portas, regras de deploy): [docs/deploy.md](docs/deploy.md).

---

<p>
  <img src="docs/assets/fundo-cinza-logo-circular.png" alt="JT Technology" width="120" align="left" />
  <br />
  <strong>JT Technology</strong><br />
  <em>Think Smarter. Build Better.</em>
</p>
