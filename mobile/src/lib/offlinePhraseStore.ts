import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PhraseList, PhraseListItem } from "../types";
import { phraseListsApi } from "./api";

type QueuedAddItem = {
  id: string;
  listId: string;
  item: {
    chinese: string;
    pinyin?: string;
    english: string;
  };
  createdAt: string;
};

type QueuedCreateList = {
  id: string;
  list: {
    name: string;
    description?: string;
  };
  createdAt: string;
};

function listsKey(userId: string) {
  return `phrase-lists:${userId}`;
}

function itemsKey(userId: string, listId: string) {
  return `phrase-list-items:${userId}:${listId}`;
}

function itemQueueKey(userId: string) {
  return `phrase-list-item-queue:${userId}`;
}

function listQueueKey(userId: string) {
  return `phrase-list-create-queue:${userId}`;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) as T : fallback;
}

async function writeJson(key: string, value: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function isHttpError(error: unknown) {
  return error instanceof Error && /^\d{3}:/.test(error.message);
}

export async function getCachedPhraseLists(userId: string) {
  return readJson<PhraseList[]>(listsKey(userId), []);
}

export async function setCachedPhraseLists(userId: string, lists: PhraseList[]) {
  await writeJson(listsKey(userId), lists);
}

export async function getCachedPhraseItems(userId: string, listId: string) {
  return readJson<PhraseListItem[]>(itemsKey(userId, listId), []);
}

export async function setCachedPhraseItems(userId: string, listId: string, items: PhraseListItem[]) {
  await writeJson(itemsKey(userId, listId), items);
}

export async function getQueuedAdds(userId: string) {
  return readJson<QueuedAddItem[]>(itemQueueKey(userId), []);
}

async function setQueuedAdds(userId: string, queue: QueuedAddItem[]) {
  await writeJson(itemQueueKey(userId), queue);
}

export async function getQueuedListCreates(userId: string) {
  return readJson<QueuedCreateList[]>(listQueueKey(userId), []);
}

async function setQueuedListCreates(userId: string, queue: QueuedCreateList[]) {
  await writeJson(listQueueKey(userId), queue);
}

export async function loadPhraseListsOfflineFirst(userId: string) {
  try {
    const remote = await phraseListsApi.getAll();
    const pending = (await getQueuedListCreates(userId)).map(toPendingList);
    const merged = [...remote, ...pending];
    await setCachedPhraseLists(userId, merged);
    return merged;
  } catch (error) {
    if (isHttpError(error)) throw error;
    return getCachedPhraseLists(userId);
  }
}

export async function loadPhraseItemsOfflineFirst(userId: string, listId: string) {
  if (isPendingId(listId)) {
    return getCachedPhraseItems(userId, listId);
  }

  try {
    const remote = await phraseListsApi.getItems(listId);
    const queued = (await getQueuedAdds(userId)).filter((entry) => entry.listId === listId);
    const pending = queued.map(toPendingItem);
    const merged = [...remote, ...pending];
    await setCachedPhraseItems(userId, listId, merged);
    return merged;
  } catch (error) {
    if (isHttpError(error)) throw error;
    return getCachedPhraseItems(userId, listId);
  }
}

export async function addPhraseItemOfflineFirst(
  userId: string,
  listId: string,
  item: { chinese: string; pinyin?: string; english: string }
) {
  if (isPendingId(listId)) {
    return queuePhraseItem(userId, listId, item);
  }

  try {
    const created = await phraseListsApi.addItem(listId, item);
    const current = await getCachedPhraseItems(userId, listId);
    await setCachedPhraseItems(userId, listId, [...current.filter((entry) => entry.id !== created.id), created]);
    return { item: created, queued: false };
  } catch (error) {
    if (isHttpError(error)) throw error;
    return queuePhraseItem(userId, listId, item);
  }
}

export async function createPhraseListOfflineFirst(
  userId: string,
  list: { name: string; description?: string }
) {
  try {
    const created = await phraseListsApi.create(list);
    const current = await getCachedPhraseLists(userId);
    await setCachedPhraseLists(userId, [...current.filter((entry) => entry.id !== created.id), created]);
    return { list: created, queued: false };
  } catch (error) {
    if (isHttpError(error)) throw error;
    const queued: QueuedCreateList = {
      id: `pending-list-${Date.now()}`,
      list,
      createdAt: new Date().toISOString()
    };
    const queue = await getQueuedListCreates(userId);
    await setQueuedListCreates(userId, [...queue, queued]);
    const pending = toPendingList(queued);
    const current = await getCachedPhraseLists(userId);
    await setCachedPhraseLists(userId, [...current, pending]);
    await setCachedPhraseItems(userId, pending.id, []);
    return { list: pending, queued: true };
  }
}

export async function syncQueuedPhraseData(userId: string) {
  const { synced: syncedLists, replacements } = await syncQueuedPhraseLists(userId);
  const syncedItems = await syncQueuedPhraseAdds(userId);
  return { syncedLists, syncedItems, replacements };
}

export async function syncQueuedPhraseAdds(userId: string) {
  const queue = await getQueuedAdds(userId);
  if (queue.length === 0) return 0;

  const remaining: QueuedAddItem[] = [];
  let synced = 0;

  for (const entry of queue) {
    if (isPendingId(entry.listId)) {
      remaining.push(entry);
      continue;
    }

    try {
      const created = await phraseListsApi.addItem(entry.listId, entry.item);
      const current = await getCachedPhraseItems(userId, entry.listId);
      await setCachedPhraseItems(
        userId,
        entry.listId,
        current.map((item) => item.id === entry.id ? created : item)
      );
      synced += 1;
    } catch {
      remaining.push(entry);
    }
  }

  await setQueuedAdds(userId, remaining);
  return synced;
}

async function syncQueuedPhraseLists(userId: string) {
  const queue = await getQueuedListCreates(userId);
  if (queue.length === 0) return { synced: 0, replacements: new Map<string, PhraseList>() };

  const remaining: QueuedCreateList[] = [];
  const replacements = new Map<string, PhraseList>();
  let synced = 0;

  for (const entry of queue) {
    try {
      const created = await phraseListsApi.create(entry.list);
      await replacePendingListId(userId, entry.id, created);
      replacements.set(entry.id, created);
      synced += 1;
    } catch {
      remaining.push(entry);
    }
  }

  await setQueuedListCreates(userId, remaining);
  return { synced, replacements };
}

async function queuePhraseItem(
  userId: string,
  listId: string,
  item: { chinese: string; pinyin?: string; english: string }
) {
  const queued: QueuedAddItem = {
    id: `pending-item-${Date.now()}`,
    listId,
    item,
    createdAt: new Date().toISOString()
  };
  const queue = await getQueuedAdds(userId);
  await setQueuedAdds(userId, [...queue, queued]);
  const pending = toPendingItem(queued);
  const current = await getCachedPhraseItems(userId, listId);
  await setCachedPhraseItems(userId, listId, [...current, pending]);
  await incrementCachedListCount(userId, listId);
  return { item: pending, queued: true };
}

async function replacePendingListId(userId: string, pendingId: string, created: PhraseList) {
  const lists = await getCachedPhraseLists(userId);
  const pendingItems = await getCachedPhraseItems(userId, pendingId);
  const queue = await getQueuedAdds(userId);
  const migratedItems = pendingItems.map((item) => ({ ...item, listId: created.id }));
  const migratedQueue = queue.map((entry) => entry.listId === pendingId ? { ...entry, listId: created.id } : entry);

  await setCachedPhraseLists(
    userId,
    lists.map((list) => list.id === pendingId ? { ...created, itemCount: pendingItems.length } : list)
  );
  await setCachedPhraseItems(userId, created.id, migratedItems);
  await AsyncStorage.removeItem(itemsKey(userId, pendingId));
  await setQueuedAdds(userId, migratedQueue);
}

async function incrementCachedListCount(userId: string, listId: string) {
  const lists = await getCachedPhraseLists(userId);
  await setCachedPhraseLists(
    userId,
    lists.map((list) => list.id === listId ? { ...list, itemCount: (list.itemCount ?? 0) + 1 } : list)
  );
}

function isPendingId(id: string) {
  return id.startsWith("pending-");
}

function toPendingList(entry: QueuedCreateList): PhraseList {
  return {
    id: entry.id,
    name: entry.list.name,
    description: entry.list.description ?? null,
    itemCount: 0,
    createdAt: entry.createdAt,
    pendingSync: true
  };
}

function toPendingItem(entry: QueuedAddItem): PhraseListItem {
  return {
    id: entry.id,
    listId: entry.listId,
    chinese: entry.item.chinese,
    pinyin: entry.item.pinyin ?? null,
    english: entry.item.english,
    createdAt: entry.createdAt
  };
}
