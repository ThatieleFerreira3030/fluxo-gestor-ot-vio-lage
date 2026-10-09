type EmpresaIdentificavel = {
  id: string;
  nome: string;
  apelido?: string | null;
};

const EMPRESAS_OFICIAIS = [
  { nome: "Vera Cruz Agropecuária", aliases: ["Vera Cruz Agropecuaria Ltda"] },
  { nome: "OL Látex", aliases: ["OL Latex Ltda"] },
  { nome: "OL Látex Tocantins", aliases: ["OL Latex Tocantins Ltda"] },
  {
    nome: "Palmeiras Empreendimentos Imobiliários",
    aliases: ["Palmeiras Empreendimentos Imobiliarios Ltda"],
  },
  { nome: "Planagri", aliases: ["Planagri Agropecuaria Ltda", "Planagri Ltda"] },
  { nome: "Goiás Carne/Cooperboi", aliases: ["Goias Carne", "Cooperboi"] },
  { nome: "RVC", aliases: ["RVC Ltda"] },
  { nome: "Parque das Estrelas", aliases: ["Parque das Estrelas Ltda"] },
  { nome: "Serra Bonita", aliases: ["Serra Bonita Ltda"] },
  { nome: "Solo Verde", aliases: ["Solo Verde Ltda"] },
] as const;

const chaveBasica = (valor: string) =>
  valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/&/g, " E ")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\b(SOCIEDADE ANONIMA|LIMITADA|EIRELI|SPE|S A|SA|LTDA|ME|EPP)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const aliases = new Map<string, string>();
for (const empresa of EMPRESAS_OFICIAIS) {
  const chaveOficial = chaveBasica(empresa.nome);
  aliases.set(chaveOficial, chaveOficial);
  empresa.aliases.forEach((alias) => aliases.set(chaveBasica(alias), chaveOficial));
}

const nomesOficiais = new Map(
  EMPRESAS_OFICIAIS.map((empresa) => [chaveBasica(empresa.nome), empresa.nome]),
);

/** Chave única para comparar razão social, nome fantasia e abreviações conhecidas. */
export const chaveEmpresa = (valor: string) => {
  const chave = chaveBasica(valor);
  return aliases.get(chave) ?? chave;
};

/** Nome curto padronizado usado ao cadastrar uma empresa conhecida. */
export const nomeOficialEmpresa = (valor: string) =>
  nomesOficiais.get(chaveEmpresa(valor)) ?? valor.trim();

/** Localiza uma empresa mesmo quando a planilha usa sua razão social ou outra grafia. */
export const encontrarEmpresa = <T extends EmpresaIdentificavel>(empresas: T[], nome: string) => {
  const chave = chaveEmpresa(nome);
  return empresas.find(
    (empresa) =>
      chaveEmpresa(empresa.nome) === chave ||
      (!!empresa.apelido && chaveEmpresa(empresa.apelido) === chave),
  );
};

/** Agrupa cadastros duplicados para exibir uma única opção nos filtros. */
export const agruparEmpresas = <T extends EmpresaIdentificavel>(empresas: T[]) => {
  const grupos = new Map<string, { chave: string; nome: string; ids: string[] }>();

  for (const empresa of empresas) {
    const chave = chaveEmpresa(empresa.nome);
    const grupo = grupos.get(chave);
    if (grupo) {
      grupo.ids.push(empresa.id);
    } else {
      grupos.set(chave, {
        chave,
        nome: nomeOficialEmpresa(empresa.nome),
        ids: [empresa.id],
      });
    }
  }

  return [...grupos.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
};
