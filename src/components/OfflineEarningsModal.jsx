import { useTranslation } from 'react-i18next';

const BASE = import.meta.env.BASE_URL;

/**
 * Shown once when the player returns after 5+ minutes away.
 * Offers normal collect or doubled collect via rewarded ad.
 */
function OfflineEarningsModal({ amount, onCollect, onDoubleCollect }) {
  const { t } = useTranslation('ui');

  return (
    <div className="offline-overlay">
      <div className="offline-card">

        <div className="offline-header">
          <div className="offline-icon-wrap">
            <img
              src={`${BASE}ui/qi.png`}
              className="offline-icon"
              alt=""
              draggable="false"
            />
          </div>
          <h2 className="offline-title">{t('offlineModal.title')}</h2>
          <p className="offline-flavour">
            {t('offlineModal.message')}
          </p>
        </div>

        <div className="offline-reward-box">
          <span className="offline-reward-label">Qi Gathered</span>
          <span className="offline-amount">+{amount.toLocaleString()}</span>
          <span className="offline-reward-unit">Qi</span>
        </div>

        <div className="offline-actions">
          <button className="offline-collect-btn" onClick={onCollect}>
            {t('offlineModal.collect')}
          </button>

          {onDoubleCollect && (
            <button className="offline-double-btn" onClick={onDoubleCollect}>
              {t('offlineModal.collectDouble')}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

export default OfflineEarningsModal;
