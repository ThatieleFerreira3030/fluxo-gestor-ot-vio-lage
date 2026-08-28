import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresas } from "@/lib/dados";
import { dataBR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/cadastros")({
  head: () => ({
    meta: [
      { title: "Cadastros | Grupo Otávio Lage" },
      {
        name: "description",
        content: "Empresas, categorias gerenciais e regras de classificação automática do fluxo.",
      },
      { property: "og:title", content: "Cadastros | Grupo Otávio Lage" },
      { property: "og:description", content: "Estrutura base do fluxo de caixa semanal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Cadastros,
});

function Cadastros() {
  const { data: empresas } = useEmpresas();

  const categorias = useQuery({
    queryKey: ["categorias"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categorias").select("*").order("grupo").order("ordem");
      if (error) throw error;
      return data ?? [];
    },
  });

  const regras = useQuery({
    queryKey: ["regras_classificacao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("regras_classificacao")
        .select("*")
        .order("prioridade");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div>
      <h1 className="text-lg font-semibold">Cadastros</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Estrutura utilizada pelo fluxo: empresas do grupo, categorias gerenciais e regras de
        classificação automática das importações.
      </p>

      <Tabs defaultValue="empresas">
        <TabsList>
          <TabsTrigger value="empresas">Empresas</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="regras">Regras de classificação</TabsTrigger>
        </TabsList>

        <TabsContent value="empresas">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Empresas do grupo</CardTitle>
              <CardDescription>{(empresas ?? []).length} empresas cadastradas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr className="text-left">
                      <th className="p-2 font-medium">Nome</th>
                      <th className="p-2 font-medium">Apelido</th>
                      <th className="p-2 font-medium">Grupo</th>
                      <th className="p-2 font-medium">CNPJ</th>
                      <th className="p-2 font-medium">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(empresas ?? []).map((e) => (
                      <tr key={e.id} className="border-t">
                        <td className="p-2 font-medium">{e.nome}</td>
                        <td className="p-2">{e.apelido ?? "—"}</td>
                        <td className="p-2">{e.grupo ?? "—"}</td>
                        <td className="p-2 text-xs text-muted-foreground">{e.cnpj ?? "—"}</td>
                        <td className="p-2">
                          <Badge variant="outline" className={e.ativa ? "border-success text-success" : ""}>
                            {e.ativa ? "Ativa" : "Inativa"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categorias">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Categorias gerenciais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr className="text-left">
                      <th className="p-2 font-medium">Grupo</th>
                      <th className="p-2 font-medium">Categoria</th>
                      <th className="p-2 font-medium">Subcategoria</th>
                      <th className="p-2 font-medium">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(categorias.data ?? []).map((c) => (
                      <tr key={c.id} className="border-t">
                        <td className="p-2 capitalize">{c.grupo}</td>
                        <td className="p-2 font-medium">{c.nome}</td>
                        <td className="p-2">{c.subcategoria ?? "—"}</td>
                        <td className="p-2">{c.ativa ? "Ativa" : "Inativa"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regras">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Regras de classificação automática</CardTitle>
              <CardDescription>Aplicadas às importações para o de/para gerencial</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr className="text-left">
                      <th className="p-2 font-medium">Campo</th>
                      <th className="p-2 font-medium">Condição</th>
                      <th className="p-2 font-medium">Valor</th>
                      <th className="p-2 font-medium">Categoria destino</th>
                      <th className="p-2 font-medium">Prioridade</th>
                      <th className="p-2 font-medium">Vigência</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(regras.data ?? []).map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="p-2">{r.campo}</td>
                        <td className="p-2">{r.condicao}</td>
                        <td className="p-2">{r.valor}</td>
                        <td className="p-2 font-medium">{r.categoria_destino}</td>
                        <td className="p-2">{r.prioridade}</td>
                        <td className="p-2 text-xs text-muted-foreground">
                          {r.vigencia_inicio ? dataBR(r.vigencia_inicio) : "—"}
                        </td>
                      </tr>
                    ))}
                    {!(regras.data ?? []).length && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-muted-foreground">
                          Nenhuma regra cadastrada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
