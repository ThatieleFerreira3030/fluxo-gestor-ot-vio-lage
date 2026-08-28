export const brl = (v: number | null | undefined, compacto = false) => {
  const n = Number(v ?? 0);
  if (compacto) {
    const abs = Math.abs(n);
    if (abs >= 1_000_000)
      return `R$ ${(n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
    if (abs >= 1_000)
      return `R$ ${(n / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  }
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
};

export const num = (v: number | null | undefined, casas = 0) =>
  Number(v ?? 0).toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });

export const pct = (v: number) => `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

/** Converte "YYYY-MM-DD" ou Date em Date local (sem deslocamento de fuso). */
export const toDate = (d: string | Date): Date => {
  if (d instanceof Date) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const [y, m, dd] = d.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, dd ?? 1);
};

export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const dataBR = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  const dt = toDate(d);
  return dt.toLocaleDateString("pt-BR");
};

export const dataHoraBR = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

export const addDias = (d: Date, dias: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + dias);
  return r;
};

/** Segunda-feira da semana da data informada. */
export const inicioSemana = (d: string | Date) => {
  const dt = toDate(d);
  const dia = (dt.getDay() + 6) % 7;
  return addDias(dt, -dia);
};
