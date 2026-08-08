import { Lesson } from '../types';

const DB_NAME = 'AhsaniLessonScannerDB';
const DB_VERSION = 1;
const STORE_NAME = 'lessons';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function saveLesson(lesson: Lesson): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(lesson);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAllLessons(): Promise<Lesson[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const rawLessons = request.result as Lesson[];
      const lessons = rawLessons.map((l) => ({
        ...l,
        pageImages: l.pageImages && l.pageImages.length > 0 ? l.pageImages : (l.imageDataUrl ? [l.imageDataUrl] : []),
      }));
      // Sort newest first
      lessons.sort((a, b) => b.createdAt - a.createdAt);
      resolve(lessons);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getLessonById(id: string): Promise<Lesson | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      const res = request.result as Lesson | undefined;
      if (!res) return resolve(null);
      resolve({
        ...res,
        pageImages: res.pageImages && res.pageImages.length > 0 ? res.pageImages : (res.imageDataUrl ? [res.imageDataUrl] : []),
      });
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteLesson(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
