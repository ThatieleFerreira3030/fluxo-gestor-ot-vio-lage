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
import { HORIZONTES } from "@/lib/constants";
import { useCenarios, useEmpresas, useFiltros } from "@/lib/dados";
import { agruparEmpresas } from "@/lib/empresas";
import { dataBR, inicioSemana } from "@/lib/format";
import { montarSemanas } from "@/lib/fluxo";
import { cn } from "@/lib/utils";

function FiltroEmpresas() {
  const { filtros, setFiltros } = useFiltros();
  const { data: empresas } = useEmpresas();
  const lista = agruparEmpresas(empresas ?? []);
  const selecionadas = new Set(filtros.empresaIds);

  const alternar = (ids: string[]) => {
    const grupoSelecionado = ids.every((id) => selecionadas.has(id));
    const idsDoGrupo = new Set(ids);
    const semGrupo = filtros.empresaIds.filter((id) => !idsDoGrupo.has(id));
    const novas = grupoSelecionado ? semGrupo : [...semGrupo, ...ids];
    setFiltros({ empresaIds: novas });
  };

  const gruposSelecionados = lista.filter((grupo) => grupo.ids.some((id) => selecionadas.has(id)));

  const rotulo =
    filtros.empresaIds.length === 0
      ? "Todas as empresas"
      : gruposSelecionados.length === 1
        ? gruposSelecionados[0]!.nome
        : `${gruposSelecionados.length} empresas selecionadas`;

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
              {lista.map((e) => {
                const grupoSelecionado = e.ids.every((id) => selecionadas.has(id));
                return (
                  <CommandItem key={e.chave} value={e.nome} onSelect={() => alternar(e.ids)}>
                    <Check
                      className={cn("h-4 w-4", grupoSelecionado ? "opacity-100" : "opacity-0")}
                    />
                    {e.nome}
                  </CommandItem>
                );
              })}
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
  const semanas = montarSemanas(filtros.dataBase, filtros.horizonte);
  const primeiraSemana = semanas[0];
  const fim = semanas.at(-1)?.fim;
  const empresasAgrupadas = agruparEmpresas(empresas ?? []);
  const empresasSelecionadas = empresasAgrupadas.filter((empresa) =>
    empresa.ids.some((id) => filtros.empresaIds.includes(id)),
  );

  return (
    <Card className="no-print mb-6 gap-0 p-4 shadow-panel">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
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
                  {h >= 52 ? ` (~${Math.round((h / 52) * 10) / 10} ano${h >= 104 ? "s" : ""})` : ""}
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
      </div>
      {empresasSelecionadas.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {empresasSelecionadas.map((e) => (
            <Badge
              key={e.chave}
              variant="secondary"
              className="cursor-pointer gap-1"
              onClick={() =>
                setFiltros({
                  empresaIds: filtros.empresaIds.filter((id) => !e.ids.includes(id)),
                })
              }
            >
              {e.nome} ×
            </Badge>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Fechamento da data-base: {dataBR(inicioSemana(filtros.dataBase))} a{" "}
        {dataBR(filtros.dataBase)}
        {" · "}primeira projeção: {dataBR(primeiraSemana?.inicio)} a {dataBR(primeiraSemana?.fim)}
        {" · "}depois, semanas de sexta a quinta até {dataBR(fim)}
      </p>
    </Card>
  );
}
