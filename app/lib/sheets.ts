import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function getDataFromSheet(spreadsheetId: string) {
  const session = await getServerSession(authOptions);

  if (!session || !session.accessToken) {
    throw new Error("Unauthorized: Silakan login terlebih dahulu.");
  }

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:Z100`,
    {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Gagal mengambil data dari link. Pastikan link Google Sheets publik atau Anda sudah login dengan akun berizin.");
  }

  return await response.json();
}