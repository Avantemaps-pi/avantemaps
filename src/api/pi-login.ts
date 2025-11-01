// src/api/pi-login.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { uid, username, wallet_address } = req.body;
  const secret = process.env.SUPABASE_JWT_SECRET;

  if (!secret) {
    return res.status(500).json({ error: 'Missing SUPABASE_JWT_SECRET in environment' });
  }

  // Generate Supabase-compatible JWT
  const token = jwt.sign(
    {
      sub: uid,
      role: 'authenticated',
      username,
      wallet_address,
    },
    secret,
    { expiresIn: '1h' }
  );

  return res.status(200).json({ token });
}
