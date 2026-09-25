"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, MessageCircle, MoreVertical, Pin } from "lucide-react";
import type { Testimonial } from "@/lib/testimonials";

// Faixa "O que dizem sobre o Inspect Talent" (tela Início).
// Card IDÊNTICO à referência — From Uiverse.io by Yaya12085 (licença MIT):
// .task/.tags/.tag/.options/p/.stats/.viewer (CSS em globals.css,
// .fin-testimonial). Única diferença: cursor default no card (os botões têm
// cursor pointer).
//
// Comportamento PROVISÓRIO, só em memória (nada é salvo; recarregou,
// voltou ao normal): Amei alterna e soma/subtrai 1; Fixar alterna e leva o
// card pro início da faixa; Comentar e ⋮ mostram "Em breve".
// Recebe só DADOS (armadilha nº 1 do CONTEXT.md: nunca função vinda de
// Server Component).

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function TestimonialCard({
  item,
  liked,
  pinned,
  onLike,
  onPin,
}: {
  item: Testimonial;
  liked: boolean;
  pinned: boolean;
  onLike: () => void;
  onPin: () => void;
}) {
  const [notice, setNotice] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

  function soon() {
    setNotice(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(false), 1800);
  }

  return (
    <article className="fin-testimonial" aria-label={`Depoimento de ${item.name}`}>
      <div className="fin-testimonial__tags">
        <span className="fin-testimonial__tag">{item.segment}</span>
        <button type="button" className="fin-testimonial__options" aria-label="Mais opções" onClick={soon}>
          <MoreVertical />
        </button>
      </div>

      <p className="fin-testimonial__text">“{item.text}”</p>
      <div className="fin-testimonial__author">
        {item.name} · {item.role} · {item.company}
      </div>

      <div className="fin-testimonial__stats">
        <div className="fin-testimonial__actions">
          <button
            type="button"
            aria-label={liked ? "Desfazer amei" : "Amei"}
            aria-pressed={liked}
            onClick={onLike}
            className={liked ? "is-active" : undefined}
          >
            <Heart strokeWidth={1.5} />
            {item.likes + (liked ? 1 : 0)}
          </button>
          <button type="button" aria-label="Comentar" onClick={soon}>
            <MessageCircle strokeWidth={1.5} />
            {item.comments}
          </button>
          <button
            type="button"
            aria-label={pinned ? "Desafixar" : "Fixar"}
            aria-pressed={pinned}
            onClick={onPin}
            className={pinned ? "is-active" : undefined}
          >
            <Pin strokeWidth={1.5} />
            {pinned ? 1 : 0}
          </button>
        </div>
        <div className="fin-testimonial__viewer">
          {item.avatarUrl ? (
            // Futuro: foto enviada pela própria pessoa (comentários reais).
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.avatarUrl} alt="" />
          ) : (
            <span aria-hidden="true">{initials(item.name)}</span>
          )}
        </div>
      </div>

      {notice && (
        <span className="fin-testimonial__notice" role="status">
          Em breve
        </span>
      )}
    </article>
  );
}

export function TestimonialsStrip({ items }: { items: Testimonial[] }) {
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [pinned, setPinned] = useState<string[]>([]);

  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  // Fixados primeiro (o mais recente no topo); o resto na ordem original.
  const ordered = useMemo(() => {
    const pinnedItems = pinned.map((id) => items.find((t) => t.id === id)).filter((t): t is Testimonial => Boolean(t));
    return [...pinnedItems, ...items.filter((t) => !pinned.includes(t.id))];
  }, [items, pinned]);

  return (
    <div className="fin-testimonials">
      {ordered.map((item) => (
        <TestimonialCard
          key={item.id}
          item={item}
          liked={liked.has(item.id)}
          pinned={pinned.includes(item.id)}
          onLike={() => setLiked((s) => toggle(s, item.id))}
          onPin={() => setPinned((p) => (p.includes(item.id) ? p.filter((id) => id !== item.id) : [item.id, ...p]))}
        />
      ))}
    </div>
  );
}
