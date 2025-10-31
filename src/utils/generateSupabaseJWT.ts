// src/server/utils/generateSupabaseJWT.ts
import jwt from 'jsonwebtoken'

interface PiUser {
  uid: string
  username: string
  wallet_address?: string
}

export function generateSupabaseJWT(user: PiUser) {
  const payload = {
    sub: user.uid,            // Required claim
    role: 'authenticated',    // Required for Supabase policies
    username: user.username,  // Optional custom claim
    wallet: user.wallet_address,
  }

  return jwt.sign(payload, process.env.SUPABASE_JWT_SECRET!, {
    expiresIn: '1h', // or longer if you prefer
    audience: 'authenticated',
  })
}
