export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const key = process.env.VAPID_PUBLIC_KEY || '';
  if (!key) return res.status(500).json({ error: 'VAPID_PUBLIC_KEY not configured' });
  return res.status(200).json({ publicKey: key });
}
