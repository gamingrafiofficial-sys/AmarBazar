import { pgTable, serial, text, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define 'users' table linking to Firebase Auth UID
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name').default(''),
  phone: text('phone').default(''),
  role: text('role').default('customer'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define 'markets' table (Thanas / Areas)
export const markets = pgTable('markets', {
  id: text('id').primaryKey(),
  nameEn: text('name_en').notNull(),
  nameBn: text('name_bn').notNull(),
  district: text('district').default('Gazipur'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define 'products' table
export const products = pgTable('products', {
  id: text('id').primaryKey(),
  marketId: text('market_id').default('kaliganj'),
  nameEn: text('name_en').notNull(),
  nameBn: text('name_bn').notNull(),
  price: integer('price').notNull(),
  unit: text('unit').notNull(),
  stock: integer('stock').default(0),
  isAvailable: boolean('is_available').default(true),
  imageUrl: text('image_url').default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define 'orders' table
export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  customerId: text('customer_id'),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  deliveryAddress: text('delivery_address').notNull(),
  totalAmount: integer('total_amount').notNull(),
  deliveryFee: integer('delivery_fee').default(50),
  subtotal: integer('subtotal').notNull(),
  orderStatus: text('order_status').notNull().default('pending_shop_confirmation'),
  paymentStatus: text('payment_status').notNull().default('pending'),
  paymentMethod: text('payment_method').default('cod'),
  thanaId: text('thana_id').default('kaliganj'),
  thanaNameBn: text('thana_name_bn').default('কালীগঞ্জ'),
  unionId: text('union_id').default(''),
  unionNameBn: text('union_name_bn').default(''),
  riderId: text('rider_id'),
  riderName: text('rider_name'),
  riderPhone: text('rider_phone'),
  items: jsonb('items'),
  notes: text('notes').default(''),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Define 'riders' table
export const riders = pgTable('riders', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull().unique(),
  area: text('area').default('kaliganj'),
  currentBalance: integer('current_balance').default(0),
  isOnline: boolean('is_online').default(false),
  isActive: boolean('is_active').default(true),
  assignedUnionIds: jsonb('assigned_union_ids'),
  createdAt: timestamp('created_at').defaultNow(),
});
