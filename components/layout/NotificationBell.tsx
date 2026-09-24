"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  clearNotifications,
  type NotificationDTO,
} from "./notificationActions";

const POLL_INTERVAL_MS = 20_000;
const RING_DURATION_MS = 650;

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} d`;
}

export function NotificationBell() {
  const [items, setItems] = useState<NotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [ringing, setRinging] = useState(false);
  const prevUnreadRef = useRef<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const data = await listNotifications();
    setItems(data.items);
    setUnreadCount(data.unreadCount);
    if (prevUnreadRef.current !== null && data.unreadCount > prevUnreadRef.current) {
      setRinging(true);
      setTimeout(() => setRinging(false), RING_DURATION_MS);
    }
    prevUnreadRef.current = data.unreadCount;
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleToggleOpen() {
    setOpen((prev) => !prev);
    if (!open) await refresh();
  }

  async function handleItemClick(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await markNotificationRead(id);
  }

  async function handleMarkAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    await markAllNotificationsRead();
  }

  async function handleClear() {
    setItems([]);
    setUnreadCount(0);
    await clearNotifications();
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={handleToggleOpen}
        aria-label="Notificações"
        className={cn("fin-header__bell", ringing && "fin-header__bell--ring")}
      >
        <Bell size={18} />
        {unreadCount > 0 && <span className="fin-header__dot" />}
      </button>

      {open && (
        <div className="fin-notif-panel">
          <div className="fin-notif-panel__header">
            <span className="fin-notif-panel__title">Notificações</span>
            <div className="fin-notif-panel__actions">
              <button type="button" onClick={handleMarkAllRead} title="Marcar como lido" aria-label="Marcar como lido">
                <Check size={14} />
              </button>
              <button type="button" onClick={handleClear} title="Limpar notificações" aria-label="Limpar notificações">
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div className="fin-notif-panel__list">
            {items.length === 0 ? (
              <p className="fin-notif-empty">Nenhuma notificação por aqui.</p>
            ) : (
              items.map((n) => {
                const content = (
                  <>
                    <div className="fin-notif-item__row">
                      <span className="fin-notif-item__title">{n.title}</span>
                      <span className="fin-notif-item__time">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="fin-notif-item__message">{n.message}</p>
                  </>
                );
                return n.link ? (
                  <Link
                    key={n.id}
                    href={n.link}
                    className={cn("fin-notif-item", !n.read && "fin-notif-item--unread")}
                    onClick={() => handleItemClick(n.id)}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    key={n.id}
                    type="button"
                    className={cn("fin-notif-item", !n.read && "fin-notif-item--unread")}
                    onClick={() => handleItemClick(n.id)}
                  >
                    {content}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
