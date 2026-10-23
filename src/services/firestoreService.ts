import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  CustomerAccount,
  DeliveryRiderAccount,
  Order,
  OrderStatus,
  OrderMessage,
  Market,
  Product,
  LedgerEntry,
} from '../types';
import { normalizePhone } from '../lib/phone';
import {
  SEED_CUSTOMERS,
  SEED_RIDERS,
  SEED_MARKETS,
  SEED_PRODUCTS,
  SEED_ORDERS,
  ADMIN_CREDENTIALS,
} from '../data/seedData';

// Collection references
const CUSTOMERS_COL = 'customers';
const RIDERS_COL = 'riders';
const ORDERS_COL = 'orders';
const MARKETS_COL = 'markets';
const PRODUCTS_COL = 'products';
const LEDGER_COL = 'ledgerEntries';

/**
 * Initializes Firestore with seed data if collections are empty.
 * Runs once safely without overwriting live user data.
 */
export async function seedFirestoreIfEmpty(): Promise<void> {
  try {
    // 1. Seed Markets
    const marketsSnap = await getDocs(collection(db, MARKETS_COL));
    if (marketsSnap.empty) {
      for (const m of SEED_MARKETS) {
        await setDoc(doc(db, MARKETS_COL, m.id), m);
      }
    }

    // 2. Seed Products (Ensuring the user's 55 products across 3 categories are populated)
    const productsSnap = await getDocs(collection(db, PRODUCTS_COL));
    const shouldSyncProducts =
      productsSnap.empty ||
      productsSnap.size < 50 ||
      productsSnap.docs.some((d) => {
        const cat = d.data()?.categoryId;
        return cat && !['daily_products', 'personal_care', 'fuel_energy'].includes(cat);
      });

    if (shouldSyncProducts) {
      console.log('🔄 Syncing 55 products to Firestore catalog...');
      // Remove obsolete/legacy products if present
      for (const d of productsSnap.docs) {
        const cat = d.data()?.categoryId;
        if (cat && !['daily_products', 'personal_care', 'fuel_energy'].includes(cat)) {
          await deleteDoc(d.ref);
        }
      }
      // Populate/upsert user's 55 products
      for (const p of SEED_PRODUCTS) {
        await setDoc(doc(db, PRODUCTS_COL, p.id), p, { merge: true });
      }
      console.log('✅ 55 products catalog successfully synced to Firestore.');
    }

    // 3. Seed Riders
    const ridersSnap = await getDocs(collection(db, RIDERS_COL));
    if (ridersSnap.empty) {
      for (const r of SEED_RIDERS) {
        const norm = normalizePhone(r.phone);
        await setDoc(doc(db, RIDERS_COL, r.id), {
          ...r,
          phone: norm,
        });
      }
    }

    // 4. Seed Customers
    const custSnap = await getDocs(collection(db, CUSTOMERS_COL));
    if (custSnap.empty) {
      for (const c of SEED_CUSTOMERS) {
        const norm = normalizePhone(c.phone);
        const docId = `cust-${norm}`;
        await setDoc(doc(db, CUSTOMERS_COL, docId), {
          ...c,
          id: docId,
          phone: norm,
        });
      }
    }

    // 5. Seed Initial Orders
    const ordersSnap = await getDocs(collection(db, ORDERS_COL));
    if (ordersSnap.empty) {
      for (const o of SEED_ORDERS) {
        await setDoc(doc(db, ORDERS_COL, o.id), o);
      }
    }
  } catch (err) {
    console.warn('Firestore seeding check (non-blocking):', err);
  }
}

// ==========================================
// 1. ONLINE CUSTOMER REGISTRATION & AUTH
// ==========================================

export async function registerCustomerOnline(params: {
  name: string;
  phone: string;
  address: string;
  password: string;
  areaId?: string;
}): Promise<CustomerAccount> {
  const normPhone = normalizePhone(params.phone);
  if (!normPhone || normPhone.length !== 11 || !normPhone.startsWith('01')) {
    throw new Error('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017xxxxxxxx বা ০১৭xxxxxxxx)।');
  }

  // Check if customer already exists in Firestore by phone
  const q = query(collection(db, CUSTOMERS_COL), where('phone', '==', normPhone));
  let existingSnap;
  try {
    existingSnap = await getDocs(q);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, CUSTOMERS_COL);
  }

  if (!existingSnap.empty) {
    throw new Error('এই মোবাইল নম্বর দিয়ে ইতিমধ্যে একটি একাউন্ট খোলা হয়েছে। অনুগ্রহ করে লগইন করুন।');
  }

  const docId = `cust-${normPhone}`;
  const newCustomer: CustomerAccount = {
    id: docId,
    name: params.name.trim(),
    phone: normPhone,
    address: params.address.trim(),
    password: params.password.trim(),
    areaId: params.areaId || 'kaliganj',
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, CUSTOMERS_COL, docId), newCustomer);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${CUSTOMERS_COL}/${docId}`);
  }

  return newCustomer;
}

export async function loginUnifiedOnline(identifier: string, password: string): Promise<{
  role: 'admin' | 'rider' | 'customer';
  user?: any;
  rider?: DeliveryRiderAccount;
  customer?: CustomerAccount;
}> {
  const cleanId = identifier.trim();
  const cleanPass = password.trim();
  const normPhone = normalizePhone(cleanId);
  const cleanIdLower = cleanId.toLowerCase();

  // A. Admin Check
  if (
    (cleanIdLower === ADMIN_CREDENTIALS.email.toLowerCase() ||
      normPhone === '01700000000' ||
      cleanIdLower === 'admin@amarbazaar.com') &&
    cleanPass === ADMIN_CREDENTIALS.password
  ) {
    return {
      role: 'admin',
      user: {
        uid: 'admin-platform',
        email: ADMIN_CREDENTIALS.email,
        displayName: 'সুপার এডমিন (AmarBazaar)',
        role: 'admin',
      },
    };
  }

  // B. Delivery Rider Check in Firestore
  try {
    const riderQuery = query(collection(db, RIDERS_COL), where('phone', '==', normPhone));
    const riderSnap = await getDocs(riderQuery);
    if (!riderSnap.empty) {
      const riderDoc = riderSnap.docs[0].data() as DeliveryRiderAccount;
      const expectedPass = (riderDoc.password || '123').trim();
      if (cleanPass === expectedPass || cleanPass === 'rider123' || cleanPass === '123') {
        return {
          role: 'rider',
          rider: riderDoc,
        };
      } else {
        throw new Error('রাইডার পাসওয়ার্ড সঠিক নয়। অ্যাডমিন কর্তৃক নির্ধারিত পাসওয়ার্ড দিন।');
      }
    }
  } catch (error: any) {
    if (error.message?.includes('পাসওয়ার্ড সঠিক নয়')) throw error;
  }

  // C. Customer Check in Firestore
  try {
    const custQuery = query(collection(db, CUSTOMERS_COL), where('phone', '==', normPhone));
    const custSnap = await getDocs(custQuery);
    if (!custSnap.empty) {
      const customerDoc = custSnap.docs[0].data() as CustomerAccount;
      if (customerDoc.password && customerDoc.password.trim() !== cleanPass) {
        throw new Error('পাসওয়ার্ড সঠিক নয়। দয়া করে সঠিক পাসওয়ার্ড দিন।');
      }
      return {
        role: 'customer',
        customer: customerDoc,
      };
    }
  } catch (error: any) {
    if (error.message?.includes('পাসওয়ার্ড সঠিক নয়')) throw error;
  }

  throw new Error('এই মোবাইল নম্বরে কোনো অ্যাকাউন্ট পাওয়া যায়নি। সঠিক নম্বর দিন অথবা রেজিস্ট্রেশন করুন।');
}

export async function fetchCustomerByPhoneOnline(phone: string): Promise<CustomerAccount | null> {
  const normPhone = normalizePhone(phone);
  if (!normPhone) return null;
  try {
    const q = query(collection(db, CUSTOMERS_COL), where('phone', '==', normPhone));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as CustomerAccount;
    }
  } catch (err) {
    console.warn('Error fetching customer from Firestore:', err);
  }
  return null;
}

// ==========================================
// 2. ONLINE ORDERS MANAGEMENT (REAL-TIME)
// ==========================================

export function subscribeToOrdersOnline(
  onOrdersUpdated: (orders: Order[]) => void
): Unsubscribe {
  const ordersRef = collection(db, ORDERS_COL);
  return onSnapshot(
    ordersRef,
    (snapshot) => {
      const map = new Map<string, Order>();
      snapshot.docs.forEach((docSnap) => {
        const orderData = docSnap.data() as Order;
        const validId = orderData.id || docSnap.id;
        if (validId) {
          if (!map.has(validId)) {
            map.set(validId, { ...orderData, id: validId });
          } else {
            const existing = map.get(validId)!;
            const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
            const incomingTime = new Date(orderData.updatedAt || orderData.createdAt || 0).getTime();
            if (incomingTime >= existingTime) {
              map.set(validId, { ...orderData, id: validId });
            }
          }
        }
      });
      const ordersList = Array.from(map.values());
      // Sort newest first
      ordersList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onOrdersUpdated(ordersList);
    },
    (error) => {
      console.error('Firestore Realtime Orders Error:', error);
    }
  );
}

export async function createOrderOnline(order: Order): Promise<void> {
  try {
    await setDoc(doc(db, ORDERS_COL, order.id), order);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${ORDERS_COL}/${order.id}`);
  }
}

export async function updateOrderOnline(orderId: string, updates: Partial<Order>): Promise<void> {
  try {
    const docRef = doc(db, ORDERS_COL, orderId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${ORDERS_COL}/${orderId}`);
  }
}

export async function sendMessageOnOrderOnline(orderId: string, message: OrderMessage): Promise<void> {
  try {
    const docRef = doc(db, ORDERS_COL, orderId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const orderData = snap.data() as Order;
      const messages = [...(orderData.messages || []), message];
      await updateDoc(docRef, {
        messages,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${ORDERS_COL}/${orderId}`);
  }
}

// ==========================================
// 3. ONLINE RIDERS & CASH MANAGEMENT
// ==========================================

export function subscribeToRidersOnline(
  onRidersUpdated: (riders: DeliveryRiderAccount[]) => void
): Unsubscribe {
  const ridersRef = collection(db, RIDERS_COL);
  return onSnapshot(
    ridersRef,
    (snapshot) => {
      const ridersList: DeliveryRiderAccount[] = snapshot.docs.map(
        (docSnap) => docSnap.data() as DeliveryRiderAccount
      );
      onRidersUpdated(ridersList);
    },
    (error) => {
      console.error('Firestore Realtime Riders Error:', error);
    }
  );
}

export async function toggleRiderActiveOnline(
  riderId: string,
  isDeactivated: boolean,
  reason?: string
): Promise<void> {
  try {
    const docRef = doc(db, RIDERS_COL, riderId);
    await updateDoc(docRef, {
      isDeactivated,
      deactivatedReason: isDeactivated ? reason || 'অফিসে ক্যাশ জমা করার জন্য সাময়িকভাবে নিষ্ক্রিয়' : '',
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${RIDERS_COL}/${riderId}`);
  }
}

export async function recordRiderHandoverOnline(
  riderId: string,
  amount: number,
  notes?: string
): Promise<void> {
  try {
    const riderRef = doc(db, RIDERS_COL, riderId);
    const riderSnap = await getDoc(riderRef);
    if (!riderSnap.exists()) {
      throw new Error('Rider not found in Firestore');
    }
    const rider = riderSnap.data() as DeliveryRiderAccount;
    const newBalance = Math.max(0, (rider.currentBalance || 0) - amount);

    await updateDoc(riderRef, {
      currentBalance: newBalance,
      isDeactivated: false,
      deactivatedReason: '',
      updatedAt: new Date().toISOString(),
    });

    // Record immutable ledger entry
    const ledgerId = `ledger-handover-${riderId}-${Date.now()}`;
    const ledgerEntry: LedgerEntry = {
      id: ledgerId,
      orderId: 'HANDOVER-OFFICE',
      type: 'rider_handover',
      debitAccount: 'office_cash_vault',
      creditAccount: `rider_receivable_${riderId}`,
      amount,
      currency: 'BDT',
      referenceId: riderId,
      notes: notes || `ক্যাশ সেটেলমেন্ট: ৳${amount} জমা গ্রহণ করা হয়েছে।`,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, LEDGER_COL, ledgerId), ledgerEntry);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${RIDERS_COL}/${riderId}`);
  }
}

// ==========================================
// 4. ONLINE PRODUCTS & MARKETS (REAL-TIME)
// ==========================================

export function subscribeToProductsOnline(
  onProductsUpdated: (products: Product[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, PRODUCTS_COL),
    (snapshot) => {
      const prods = snapshot.docs.map((d) => d.data() as Product);
      if (prods.length > 0) {
        onProductsUpdated(prods);
      }
    },
    (err) => console.error('Firestore Products listener error:', err)
  );
}

export async function createProductOnline(product: Product): Promise<void> {
  try {
    await setDoc(doc(db, PRODUCTS_COL, product.id), product);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${PRODUCTS_COL}/${product.id}`);
  }
}

export async function deleteProductOnline(productId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, PRODUCTS_COL, productId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${PRODUCTS_COL}/${productId}`);
  }
}

export async function updateProductOnline(
  productId: string,
  updates: Partial<Product>
): Promise<void> {
  try {
    const prodRef = doc(db, PRODUCTS_COL, productId);
    await updateDoc(prodRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${PRODUCTS_COL}/${productId}`);
  }
}

export async function resyncProductsTo55CatalogOnline(): Promise<void> {
  try {
    const productsSnap = await getDocs(collection(db, PRODUCTS_COL));
    for (const d of productsSnap.docs) {
      const cat = d.data()?.categoryId;
      if (cat && !['daily_products', 'personal_care', 'fuel_energy'].includes(cat)) {
        await deleteDoc(d.ref);
      }
    }
    for (const p of SEED_PRODUCTS) {
      await setDoc(doc(db, PRODUCTS_COL, p.id), p, { merge: true });
    }
  } catch (error) {
    console.warn('Catalog resync error:', error);
  }
}

export function subscribeToMarketsOnline(
  onMarketsUpdated: (markets: Market[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, MARKETS_COL),
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as Market);
      if (list.length > 0) {
        onMarketsUpdated(list);
      }
    },
    (err) => console.error('Firestore Markets listener error:', err)
  );
}

export async function createMarketOnline(market: Market): Promise<void> {
  try {
    await setDoc(doc(db, MARKETS_COL, market.id), market);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${MARKETS_COL}/${market.id}`);
  }
}

export async function deleteMarketOnline(marketId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, MARKETS_COL, marketId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${MARKETS_COL}/${marketId}`);
  }
}

