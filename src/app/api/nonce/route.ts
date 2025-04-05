import { cookies } from "next/headers"; 
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Expects only alphanumeric characters - using UUID without dashes
  const nonce = crypto.randomUUID().replace(/-/g, "");

  // The nonce should be stored somewhere that is not tamperable by the client
  const cookieStore = await cookies();
  cookieStore.set("siwe", nonce, { 
    secure: true,
    httpOnly: true,
    sameSite: "strict",
    path: "/"
  });
  
  return NextResponse.json({ nonce });
}