import { Check, ChevronsUpDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { HORIZONTES, STATUS_LABEL } from "@/lib/constants";
import { useCenarios, useEmpresas, useFiltros } from "@/lib/dados";
import { addDias, dataBR, toDate } from "@/lib/format";
import { cn } from "@/lib/utils";

function FiltroEmpresas() {
  const { filtros, setFiltros } = useFiltros();
  const { data: empresas } = useEmpresas();
  const lista = empresas ?? [];
  const selecionadas = new Set(filtros.empresaIds);

  const alternar = (id: string) => {
    const novas = selecionadas.has(id)
      ? filtros.empresaIds.filter((v) => v !== id)
      : [...filtros.empresaIds, id];
    setFiltros({ empresaIds: novas });
  };

  const rotulo =
    filtros.empresaIds.length === 0
      ? "Todas as empresas"
      : filtros.empresaIds.length === 1
        ? (lista.find((e) => e.id === filtros.empresaIds[0])?.nome ?? "1 empresa")
        : `${filtros.empresaIds.length} empresas selecionadas`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          <span className="truncate">{rotulo}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar empresa…" />
          <CommandList>
            <CommandEmpty>Nenhuma empresa encontrada.</CommandEmpty>
            <CommandGroup>
              <CommandItem onSelect={() => setFiltros({ empresaIds: [] })}>
                <Check
                  className={cn(
                    "h-4 w-4",
                    filtros.empresaIds.length === 0 ? "opacity-100" : "opacity-0",
                  )}
                />
                Todas as empresas
              </CommandItem>
              {lista.map((e) => (
                <CommandItem key={e.id} value={e.nome} onSelect={() => alternar(e.id)}>
                  <Check
                    className={cn("h-4 w-4", selecionadas.has(e.id) ? "opacity-100" : "opacity-0")}
                  />
                  {e.nome}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function FiltrosBar() {
  const { filtros, setFiltros } = useFiltros();
  const { data: empresas } = useEmpresas();
  const { data: cenarios } = useCenarios();
  const grupos = [...new Set((empresas ?? []).map((e) => e.grupo).filter(Boolean))] as string[];
  const fim = addDias(toDate(filtros.dataBase), filtros.horizonte * 7 - 1);
  const empresasSelecionadas = (empresas ?? []).filter((e) => filtros.empresaIds.includes(e.id));

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
          <Label className="text-xs text-muted-foreground">Empresas</Label>
          <FiltroEmpresas />
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
      {empresasSelecionadas.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {empresasSelecionadas.map((e) => (
            <Badge
              key={e.id}
              variant="secondary"
              className="cursor-pointer gap-1"
              onClick={() =>
                setFiltros({ empresaIds: filtros.empresaIds.filter((id) => id !== e.id) })
              }
            >
              {e.nome} ×
            </Badge>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Período projetado: {dataBR(filtros.dataBase)} a {dataBR(fim)}
      </p>
    </Card>
  );
}
