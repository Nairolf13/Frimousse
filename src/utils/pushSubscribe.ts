export async function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush(vapidPublicKey: string) {
  if (!('serviceWorker' in navigator)) throw new Error('Service Worker non supporté');
  if (!('PushManager' in window)) throw new Error('Push API non supportée');

  const registration = await navigator.serviceWorker.register('/sw.js');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permission de notifications refusée');

  const convertedVapidKey = await urlBase64ToUint8Array(vapidPublicKey);
  const sub = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: convertedVapidKey });
  return { subscription: sub, registration };
}

export async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;
  const subs = await reg.pushManager.getSubscription();
  if (subs) await subs.unsubscribe();
}
