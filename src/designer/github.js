/**
 * Minimal GitHub Contents API client for the designer panel.
 *
 * Responsibilities:
 *   - GET a file's current content + SHA (used both to show existing state
 *     and to pass the SHA back on PUT for optimistic concurrency).
 *   - PUT a file back with a new content blob and a commit message. 409
 *     surfaces as a stale-SHA error so the caller can prompt the user.
 *   - Sanity-check a PAT against the target repo (does it exist, and does
 *     the token have push access?).
 *
 * Repo coords are hardcoded — this panel is a single-repo tool.
 */

export const REPO_OWNER = 'titarta';
export const REPO_NAME  = 'MartialArtsIdle';
export const BRANCH     = 'main';
const API_BASE = 'https://api.github.com';

function headers(pat) {
  return {
    'Authorization': `Bearer ${pat}`,
    'Accept':        'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function contentsUrl(path) {
  return `${API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${encodeURI(path)}?ref=${BRANCH}`;
}

/* ── Encoding helpers ────────────────────────────────────────────────────── */

// GitHub Contents API wants base64-encoded payloads. Convert a JS string.
// Unicode-safe path uses TextEncoder → btoa on binary-safe bytes.
function base64FromString(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function stringFromBase64(b64) {
  // GitHub returns base64 with embedded newlines; strip them.
  const clean = b64.replace(/\s/g, '');
  const binary = atob(clean);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/* ── Token validation ────────────────────────────────────────────────────── */

export async function checkToken(pat) {
  if (!pat) return { ok: false, reason: 'empty' };

  try {
    // 1. Who is this token?
    const userRes = await fetch(`${API_BASE}/user`, { headers: headers(pat) });
    if (userRes.status === 401) return { ok: false, reason: 'unauthorized' };
    if (!userRes.ok)            return { ok: false, reason: `user ${userRes.status}` };
    const user = await userRes.json();

    // 2. Does the token have push access to this repo?
    const repoRes = await fetch(`${API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}`, { headers: headers(pat) });
    if (repoRes.status === 404) return { ok: false, reason: 'repo-not-visible', login: user.login };
    if (!repoRes.ok)            return { ok: false, reason: `repo ${repoRes.status}`, login: user.login };
    const repo = await repoRes.json();

    const canPush = repo.permissions?.push === true || repo.permissions?.admin === true;
    if (!canPush) return { ok: false, reason: 'no-push', login: user.login };

    return { ok: true, login: user.login, repoFullName: repo.full_name };
  } catch (err) {
    return { ok: false, reason: 'network', detail: err.message };
  }
}

/* ── Contents API ────────────────────────────────────────────────────────── */

/**
 * GET a file's current content and SHA.
 * Returns { exists, sha, content, raw } where content is the decoded string
 * (JSON-parsed by the caller). If the file doesn't exist (404), exists=false.
 */
export async function getFile(pat, path) {
  const res = await fetch(contentsUrl(path), { headers: headers(pat) });
  if (res.status === 404) return { exists: false, sha: null, content: null };
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return {
    exists:  true,
    sha:     data.sha,
    content: stringFromBase64(data.content),
    raw:     data,
  };
}

/**
 * PUT a text file. Pass `sha` when updating an existing file (omit on create).
 * Returns { ok, sha, commit } on 2xx, or { ok:false, conflict, status, body }.
 */
export async function putTextFile(pat, { path, content, sha, message }) {
  const body = { message, content: base64FromString(content), branch: BRANCH };
  if (sha) body.sha = sha;

  const res = await fetch(contentsUrl(path), {
    method:  'PUT',
    headers: { ...headers(pat), 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  if (res.status === 409 || res.status === 422) {
    // 422 here typically means "sha does not match" — treat as conflict.
    const b = await res.text();
    return { ok: false, conflict: true, status: res.status, body: b };
  }
  if (!res.ok) {
    const b = await res.text();
    return { ok: false, conflict: false, status: res.status, body: b };
  }
  const data = await res.json();
  return { ok: true, sha: data.content.sha, commit: data.commit };
}

/**
 * PUT a binary file (for sprite uploads). Accepts a Uint8Array or ArrayBuffer.
 * Same contract as putTextFile.
 */
export async function putBinaryFile(pat, { path, bytes, sha, message }) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < u8.length; i++) binary += String.fromCharCode(u8[i]);
  const b64 = btoa(binary);

  const body = { message, content: b64, branch: BRANCH };
  if (sha) body.sha = sha;

  const res = await fetch(contentsUrl(path), {
    method:  'PUT',
    headers: { ...headers(pat), 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  if (res.status === 409 || res.status === 422) {
    const b = await res.text();
    return { ok: false, conflict: true, status: res.status, body: b };
  }
  if (!res.ok) {
    const b = await res.text();
    return { ok: false, conflict: false, status: res.status, body: b };
  }
  const data = await res.json();
  return { ok: true, sha: data.content.sha, commit: data.commit };
}
