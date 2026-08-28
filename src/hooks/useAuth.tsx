import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Perfil = "admin" | "financeiro" | "diretoria";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  perfil: Perfil | null;
  nome: string;
  carregando: boolean;
  podeEditar: boolean;
  sair: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  perfil: null,
  nome: "",
  carregando: true,
  podeEditar: false,
  sair: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [nome, setNome] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) {
        setPerfil(null);
        setNome("");
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCarregando(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const uid = session?.user.id;
    if (!uid) return;
    let ativo = true;
    (async () => {
      const [{ data: roles }, { data: prof }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid),
        supabase.from("profiles").select("nome").eq("id", uid).maybeSingle(),
      ]);
      if (!ativo) return;
      const lista = (roles ?? []).map((r) => r.role as Perfil);
      setPerfil(
        lista.includes("admin")
          ? "admin"
          : lista.includes("financeiro")
            ? "financeiro"
            : lista.includes("diretoria")
              ? "diretoria"
              : null,
      );
      setNome(prof?.nome ?? session.user.email ?? "");
    })();
    return () => {
      ativo = false;
    };
  }, [session]);

  return (
    <Ctx.Provider
      value={{
        user: session?.user ?? null,
        session,
        perfil,
        nome,
        carregando,
        podeEditar: perfil === "admin" || perfil === "financeiro",
        sair: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
