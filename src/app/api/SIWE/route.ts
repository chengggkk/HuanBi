import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { MiniAppWalletAuthSuccessPayload, verifySiweMessage } from '@worldcoin/minikit-js'

interface IRequestPayload {
  payload: MiniAppWalletAuthSuccessPayload
  nonce: string
}

export async function POST(req: NextRequest) {
  const { payload, nonce } = (await req.json()) as IRequestPayload
  
  // Get the cookie store
  const cookieStore = await cookies();
  
  // Verify that the nonce matches what we stored in the cookie
  if (nonce != cookieStore.get('siwe')?.value) {
    return NextResponse.json({
      status: 'error',
      isValid: false,
      message: 'Invalid nonce',
    })
  }
  
  try {
    // Verify the SIWE message with the provided library function
    const validMessage = await verifySiweMessage(payload, nonce)
    
    // If successful, we can optionally clear the nonce cookie
    cookieStore.delete('siwe');
    
    return NextResponse.json({
      status: 'success',
      isValid: validMessage.isValid,
      address: payload.address, // Return the verified wallet address
    })
  } catch (error: any) {
    // Handle errors in validation or processing
    return NextResponse.json({
      status: 'error',
      isValid: false,
      message: error.message,
    })
  }
}