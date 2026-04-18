// SKU IDs must match exactly what you create in Google Play Console / App Store Connect:
//   jade_60, jade_330, jade_980, jade_1980, jade_3280, jade_6480

import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

const RC_ANDROID_KEY = import.meta.env.VITE_RC_ANDROID_KEY ?? '';
const RC_IOS_KEY     = import.meta.env.VITE_RC_IOS_KEY ?? '';

let initialised = false;

export async function initIAP(userId) {
  if (!Capacitor.isNativePlatform()) return;
  if (initialised) return;

  const apiKey = Capacitor.getPlatform() === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY;
  if (!apiKey) { console.warn('IAP: no RevenueCat API key set'); return; }

  await Purchases.setLogLevel({ level: LOG_LEVEL.ERROR });
  await Purchases.configure({ apiKey });

  if (userId) await Purchases.logIn({ appUserID: userId });

  initialised = true;
}

export async function getProducts(productIds) {
  if (!Capacitor.isNativePlatform()) return [];
  const { products } = await Purchases.getProducts({ productIdentifiers: productIds });
  return products;
}

export async function purchaseProduct(productId) {
  if (!Capacitor.isNativePlatform()) {
    // Web/dev fallback — simulate success so you can test the UI flow
    console.warn('IAP: not on native platform, simulating purchase of', productId);
    return { simulated: true, productId };
  }

  const { products } = await Purchases.getProducts({ productIdentifiers: [productId] });
  if (!products.length) throw new Error(`Product not found: ${productId}`);

  const { customerInfo } = await Purchases.purchaseStoreProduct({ product: products[0] });
  return customerInfo;
}

export async function restorePurchases() {
  if (!Capacitor.isNativePlatform()) return null;
  const { customerInfo } = await Purchases.restorePurchases();
  return customerInfo;
}
