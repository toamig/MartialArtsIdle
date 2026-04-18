import { useState, useCallback } from 'react';
import { JADE_PACKAGES, purchaseJade, getJadeBalance } from '../systems/jade';
import { restorePurchases } from '../iap/iapService';

const BASE = import.meta.env.BASE_URL;

const BADGE = {
  jade_330:  'Popular',
  jade_6480: 'Best Value',
};

export default function JadeShopModal({ onClose, onBalanceChange }) {
  const [pending, setPending] = useState(null);
  const [error,   setError]   = useState(null);
  const [success, setSuccess] = useState(null);

  const buy = useCallback(async (pkg) => {
    setError(null);
    setSuccess(null);
    setPending(pkg.id);
    const result = await purchaseJade(pkg.id);
    setPending(null);
    if (result.ok) {
      setSuccess(`+${pkg.jade} Blood Lotus added!`);
      onBalanceChange?.(getJadeBalance());
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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="jade-shop-modal" onClick={e => e.stopPropagation()}>

        <div className="jade-shop-header">
          <img src={`${BASE}sprites/items/blood_lotus.png`} className="jade-shop-icon" alt="" draggable="false" />
          <span className="jade-shop-title">Blood Lotus Shop</span>
          <button className="jade-shop-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {success && <div className="jade-shop-success">{success}</div>}
        {error   && <div className="jade-shop-error">{error}</div>}

        <div className="jade-shop-grid">
          {JADE_PACKAGES.map(pkg => (
            <button
              key={pkg.id}
              className={`jade-shop-item${pending === pkg.id ? ' jade-shop-item-pending' : ''}`}
              onClick={() => buy(pkg)}
              disabled={!!pending}
            >
              {BADGE[pkg.id] && <span className="jade-shop-badge">{BADGE[pkg.id]}</span>}
              <img src={`${BASE}sprites/items/blood_lotus.png`} className="jade-shop-item-icon" alt="" draggable="false" />
              <span className="jade-shop-item-amount">{pkg.jade.toLocaleString()}</span>
              <span className="jade-shop-item-label">{pkg.label}</span>
              <span className="jade-shop-item-price">
                {pending === pkg.id ? '...' : pkg.price}
              </span>
            </button>
          ))}
        </div>

        <button
          className="jade-shop-restore"
          onClick={restore}
          disabled={!!pending}
        >
          {pending === 'restore' ? 'Restoring…' : 'Restore Purchases'}
        </button>

      </div>
    </div>
  );
}
