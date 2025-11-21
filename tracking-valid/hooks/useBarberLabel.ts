// hooks/useBarberLabel.ts
import { useMemo } from 'react'

export function useBarberLabel(barberType?: 'rental' | 'commission') {
  const label = useMemo(() => {
    if (barberType === 'rental') return 'Rental Revenue'
    if (barberType === 'commission') return 'Commission Revenue'
    return 'Revenue'
  }, [barberType])

  return { label }
}
