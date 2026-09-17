// components/montree/feedback/api.ts
//
// The client's side of the API. One place that knows the board query
// parameter, so a component never assembles a URL and never forgets `?board=`
// — which on a school board would silently read the PUBLIC one.

'use client';

import type {
  Comment,
  FlagReason,
  ListResult,
  Post,
  PostStatus,
  PostType,
  SortKey,
} from '@/lib/montree/feedback/types';

const BASE = '/api/montree/feedback/v2';

export interface ApiError {
  error: string;
  code?: string;
  errors?: Array<{ field: string; message: string }>;
}

async function request<T>(path: string, board: string, init?: RequestInit): Promise<T> {
  const joiner = path.includes('?') ? '&' : '?';
  const res = await fetch(`${BASE}${path}${joiner}board=${encodeURIComponent(board)}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    // Cookies carry the entire identity model, so they must ride every call.
    credentials: 'same-origin',
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = (data ?? {}) as ApiError;
    throw Object.assign(new Error(err.error || `Request failed (${res.status})`), {
      status: res.status,
      code: err.code,
      errors: err.errors,
    });
  }
  return data as T;
}

export interface ListParams {
  q?: string;
  type?: PostType | null;
  status?: PostStatus | null;
  sort?: SortKey;
  cursor?: string | null;
  includeHidden?: boolean;
}

export function listPosts(board: string, params: ListParams): Promise<ListResult> {
  const sp = new URLSearchParams();
  if (params.q) sp.set('q', params.q);
  if (params.type) sp.set('type', params.type);
  if (params.status) sp.set('status', params.status);
  if (params.sort) sp.set('sort', params.sort);
  if (params.cursor) sp.set('cursor', params.cursor);
  const qs = sp.toString();
  return request<ListResult>(`/posts${qs ? `?${qs}` : ''}`, board);
}

export interface DuplicateCandidate {
  id: string;
  title: string;
  type: PostType;
  status: PostStatus;
  voteCount: number;
  commentCount: number;
  createdAt: string;
  viewerHasVoted: boolean;
}

export function searchDuplicates(board: string, q: string, signal?: AbortSignal) {
  return request<{ candidates: DuplicateCandidate[] }>(
    `/search?q=${encodeURIComponent(q)}`,
    board,
    { signal },
  );
}

export interface CreatePostBody {
  type: PostType;
  title: string;
  body?: string;
  template?: Record<string, string | undefined>;
  screenshotPath?: string | null;
  name?: string;
  email?: string;
  /** The honeypot. Always sent, always empty when a person filled the form. */
  website?: string;
}

export function createPost(board: string, body: CreatePostBody) {
  return request<{ ok: true; post: Post }>('/posts', board, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function toggleVote(board: string, postId: string) {
  return request<{ ok: true; voted: boolean; count: number }>(`/posts/${postId}/vote`, board, {
    method: 'POST',
  });
}

export function setSubscribed(board: string, postId: string, subscribed: boolean, email?: string) {
  return request<{ ok: true; subscribed: boolean }>(`/posts/${postId}/subscribe`, board, {
    method: subscribed ? 'POST' : 'DELETE',
    body: subscribed ? JSON.stringify({ email }) : undefined,
  });
}

export interface CreateCommentBody {
  body: string;
  quoteOf?: string | null;
  official?: boolean;
  answer?: boolean;
  name?: string;
  email?: string;
  website?: string;
}

export function createComment(board: string, postId: string, body: CreateCommentBody) {
  return request<{ ok: true; comment: Comment }>(`/posts/${postId}/comments`, board, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function markAnswer(board: string, postId: string, commentId: string) {
  return request<{ ok: true }>(`/posts/${postId}/comments`, board, {
    method: 'PATCH',
    body: JSON.stringify({ commentId }),
  });
}

export interface PatchPostBody {
  status?: PostStatus;
  tags?: string[];
  pinned?: boolean;
  hidden?: boolean;
  note?: string;
}

export function patchPost(board: string, postId: string, body: PatchPostBody) {
  return request<{ ok: true; post: Post }>(`/posts/${postId}`, board, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function mergeInto(board: string, survivorId: string, duplicateId: string) {
  return request<{ ok: true; post: Post }>(`/posts/${survivorId}`, board, {
    method: 'POST',
    body: JSON.stringify({ duplicateId }),
  });
}

export function flag(
  board: string,
  targetKind: 'post' | 'comment',
  targetId: string,
  reason: FlagReason,
) {
  return request<{ ok: true; hidden: boolean }>('/flags', board, {
    method: 'POST',
    body: JSON.stringify({ targetKind, targetId, reason }),
  });
}

export async function uploadScreenshot(board: string, file: File): Promise<{ path: string; url: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/upload?board=${encodeURIComponent(board)}`, {
    method: 'POST',
    body: form,
    credentials: 'same-origin',
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as ApiError;
    throw new Error(err.error || 'Upload failed');
  }
  return (await res.json()) as { path: string; url: string };
}

export async function setLang(lang: 'en' | 'zh'): Promise<void> {
  await fetch(`${BASE}/lang`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ lang }),
    credentials: 'same-origin',
  });
}
