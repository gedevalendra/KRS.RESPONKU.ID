import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  try {
    const data = await resend.emails.send({
      from: 'KRS Kamu <noreply@krs.bekarya.com>', // Ganti jika sudah punya domain terverifikasi di Resend
      to: ['funikindev@gmail.com'], // Masukkan email Anda yang aktif untuk mengecek inbox
      subject: 'Bujang Inam Siakad Database nya Masih Kekunci',
      html: '<p>ITERA</p>',
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}