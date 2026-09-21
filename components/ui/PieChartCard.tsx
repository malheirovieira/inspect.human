"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/Card";

export type PieDatum = { name: string; value: number; color: string };

function formatMoney(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PieChartCard({
  title,
  data,
  valueFormat = "money",
}: {
  title: string;
  data: PieDatum[];
  valueFormat?: "money" | "number";
}) {
  const hasData = data.some((d) => d.value > 0);
  const format = valueFormat === "money" ? formatMoney : (v: number) => String(v);

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <span className="fin-eyebrow">{title}</span>
      {!hasData ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Sem dados suficientes ainda.</p>
      ) : (
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
                animationDuration={700}
                animationEasing="ease-out"
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} stroke="var(--surface)" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => format(Number(value))} />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
