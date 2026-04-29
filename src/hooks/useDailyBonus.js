import { useState, useCallback } from 'react';
import { getDailyBonusState, collectDailyBonus } from '../systems/dailyBonus';
import { trackDailyBonusClaimed } from '../analytics';

export function useDailyBonus() {
  const [state, setState] = useState(() => getDailyBonusState());

  const collect = useCallback(() => {
    const awarded = collectDailyBonus();
    if (awarded > 0) {
      const next = getDailyBonusState();
      try { trackDailyBonusClaimed(state.streak); } catch {}
      setState(next);
    }
    return awarded;
  }, [state.streak]);

  return { ...state, collect };
}
