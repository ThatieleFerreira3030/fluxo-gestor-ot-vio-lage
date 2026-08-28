import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CalendarRange,
  ListOrdered,
  Landmark,
  TrendingUp,
  Receipt,
  Banknote,
  Upload,
  ShieldCheck,
  GitCompare,
  History,
  Settings2,
  ChevronLeft,
  LogOut,
  Presentation,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { dataBR, dataHoraBR } from "@/lib/format";
import { useFiltros, useCenarios } from "@/lib/dados";

const NAV = [
  { to: "/", rotulo: "Visão Executiva", icone: LayoutDashboard },
  { to: "/fluxo-semanal", rotulo: "Fluxo Semanal", icone: CalendarRange },
  { to: "/movimentacoes", rotulo: "Movimentações", icone: ListOrdered },
  { to: "/disponibilidades", rotulo: "Disponibilidades", icone: Landmark },
  { to: "/receitas", rotulo: "Receitas Projetadas", icone: TrendingUp },
  { to: "/pagamentos", rotulo: "Pagamentos", icone: Receipt },
  { to: "/dividas", rotulo: "Dívidas e Operações", icone: Banknote },
  { to: "/importacoes", rotulo: "Importações", icone: Upload },
  { to: "/conciliacao", rotulo: "Conciliação e Pendências", icone: ShieldCheck },
  { to: "/cenarios", rotulo: "Cenários", icone: GitCompare },
  { to: "/versoes", rotulo: "Histórico de Versões", icone: History },
  { to: "/cadastros", rotulo: "Cadastros e Regras", icone: Settings2 },
] as const;

const PERFIL_LABEL: Record<string, string> = {
  admin: "Administrador",
  financeiro: "Financeiro",
  diretoria: "Diretoria",
};

export function AppLayout({ children }: { children: ReactNode }) {
  const [recolhida, setRecolhida] = useState(false);
  const { nome, perfil, sair } = useAuth();
  const { filtros } = useFiltros();
  const { data: cenarios } = useCenarios();
  const rota = useRouterState({ select: (s) => s.location.pathname });
  const cenario = cenarios?.find((c) => c.id === filtros.cenarioId) ?? cenarios?.find((c) => c.oficial);

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "no-print sticky top-0 flex h-screen shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-all duration-200",
          recolhida ? "w-16" : "w-64",
        )}
      >
        <div className="flex items-center gap-3 border-b border-sidebar-border px-4 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
            OL
          </div>
          {!recolhida && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Fluxo de Caixa</p>
              <p className="truncate text-xs text-sidebar-foreground/70">Grupo Otávio Lage</p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
          {NAV.map((item) => {
            const ativo = item.to === "/" ? rota === "/" : rota.startsWith(item.to);
            const Icone = item.icone;
            return (
              <Link
                key={item.to}
                to={item.to}
                title={item.rotulo}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  ativo
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
                )}
              >
                <Icone className="h-4 w-4 shrink-0" />
                {!recolhida && <span className="truncate">{item.rotulo}</span>}
              </Link>
            );
          })}
          <Link
            to="/modo-diretoria"
            className="mt-3 flex items-center gap-3 rounded-md border border-sidebar-border px-3 py-2 text-sm text-sidebar-foreground/90 hover:bg-sidebar-accent/60"
          >
            <Presentation className="h-4 w-4 shrink-0" />
            {!recolhida && <span>Modo Diretoria</span>}
          </Link>
        </nav>

        <div className="border-t border-sidebar-border p-2">
          <button
            onClick={() => setRecolhida((v) => !v)}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", recolhida && "rotate-180")} />
            {!recolhida && <span>Recolher menu</span>}
          </button>
          <button
            onClick={() => void sair()}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
          >
            <LogOut className="h-4 w-4" />
            {!recolhida && <span>Sair</span>}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3">
            <div>
              <h1 className="text-base font-semibold text-foreground">
                Fluxo de Caixa Semanal — Grupo Otávio Lage
              </h1>
              <p className="text-xs text-muted-foreground">
                Data-base {dataBR(filtros.dataBase)} · Horizonte {filtros.horizonte} semanas · Cenário{" "}
                {cenario?.nome ?? "Base"} · Atualizado em {dataHoraBR(new Date())}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-warning text-warning">
                Dados de demonstração
              </Badge>
              <div className="text-right">
                <p className="text-sm font-medium">{nome || "Usuário"}</p>
                <p className="text-xs text-muted-foreground">
                  {perfil ? PERFIL_LABEL[perfil] : "Sem perfil"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => void sair()} className="no-print">
                Sair
              </Button>
            </div>
          </div>
        </header>
        <main className="min-w-0 flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
