// api/send-notifications.js
// Vercel serverless function — called by cron every hour
// Checks which habits are due in the current hour and sends push notifications

import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // service role needed for server-side queries
);

export default async function handler(req, res) {
  // Verify this is called by Vercel cron (or allow manual trigger in dev)
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = new Date();
  const currentHour = now.getHours();
  const currentDow = now.getDay(); // 0=Sun
  const todayStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

  try {
    // Get all habits scheduled for this hour and day
    const { data: habits } = await supabase
      .from('habits')
      .select('*, push_subscriptions!inner(subscription, user_id)')
      .filter('time', 'like', `${String(currentHour).padStart(2, '0')}:%`);

    if (!habits || habits.length === 0) {
      return res.status(200).json({ sent: 0 });
    }

    let sent = 0;
    const promises = [];

    for (const habit of habits) {
      // Check if habit is active today (empty days = every day)
      const activeDays = habit.days || [];
      if (activeDays.length > 0 && !activeDays.includes(currentDow)) continue;

      // Check if already completed today
      const { data: completion } = await supabase
        .from('completions')
        .select('id')
        .eq('habit_id', habit.id)
        .eq('completed_on', todayStr)
        .single();

      if (completion) continue; // already done, skip

      // Send push to all user's subscriptions
      for (const sub of habit.push_subscriptions || []) {
        const payload = JSON.stringify({
          title: `Time for: ${habit.name}`,
          body: `${habit.emoji} Your ${habit.name} habit is scheduled now.`,
          tag: `habit-${habit.id}`,
          url: '/',
        });

        promises.push(
          webpush.sendNotification(sub.subscription, payload)
            .then(() => { sent++; })
            .catch(async (e) => {
              // Subscription expired — remove it
              if (e.statusCode === 410 || e.statusCode === 404) {
                await supabase
                  .from('push_subscriptions')
                  .delete()
                  .eq('endpoint', sub.subscription.endpoint);
              }
            })
        );
      }
    }

    await Promise.all(promises);
    return res.status(200).json({ sent, checked: habits.length });

  } catch (e) {
    console.error('Notification error:', e);
    return res.status(500).json({ error: e.message });
  }
}
