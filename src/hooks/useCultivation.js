import { useState, useEffect, useRef, useCallback } from 'react';
import REALMS from '../data/realms';
import { saveGame, loadGame } from '../systems/save';

const BASE_RATE = 5; // qi per second at 1x
const BOOST_MULTIPLIER = 3;

const label = (r) => (r.stage ? `${r.name} - ${r.stage}` : r.name);

export default function useCultivation() {
  const saved = loadGame();
  const [realmIndex, setRealmIndex] = useState(saved?.realmIndex ?? 0);
  const [boosting, setBoosting] = useState(false);

  const boostRef    = useRef(false);
  const lastTickRef = useRef(performance.now());

  // Mutable refs — updated every tick, no React re-render needed
  const qiRef      = useRef(saved?.qi ?? 0);
  const costRef    = useRef(REALMS[saved?.realmIndex ?? 0].cost);
  const maxedRef   = useRef(!REALMS[(saved?.realmIndex ?? 0) + 1]);
  const indexRef   = useRef(saved?.realmIndex ?? 0);

  // Keep cost/maxed refs in sync whenever realmIndex state changes
  useEffect(() => {
    const realm = REALMS[realmIndex];
    costRef.current  = realm.cost;
    maxedRef.current = !REALMS[realmIndex + 1];
    indexRef.current = realmIndex;
  }, [realmIndex]);

  // Single game loop — level-up handled here so it uses current refs
  useEffect(() => {
    let raf;
    const tick = (now) => {
      const dt = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;

      if (!maxedRef.current) {
        const rate = BASE_RATE * (boostRef.current ? BOOST_MULTIPLIER : 1);
        qiRef.current += rate * dt;

        if (qiRef.current >= costRef.current) {
          qiRef.current -= costRef.current;
          const nextIndex = indexRef.current + 1;
          indexRef.current  = nextIndex;
          costRef.current   = REALMS[nextIndex].cost;
          maxedRef.current  = !REALMS[nextIndex + 1];
          setRealmIndex(nextIndex);
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []); // runs once — reads everything via refs

  // Auto-save every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      saveGame({ realmIndex: indexRef.current, qi: Math.floor(qiRef.current) });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const startBoost = useCallback(() => { boostRef.current = true;  setBoosting(true);  }, []);
  const stopBoost  = useCallback(() => { boostRef.current = false; setBoosting(false); }, []);

  const realm     = REALMS[realmIndex];
  const nextRealm = REALMS[realmIndex + 1] ?? null;

  return {
    realmIndex,
    realmName:     label(realm),
    realmMajor:    realm.name,
    realmStage:    realm.stage,
    nextRealmName: nextRealm ? label(nextRealm) : 'Peak',
    maxed:         !nextRealm,
    boosting,
    startBoost,
    stopBoost,
    totalRealms:   REALMS.length,
    // Refs for direct DOM updates — avoids React render lag on the progress bar
    qiRef,
    costRef,
  };
}
