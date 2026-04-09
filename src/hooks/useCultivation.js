import { useState, useEffect, useRef, useCallback } from 'react';
import REALMS from '../data/realms';

const BASE_RATE = 5; // qi per second at 1x
const BOOST_MULTIPLIER = 3;
const SAVE_KEY = 'mai_cultivation';

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveState(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {}
}

export default function useCultivation() {
  const saved = loadState();
  const [realmIndex, setRealmIndex] = useState(saved?.realmIndex ?? 0);
  const [qi, setQi] = useState(saved?.qi ?? 0);
  const [boosting, setBoosting] = useState(false);
  const boostRef = useRef(false);
  const lastTickRef = useRef(performance.now());

  const realm = REALMS[realmIndex];
  const nextRealm = REALMS[realmIndex + 1] ?? null;
  const maxed = !nextRealm;
  const cost = realm.cost;
  const progress = maxed ? 1 : Math.min(qi / cost, 1);

  // Game loop
  useEffect(() => {
    let raf;
    const tick = (now) => {
      const dt = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;

      if (!maxed) {
        const rate = BASE_RATE * (boostRef.current ? BOOST_MULTIPLIER : 1);
        setQi((prev) => {
          const next = prev + rate * dt;
          return next;
        });
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [maxed]);

  // Level up check
  useEffect(() => {
    if (!maxed && qi >= cost) {
      setQi((prev) => prev - cost);
      setRealmIndex((prev) => prev + 1);
    }
  }, [qi, cost, maxed]);

  // Save periodically
  useEffect(() => {
    const interval = setInterval(() => {
      saveState({ realmIndex, qi });
    }, 2000);
    return () => clearInterval(interval);
  }, [realmIndex, qi]);

  const startBoost = useCallback(() => {
    boostRef.current = true;
    setBoosting(true);
  }, []);

  const stopBoost = useCallback(() => {
    boostRef.current = false;
    setBoosting(false);
  }, []);

  return {
    realmIndex,
    realmName: realm.name,
    nextRealmName: nextRealm?.name ?? 'Peak',
    qi: Math.floor(qi),
    cost,
    progress,
    boosting,
    maxed,
    startBoost,
    stopBoost,
    totalRealms: REALMS.length,
  };
}
