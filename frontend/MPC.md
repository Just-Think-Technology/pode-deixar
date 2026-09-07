**Goals**

Developing the "Pode Deixar" system aims to facilitate and modernize the service hiring process, connecting clients who need tasks done with providers who want to offer their skills professionally and in an organized way. The platform will intermediate the entire process, letting clients find providers, request quotes, evaluate proposals, and pay securely, all in a single digital environment.

Beyond providing practicality, security, and transparency when hiring services, the project also aims to create a sustainable revenue source by charging fees on platform-intermediated services and, in the future, through featured plans for providers. This keeps the system financially viable and able to evolve continuously, adding value for both clients and service providers.

**How it works**

The "Pode Deixar" system operation is split into two parts: the platform's internal processes and the features available to clients and providers.

**Internal features**

**User management**

The system manages registration, authentication, and storage of client and service provider information. Each provider has a professional profile with a description, offered services, experience, ratings, and other relevant information.

**Service and proposal management**

The platform stores and organizes services registered by providers, including fixed-price services and custom proposals. The system also records quote requests, submitted proposals, negotiations, and the status of each hire.

**Payment intermediation**

The system acts as a financial intermediary, recording client payments and linking them to hired services. This ensures greater security for both parties, enabling traceability and control of transactions made within the platform.

**Platform monitoring and control**

The platform has internal control mechanisms to manage users, services, proposals, and payments, ensuring data integrity, information security, and proper system operation.

**Public features**

**Registration and platform access**

Users can register as clients or service providers. After logging in, they get access to the features specific to their profile. Unauthenticated users have limited access to the platform.

**Service provider search**

Clients can search providers by desired service type, viewing their profiles, descriptions, offered services, and other relevant information. This lets clients choose the most suitable professional for their needs.

**Quote request (custom proposal)**

After selecting a provider, the client can request a quote describing the desired service. The provider reviews the request and sends a proposal with price, deadline, and execution details. The client can accept, reject, or negotiate the proposal before hiring.

**Fixed-price service hiring**

Besides custom proposals, providers can register services with a fixed price and defined description. In these cases, clients can hire the service directly without requesting a quote.

**Payment and intermediation**

After accepting a proposal or hiring a fixed service, the client pays through the platform. The system acts as intermediary, ensuring greater security throughout the process.


**Communication and tracking**

The system tracks the hired service status from request to completion, providing transparency and organization for both parties.

**Ratings and reputation**

After service completion, the client can rate the provider, helping build their reputation within the platform. This helps other clients make safer hiring decisions.

**Architecture**

**Backend**

The backend is built with NestJS, a framework for creating independent services, making separation of responsibilities easier. Each microservice handles a specific system feature, communicating via REST APIs. This structure gives greater control over each system module, improves maintainability, and allows scaling only the services needed as demand grows.

The main planned microservices include:

- Authentication and user management;
- Provider and professional profile management;
- Service and proposal management;
- Hiring and task management;
- Payments and financial transactions;
- Ratings and reputation.

**Frontend**

The frontend is built with Next.js, a framework for building a modern, fast, and optimized interface, providing a smooth and responsive user experience. The frontend handles all user interaction, including:

- User registration and authentication;
- Service provider search;
- Professional profile views;
- Proposal requests and management;
- Service hiring;
- Active service tracking;
- Payment system;
- Ratings and history.

Backend communication happens via REST APIs, ensuring full separation between interface and system logic.



The system uses PostgreSQL, chosen for its reliability, performance, and ability to handle large data volumes. The database stores user, provider, service, proposal, contract, payment, and rating information.

**3.4. Authentication**

System authentication is JWT-based, letting the system operate statelessly — no server-side session storage needed — keeping frontend-backend communication light and efficient.

Authentication works as follows: after logging in with their credentials, the user receives a server-signed JWT token. The token carries essential information such as the user identifier and profile type (client or provider), plus the expiration time. On every request to protected APIs, the token must be sent in the request header for validation.

On the NestJS backend, a dedicated authentication module handles:

- Credential validation;
- JWT token generation and signing;
- Token expiration control;
- Route protection via Guards;
- Profile-based authorization.

**Hosting and Infrastructure**

The system is hosted on the Vercel platform, which supports deploying and running both the backend and the frontend in a secure, scalable cloud environment. The NestJS backend processes business rules and exposes the APIs. The Next.js frontend provides the user interface and consumes those APIs.

The Railway infrastructure runs services independently, ensuring greater stability, easier maintenance, and scalability as the system grows. The platform also offers environment variable management, simplified provisioning, and high availability, ensuring a reliable and efficient operating environment.


____________________________________________________________________________________________________________________



**First-level frontend dependencies:**  
  
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

**Frontend project architecture**

app -> application pages; each page has its own folder and a page.tsx.
components -> all page UI lives here — every page's graphical interface; they only inherit their own components.
api -> responsible for backend API calls. Every call goes through the specific app page handler, which validates and calls the backend in api.
lib -> all utilities that keep the frontend working correctly.
mock -> static data used during development when there is no suitable backend endpoint.

SUMMARY: Each screen is a page, each screen keeps its own resources for that specific screen, and this must be followed at all costs.

**Frontend requirements**

Every screen must be built with shadcn UI and Tailwind styling only. Plain CSS is out of the project.

The frontend must follow all 10 of Nielsen's Heuristics:
1: Visibility of system status.
2: Match between system and the real world.
3: User control and freedom.
4: Consistency and standards.
5: Error prevention.
6: Recognition rather than recall.
7: Flexibility and efficiency of use.
8: Aesthetic and minimalist design.
9: Help users recognize, diagnose, and recover from errors.
10: Help and documentation.

Follow the 10 core frontend concepts:
Rendering Pipeline: The process the browser follows to turn code into pixels on screen.
Event Loop and Scheduling: How to manage tasks without blocking the main thread.
State Management: Telling apart local state, server state, and what belongs in the URL.
Cache and Optimization: Cache invalidation strategies and the importance of optimistic updates.
SSR and Hydration: Using Server Side Rendering and streaming to improve load performance.
Bundle Architecture: The importance of strategies like code splitting and tree shaking.
Main Thread Performance (INP): How metrics like Interaction to Next Paint affect perceived responsiveness.
Design System as Contract: Using the Design System to standardize behavior and reduce inconsistencies.
Accessibility Architecture: The importance of integrating accessibility from component creation onward.
Observability: The ability to monitor errors and performance metrics in real production environments.


Colors:
Primary: #2F80ED Secondary: #27AE60 Accent: #F2C94C Background: #F5F6FA Text: #333333

Typography:
Headings and Body: Poppins

Components:
Buttons
Inputs
Cards
Modals
Chat bubbles
Request cards
