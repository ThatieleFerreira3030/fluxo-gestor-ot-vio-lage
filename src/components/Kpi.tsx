import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function Kpi({
  titulo,
  valor,
  detalhe,
  tom = "neutro",
  onClick,
  icone,
}: {
  titulo: string;
  valor: ReactNode;
  detalhe?: ReactNode;
  tom?: "neutro" | "positivo" | "negativo" | "alerta";
  onClick?: () => void;
  icone?: ReactNode;
}) {
  const cor =
    tom === "positivo"
      ? "text-success"
      : tom === "negativo"
        ? "text-destructive"
        : tom === "alerta"
          ? "text-warning"
          : "text-foreground";
  return (
    <Card
      onClick={onClick}
      className={cn(
        "gap-1 p-4 shadow-card transition-shadow",
        onClick && "cursor-pointer hover:shadow-lg",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{titulo}</p>
        {icone}
      </div>
      <p className={cn("num text-2xl font-semibold", cor)}>{valor}</p>
      {detalhe && <p className="text-xs text-muted-foreground">{detalhe}</p>}
    </Card>
  );
}
