"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Heart, MessageCircle, Pin, X } from "lucide-react";
import type { Testimonial } from "@/lib/testimonials";

// Faixa "O que dizem sobre o Inspect Talent" (tela Início) — carrossel.
// Card IDÊNTICO à referência — From Uiverse.io by Yaya12085 (licença MIT):
// .task/.tags/.tag/.options/p/.stats/.viewer (CSS em globals.css,
// .fin-testimonial). Diferenças pedidas: cursor default no card (botões com
// pointer), sem contorno no hover, "X" (Fechar) no lugar dos três pontos.
//
// Carrossel: 4 cards por vez no desktop, 2 no tablet, 1 no celular (largura
// no CSS). Scroll horizontal com scroll-snap card a card (dedo/touchpad),
// setas anterior/próximo (Tab + aria-label), sem barra de rolagem visível.
//
// Comportamento PROVISÓRIO: Amei/Fixar só em memória (recarregou, voltou);
// Comentar mostra "Em breve". Fechar ("X") guarda o id no localStorage
// (DISMISSED_KEY) — quando os comentários forem reais, isso vira por
// usuário no banco (CONTEXT.md). Todos fechados = a seção some.
// Recebe só DADOS (armadilha nº 1 do CONTEXT.md).

const DISMISSED_KEY = "inspect-talent:dismissed-testimonials";

function readDismissed(): string[] {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return []; // localStorage indisponível ou valor corrompido
  }
}

function writeDismissed(ids: string[]) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
  } catch {
    // modo privado/cota cheia — o fechamento vale só nesta visita
  }
}

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
  onClose,
}: {
  item: Testimonial;
  liked: boolean;
  pinned: boolean;
  onLike: () => void;
  onPin: () => void;
  onClose: () => void;
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
        <button type="button" className="fin-testimonial__options" aria-label="Fechar" onClick={onClose}>
          <X />
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
  const reduceMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [pinned, setPinned] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  // Antes de ler o localStorage (SSR e 1º render) a lista sai sem
  // AnimatePresence — ao ler, os já fechados somem SEM animação.
  const [ready, setReady] = useState(false);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  useEffect(() => {
    setDismissed(readDismissed());
    setReady(true);
  }, []);

  // Fixados primeiro (o mais recente no topo); fechados saem.
  const visible = useMemo(() => {
    const open = items.filter((t) => !dismissed.includes(t.id));
    const pinnedItems = pinned.map((id) => open.find((t) => t.id === id)).filter((t): t is Testimonial => Boolean(t));
    return [...pinnedItems, ...open.filter((t) => !pinned.includes(t.id))];
  }, [items, pinned, dismissed]);

  // Setas desativadas quando não há mais cards naquela direção.
  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 1);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    el.addEventListener("scrollend", updateArrows);
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      el.removeEventListener("scrollend", updateArrows);
      ro.disconnect();
    };
  }, [updateArrows, visible.length]);

  // Um card por clique (encaixa com o scroll-snap).
  function scrollByCard(direction: 1 | -1) {
    const el = trackRef.current;
    const first = el?.querySelector<HTMLElement>(".fin-testimonials__item");
    if (!el || !first) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    el.scrollBy({ left: direction * (first.offsetWidth + gap), behavior: reduceMotion ? "auto" : "smooth" });
    // Garantia extra além do evento de scroll: reavalia as setas depois que
    // a rolagem (suave, ~300–500ms) termina.
    setTimeout(updateArrows, reduceMotion ? 0 : 600);
  }

  function close(id: string) {
    setDismissed((prev) => {
      const next = [...prev, id];
      writeDismissed(next);
      return next;
    });
    setPinned((p) => p.filter((x) => x !== id));
  }

  function togglePin(id: string) {
    const willPin = !pinned.includes(id);
    setPinned((p) => (p.includes(id) ? p.filter((x) => x !== id) : [id, ...p]));
    // Fixou: volta pro início da faixa, onde o card foi parar.
    if (willPin) trackRef.current?.scrollTo({ left: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  if (ready && visible.length === 0) return null;

  const renderCard = (item: Testimonial) => (
    <TestimonialCard
      item={item}
      liked={liked.has(item.id)}
      pinned={pinned.includes(item.id)}
      onLike={() =>
        setLiked((s) => {
          const next = new Set(s);
          if (next.has(item.id)) next.delete(item.id);
          else next.add(item.id);
          return next;
        })
      }
      onPin={() => togglePin(item.id)}
      onClose={() => close(item.id)}
    />
  );

  return (
    <section className="fin-testimonials-section" aria-labelledby="depoimentos-titulo">
      <div className="fin-testimonials-section__head">
        <h2 id="depoimentos-titulo" className="fin-heading" style={{ margin: 0 }}>
          O que dizem sobre o Inspect Talent
        </h2>
        <div className="fin-testimonials-section__arrows">
          <button type="button" aria-label="Depoimentos anteriores" disabled={!canPrev} onClick={() => scrollByCard(-1)}>
            <ChevronLeft size={16} />
          </button>
          <button type="button" aria-label="Próximos depoimentos" disabled={!canNext} onClick={() => scrollByCard(1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        className="fin-testimonials"
        role="region"
        aria-roledescription="carrossel"
        aria-label="Depoimentos"
        tabIndex={0}
      >
        {!ready ? (
          visible.map((item) => (
            <div key={item.id} className="fin-testimonials__item">
              {renderCard(item)}
            </div>
          ))
        ) : (
          <AnimatePresence initial={false}>
            {visible.map((item) => (
              <motion.div
                key={item.id}
                className="fin-testimonials__item"
                // Fechar: some (opacidade + leve redução de escala, ~250ms);
                // depois os seguintes deslizam (layout). Movimento reduzido:
                // sem animação, o card só desaparece.
                layout={reduceMotion ? false : "position"}
                exit={reduceMotion ? undefined : { opacity: 0, scale: 0.92, transition: { duration: 0.25, ease: "easeOut" } }}
                transition={{ layout: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }}
              >
                {renderCard(item)}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </section>
  );
}
