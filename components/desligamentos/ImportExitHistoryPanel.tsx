"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Select } from "@/components/ui/Field";
import { EXIT_HISTORY_IMPORT_FIELDS, type ImportFieldId, type MappedExitHistoryRow } from "@/lib/desligamentos/importExitHistory";
import { EXIT_TYPES, EXIT_TYPE_LABELS, EXIT_REASONS, EXIT_REASON_LABELS } from "@/schemas/employeeExit";
import { importExitHistory, type ImportExitHistoryResult } from "@/app/(dashboard)/desligamentos/importActions";

type Step = "upload" | "mapping" | "result";

const NO_COLUMN = "__none__";

type FieldMapping = { column: string; fixedValue: string };

const FIXED_VALUE_OPTIONS: Partial<Record<ImportFieldId, { value: string; label: string }[]>> = {
  exitType: EXIT_TYPES.map((t) => ({ value: t, label: EXIT_TYPE_LABELS[t] })),
  reason: EXIT_REASONS.map((r) => ({ value: r, label: EXIT_REASON_LABELS[r] })),
};

export function ImportExitHistoryPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [parseError, setParseError] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<ImportFieldId, FieldMapping>>(
    () =>
      Object.fromEntries(EXIT_HISTORY_IMPORT_FIELDS.map((f) => [f.id, { column: NO_COLUMN, fixedValue: "" }])) as Record<
        ImportFieldId,
        FieldMapping
      >
  );
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportExitHistoryResult | null>(null);

  function handleFile(file: File) {
    setParseError(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (parsed) => {
        if (parsed.errors.length > 0) {
          setParseError(parsed.errors[0].message);
          return;
        }
        const cols = parsed.meta.fields ?? [];
        if (cols.length === 0) {
          setParseError("Não foi possível identificar o cabeçalho do arquivo.");
          return;
        }
        setHeaders(cols);
        setRawRows(parsed.data);

        // Tenta pré-associar colunas cujo nome bate (ignorando maiúsc./espaços).
        setMapping((prev) => {
          const next = { ...prev };
          for (const field of EXIT_HISTORY_IMPORT_FIELDS) {
            const match = cols.find((c) => c.trim().toLowerCase() === field.label.trim().toLowerCase());
            if (match) next[field.id] = { ...next[field.id], column: match };
          }
          return next;
        });
        setStep("mapping");
      },
      error: (err) => setParseError(err.message),
    });
  }

  function buildMappedRows(): MappedExitHistoryRow[] {
    return rawRows.map((row) => {
      const entry = {} as MappedExitHistoryRow;
      for (const field of EXIT_HISTORY_IMPORT_FIELDS) {
        const m = mapping[field.id];
        if (m.column !== NO_COLUMN) {
          entry[field.id] = (row[m.column] ?? "").toString();
        } else {
          entry[field.id] = m.fixedValue;
        }
      }
      return entry;
    });
  }

  const missingRequired = EXIT_HISTORY_IMPORT_FIELDS.filter((f) => {
    const m = mapping[f.id];
    if (m.column !== NO_COLUMN) return false;
    if (f.allowFixedValue && m.fixedValue) return false;
    return f.required;
  });

  async function handleConfirm() {
    setSubmitting(true);
    const mappedRows = buildMappedRows();
    const res = await importExitHistory(mappedRows);
    setSubmitting(false);
    setResult(res);
    setStep("result");
    router.refresh();
  }

  const previewRows = buildMappedRows().slice(0, 5);

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="fin-eyebrow">IMPORTAR HISTÓRICO DE DESLIGAMENTOS</span>
        <Button type="button" variant="icon-cancel" onClick={onClose} aria-label="Fechar">
          Fechar
        </Button>
      </div>

      {step === "upload" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
            Envie um arquivo <strong>.csv</strong> com o histórico de desligamentos (e, se tiver, as respostas da
            pesquisa de saída). Na próxima etapa você associa as colunas do arquivo aos campos do sistema.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          {parseError && <span className="fin-field-error">{parseError}</span>}
        </div>
      )}

      {step === "mapping" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
            {rawRows.length} linha(s) encontrada(s) no arquivo. Associe cada campo a uma coluna — campos marcados com
            * são obrigatórios.
          </p>

          {["Desligamento", "Pesquisa"].map((group) => (
            <div key={group} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                {group === "Desligamento" ? "Dados do desligamento" : "Dados da pesquisa (opcional)"}
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                {EXIT_HISTORY_IMPORT_FIELDS.filter((f) => f.group === group).map((field) => {
                  const m = mapping[field.id];
                  const fixedOptions = FIXED_VALUE_OPTIONS[field.id];
                  return (
                    <FieldLabel key={field.id} label={field.label} required={field.required}>
                      <Select
                        value={m.column}
                        onChange={(e) =>
                          setMapping((prev) => ({ ...prev, [field.id]: { ...prev[field.id], column: e.target.value } }))
                        }
                      >
                        <option value={NO_COLUMN}>— não mapear —</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </Select>
                      {m.column === NO_COLUMN && fixedOptions && (
                        <Select
                          style={{ marginTop: 6 }}
                          value={m.fixedValue}
                          onChange={(e) =>
                            setMapping((prev) => ({ ...prev, [field.id]: { ...prev[field.id], fixedValue: e.target.value } }))
                          }
                        >
                          <option value="">Valor fixo para todas as linhas...</option>
                          {fixedOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </Select>
                      )}
                    </FieldLabel>
                  );
                })}
              </div>
            </div>
          ))}

          {missingRequired.length > 0 && (
            <div
              style={{ padding: "12px 16px", borderRadius: "var(--radius-md)", background: "var(--danger-surface)", color: "var(--danger)", fontSize: 13 }}
            >
              Mapeie (ou defina um valor fixo para) os campos obrigatórios: {missingRequired.map((f) => f.label).join(", ")}.
            </div>
          )}

          {previewRows.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                Pré-visualização (5 primeiras linhas)
              </span>
              <table style={{ width: "100%", fontSize: 12, marginTop: 8, borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {EXIT_HISTORY_IMPORT_FIELDS.map((f) => (
                      <th key={f.id} style={{ textAlign: "left", padding: "4px 8px", borderBottom: "1px solid var(--border)" }}>
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i}>
                      {EXIT_HISTORY_IMPORT_FIELDS.map((f) => (
                        <td key={f.id} style={{ padding: "4px 8px", borderBottom: "1px solid var(--border)" }}>
                          {row[f.id] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button type="button" variant="secondary" onClick={() => setStep("upload")}>
              Voltar
            </Button>
            <Button
              type="button"
              variant={submitting || missingRequired.length > 0 ? "disabled" : "confirm"}
              onClick={handleConfirm}
              disabled={submitting || missingRequired.length > 0}
            >
              {submitting ? "Importando..." : `Importar ${rawRows.length} linha(s)`}
            </Button>
          </div>
        </div>
      )}

      {step === "result" && result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{ padding: 12, borderRadius: "var(--radius-md)", background: "var(--surface-muted)" }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{result.imported}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Importadas</div>
            </div>
            <div style={{ padding: 12, borderRadius: "var(--radius-md)", background: "var(--surface-muted)" }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{result.skippedDuplicates}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Puladas por duplicidade</div>
            </div>
            <div style={{ padding: 12, borderRadius: "var(--radius-md)", background: "var(--surface-muted)" }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{result.errors.length}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Com erro</div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 240, overflowY: "auto" }}>
              {result.errors.map((e, i) => (
                <div key={i} style={{ fontSize: 12, color: "var(--danger)" }}>
                  Linha {e.line}: {e.message}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button type="button" variant="confirm" onClick={onClose}>
              Concluir
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
