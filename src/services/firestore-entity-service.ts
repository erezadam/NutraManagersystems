import type { DocumentData } from 'firebase/firestore';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';

export interface SortInstruction {
  field: string;
  direction: 'asc' | 'desc';
}

export function parseSort(sort?: string): SortInstruction | null {
  const normalized = sort?.trim();
  if (!normalized) return null;

  const parts = normalized.split(/\s+/).filter(Boolean);
  const field = parts[0];
  const direction = parts[1]?.toLowerCase() === 'desc' ? 'desc' : 'asc';

  if (!field) return null;
  return { field, direction };
}

function isTimestampLike(value: unknown): value is { toDate: () => Date } {
  return typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function';
}

function normalizeFirestoreValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeFirestoreValue);
  }

  if (isTimestampLike(value)) {
    return value.toDate().toISOString();
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, nested]) => [key, normalizeFirestoreValue(nested)]);
    return Object.fromEntries(entries);
  }

  return value;
}

function omitUndefined<T extends object>(input: T): T {
  const entries = Object.entries(input).filter(([, value]) => value !== undefined);
  return Object.fromEntries(entries) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

function fromDoc<T extends { id: string }>(id: string, data: DocumentData): T {
  const normalized = normalizeFirestoreValue(data) as Record<string, unknown>;
  return { id, ...(normalized as Omit<T, 'id'>) } as T;
}

export class FirestoreEntityService<T extends { id: string }, TCreate = Partial<T>, TUpdate = Partial<T>> {
  private readonly entityName: string;

  constructor(entityName: string) {
    this.entityName = entityName;
  }

  async list(sort?: string): Promise<T[]> {
    const db = getFirebaseDb();
    const collectionRef = collection(db, this.entityName);
    const instruction = parseSort(sort);
    const targetQuery = instruction ? query(collectionRef, orderBy(instruction.field, instruction.direction)) : query(collectionRef);
    const snapshot = await getDocs(targetQuery);
    return snapshot.docs.map((snapshotDoc) => fromDoc<T>(snapshotDoc.id, snapshotDoc.data()));
  }

  async get(id: string): Promise<T> {
    const db = getFirebaseDb();
    const ref = doc(db, this.entityName, id);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      throw new Error(`Entity ${this.entityName} with ID ${id} not found`);
    }
    return fromDoc<T>(snapshot.id, snapshot.data());
  }

  async create(data: TCreate): Promise<T> {
    const db = getFirebaseDb();
    const createdDate = nowIso();
    const payload = omitUndefined({
      ...(data as Record<string, unknown>),
      created_date: (data as Record<string, unknown>).created_date ?? createdDate,
      updated_date: createdDate
    });

    const created = await addDoc(collection(db, this.entityName), payload);
    const snapshot = await getDoc(created);
    if (!snapshot.exists()) {
      throw new Error(`Failed to read created ${this.entityName}`);
    }

    return fromDoc<T>(snapshot.id, snapshot.data());
  }

  async update(id: string, data: TUpdate): Promise<T> {
    const db = getFirebaseDb();
    const ref = doc(db, this.entityName, id);
    const payload = omitUndefined({ ...(data as Record<string, unknown>), updated_date: nowIso() });
    await updateDoc(ref, payload);

    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      throw new Error(`Entity ${this.entityName} with ID ${id} not found`);
    }

    return fromDoc<T>(snapshot.id, snapshot.data());
  }

  async delete(id: string): Promise<void> {
    const db = getFirebaseDb();
    await deleteDoc(doc(db, this.entityName, id));
  }
}
