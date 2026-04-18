import { useState, useCallback } from 'react';
import { purchaseProduct, restorePurchases } from './iapService';
import { BLOOD_LOTUS_PACKS } from './products';

export function useIAP({ onPurchaseSuccess }) {
  const [pending, setPending]   = useState(null); // productId being purchased
  const [error, setError]       = useState(null);

  const purchase = useCallback(async (productId) => {
    setError(null);
    setPending(productId);
    try {
      const result = await purchaseProduct(productId);
      const pack   = BLOOD_LOTUS_PACKS.find(p => p.id === productId);
      if (pack) onPurchaseSuccess?.(pack.amount, productId, result);
    } catch (err) {
      // User cancellation is not an error worth surfacing
      if (!err?.message?.includes('cancel')) setError(err?.message ?? 'Purchase failed');
    } finally {
      setPending(null);
    }
  }, [onPurchaseSuccess]);

  const restore = useCallback(async () => {
    setError(null);
    setPending('restore');
    try {
      await restorePurchases();
    } catch (err) {
      setError(err?.message ?? 'Restore failed');
    } finally {
      setPending(null);
    }
  }, []);

  return { purchase, restore, pending, error };
}
