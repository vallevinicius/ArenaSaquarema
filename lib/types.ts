// Espelha os DTOs do backend (ver /api/docs.json). Dinheiro chega como string "12.50".
export type Role = 'ADMIN' | 'OPERADOR';
export type Paginated<T> = { data: T[]; meta: { page: number; pageSize: number; total: number } };

export type Me = { id: number; name: string; email: string; role: Role };
export type User = Me & { active: boolean; createdAt: string };

export type Customer = {
  id: number;
  name: string;
  phone: string | null;
  cpf: string | null;
  openTabId: number | null;
  createdAt: string;
};

export const CATEGORIES = {
  CERVEJA: 'Cerveja',
  REFRIGERANTE: 'Refrigerante',
  AGUA: 'Água',
  ISOTONICO: 'Isotônico',
  SUCO: 'Suco',
  DRINK: 'Drink',
  DESTILADO: 'Destilado',
  PETISCO: 'Petisco',
  OUTROS: 'Outros',
} as const;
export type Category = keyof typeof CATEGORIES;

export type Product = {
  id: number;
  name: string;
  category: Category;
  price: string;
  trackStock: boolean;
  stock: number;
  minStock: number;
  lowStock: boolean;
  active: boolean;
};

export type DayUsePlan = { id: number; name: string; description: string | null; price: string; active: boolean };

export type DayUseSessionStatus = 'ABERTO' | 'FECHADO';

export type DayUseEntry = {
  id: number;
  dayUsePlanId: number;
  planName: string;
  personName: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  paymentMethod: PaymentMethod;
  createdBy: string;
  createdById: number;
  createdAt: string;
};

export type DayUseSession = {
  id: number;
  date: string;
  status: DayUseSessionStatus;
  openedBy: string;
  closedBy: string | null;
  openedAt: string;
  closedAt: string | null;
  entriesCount: number;
  peopleCount: number;
  total: string;
};

export type DayUseSessionDetail = DayUseSession & {
  entries: DayUseEntry[];
  totalsByMethod: { method: PaymentMethod; total: string; count: number }[];
};

export const MOVEMENT_TYPES = {
  ENTRADA: 'Entrada',
  SAIDA: 'Saída',
  AJUSTE: 'Ajuste',
  VENDA: 'Venda',
  ESTORNO: 'Estorno',
} as const;
export type MovementType = keyof typeof MOVEMENT_TYPES;

export type StockMovement = {
  id: number;
  productId: number;
  productName: string;
  type: MovementType;
  quantity: number;
  balance: number;
  reason: string | null;
  userName: string;
  tabId: number | null;
  createdAt: string;
};

export const PAYMENT_METHODS = {
  PIX: 'PIX',
  DINHEIRO: 'Dinheiro',
  CARTAO_DEBITO: 'Cartão de débito',
  CARTAO_CREDITO: 'Cartão de crédito',
} as const;
export type PaymentMethod = keyof typeof PAYMENT_METHODS;
export type TabStatus = 'ABERTA' | 'FECHADA' | 'CANCELADA';

export type Tab = {
  id: number;
  customer: { id: number; name: string; phone: string | null };
  status: TabStatus;
  total: string;
  paymentMethod: PaymentMethod | null;
  notes: string | null;
  itemsCount: number;
  openedBy: string;
  closedBy: string | null;
  openedAt: string;
  closedAt: string | null;
};

export type TabItem = {
  id: number;
  type: 'PRODUTO' | 'DAY_USE';
  productId: number | null;
  dayUsePlanId: number | null;
  description: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  usageDate: string | null;
  createdBy: string;
  createdById: number;
  createdAt: string;
};

export type TabDetail = Tab & { items: TabItem[] };

export type Dashboard = {
  period: { from: string; to: string };
  revenue: string;
  closedTabs: number;
  averageTicket: string;
  openTabs: { count: number; total: string };
  dayUsePeople: number;
  dayUseRevenue: string;
  barRevenue: string;
  byPaymentMethod: { method: string; total: string; count: number }[];
  topProducts: { productId: number; name: string; quantity: number; total: string }[];
  dailyRevenue: { date: string; total: string }[];
  lowStock: { id: number; name: string; stock: number; minStock: number }[];
};
