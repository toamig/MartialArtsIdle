import { useState, useCallback } from 'react';
import { getDailyBonusState, collectDailyBonus } from '../systems/dailyBonus';

export function useDailyBonus() {
  const [state, setState] = useState(() => getDailyBonusState());

  const collect = useCallback(() => {
    const awarded = collectDailyBonus();
    if (awarded > 0) setState(getDailyBonusState());
    return awarded;
  }, []);

  return { ...state, collect };
}
