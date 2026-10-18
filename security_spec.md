# Security Specification: AmarBazaar Local Marketplace & Delivery

## 1. Data Invariants
1. **Role Immobility & Verification:** A user cannot elevate their own role (`role: 'admin'`, `role: 'rider'`, `role: 'shopkeeper'`) or bypass email verification. Admin bootstrap is strictly bound to `gamingrafi.official@gmail.com` and admin documents.
2. **Pricing & Fee Client Distrust:** Never trust client-supplied item prices, subtotal, delivery fee, platform commissions, or road distance calculations. Order creation must be sealed or server-validated.
3. **Single-Shop Order Boundary:** An order must exclusively reference products belonging to a single authorized, approved shop in the active service area.
4. **State Machine Strictness:** Transitions follow a deterministic DAG:
   - `pending_shop_confirmation` -> `shop_confirmed` (only by shopkeeper) or `shop_rejected` (only by shopkeeper with reason) or `cancelled` (customer prior to confirmation)
   - `shop_confirmed` -> `rider_assigned` (only by admin or authorized system dispatch)
   - `rider_assigned` -> `picked_up` (only by assigned rider)
   - `picked_up` -> `out_for_delivery` (only by assigned rider)
   - `out_for_delivery` -> `delivered` (only by assigned rider with exact COD recorded) or `delivery_failed` (only by assigned rider with failure reason)
   - Terminal states (`delivered`, `cancelled`, `shop_rejected`, `delivery_failed`, `returned`) are immutable and locked against updates except by admin.
5. **Shopkeeper Isolation:** Shopkeepers can only modify products where `product.shopId == request.auth.uid` or their verified owned shop document. They cannot tamper with completed orders, ledger records, or platform commissions.
6. **Rider Access & Privacy Guard:** Riders can only view delivery tasks assigned to their UID (`delivery.riderId == request.auth.uid`). They cannot modify order totals, prices, or customer identities.
7. **Ledger Immutability:** Financial ledger entries (`ledgerEntries`) are strictly append-only and immutable. No client can edit or delete an existing ledger entry.
8. **Anti-Update-Gap:** All updates require validation helper wrapping and `affectedKeys().hasOnly([...])` field masks.

---

## 2. The Dirty Dozen Malicious Payloads

1. **Payload 1 (Privilege Escalation on User Profile):**
   A standard customer sends `{ "role": "admin", "isActive": true }` to `/users/{uid}`.
   *Expected:* PERMISSION_DENIED.

2. **Payload 2 (Ghost Field Injection):**
   A shopkeeper updating inventory adds an unmapped field `{ "stock": 10, "isApprovedBypass": true }`.
   *Expected:* PERMISSION_DENIED.

3. **Payload 3 (Arbitrary Delivery Fee Spoofing):**
   A customer submits an order document directly with `{ "deliveryFee": 0, "subtotal": 5 }` on a 15km delivery.
   *Expected:* PERMISSION_DENIED (Must be verified via cloud function / trusted server).

4. **Payload 4 (Rider Self-Assignment & Theft):**
   Rider A attempts to update order `/orders/{orderId}` to set `riderId: "riderA"` for an unassigned order without admin privilege.
   *Expected:* PERMISSION_DENIED.

5. **Payload 5 (Rider Tampering with COD Amount Due):**
   Rider updates `/deliveries/{deliveryId}` setting `codAmountToCollect: 10` when order total is ৳850.
   *Expected:* PERMISSION_DENIED (`affectedKeys().hasOnly(['status', 'codAmountCollected', 'failedReason', 'updatedAt'])`).

6. **Payload 6 (Terminal State Overwrite):**
   A shopkeeper or customer attempts to change an order with status `delivered` back to `shop_confirmed`.
   *Expected:* PERMISSION_DENIED (Terminal state locked).

7. **Payload 7 (Cross-Shop Product Tampering):**
   Shopkeeper A attempts to edit a product document in `/products/{productId}` owned by Shopkeeper B.
   *Expected:* PERMISSION_DENIED.

8. **Payload 8 (Ledger Tampering / Deletion):**
   A user or shopkeeper calls `deleteDoc(doc(db, 'ledgerEntries', 'entry123'))` to erase a commission charge.
   *Expected:* PERMISSION_DENIED (Delete rule evaluates to false).

9. **Payload 9 (Denial-of-Wallet Oversized String Injection):**
   Attacker submits a 500KB address string in `deliveryAddress`.
   *Expected:* PERMISSION_DENIED (Boundary check `deliveryAddress.size() <= 500`).

10. **Payload 10 (Path ID Poisoning):**
    Attacker tries to create a document with ID `../../root` or a non-alphanumeric string.
    *Expected:* PERMISSION_DENIED (`isValidId()` constraint).

11. **Payload 11 (Timestamp Fraud):**
    Attacker sets `createdAt: "2020-01-01T00:00:00Z"` in client write payload.
    *Expected:* PERMISSION_DENIED (`incoming().createdAt == request.time`).

12. **Payload 12 (Unauthenticated / Blanket Query Scraping):**
    Attacker runs blanket `getDocs(collection(db, 'orders'))` without filtering by their own `customerId` or `shopId`.
    *Expected:* PERMISSION_DENIED.
