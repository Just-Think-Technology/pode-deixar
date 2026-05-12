ARQUITETURA DE PASTAS EXEMPLO DO PROJETO
src/
│
├── app/                                # 🧭 ROTAS (Next App Router)
│   ├── layout.jsx                      # Layout global
│   ├── page.jsx                        # Landing pública
│
│   ├── login/
│   │   └── page.jsx
│
│   ├── register/
│   │   ├── page.jsx                   # Escolha de tipo
│   │   ├── client/
│   │   │   └── page.jsx
│   │   └── worker/
│   │       └── page.jsx
│
│   ├── (client)/                      # 🔵 ÁREA DO CLIENTE
│   │   ├── layout.jsx                 # Layout do cliente
│   │   ├── home/
│   │   │   └── page.jsx
│   │   ├── search/
│   │   │   └── page.jsx
│   │   ├── service/
│   │   │   └── [id]/page.jsx
│   │   ├── orders/
│   │   │   └── page.jsx
│   │   ├── chat/
│   │   │   └── page.jsx
│   │   ├── profile/
│   │       └── page.jsx
│
│   ├── (worker)/                      # 🟢 ÁREA DO TRABALHADOR
│       ├── layout.jsx                 # Layout do trabalhador
│       ├── dashboard/
│       │   └── page.jsx
│       ├── services/
│       │   ├── page.jsx
│       │   └── create/
│       │       └── page.jsx
│       ├── requests/
│       │   └── page.jsx
│       ├── chat/
│       │   └── page.jsx
│       ├── profile/
│           └── page.jsx
│
│
├── components/
│
│   ├── ui/                            # 🔹 PRIMITIVOS (shadcn-style)
│   │   ├── button.jsx
│   │   ├── input.jsx
│   │   ├── dialog.jsx
│   │   ├── table.jsx
│   │   ├── card.jsx
│   │   ├── badge.jsx
│   │   ├── avatar.jsx
│
│   ├── pages/                         # 🧩 PÁGINAS COMPOSTAS
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── ClientHomePage.jsx
│   │   ├── WorkerDashboardPage.jsx
│
│   ├── modals/                        # 🪟 MODAIS
│   │   ├── CreateServiceModal.jsx
│   │   ├── RequestQuoteModal.jsx
│   │   ├── ConfirmModal.jsx
│
│   ├── sidebar/                       # 🧭 NAVEGAÇÃO
│   │   ├── ClientSidebar.jsx
│   │   ├── WorkerSidebar.jsx
│
│   ├── shared/                        # 🔄 COMPONENTES COMPARTILHADOS
│   │   ├── ServiceCard.jsx
│   │   ├── RatingStars.jsx
│   │   ├── ChatBox.jsx
│   │   ├── EmptyState.jsx
│
│
├── context/                           # 🌐 ESTADO GLOBAL (CLIENT SIDE)
│   ├── AuthContext.jsx
│   ├── ServiceContext.jsx
│   ├── OrderContext.jsx
│   ├── ChatContext.jsx
│
│
├── types/                             # 🧾 TIPOS
│   ├── user.ts
│   ├── service.ts
│   ├── order.ts
│   ├── chat.ts
│
│
├── lib/
│   ├── utils.js                      # cn()
│   ├── constants.js                  # roles, status
│
│
├── styles/
│   ├── globals.css
│   ├── theme.css
│
│
├── assets/
│   ├── images/
│   ├── icons/

DESIGN SYSTEM
Colors

Primary: #2F80ED
Secondary: #27AE60
Accent: #F2C94C
Background: #F5F6FA
Text: #333333

Typography
Headings: Poppins
Body: Roboto / Open Sans
Components
Buttons
Inputs
Cards
Modals
Chat bubbles
Request cards