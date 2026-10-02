// Curvas e molas compartilhadas pela animated-sidebar (beui.dev). O pacote
// original não veio junto com o componente — valores equivalentes aos
// padrões usados por ele.

// Gaveta (mesma curva do vaul/iOS sheet): sai rápido, assenta suave.
export const EASE_DRAWER = [0.32, 0.72, 0, 1] as const;

// Saída suave padrão pra opacidade/rótulos.
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;

// Mola de layout (pílula ativa, itens mudando de posição) — sem overshoot
// perceptível.
export const SPRING_LAYOUT = { type: "spring", stiffness: 500, damping: 40, mass: 0.8 } as const;

// Mola curta do "aperto" ao clicar (whileTap).
export const SPRING_PRESS = { type: "spring", stiffness: 600, damping: 30 } as const;
