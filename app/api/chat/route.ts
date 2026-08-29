import { NextRequest, NextResponse } from 'next/server';

// Tempatkan file ini di: app/api/chat/route.ts
// Tambahkan GROQ_API_KEY=isi_api_key_kamu ke file .env.local (JANGAN taruh di kode client)

export const runtime = 'nodejs';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
// llama-3.3-70b-versatile sudah dideprecate Groq per Juni 2026.
// openai/gpt-oss-120b adalah model pengganti yang direkomendasikan untuk reasoning umum.
const MODEL = 'openai/gpt-oss-120b';

export async function POST(req: NextRequest) {
  try {
    const { messages, context } = await req.json();

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY belum diatur di environment server (.env.local).' },
        { status: 500 },
      );
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Pesan tidak boleh kosong.' }, { status: 400 });
    }

    const systemPrompt = `Kamu adalah asisten "RESPONKU KRS", pembantu penyusunan KRS untuk mahasiswa Indonesia.
Jawab singkat, jelas, dan praktis dalam Bahasa Indonesia.

Berikut konteks data jadwal mahasiswa saat ini (JSON). Gunakan ini sebagai satu-satunya sumber fakta tentang jadwalnya — jangan mengarang mata kuliah, dosen, atau jam yang tidak ada di sini:
${JSON.stringify(context ?? {}, null, 2)}

Tugasmu: menjelaskan isi jadwal, membantu mendeteksi/menjelaskan bentrok jam, menghitung atau mengonfirmasi total SKS, membantu memilih dosen, dan memberi saran penyusunan KRS. Jika pertanyaan menyangkut data yang tidak ada di konteks di atas, katakan terus terang bahwa datanya belum tersedia — jangan menebak.`;

    const groqRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      return NextResponse.json(
        { error: `Groq API error (${groqRes.status}): ${errText}` },
        { status: 502 },
      );
    }

    const data = await groqRes.json();
    const reply = data?.choices?.[0]?.message?.content ?? 'Maaf, tidak ada respons dari asisten.';

    return NextResponse.json({ reply });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Terjadi kesalahan pada server.' },
      { status: 500 },
    );
  }
}