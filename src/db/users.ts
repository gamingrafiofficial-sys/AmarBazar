import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string, name?: string, phone?: string, role?: string) {
  try {
    const result = await db.insert(users)
      .values({
        uid,
        email: email || '',
        name: name || '',
        phone: phone || '',
        role: role || 'customer',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: email || '',
          name: name || '',
          phone: phone || '',
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Database getOrCreateUser failed:", error);
    throw new Error("Failed to synchronize user profile. Please try again later.", { cause: error });
  }
}

export async function getUsers() {
  try {
    return await db.select().from(users);
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}
