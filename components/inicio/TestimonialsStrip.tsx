"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type WheelEvent } from "react";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight, Heart, MessageCircle, Pause, Pin, Play, X } from "lucide-react";
import type { Testimonial } from "@/lib/testimonials";

// Faixa "O que dizem sobre o Inspect Talent" (tela Início) — carrossel POR
// PÁGINA com avanço automático.
// Card com o visual da referência — From Uiverse.io by Yaya12085 (licença
// MIT), compacto e horizontal: ocupa 1/N da faixa (CSS em globals.css,
// .fin-testimonial).
//
// Página = grupo de cards visíveis: 3 no desktop (qualquer largura a partir
// de 1024px), 2 no tablet, 1 no celular; 32px entre os cards. A fileira
// inteira desliza (~700ms, ease-in-out) e a próxima entra, sempre na direção
// do movimento — depois da última volta à primeira continuando pro mesmo lado
// (loop, sem "voltar correndo"). Última página incompleta é completada com os
// primeiros.
// Avanço automático a cada 6s; pausa com mouse em cima, foco do teclado,
// arraste, aba oculta ou botão Pausar. Setas, bolinhas e arraste (dedo ou
// touchpad) trocam de página e reiniciam a contagem. prefers-reduced-motion:
// sem avanço automático e sem animação (controles continuam).
//
// Provisório: Amei/Fixar só em memória; Comentar mostra "Em breve"; Fechar
// (X) guarda no localStorage (DISMISSED_KEY) — com comentários reais, isso
// vira por usuário no banco (CONTEXT.md). Todos fechados = a seção some.
// Recebe só DADOS (armadilha nº 1 do CONTEXT.md).

const DISMISSED_KEY = "inspect-talent:dismissed-testimonials";
const PAGE_MS = 6000;
const SLIDE_S = 0.7;
const SWIPE_PX = 50;

// Cards por página conforme a largura da tela.
const BREAKPOINTS: [query: string, perPage: number][] = [
  ["(min-width: 1024px)", 3],
  ["(min-width: 640px)", 2],
];

function currentPerPage(): number {
  for (const [query, n] of BREAKPOINTS) if (window.matchMedia(query).matches) return n;
  return 1;
}

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
      <div className="fin-testimonial__author" title={`${item.name} · ${item.role} · ${item.company}`}>
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

// Página entra do lado de onde vem o movimento e sai pro lado oposto.
const pageVariants = {
  enter: (dir: number) => ({ x: dir >= 0 ? "100%" : "-100%" }),
  center: { x: "0%" },
  exit: (dir: number) => ({ x: dir >= 0 ? "-100%" : "100%" }),
};

export function TestimonialsStrip({ items }: { items: Testimonial[] }) {
  const reduceMotion = useReducedMotion() ?? false;
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [pinned, setPinned] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [perPage, setPerPage] = useState(3); // SSR: desktop
  // Antes de ler localStorage/largura, render estático (sem animação); ao
  // ler, os fechados somem e a quantidade por página se ajusta SEM animar.
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState(0);
  const [dir, setDir] = useState(1);
  const [tick, setTick] = useState(0); // muda = reinicia a contagem de 6s
  const [userPaused, setUserPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const wheelLock = useRef(false);
  const wheelAcc = useRef(0);

  useEffect(() => {
    setDismissed(readDismissed());
    setPerPage(currentPerPage());
    setReady(true);

    const queries = BREAKPOINTS.map(([q]) => window.matchMedia(q));
    const onResize = () => setPerPage(currentPerPage());
    queries.forEach((mq) => mq.addEventListener("change", onResize));
    const onVisibility = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      queries.forEach((mq) => mq.removeEventListener("change", onResize));
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Fixados primeiro (o mais recente no topo); fechados saem.
  const visible = useMemo(() => {
    const open = items.filter((t) => !dismissed.includes(t.id));
    const pinnedItems = pinned.map((id) => open.find((t) => t.id === id)).filter((t): t is Testimonial => Boolean(t));
    return [...pinnedItems, ...open.filter((t) => !pinned.includes(t.id))];
  }, [items, pinned, dismissed]);

  const count = visible.length;
  const pageCount = Math.max(1, Math.ceil(count / perPage));
  const currentPage = Math.min(page, pageCount - 1);

  // Fechou cards / mudou a largura e a página atual deixou de existir.
  useEffect(() => {
    if (page > pageCount - 1) setPage(pageCount - 1);
  }, [page, pageCount]);

  // Cards da página: completa a última com os primeiros (sem buraco). Com
  // menos depoimentos que uma página, mostra só os que existem (sem repetir).
  const pageItems = useMemo(() => {
    if (count <= perPage) return visible;
    return Array.from({ length: perPage }, (_, i) => visible[(currentPage * perPage + i) % count]);
  }, [visible, count, perPage, currentPage]);

  const goTo = useCallback(
    (target: number, direction: number) => {
      setDir(direction);
      setPage(((target % pageCount) + pageCount) % pageCount);
      setTick((t) => t + 1);
    },
    [pageCount]
  );
  const next = useCallback(() => goTo(currentPage + 1, 1), [goTo, currentPage]);
  const prev = useCallback(() => goTo(currentPage - 1, -1), [goTo, currentPage]);

  // Avanço automático.
  const multiPage = pageCount > 1;
  const autoplay = ready && !reduceMotion && multiPage && !userPaused && !hovered && !focused && !dragging && !tabHidden;
  useEffect(() => {
    if (!autoplay) return;
    const timer = setTimeout(next, PAGE_MS);
    return () => clearTimeout(timer);
  }, [autoplay, next, currentPage, tick]);

  function close(id: string) {
    setDismissed((prev) => {
      const nextIds = [...prev, id];
      writeDismissed(nextIds);
      return nextIds;
    });
    setPinned((p) => p.filter((x) => x !== id));
    setTick((t) => t + 1);
  }

  function togglePin(id: string) {
    const willPin = !pinned.includes(id);
    setPinned((p) => (p.includes(id) ? p.filter((x) => x !== id) : [id, ...p]));
    // Fixou: o card vai pro início — volta pra primeira página.
    if (willPin && currentPage !== 0) goTo(0, -1);
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    setDragging(false);
    if (info.offset.x < -SWIPE_PX || info.velocity.x < -400) next();
    else if (info.offset.x > SWIPE_PX || info.velocity.x > 400) prev();
  }

  // Touchpad: gesto horizontal de dois dedos troca de página (uma por gesto).
  function onWheel(e: WheelEvent) {
    if (!multiPage || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    if (wheelLock.current) return;
    wheelAcc.current += e.deltaX;
    if (Math.abs(wheelAcc.current) < 40) return;
    if (wheelAcc.current > 0) next();
    else prev();
    wheelAcc.current = 0;
    wheelLock.current = true;
    setTimeout(() => (wheelLock.current = false), SLIDE_S * 1000 + 200);
  }

  if (ready && count === 0) return null;

  const renderCard = (item: Testimonial) => (
    <TestimonialCard
      item={item}
      liked={liked.has(item.id)}
      pinned={pinned.includes(item.id)}
      onLike={() =>
        setLiked((s) => {
          const nextSet = new Set(s);
          if (nextSet.has(item.id)) nextSet.delete(item.id);
          else nextSet.add(item.id);
          return nextSet;
        })
      }
      onPin={() => togglePin(item.id)}
      onClose={() => close(item.id)}
    />
  );

  // Cada card ocupa 1/N da faixa, descontados os espaços de 32px (CSS).
  const gridStyle = { gridTemplateColumns: `repeat(${perPage}, minmax(0, 1fr))` };
  const slide = { duration: reduceMotion ? 0 : SLIDE_S, ease: "easeInOut" as const };

  return (
    <section className="fin-testimonials-section" aria-labelledby="depoimentos-titulo">
      <div className="fin-testimonials-section__head">
        <h2 id="depoimentos-titulo" className="fin-heading" style={{ margin: 0 }}>
          O que dizem sobre o Inspect Talent
        </h2>
        {multiPage && (
          <div className="fin-testimonials-section__arrows">
            {!reduceMotion && (
              <button
                type="button"
                aria-label={userPaused ? "Continuar a passagem automática" : "Pausar a passagem automática"}
                aria-pressed={userPaused}
                onClick={() => {
                  setUserPaused((p) => !p);
                  setTick((t) => t + 1);
                }}
              >
                {userPaused ? <Play size={14} /> : <Pause size={14} />}
              </button>
            )}
            <button type="button" aria-label="Depoimentos anteriores" onClick={prev}>
              <ChevronLeft size={16} />
            </button>
            <button type="button" aria-label="Próximos depoimentos" onClick={next}>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      <div
        className="fin-testimonials"
        role="region"
        aria-roledescription="carrossel"
        aria-label="Depoimentos"
        tabIndex={0}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
        }}
        onKeyDown={(e) => {
          if (!multiPage || e.target !== e.currentTarget) return;
          if (e.key === "ArrowRight") next();
          if (e.key === "ArrowLeft") prev();
        }}
        onWheel={onWheel}
      >
        {!ready ? (
          <div className="fin-testimonials__page" style={gridStyle}>
            {pageItems.map((item) => (
              <div key={item.id} className="fin-testimonials__item">
                {renderCard(item)}
              </div>
            ))}
          </div>
        ) : (
          <AnimatePresence initial={false} custom={dir} mode="popLayout">
            <motion.div
              key={`${perPage}-${currentPage}`}
              className="fin-testimonials__page"
              style={gridStyle}
              custom={dir}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={slide}
              drag={multiPage ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.25}
              onDragStart={() => setDragging(true)}
              onDragEnd={onDragEnd}
            >
              {/* Fechar: o card sai (opacidade + escala) e os da página se
                  reorganizam, puxando o próximo depoimento. */}
              <AnimatePresence initial={false} mode="popLayout">
                {pageItems.map((item) => (
                  <motion.div
                    key={item.id}
                    className="fin-testimonials__item"
                    layout={reduceMotion ? false : "position"}
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduceMotion ? undefined : { opacity: 0, scale: 0.92, transition: { duration: 0.25, ease: "easeOut" } }}
                    transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {renderCard(item)}
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {multiPage && (
        <div className="fin-testimonials__dots" role="group" aria-label="Páginas de depoimentos">
          {Array.from({ length: pageCount }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ir para a página ${i + 1} de ${pageCount}`}
              aria-current={i === currentPage ? "true" : undefined}
              className={i === currentPage ? "is-active" : undefined}
              onClick={() => (i === currentPage ? setTick((t) => t + 1) : goTo(i, i > currentPage ? 1 : -1))}
            />
          ))}
        </div>
      )}
    </section>
  );
}
