import { useEffect, useState } from 'react';

// Shows a boolean only after a specified delay while `active` stays true.
// Prevents flicker for quick operations.
export function useDelayedIndicator(active: boolean, delayMs = 1500) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (active) {
      const t = setTimeout(() => setShow(true), delayMs);
      return () => clearTimeout(t);
    } else {
      setShow(false);
    }
  }, [active, delayMs]);
  return show;
}
