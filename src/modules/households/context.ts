import { createContext, useContext } from 'react';
import type { IsoDate } from '@/lib/dates';
import type { Member, Membership } from './types';

export interface HouseholdValue extends Membership {
  /** Today in the household timezone; rolls over at midnight there. */
  today: IsoDate;
  isOwner: boolean;
  memberById: (id: string | null | undefined) => Member | undefined;
}

export const HouseholdContext = createContext<HouseholdValue | null>(null);

export function useHousehold(): HouseholdValue {
  const value = useContext(HouseholdContext);
  if (!value) throw new Error('useHousehold must be used inside HouseholdGate');
  return value;
}

/** For components that also render outside a household (previews). */
export function useOptionalHousehold(): HouseholdValue | null {
  return useContext(HouseholdContext);
}
