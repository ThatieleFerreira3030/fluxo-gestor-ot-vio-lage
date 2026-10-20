import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { perguntarDividas } from "@/lib/assistente-dividas.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/assistente-dividas")({
  head: () => ({
    meta: [
      { title: "Assistente de Dívidas — Fluxo de Caixa Grupo Otávio Lage" },
      { name: "description", content: "Perguntas em linguagem natural sobre posições e cronogramas de dívidas." },
      { property: "og:title", content: "Assistente de Dívidas — Grupo Otávio Lage" },
      { property: "og:description", content: "Consulte vencimentos e exposições de dívidas com IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Assistente,
});

type Msg = { role: "user" | "assistant"; content: string };

const SUGESTOES = [
  "Quais parcelas vencem nos próximos 90 dias?",
  "Qual credor concentra o maior saldo devedor?",
  "Quanto vence de dívida por empresa nos próximos 6 meses?",
  "Qual o total de curto e longo prazo?",
];

function formatar(texto: string) {
  return texto.split("\n").map((linha, i) => {
    const partes = linha.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith("**") && p.endsWith("**") ? (
        <strong key={j} className="text-primary">{p.slice(2, -2)}</strong>
      ) : (
        <span key={j}>{p}</span>
      ),
    );
    return <p key={i} className="min-h-[0.5rem] whitespace-pre-wrap">{partes}</p>;
  });
}

function Assistente() {
  const perguntar = useServerFn(perguntarDividas);
  const [mensagens, setMensagens] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const fim = useRef<HTMLDivElement>(null);

  async function enviar(pergunta: string) {
    const q = pergunta.trim();
    if (!q || carregando) return;
    const nova = [...mensagens, { role: "user" as const, content: q }];
    setMensagens(nova);
    setTexto("");
    setErro("");
    setCarregando(true);
    try {
      const r = await perguntar({ data: { mensagens: nova } });
      setMensagens([...nova, { role: "assistant", content: r.resposta }]);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível obter a resposta.");
    } finally {
      setCarregando(false);
      setTimeout(() => fim.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold text-primary">
          <Sparkles className="h-5 w-5" /> Assistente de Dívidas
        </h2>
        <p className="text-sm text-muted-foreground">
          Pergunte sobre posições, contratos e cronogramas de dívidas. As respostas usam apenas os dados cadastrados.
        </p>
      </div>

      <div className="min-h-[300px] space-y-3 rounded-lg border bg-card p-4">
        {mensagens.length === 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {SUGESTOES.map((s) => (
              <button
                key={s}
                onClick={() => void enviar(s)}
                className="rounded-md border px-3 py-2 text-left text-sm hover:bg-accent"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {mensagens.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                : "max-w-[95%] space-y-1 rounded-lg bg-muted px-3 py-2 text-sm"
            }
          >
            {m.role === "user" ? m.content : formatar(m.content)}
          </div>
        ))}
        {carregando && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Analisando os dados de dívidas…
          </div>
        )}
        {erro && <p className="rounded-md border border-destructive/40 p-2 text-sm text-destructive">{erro}</p>}
        <div ref={fim} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void enviar(texto);
        }}
        className="flex gap-2"
      >
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void enviar(texto);
            }
          }}
          placeholder="Ex.: Quais são os maiores vencimentos de novembro?"
          className="min-h-[44px] flex-1"
        />
        <Button type="submit" disabled={carregando || !texto.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
