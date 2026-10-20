import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Msg = { role: "user" | "assistant"; content: string };

const INSTRUCOES = `Você é o assistente de endividamento do Grupo Otávio Lage, para a equipe Financeira.
Responda SEMPRE em português do Brasil, de forma objetiva, usando apenas os dados fornecidos no bloco DADOS.
- Valores em reais no formato R$ 1.234.567,89; datas no formato DD/MM/AAAA.
- Destaque com **negrito** vencimentos próximos (próximos 90 dias) e exposições relevantes (credores, empresas ou contratos com maior concentração de saldo ou de pagamentos).
- Quando fizer somas, mostre o critério usado. Use listas ou tabelas markdown curtas quando ajudar.
- Se a informação não estiver nos dados, diga claramente que não consta na base cadastrada. Nunca invente números.`;

export const perguntarDividas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { mensagens: Msg[] }) => {
    const mensagens = (input?.mensagens ?? [])
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
    if (!mensagens.length || mensagens[mensagens.length - 1].role !== "user")
      throw new Error("Envie uma pergunta.");
    return { mensagens };
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const hoje = new Date().toISOString().slice(0, 10);
    const [emp, pos, contr, parc, resumo, crono] = await Promise.all([
      sb.from("empresas").select("id,nome"),
      sb
        .from("posicoes_dividas")
        .select(
          "credor,empresa_id,tipo,modalidade,numero_contrato,indexador,taxa,vencimento,parcelas_restantes,curto_prazo,longo_prazo,outras_safras,saldo_contabil_aproximado,data_base",
        )
        .order("saldo_contabil_aproximado", { ascending: false })
        .limit(300),
      sb
        .from("contratos_financeiros")
        .select("id,instituicao,numero_contrato,empresa_id,tipo_operacao,indexador,taxa,saldo_devedor,data_vencimento,status")
        .eq("demo", false)
        .limit(300),
      sb
        .from("parcelas_divida")
        .select("contrato_id,vencimento,principal,juros")
        .gte("vencimento", hoje)
        .order("vencimento")
        .limit(600),
      sb.from("resumos_endividamento").select("*").limit(50),
      sb.from("cronograma_endividamento").select("periodo,valor,data_base,ordem").order("ordem").limit(100),
    ]);
    const nomes = new Map((emp.data ?? []).map((e) => [e.id, e.nome]));
    const nomeEmp = (id: string | null) => (id ? (nomes.get(id) ?? "") : "");
    const contratos = new Map((contr.data ?? []).map((c) => [c.id, c]));

    const linhas = (cab: string, rows: (string | number | null)[][]) =>
      [cab, ...rows.map((r) => r.map((v) => (v ?? "")).join(" | "))].join("\n");

    const dados = [
      `Data de hoje: ${hoje}`,
      "## POSIÇÕES DE DÍVIDAS",
      linhas(
        "credor | empresa | tipo | modalidade | contrato | indexador | taxa | vencimento | parcelas restantes | curto prazo | longo prazo | outras safras | saldo contábil | data-base",
        (pos.data ?? []).map((p) => [p.credor, nomeEmp(p.empresa_id), p.tipo, p.modalidade, p.numero_contrato, p.indexador, p.taxa, p.vencimento, p.parcelas_restantes, p.curto_prazo, p.longo_prazo, p.outras_safras, p.saldo_contabil_aproximado, p.data_base]),
      ),
      "## CONTRATOS",
      linhas(
        "instituição | contrato | empresa | operação | indexador | taxa | saldo devedor | vencimento final | status",
        (contr.data ?? []).map((c) => [c.instituicao, c.numero_contrato, nomeEmp(c.empresa_id), c.tipo_operacao, c.indexador, c.taxa, c.saldo_devedor, c.data_vencimento, c.status]),
      ),
      "## CRONOGRAMA DE PARCELAS FUTURAS (cronograma cronológico)",
      linhas(
        "vencimento | instituição | contrato | empresa | principal | juros | total",
        (parc.data ?? []).map((p) => {
          const c = contratos.get(p.contrato_id);
          return [p.vencimento, c?.instituicao ?? "", c?.numero_contrato ?? "", nomeEmp(c?.empresa_id ?? null), p.principal, p.juros, Number(p.principal) + Number(p.juros)];
        }),
      ),
      "## RESUMO DO ENDIVIDAMENTO",
      JSON.stringify(resumo.data ?? []),
      "## CRONOGRAMA POR PERÍODO",
      linhas("período | valor | data-base", (crono.data ?? []).map((c) => [c.periodo, c.valor, c.data_base])),
    ].join("\n\n");

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Assistente indisponível: chave de IA não configurada.");

    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText } = await import("ai");
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    let erro: unknown = null;
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      instructions: `${INSTRUCOES}\n\nDADOS:\n${dados}`,
      messages: data.mensagens,
      maxRetries: 0,
      onError: ({ error }) => {
        erro = error;
      },
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    const texto = await result.text;
    if (erro || !texto) {
      const status = (erro as { statusCode?: number } | null)?.statusCode;
      console.error("assistente-dividas", erro);
      if (status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos em Configurações → Planos e créditos.");
      if (status === 429) throw new Error("Muitas perguntas em sequência. Aguarde alguns instantes e tente de novo.");
      throw new Error("Não foi possível obter a resposta do assistente agora.");
    }
    return { resposta: texto };
  });
