# 📦 Pode-Deixar
# Visão Geral

O Pode-Deixar é uma plataforma distribuída de orquestração de serviços locais, projetada para gerenciar todo o ciclo de vida de operações entre demanda e execução. A solução centraliza a gestão de solicitações de serviço, agendamentos, fluxos operacionais e controle de prestadores em um ambiente único, escalável e orientado a domínio.

A arquitetura do sistema é baseada em microserviços e segue princípios de Domain-Driven Design, com separação clara de responsabilidades entre os componentes. O objetivo da plataforma é atuar como uma camada de orquestração entre usuários, prestadores e processos operacionais, garantindo consistência, rastreabilidade e eficiência na execução de serviços.

# Arquitetura

A arquitetura do Pode-Deixar é estruturada com base em um modelo distribuído, utilizando microserviços independentes que se comunicam via APIs REST e, quando necessário, por meio de eventos assíncronos. O sistema segue uma abordagem API-first, permitindo desacoplamento entre frontend e backend, além de facilitar escalabilidade horizontal.

Cada serviço possui sua própria responsabilidade de domínio e persistência isolada, seguindo o padrão Database per Service. A comunicação entre serviços pode ocorrer de forma síncrona via HTTP ou de forma assíncrona através de mensageria, garantindo flexibilidade e resiliência operacional.

# Identity & Access Management (IAM)

O serviço de autenticação do Pode-Deixar é responsável pela gestão centralizada de identidade e controle de acesso em toda a plataforma. Ele gerencia o ciclo de vida de autenticação dos usuários, incluindo login, emissão de tokens, validação de sessões e autorização de requisições.

O modelo de segurança é baseado em JWT e controle de acesso baseado em papéis (RBAC), garantindo segregação de permissões entre diferentes tipos de usuários, como clientes, prestadores e administradores. Este serviço atua como componente crítico de segurança dentro da arquitetura distribuída.

# Service Scheduling

O serviço de agendamento é responsável pela gestão de horários e alocação de prestadores dentro da plataforma. Ele controla a criação, atualização e cancelamento de agendamentos, além de validar disponibilidade e evitar conflitos de agenda.

Este módulo também se integra com regras de negócio do domínio, garantindo consistência na distribuição de serviços e otimização da utilização dos prestadores.

# Service Request

O serviço de solicitações gerencia o ciclo de vida completo das demandas criadas dentro da plataforma. Ele é responsável por registrar novas solicitações, classificar o tipo de serviço, atribuir prestadores e acompanhar o status de execução.

Esse componente funciona como o núcleo operacional da plataforma, conectando a entrada de demanda com a execução do serviço.

# Workflow Engine

O motor de workflows é responsável pela orquestração dos processos internos da plataforma. Ele define e executa fluxos de trabalho baseados em regras de negócio, controlando estados, transições e automações entre serviços.

Esse componente permite a criação de processos dinâmicos e escaláveis, garantindo que operações complexas possam ser executadas de forma estruturada e rastreável.

# Operations Management

O módulo de gestão operacional é responsável pelo monitoramento e controle das atividades em execução dentro da plataforma. Ele fornece visibilidade sobre serviços ativos, desempenho de prestadores e indicadores operacionais.

Além disso, esse componente também realiza auditoria de eventos e suporta análise de métricas para tomada de decisão operacional.

# Frontend

O frontend do Pode-Deixar é uma aplicação cliente responsável pela camada de apresentação da plataforma. Ele consome APIs dos microserviços e fornece uma interface unificada para gestão de agendamentos, solicitações, workflows e operações.

A aplicação é desacoplada do backend e segue uma arquitetura baseada em API-first, garantindo flexibilidade, escalabilidade e facilidade de manutenção. O foco principal da interface é oferecer uma experiência operacional eficiente, com suporte a fluxos em tempo real e alta responsividade.

# Comunicação entre Serviços

A comunicação entre os serviços do Pode-Deixar ocorre por meio de APIs REST para operações síncronas e por eventos para processos assíncronos. Essa abordagem híbrida permite desacoplamento entre domínios, maior escalabilidade e melhor resiliência em cenários de carga elevada ou falhas parciais.

# Segurança

A segurança da plataforma é baseada em autenticação via JWT, controle de acesso baseado em papéis e comunicação segura entre serviços via HTTPS. O serviço de IAM atua como ponto central de validação de identidade e autorização, garantindo que todas as requisições sejam devidamente autenticadas e autorizadas antes de acessar recursos protegidos.

# Objetivo

O objetivo do Pode-Deixar é fornecer uma infraestrutura robusta para orquestração de serviços locais, reduzindo a complexidade operacional, automatizando fluxos de trabalho e centralizando a gestão de prestadores e demandas em um sistema escalável e observável.
