import { useState, useCallback, useEffect, useRef } from 'react';
import { BLOOD_LOTUS_PACKAGES, purchaseBloodLotus, getBloodLotusBalance } from '../systems/bloodLotus';
import { restorePurchases } from '../iap/iapService';

const BASE = import.meta.env.BASE_URL;

const BADGE = {
  blood_lotus_330:  'Popular',
  blood_lotus_6480: 'Best Value',
};

export default function BloodLotusShopCard({ onClose, onBalanceChange }) {
  const [pending, setPending] = useState(null);
  const [error,   setError]   = useState(null);
  const [success, setSuccess] = useState(null);
  const cardRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('pointerdown', handler, true);
    return () => document.removeEventListener('pointerdown', handler, true);
  }, [onClose]);

  const buy = useCallback(async (pkg) => {
    setError(null);
    setSuccess(null);
    setPending(pkg.id);
    const result = await purchaseBloodLotus(pkg.id);
    setPending(null);
    if (result.ok) {
      setSuccess(`+${pkg.amount} Blood Lotus added!`);
      onBalanceChange?.(getBloodLotusBalance());
    } else if (!result.cancelled) {
      setError(result.error ?? 'Something went wrong.');
    }
  }, [onBalanceChange]);

  const restore = useCallback(async () => {
    setError(null);
    setPending('restore');
    try { await restorePurchases(); }
    catch (e) { setError(e?.message ?? 'Restore failed'); }
    finally { setPending(null); }
  }, []);

  return (
    <div className="blood-lotus-shop-card" ref={cardRef}>

      <div className="blood-lotus-shop-header">
        <img src={`${BASE}sprites/items/blood_lotus.png`} className="blood-lotus-shop-icon" alt="" draggable="false" />
        <span className="blood-lotus-shop-title">Blood Lotus Shop</span>
        <button className="blood-lotus-shop-close" onClick={onClose} aria-label="Close">✕</button>
      </div>

      {success && <div className="blood-lotus-shop-success">{success}</div>}
      {error   && <div className="blood-lotus-shop-error">{error}</div>}

      <div className="blood-lotus-shop-grid">
        {BLOOD_LOTUS_PACKAGES.map(pkg => (
          <button
            key={pkg.id}
            className={`blood-lotus-shop-item${pending === pkg.id ? ' blood-lotus-shop-item-pending' : ''}`}
            onClick={() => buy(pkg)}
            disabled={!!pending}
          >
            {BADGE[pkg.id] && <span className="blood-lotus-shop-badge">{BADGE[pkg.id]}</span>}
            <img src={`${BASE}sprites/items/${pkg.id}.png`} className="blood-lotus-shop-item-icon" alt="" draggable="false" />
            <span className="blood-lotus-shop-item-amount">{pkg.amount.toLocaleString()}</span>
            <span className="blood-lotus-shop-item-label">{pkg.label}</span>
            <span className="blood-lotus-shop-item-price">
              {pending === pkg.id ? '…' : pkg.price}
            </span>
          </button>
        ))}
      </div>

      <button
        className="blood-lotus-shop-restore"
        onClick={restore}
        disabled={!!pending}
      >
        {pending === 'restore' ? 'Restoring…' : 'Restore Purchases'}
      </button>

    </div>
  );
}
