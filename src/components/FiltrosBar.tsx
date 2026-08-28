import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HORIZONTES, STATUS_LABEL } from "@/lib/constants";
import { useCenarios, useEmpresas, useFiltros } from "@/lib/dados";
import { addDias, dataBR, toDate } from "@/lib/format";

export function FiltrosBar() {
  const { filtros, setFiltros } = useFiltros();
  const { data: empresas } = useEmpresas();
  const { data: cenarios } = useCenarios();
  const grupos = [...new Set((empresas ?? []).map((e) => e.grupo).filter(Boolean))] as string[];
  const fim = addDias(toDate(filtros.dataBase), filtros.horizonte * 7 - 1);

  return (
    <Card className="no-print mb-6 gap-0 p-4 shadow-panel">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Data-base</Label>
          <Input
            type="date"
            value={filtros.dataBase}
            onChange={(e) => setFiltros({ dataBase: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Horizonte</Label>
          <Select
            value={String(filtros.horizonte)}
            onValueChange={(v) => setFiltros({ horizonte: Number(v) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HORIZONTES.map((h) => (
                <SelectItem key={h} value={String(h)}>
                  {h} semanas
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Empresa</Label>
          <Select value={filtros.empresaId} onValueChange={(v) => setFiltros({ empresaId: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as empresas</SelectItem>
              {(empresas ?? []).map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Grupo de empresas</Label>
          <Select value={filtros.grupo} onValueChange={(v) => setFiltros({ grupo: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os grupos</SelectItem>
              {grupos.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Cenário</Label>
          <Select
            value={filtros.cenarioId || (cenarios?.find((c) => c.oficial)?.id ?? "")}
            onValueChange={(v) => setFiltros({ cenarioId: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Base" />
            </SelectTrigger>
            <SelectContent>
              {(cenarios ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Status da informação</Label>
          <Select value={filtros.status} onValueChange={(v) => setFiltros({ status: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Período projetado: {dataBR(filtros.dataBase)} a {dataBR(fim)}
      </p>
    </Card>
  );
}
