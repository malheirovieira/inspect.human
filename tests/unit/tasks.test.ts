import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { BACKOFF_MAX_MS, computeBackoffMs } from "@/lib/tasks/backoff";
import { checkCronAuth } from "@/lib/tasks/cronAuth";
import { createTaskRegistry, defineTask } from "@/lib/tasks/registry";
import { enqueueTask, type TaskDb } from "@/lib/tasks/queue";

describe("computeBackoffMs", () => {
  const noJitter = () => 0.5;

  it("cresce 4x por tentativa a partir de 30s", () => {
    expect(computeBackoffMs(1, noJitter)).toBe(30_000);
    expect(computeBackoffMs(2, noJitter)).toBe(120_000);
    expect(computeBackoffMs(3, noJitter)).toBe(480_000);
    expect(computeBackoffMs(4, noJitter)).toBe(1_920_000);
  });

  it("para no teto de 1h", () => {
    expect(computeBackoffMs(5, noJitter)).toBe(BACKOFF_MAX_MS);
    expect(computeBackoffMs(50, noJitter)).toBe(BACKOFF_MAX_MS);
  });

  it("aplica no máximo ±20% de variação", () => {
    expect(computeBackoffMs(1, () => 0)).toBe(24_000);
    expect(computeBackoffMs(1, () => 1)).toBe(36_000);
  });
});

describe("checkCronAuth", () => {
  it("fica fechada sem CRON_SECRET", () => {
    expect(checkCronAuth("Bearer qualquer", undefined)).toBe("not-configured");
    expect(checkCronAuth("Bearer ", "")).toBe("not-configured");
  });

  it("recusa sem header, sem Bearer ou com segredo errado", () => {
    expect(checkCronAuth(null, "s3gredo")).toBe("unauthorized");
    expect(checkCronAuth("s3gredo", "s3gredo")).toBe("unauthorized");
    expect(checkCronAuth("Bearer outro", "s3gredo")).toBe("unauthorized");
    expect(checkCronAuth("Bearer s3gredo-mais-longo", "s3gredo")).toBe("unauthorized");
  });

  it("aceita o segredo correto", () => {
    expect(checkCronAuth("Bearer s3gredo", "s3gredo")).toBe("ok");
  });
});

describe("registro de tipos", () => {
  const task = defineTask({ type: "teste.eco", payloadSchema: z.object({ n: z.number() }), handler: async () => {} });

  it("recusa tipo duplicado", () => {
    expect(() => createTaskRegistry([task, task])).toThrow(/duplicado/);
  });

  it("enqueue valida tipo e payload antes de tocar no banco", async () => {
    const db = { $queryRaw: vi.fn(), $executeRaw: vi.fn() } as unknown as TaskDb;
    const registry = createTaskRegistry([task]);

    await expect(enqueueTask(db, registry, "teste.inexistente", {})).rejects.toThrow(/não registrado/);
    await expect(enqueueTask(db, registry, "teste.eco", { n: "texto" })).rejects.toThrow(/Payload inválido/);
    await expect(enqueueTask(db, registry, "teste.eco", { n: 1 }, { maxAttempts: 0 })).rejects.toThrow(/maxAttempts/);
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });
});
