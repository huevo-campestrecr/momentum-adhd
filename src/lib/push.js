// src/lib/push.js
// Handles service worker registration and push subscription

function getVapidKey() {
  // Read at call time, not module load time
  return import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
}

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
    console.log('[SW] registered:', reg.scope);
    return reg;
  } catch (e) {
    console.error('[SW] registration failed:', e);
    return null;
  }
}

export async function subscribeToPush(supabaseClient, userId) {
  console.log('[Push] subscribeToPush called', { userId, hasClient: !!supabaseClient });

  if (!('Notification' in window)) return { error: 'Notifications not supported' };
  if (!('serviceWorker' in navigator)) return { error: 'Service worker not supported' };

  const vapidKey = getVapidKey();
  if (!vapidKey) {
    console.error('[Push] VAPID key missing');
    return { error: 'VAPID key not configured' };
  }

  if (!supabaseClient) return { error: 'Supabase client not ready' };
  if (!userId) return { error: 'User not logged in' };

  // Request permission
  const permission = await Notification.requestPermission();
  console.log('[Push] permission:', permission);
  if (permission !== 'granted') return { error: 'Permission denied' };

  try {
    // Wait for service worker to be ready
    const reg = await navigator.serviceWorker.ready;
    console.log('[Push] SW ready:', reg.scope);

    // Check for existing subscription first
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }
    console.log('[Push] subscription obtained:', subscription.endpoint.slice(0, 50));

    const subJson = subscription.toJSON();

    // Save to Supabase
    const { error, data } = await supabaseClient
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subJson.endpoint,
        subscription: subJson,
      })
      .select();

    console.log('[Push] saved to Supabase:', { error, data });
    return { error, subscription };
  } catch (e) {
    console.error('[Push] subscribe error:', e);
    return { error: e.message };
  }
}

export async function unsubscribeFromPush(supabaseClient, userId) {
  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      if (supabaseClient && userId) {
        await supabaseClient
          .from('push_subscriptions')
          .delete()
          .eq('user_id', userId)
          .eq('endpoint', subscription.endpoint);
      }
    }
  } catch (e) {
    console.error('[Push] unsubscribe failed:', e);
  }
}

export async function getNotificationStatus() {
  if (!('Notification' in window)) return 'unsupported';
  if (!('serviceWorker' in navigator)) return 'unsupported';
  return Notification.permission;
}
