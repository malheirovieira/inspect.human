"use client";

import { useEffect, useState } from "react";

export function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  // Começa em 0 e anima até o valor real no mount/atualização — sem isso,
  // o preenchimento já nasceria no tamanho final e não teria o que animar.
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setWidth(clamped));
    return () => cancelAnimationFrame(frame);
  }, [clamped]);

  return (
    <div className="fin-bar__track">
      <div className="fin-bar__fill" style={{ width: `${width}%` }} />
    </div>
  );
}
