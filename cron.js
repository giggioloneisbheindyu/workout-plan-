import { Redis } from '@upstash/redis';
import webpush from 'web-push';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:power@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  const key = req.query.key || req.headers['x-cron-secret'];
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) {
    const auth = req.headers.authorization || '';
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const keys = await redis.smembers('push:subs');
    if (!keys || keys.length === 0) {
      return res.status(200).json({ ok: true, sent: 0, message: 'No subscribers' });
    }

    const payload = JSON.stringify({
      title: '🏋️ Scheda Powerlifting',
      body: 'È ora di allenarsi! Apri l\'app e guarda cosa ti aspetta oggi.',
      icon: '/coach.jpg',
      badge: '/coach.jpg',
      url: '/',
      tag: 'allenamento-mattina'
    });

    // urgency: high = consegna prioritaria (max consentito da Web Push / iOS)
    const pushOptions = {
      urgency: 'high',
      TTL: 60 * 60 * 12 // 12 ore
    };

    let sent = 0;
    let failed = 0;
    const dead = [];

    for (const k of keys) {
      try {
        const raw = await redis.get(k);
        if (!raw) {
          dead.push(k);
          continue;
        }
        const sub = typeof raw === 'string' ? JSON.parse(raw) : raw;
        await webpush.sendNotification(sub, payload, pushOptions);
        sent++;
      } catch (err) {
        failed++;
        if (err.statusCode === 410 || err.statusCode === 404) {
          dead.push(k);
        }
        console.error('push fail', k, err.statusCode || err.message);
      }
    }

    if (dead.length) {
      await redis.srem('push:subs', ...dead);
      for (const d of dead) await redis.del(d);
    }

    return res.status(200).json({ ok: true, sent, failed, cleaned: dead.length });
  } catch (err) {
    console.error('cron error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
