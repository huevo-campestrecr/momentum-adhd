// src/lib/push.js
// Handles service worker registration and push subscription

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    return reg;
  } catch (e) {
    console.error('SW registration failed:', e);
    return null;
  }
}

export async function subscribeToPush(supabaseClient, userId) {
  if (!('Notification' in window)) return { error: 'Notifications not supported' };
  if (!VAPID_PUBLIC_KEY) return { error: 'VAPID key not configured' };

  // Request permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { error: 'Permission denied' };

  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const subJson = subscription.toJSON();

    // Save to Supabase
    const { error } = await supabaseClient
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subJson.endpoint,
        subscription: subJson,
      });

    return { error, subscription };
  } catch (e) {
    return { error: e.message };
  }
}

export async function unsubscribeFromPush(supabaseClient, userId) {
  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      await supabaseClient
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint);
    }
  } catch (e) {
    console.error('Unsubscribe failed:', e);
  }
}

export async function getNotificationStatus() {
  if (!('Notification' in window)) return 'unsupported';
  if (!('serviceWorker' in navigator)) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}
