// ---------------------------------------------------------------------------
// API route untuk widget "Online Sekarang" (realtime, dihitung per IP unik)
// dan "Total Pengunjung" (akumulasi, tidak pernah berkurang).
//
// Kenapa butuh route sendiri (tidak bisa pakai countapi.xyz dkk)?
// Servis counter gratisan cuma bisa nge-INCR angka — tidak ada konsep
// "sedang online sekarang" karena mereka tidak tahu kapan seseorang
// berhenti membuka halaman. Untuk itu perlu state di server yang di-update
// terus-menerus (heartbeat) dan otomatis kadaluarsa. Di sini dipakai
// Upstash Redis (gratis untuk skala kecil, REST-based, cocok untuk
// serverless functions).
//
// Setup yang perlu dilakukan sebelum ini jalan:
//   1. Daftar gratis di https://upstash.com lalu buat 1 database Redis.
//   2. Dari dashboard database itu, copy "UPSTASH_REDIS_REST_URL" dan
//      "UPSTASH_REDIS_REST_TOKEN", taruh di file .env.local (dan juga di
//      Environment Variables project kamu kalau deploy ke Vercel/dst).
//   3. Install package-nya: npm install @upstash/redis
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import crypto from 'crypto';

// Dibuat lazy (bukan langsung di top-level) supaya kalau env var belum
// diisi, error-nya baru muncul saat route ini dipanggil — bukan bikin
// seluruh build/app gagal start.
function getRedis(): Redis {
  return Redis.fromEnv();
}

const ONLINE_KEY = 'krs:presence'; // sorted set: member = hash(IP), score = waktu heartbeat terakhir (ms)
const TOTAL_KEY = 'krs:total-visits'; // counter akumulasi, tidak pernah di-reset otomatis
const ONLINE_WINDOW_MS = 60 * 1000; // dianggap "online" kalau heartbeat terakhir < 60 detik lalu

// Ambil IP pengunjung dari header yang biasanya di-set proxy/CDN (Vercel dkk).
function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || '0.0.0.0';
}

// IP di-hash (bukan disimpan mentah) supaya tidak menyimpan data pribadi
// pengunjung apa adanya di Redis.
function hashIp(ip: string): string {
  const salt = process.env.PRESENCE_IP_SALT || 'papan-jadwal-default-salt';
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 40);
}

async function recordHeartbeatAndGetOnline(redis: Redis, hashedIp: string): Promise<number> {
  const now = Date.now();
  await redis.zadd(ONLINE_KEY, { score: now, member: hashedIp });
  // Buang entri basi supaya sorted set tidak numpuk terus-menerus.
  await redis.zremrangebyscore(ONLINE_KEY, 0, now - ONLINE_WINDOW_MS);
  return redis.zcard(ONLINE_KEY);
}

// POST — dipanggil browser sebagai heartbeat (tiap ~25 detik).
// Tambahkan ?newVisit=1 untuk menaikkan hitungan "Total Pengunjung" (dipakai
// sekali saat halaman pertama kali dimuat).
export async function POST(req: NextRequest) {
  try {
    const redis = getRedis();
    const hashedIp = hashIp(getClientIp(req));

    const online = await recordHeartbeatAndGetOnline(redis, hashedIp);

    const isNewVisit = new URL(req.url).searchParams.get('newVisit') === '1';
    const total = isNewVisit ? await redis.incr(TOTAL_KEY) : ((await redis.get<number>(TOTAL_KEY)) ?? 0);

    return NextResponse.json({ online, total });
  } catch (err) {
    console.error('Gagal mencatat presence pengunjung:', err);
    return NextResponse.json({ error: 'Gagal mencatat presence' }, { status: 500 });
  }
}

// GET — kalau cuma perlu baca angka tanpa ikut dihitung sebagai "online".
export async function GET() {
  try {
    const redis = getRedis();
    const now = Date.now();
    await redis.zremrangebyscore(ONLINE_KEY, 0, now - ONLINE_WINDOW_MS);
    const online = await redis.zcard(ONLINE_KEY);
    const total = (await redis.get<number>(TOTAL_KEY)) ?? 0;
    return NextResponse.json({ online, total });
  } catch (err) {
    console.error('Gagal mengambil data presence pengunjung:', err);
    return NextResponse.json({ error: 'Gagal mengambil data presence' }, { status: 500 });
  }
}