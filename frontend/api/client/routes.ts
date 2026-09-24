// Declarative route tables — single source for client API paths

export const CLIENT_ROUTES = {
  categories: "/categories",
  providers: {
    search: "/providers/search",
    profile: (providerId: string) => `/providers/${providerId}/profile`,
  },
  services: {
    me: "/services/me",
    byId: (orderId: string) => `/services/me/${orderId}`,
  },
  payments: {
    create: "/payments",
    charge: (paymentId: string) => `/payments/${paymentId}/charge`,
    status: (paymentId: string) => `/payments/${paymentId}/status`,
  },
  proposals: {
    accept: (proposalId: string) => `/proposals/${proposalId}/accept`,
    reject: (proposalId: string) => `/proposals/${proposalId}/reject`,
  },
  reviews: {
    provider: (providerId: string, limit: number) =>
      `/reviews/provider/${providerId}?limit=${limit}`,
  },
} as const;

export const SERVICE_ORDERS_ROUTES = {
  me: "/services/me",
  byId: (orderId: string) => `/services/me/${orderId}`,
} as const;

export const CLIENT_PAYMENTS_ROUTES = {
  list: "/payments",
  create: "/payments",
  charge: (paymentId: string) => `/payments/${paymentId}/charge`,
  status: (paymentId: string) => `/payments/${paymentId}/status`,
} as const;

export const CLIENT_PROPOSALS_ROUTES = {
  accept: (proposalId: string) => `/proposals/${proposalId}/accept`,
  reject: (proposalId: string) => `/proposals/${proposalId}/reject`,
} as const;
