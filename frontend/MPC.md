**Objetivos**

O desenvolvimento do sistema “Pode Deixar” visa facilitar e modernizar o processo de contratação de serviços, conectando clientes que precisam realizar tarefas com prestadores que desejam oferecer suas habilidades de forma profissional e organizada. A plataforma atuará como intermediadora de todo o processo, permitindo que clientes encontrem prestadores, solicitem orçamentos, avaliem propostas e realizem pagamentos com segurança, tudo em um único ambiente digital.

Além de proporcionar praticidade, segurança e transparência na contratação de serviços, o projeto também possui como objetivo criar uma fonte de renda sustentável por meio da cobrança de taxas sobre serviços intermediados pela plataforma e, futuramente, por meio de planos de destaque para prestadores. Dessa forma, o sistema se torna financeiramente viável e capaz de evoluir continuamente, agregando valor tanto para clientes quanto para prestadores de serviços.

**Funcionamento**

O funcionamento do sistema “Pode Deixar” será dividido em duas partes, sendo a primeira os processos internos da plataforma e a segunda as funcionalidades disponíveis para clientes e prestadores.

**Funcionalidades Internas**

**Gerenciamento de usuários**

O sistema será responsável por gerenciar o cadastro, autenticação e armazenamento das informações de clientes e prestadores de serviço. Cada prestador possuirá um perfil profissional contendo descrição, serviços oferecidos, experiência, avaliações e outras informações relevantes.

**Gerenciamento de serviços e propostas**

A plataforma armazenará e organizará os serviços cadastrados pelos prestadores, incluindo serviços com valor fixo e propostas enviadas sob medida. O sistema também será responsável por registrar solicitações de orçamento, propostas enviadas, negociações e status de cada contratação.

**Intermediação de pagamento**

O sistema atuará como intermediador financeiro, registrando os pagamentos realizados pelos clientes e vinculando-os aos serviços contratados. Isso garante maior segurança para ambas as partes, permitindo rastreabilidade e controle das transações realizadas dentro da plataforma.

**Monitoramento e controle da plataforma**

A plataforma contará com mecanismos internos de controle para gerenciar usuários, serviços, propostas e pagamentos, garantindo integridade dos dados, segurança das informações e funcionamento adequado do sistema.

**Funcionalidades públicas**

**Cadastro e acesso à plataforma**

O usuário poderá se cadastrar como cliente ou prestador de serviço. Após realizar o login, terá acesso às funcionalidades específicas do seu perfil. Usuários não autenticados terão acesso limitado à plataforma.

**Busca de prestadores de serviço**

O cliente poderá buscar prestadores com base no tipo de serviço desejado, visualizando seus perfis, descrições, serviços oferecidos e outras informações relevantes. Isso permite que o cliente escolha o profissional mais adequado para sua necessidade.

**Solicitação de orçamento (proposta sob medida)**

Após selecionar um prestador, o cliente poderá solicitar um orçamento descrevendo o serviço desejado. O prestador analisará a solicitação e enviará uma proposta contendo valor, prazo e descrição da execução. O cliente poderá aceitar, recusar ou negociar a proposta antes de realizar a contratação.

**Contratação de serviços com valor fixo**

Além das propostas personalizadas, os prestadores poderão cadastrar serviços com preço fixo e descrição definida. Nesses casos, o cliente poderá contratar diretamente o serviço sem necessidade de solicitar orçamento.

**Pagamento e intermediação**

Após aceitar uma proposta ou contratar um serviço fixo, o cliente realizará o pagamento por meio da plataforma. O sistema atuará como intermediador, garantindo maior segurança durante todo o processo.  


**Comunicação e acompanhamento**

O sistema permitirá o acompanhamento do status do serviço contratado, desde a solicitação até sua conclusão, proporcionando transparência e organização para ambas as partes.

**Avaliações e reputação**

Após a conclusão do serviço, o cliente poderá avaliar o prestador, contribuindo para a construção de sua reputação dentro da plataforma. Isso ajuda outros clientes a tomarem decisões mais seguras ao contratar serviços.

**Arquitetura**

**Backend**

O backend será desenvolvido utilizando o NestJS, um framework que permite a criação de serviços independentes, facilitando a separação de responsabilidades. Cada microsserviço será responsável por uma funcionalidade específica do sistema, comunicando-se por meio de APIs REST. Essa estrutura permite maior controle sobre cada módulo do sistema, melhora a manutenibilidade e possibilita escalar apenas os serviços necessários conforme a demanda.

Os principais microsserviços previstos incluem:

- Autenticação e gerenciamento de usuários;
- Gerenciamento de prestadores e perfis profissionais;
- Serviço de gerenciamento de serviços e propostas;
- Serviço de contratação e gerenciamento de tarefas;
- Serviço de pagamentos e transações financeiras;
- Serviço de avaliações e reputação.

**Frontend**

O frontend será desenvolvido utilizando o Next.js, um framework que permite a construção de uma interface moderna, rápida e otimizada, proporcionando uma experiência fluida e responsiva para os usuários. O frontend será responsável por toda a interface de interação com o usuário, incluindo:

- Cadastro e autenticação de usuários;
- Busca de prestadores de serviço;
- Visualização de perfis profissionais;
- Solicitação e gerenciamento de propostas;
- Contratação de serviços;
- Acompanhamento de serviços ativos;
- Sistema de pagamentos;
- Avaliações e histórico.

A comunicação com o backend será realizada por meio de APIs REST, garantindo separação total entre a interface e a lógica do sistema.



O sistema utilizará o PostgreSQL, escolhido por sua confiabilidade, desempenho e capacidade de lidar com grandes volumes de dados. O banco será responsável por armazenar informações de usuários, prestadores, serviços, propostas, contratos, pagamentos e avaliações.

**3.4. Autenticação**

A autenticação do sistema será baseada em JWT, que permite que o sistema opere de forma stateless, ou seja, sem necessidade de armazenamento de sessão no servidor, tornando a comunicação entre frontend e backend mais leve e eficiente.

O processo de autenticação funcionará da seguinte forma: após realizar o login com suas credenciais, o usuário receberá um token JWT assinado digitalmente pelo servidor. Esse token conterá informações essenciais, como o identificador do usuário e seu tipo de perfil (cliente ou prestador), além do tempo de expiração. A cada requisição realizada às APIs protegidas, o token deverá ser enviado no cabeçalho da requisição para validação.

No backend, desenvolvido com NestJS, será implementado um módulo específico de autenticação responsável por:

- Validação de credenciais;
- Geração e assinatura de tokens JWT;
- Controle de expiração de tokens;
- Proteção de rotas por meio de Guards;
- Autorização baseada em perfil de usuário.

**Hospedagem e Infraestrutura**

A hospedagem e a infraestrutura do sistema serão realizadas na plataforma Vercel, que permite o deploy e a execução tanto do backend quanto do frontend em um ambiente de nuvem seguro e escalável. O backend, desenvolvido com o framework NestJS, será responsável pelo processamento das regras de negócio e pela disponibilização das APIs. O frontend, desenvolvido com o framework Next.js, será responsável pela interface do usuário e pelo consumo dessas APIs.

A infraestrutura no Railway permite a execução dos serviços de forma independente, garantindo maior estabilidade, facilidade de manutenção e possibilidade de escalabilidade conforme o crescimento do sistema. Além disso, a plataforma oferece recursos como gerenciamento de variáveis de ambiente, provisionamento simplificado e alta disponibilidade, assegurando um ambiente confiável e eficiente para a operação da aplicação.  
  
____________________________________________________________________________________________________________________



**Dependencias de primeiro nivel no frontend:**  
  
├── @base-ui/react@1.4.0

├── @tailwindcss/postcss@4.2.0

├── @types/node@20.19.33

├── @types/react-dom@19.2.3

├── @types/react@19.2.14

├── class-variance-authority@0.7.1

├── clsx@2.1.1

├── cmdk@1.1.1

├── date-fns@4.1.0

├── embla-carousel-react@8.6.0

├── eslint-config-next@16.1.6

├── eslint@9.39.2

├── input-otp@1.4.2

├── lucide-react@1.8.0

├── next-themes@0.4.6

├── next@16.2.9

├── prettier@3.8.3

├── prisma@6.19.3

├── react-day-picker@9.14.0

├── react-dom@19.2.3

├── react-resizable-panels@4.10.0

├── react@19.2.3

├── recharts@3.8.0

├── server-only@0.0.1

├── shadcn@4.3.0

├── sonner@2.0.7

├── tailwind-merge@3.5.0

├── tailwindcss@4.2.0

├── tw-animate-css@1.4.0

├── typescript@5.9.3

└── vaul@1.1.2   
______________________________________________________________________________________________________________________________

**Arquitetura de projeto frontend**

app -> pages da aplicacao, cada page tem um pasta sua e um page.tsx.
components -> toda UI das pages, ficam todas as interface grafica das pages, elas herdam apenas seus componentes. 
api -> responsavel por fazer as chamadas de api no backend. toda chamada acontece por um handler da page em espeficifica de app, faz validacoes e chama o backend em api.
lib -> todos os utilitarios para ajudar o frontend a funcionar corretamente. 
mock -> dados staticos para utilizar na construcao quando nao ha endpoint do backend apropriado.

RESUMO: Cada tela e um page e cada tela tem seus recursos para aquela tela em espefico e deve ser sigo a todo custo.

**Obrigatoriedades do Frontend**

Toda tela precisa ser composta por UI do shacdcn e estilizacao tailwind apenas. CSS puro esta de fora do projeto.

O Frontend precisa serguir todas as 10 Heuristicas de Nilsen sendo ela:
1: Visibilidade do estado do sistema.
2: Correspondência entre o sistema e o mundo real.
3: Controle e Liberdade do Usuário.
4: Consistência e Padrões.
5: Prevenção de erros.
6: Reconhecimento em vez de recordação.
7: Flexibilidade e Eficiência de Uso.
8: Design Estético e Minimalista.
9: Ajudar os usuários a reconhecer, diagnosticar e recuperar-se de erros.
10: Ajuda e Documentação.

Seguir os 10 principais conceitos de um frontend:
Pipeline de Renderização: O processo que o navegador segue para transformar código em pixels na tela.
Event Loop e Scheduling: Como gerenciar tarefas para não travar a thread principal.
Gestão de Estado: Diferenciar o estado local, o estado do servidor e o que deve residir na URL.
Cache e Otimização: Estratégias de invalidação de cache e a importância de atualizações otimistas.
SSR e Hidratação: O uso de Server Side Rendering e streaming para melhorar a performance de carregamento.
Arquitetura de Bundle: A importância de estratégias como code splitting e tree shaking.
Performance da Thread Principal (INP): Como métricas como Interaction to Next Paint afetam a percepção de responsividade do usuário.
Design System como Contrato: Utilizar o Design System para padronizar comportamentos e reduzir inconsistências.
Arquitetura de Acessibilidade: A importância de integrar acessibilidade desde a criação dos componentes.
Observabilidade: A capacidade de monitorar erros e métricas de desempenho em ambientes de produção real.





