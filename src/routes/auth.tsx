import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acesso | Fluxo de Caixa Semanal – Grupo Otávio Lage" },
      {
        name: "description",
        content:
          "Área restrita da plataforma de fluxo de caixa semanal do Grupo Otávio Lage: financeiro e diretoria.",
      },
      { property: "og:title", content: "Acesso | Fluxo de Caixa Semanal – Grupo Otávio Lage" },
      {
        property: "og:description",
        content: "Entre na plataforma de projeção semanal de caixa do Grupo Otávio Lage.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/" });
    });
  }, [navigate]);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setCarregando(false);
    if (error) {
      toast.error("Não foi possível entrar: " + error.message);
      return;
    }
    void navigate({ to: "/" });
  };

  const cadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome }, emailRedirectTo: window.location.origin },
    });
    setCarregando(false);
    if (error) {
      toast.error("Não foi possível cadastrar: " + error.message);
      return;
    }
    toast.success("Cadastro realizado. Você já pode acessar a plataforma.");
    void navigate({ to: "/" });
  };

  const google = async () => {
    const { lovable } = await import("@/integrations/lovable/index");
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Falha no acesso com Google.");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary/95 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-primary-foreground">
          <p className="text-sm uppercase tracking-widest opacity-80">Grupo Otávio Lage</p>
          <h1 className="mt-1 text-2xl font-semibold">Fluxo de Caixa Semanal</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Acesso restrito</CardTitle>
            <CardDescription>Financeiro e Diretoria</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="entrar">
              <TabsList className="mb-4 grid w-full grid-cols-2">
                <TabsTrigger value="entrar">Entrar</TabsTrigger>
                <TabsTrigger value="criar">Criar conta</TabsTrigger>
              </TabsList>
              <TabsContent value="entrar">
                <form onSubmit={entrar} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" value={email} required onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="senha">Senha</Label>
                    <Input id="senha" type="password" value={senha} required onChange={(e) => setSenha(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={carregando}>
                    Entrar
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="criar">
                <form onSubmit={cadastrar} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome</Label>
                    <Input id="nome" value={nome} required onChange={(e) => setNome(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email2">E-mail corporativo</Label>
                    <Input id="email2" type="email" value={email} required onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="senha2">Senha</Label>
                    <Input
                      id="senha2"
                      type="password"
                      value={senha}
                      required
                      minLength={6}
                      onChange={(e) => setSenha(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={carregando}>
                    Criar conta
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            <Button variant="outline" className="mt-4 w-full" onClick={() => void google()}>
              Entrar com Google
            </Button>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              O primeiro usuário cadastrado recebe o perfil Administrador.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
