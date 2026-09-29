import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subscription, action } = req.body || {};

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Missing subscription' });
    }

    const key = 'push:' + Buffer.from(subscription.endpoint).toString('base64url').slice(0, 48);

    if (action === 'unsubscribe') {
      await redis.del(key);
      await redis.srem('push:subs', key);
      return res.status(200).json({ ok: true, action: 'unsubscribed' });
    }

    await redis.set(key, JSON.stringify(subscription));
    await redis.sadd('push:subs', key);

    return res.status(200).json({ ok: true, action: 'subscribed' });
  } catch (err) {
    console.error('subscribe error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
