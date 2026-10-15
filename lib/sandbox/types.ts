import type {
  GENRES,
  INVOICE_STATUSES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  TableName,
  USER_ROLES,
} from "./schema";

export interface Author {
  id: number;
  name: string;
  country: string;
  birth_year: number | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface Book {
  id: number;
  title: string;
  isbn: string;
  author_id: number;
  genre: (typeof GENRES)[number];
  price: number;
  stock: number;
  published_year: number | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  /** Never leaves the server — handlers strip it from every response. */
  password_hash: string;
  role: (typeof USER_ROLES)[number];
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: number;
  user_id: number;
  status: (typeof ORDER_STATUSES)[number];
  total_amount: number;
  shipping_address: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  book_id: number;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface Payment {
  id: number;
  order_id: number;
  amount: number;
  method: (typeof PAYMENT_METHODS)[number];
  status: (typeof PAYMENT_STATUSES)[number];
  transaction_ref: string;
  paid_at: string | null;
  created_at: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  order_id: number;
  payment_id: number;
  user_id: number;
  amount: number;
  status: (typeof INVOICE_STATUSES)[number];
  issued_at: string;
}

/** One learner's whole sandbox — small enough to keep as a single JSON document. */
export interface SandboxData {
  authors: Author[];
  books: Book[];
  users: User[];
  orders: Order[];
  order_items: OrderItem[];
  payments: Payment[];
  invoices: Invoice[];
  /** Last id handed out per table; ids are never reused, as in a real database. */
  seq: Record<TableName, number>;
}
