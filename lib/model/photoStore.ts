const DB_NAME = "autobench-pops-photo-evidence";
const STORE = "images";
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

function openPhotoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Image database unavailable"));
  });
}

async function transact<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openPhotoDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = action(tx.objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Photo storage failed"));
      tx.onerror = () => reject(tx.error ?? new Error("Photo transaction failed"));
      tx.onabort = () => reject(tx.error ?? new Error("Photo transaction aborted"));
    });
  } finally {
    db.close();
  }
}

export async function storePhotoFile(id: string, file: File): Promise<{ widthPx: number; heightPx: number }> {
  if (!id || !ALLOWED_MIME.has(file.type) || file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    throw new Error("Use a PNG, JPEG or WebP image under 15 MB.");
  }
  const bitmap = await createImageBitmap(file);
  const widthPx = bitmap.width;
  const heightPx = bitmap.height;
  bitmap.close();
  if (!widthPx || !heightPx || widthPx > 30000 || heightPx > 30000) {
    throw new Error("Image dimensions are invalid or too large.");
  }
  await transact("readwrite", store => store.put(file, id));
  return { widthPx, heightPx };
}

export async function loadPhotoBlob(id: string): Promise<Blob | null> {
  const result = await transact<Blob | undefined>("readonly", store => store.get(id));
  return result ?? null;
}

export async function removePhotoBlob(id: string): Promise<void> {
  await transact("readwrite", store => store.delete(id));
}
