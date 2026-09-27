import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types';
import { documentPaths, MAX_FILE_BYTES, type DocKind } from './logic';
import { prepareFile } from './media';

export type Item = Tables<'items'>;
export type ItemInput = Omit<TablesInsert<'items'>, 'household_id'>;
export type ItemPatch = TablesUpdate<'items'>;
export type Doc = Tables<'documents'>;
export type ShortCode = Tables<'short_codes'>;

const BUCKET = 'docs';

function fail(error: { message: string; code?: string } | null): never {
  const e = new Error(error?.message ?? 'Request failed') as Error & { code?: string };
  e.code = error?.code;
  throw e;
}

export async function listItems(householdId: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('household_id', householdId)
    .order('name')
    .limit(5000);
  if (error) fail(error);
  return data ?? [];
}

export async function createItem(householdId: string, input: ItemInput): Promise<Item> {
  const { data, error } = await supabase
    .from('items')
    .insert({ ...input, household_id: householdId })
    .select('*')
    .single();
  if (error) fail(error);
  return data;
}

export async function updateItem(id: string, patch: ItemPatch): Promise<void> {
  const { error } = await supabase.from('items').update(patch).eq('id', id);
  if (error) fail(error);
}

/** Finished uploads only; reservations in flight stay hidden. */
export async function listDocuments(householdId: string): Promise<Doc[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('household_id', householdId)
    .not('uploaded_at', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5000);
  if (error) fail(error);
  return data ?? [];
}

export async function listShortCodes(householdId: string): Promise<ShortCode[]> {
  const { data, error } = await supabase
    .from('short_codes')
    .select('*')
    .eq('household_id', householdId)
    .limit(10000);
  if (error) fail(error);
  return data ?? [];
}

/** RLS answers only for your own household, so a stranger's code finds nothing. */
export async function resolveCode(code: string): Promise<ShortCode | null> {
  const { data, error } = await supabase
    .from('short_codes')
    .select('*')
    .eq('code', code)
    .maybeSingle();
  if (error) fail(error);
  return data;
}

export class UploadError extends Error {
  constructor(public reason: 'too_big' | 'type' | 'quota' | 'failed') {
    super(reason);
  }
}

/**
 * Upload one file: compress images on the device, reserve the path (the
 * database checks the quota), upload the file and thumbnail, then finalize.
 * Anything that fails midway is cleaned up.
 */
export async function uploadDocument(input: {
  householdId: string;
  itemId: string | null;
  kind: DocKind;
  title: string | null;
  file: File;
}): Promise<Doc> {
  const prepared = await prepareFile(input.file);
  if (!prepared) throw new UploadError('type');
  if (prepared.blob.size > MAX_FILE_BYTES) throw new UploadError('too_big');
  const id = crypto.randomUUID();
  const paths = documentPaths(input.householdId, input.itemId, id, prepared.mime, !!prepared.thumb);
  if (!paths) throw new UploadError('type');

  const row: TablesInsert<'documents'> = {
    id,
    household_id: input.householdId,
    item_id: input.itemId,
    kind: input.kind,
    title: input.title?.trim() || null,
    storage_path: paths.path,
    thumb_path: paths.thumb,
    mime_type: prepared.mime,
    size_bytes: prepared.blob.size + (prepared.thumb?.size ?? 0),
  };
  const reserved = await supabase.from('documents').insert(row);
  if (reserved.error) {
    throw new UploadError(reserved.error.code === '53100' ? 'quota' : 'failed');
  }

  const uploaded: string[] = [];
  try {
    const main = await supabase.storage
      .from(BUCKET)
      .upload(paths.path, prepared.blob, { contentType: prepared.mime, upsert: false });
    if (main.error) throw main.error;
    uploaded.push(paths.path);
    if (paths.thumb && prepared.thumb) {
      const thumb = await supabase.storage
        .from(BUCKET)
        .upload(paths.thumb, prepared.thumb, { contentType: 'image/jpeg', upsert: false });
      if (!thumb.error) uploaded.push(paths.thumb);
    }
    const done = await supabase.rpc('finalize_document', { p_id: id });
    if (done.error) throw done.error;
  } catch {
    if (uploaded.length) await supabase.storage.from(BUCKET).remove(uploaded);
    await supabase.from('documents').delete().eq('id', id);
    throw new UploadError('failed');
  }
  const { data, error } = await supabase.from('documents').select('*').eq('id', id).single();
  if (error) fail(error);
  return data;
}

export async function updateDocument(id: string, patch: TablesUpdate<'documents'>): Promise<void> {
  const { error } = await supabase.from('documents').update(patch).eq('id', id);
  if (error) fail(error);
}

/** Files first, then the row, so nothing is left orphaned in Storage. */
export async function deleteDocument(doc: Doc): Promise<void> {
  const paths = [doc.storage_path, doc.thumb_path].filter((p): p is string => !!p);
  const removed = await supabase.storage.from(BUCKET).remove(paths);
  if (removed.error) fail(removed.error);
  const { error } = await supabase.from('documents').delete().eq('id', doc.id);
  if (error) fail(error);
}

/** Short-lived links to private files (an hour). */
export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
  if (error) fail(error);
  const out: Record<string, string> = {};
  for (const d of data ?? []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  return out;
}

export async function recordLabelsPrinted(count: number): Promise<void> {
  const { error } = await supabase.rpc('record_labels_printed', { p_count: count });
  if (error) fail(error);
}
