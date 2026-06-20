const fs = require('fs');
const path = require('path');

function stripBom(s) {
  return s.replace(/^\uFEFF/, '');
}

function normalizeUrl(value) {
  if (value == null) return value;
  let v = stripBom(String(value));
  v = v.trim();

  // remove wrapping quotes if present
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }

  v = v.trim();
  return v;
}

function loadDotenvIfPresent(dotenvPath) {
  if (!fs.existsSync(dotenvPath)) return;
  const raw = fs.readFileSync(dotenvPath, 'utf8');

  // Minimal .env parser: only DATABASE_URL.
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;

    const key = trimmed.slice(0, idx).trim();
    if (key !== 'DATABASE_URL') continue;

    const val = normalizeUrl(trimmed.slice(idx + 1));
    process.env.DATABASE_URL = val;
    return;
  }
}

function main() {
  // Prefer runtime env (e.g. Vercel). Fallback to local .env only if not set.
  let url = process.env.DATABASE_URL;

  if (!url) {
    const dotenvPath = path.join(process.cwd(), '.env');
    loadDotenvIfPresent(dotenvPath);
    url = process.env.DATABASE_URL;
  }

  url = normalizeUrl(url);

  if (!url) {
    throw new Error(
      '[Prisma env error] DATABASE_URL is not set. Set it in your environment (Vercel dashboard) or provide a local .env file.'
    );
  }

  // Common symptom: the literal placeholder is stored instead of the real value.
  if (/%DATABASE_URL%/.test(url) || /^\$\{?DATABASE_URL\}?$/i.test(url)) {
    throw new Error(
      '[Prisma env error] DATABASE_URL is still a placeholder (not substituted). Set the real Supabase connection string as DATABASE_URL (e.g. in Vercel env variables), and ensure Windows %DATABASE_URL% syntax is not stored literally in .env.'
    );
  }

  const ok = /^postgres(ql)?:\/\//i.test(url);
  if (!ok) {
    // Do NOT print the URL (may contain credentials). Show only a safe prefix.
    const safePrefix = url.slice(0, 30);
    throw new Error(
      `[Prisma env error] DATABASE_URL is invalid. Expected to start with postgresql:// or postgres:// but got: ${safePrefix}` +
        '\n[Hint] Common causes: quotes/BOM/whitespace, or env var not being loaded. Set DATABASE_URL to a raw value like: postgresql://USER:PASSWORD@HOST:5432/DB?schema=public'
    );
  }

  process.env.DATABASE_URL = url;
  console.log('[Prisma env] DATABASE_URL looks valid.');
}

main();

