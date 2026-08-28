# Fluxo Gestor Otávio Lage

Crie uma plataforma web responsiva e interativa chamada “Fluxo de Caixa Semanal – Grupo Otávio Lage”, destinada ao setor Financeiro e à Diretoria.

O objetivo é substituir uma apresentação de fluxo de caixa atualmente montada manualmente no Excel. A plataforma deverá importar informações de diferentes fontes, consolidar receitas, pagamentos, disponibilidades e compromissos financeiros, e gerar automaticamente uma projeção semanal de caixa.

Utilize React, TypeScript, Tailwind CSS, Supabase e uma biblioteca confiável para leitura de arquivos Excel e CSV, como SheetJS. Toda a interface deve estar em português do Brasil, com datas no formato DD/MM/AAAA e valores no formato monetário brasileiro.

A plataforma não deve ser apenas um painel visual. Ela também deve funcionar como ferramenta de preparação, conferência, ajuste e apresentação do fluxo de caixa.

ESTILO VISUAL

Crie um design corporativo, elegante, limpo e executivo, apropriado para apresentação à diretoria.

Utilize:

Fundo predominantemente branco ou cinza muito claro;

Azul-marinho como cor principal;

Verde para entradas e situações favoráveis;

Vermelho para saídas, déficits e alertas;

Amarelo ou laranja para pendências, estimativas e valores ainda não confirmados;

Cards com cantos discretamente arredondados;

Gráficos modernos e sem excesso de elementos;

Tipografia clara e profissional;

Navegação lateral recolhível;

Cabeçalho com período selecionado, cenário, data da última atualização e responsável.

PERFIS DE ACESSO

Criar inicialmente três perfis:

Administrador:

Gerencia usuários, empresas, categorias e regras;

Pode importar, editar, excluir e aprovar informações;

Pode fechar e reabrir versões do fluxo.

Financeiro:

Importa bases;

Faz ajustes e classificações;

Confirma valores;

Inclui previsões e observações;

Gera novas versões do fluxo.

Diretoria:

Acesso somente para consulta;

Visualiza dashboards, detalhamentos, cenários e relatórios;

Não altera valores.

EMPRESAS INICIAIS

Cadastrar inicialmente:

Vera Cruz Agropecuária;

OL Látex;

OL Látex Tocantins;

Palmeiras Empreendimentos Imobiliários;

Planagri;

Goiás Carne/Cooperboi;

RVC;

Parque das Estrelas;

Serra Bonita;

Solo Verde.

Permitir cadastrar, editar, inativar e agrupar empresas.

ESTRUTURA PRINCIPAL

Criar as seguintes páginas no menu lateral:

Visão Executiva;

Fluxo Semanal;

Movimentações;

Disponibilidades;

Receitas Projetadas;

Pagamentos;

Dívidas e Operações Financeiras;

Importações;

Conciliação e Pendências;

Cenários;

Histórico de Versões;

Cadastros e Regras.

VISÃO EXECUTIVA

Criar uma página inicial preparada para apresentação à diretoria.

No topo, mostrar filtros para:

Data-base;

Período inicial e final;

Horizonte da projeção: 4, 8, 13, 26 ou 52 semanas;

Empresa;

Grupo de empresas;

Cenário;

Status da informação;

Versão do fluxo.

Exibir cards com:

Saldo disponível inicial;

Total de contas bancárias;

Total de aplicações;

Entradas projetadas;

Saídas projetadas;

Amortizações de dívidas;

Geração ou consumo líquido de caixa;

Saldo final projetado;

Menor saldo projetado;

Semana de menor saldo;

Necessidade máxima de caixa;

Aplicações com liquidez disponível;

Valores ainda não confirmados.

Criar um gráfico principal de linha ou área com a evolução semanal de:

Saldo inicial;

Entradas;

Saídas;

Saldo final.

Criar também:

Gráfico de barras comparando entradas e saídas por semana;

Gráfico de composição das receitas;

Gráfico de composição dos pagamentos;

Gráfico ou tabela com os maiores compromissos do período;

Indicador da semana mais crítica;

Indicador da concentração de pagamentos;

Alertas para semanas com saldo abaixo do mínimo de caixa definido.

Todos os elementos devem ser interativos. Ao clicar em um valor ou gráfico, abrir o detalhamento das movimentações que compõem aquele número.

FLUXO SEMANAL

Criar uma tabela dinâmica semelhante à lógica da planilha atual, mas com navegação mais simples.

As colunas devem representar as semanas e as linhas devem representar as categorias.

Estrutura inicial:

Saldo inicial do disponível

Disponibilidades:

Contas bancárias;

Aplicações financeiras.

Entradas:

Abate de bovinos;

Soja;

Cana;

Milho;

Cliente Touro;

Cliente Palmeiras;

Látex;

StoneX;

Remuneração de aval;

Outros recebimentos;

Operações de crédito.

Pagamentos operacionais:

Compra de bovinos;

Folha salarial;

PPR e bônus executivo;

Impostos;

Parcelamentos;

Compra de ações;

Dividendos aos sócios;

StoneX;

Despesas gerais.

Amortizações e operações financeiras:

Bradesco;

Safra;

Sicredi;

Unicentro;

Banco da Amazônia;

Banco Inter;

Banco do Brasil;

Banco Votorantim;

CCB;

ABC Brasil;

XP Investimentos;

Swap XP;

EcoAgro CRA 2021;

EcoAgro CRA 2024;

EcoAgro CRA 2026;

BTG;

Agrolend;

Outros.

Resultados:

Disponibilidade antes dos pagamentos;

Receitas totais;

Pagamentos operacionais totais;

Amortizações totais;

Saídas totais;

Geração ou consumo líquido da semana;

Saldo final projetado.

Permitir:

Expandir e recolher grupos;

Visualizar o detalhamento de cada categoria;

Editar valores autorizados;

Adicionar comentários;

Marcar valores como confirmado, estimado ou pendente;

Fixar a primeira coluna;

Rolagem horizontal;

Exportar para Excel e PDF;

Alternar entre visão consolidada e visão por empresa;

Comparar versões;

Comparar cenário base, conservador e otimista.

REGRAS DE CÁLCULO

Para cada semana:

Saldo inicial da semana = saldo final da semana anterior.

Disponibilidade antes dos pagamentos = saldo inicial + entradas.

Saídas totais = pagamentos operacionais + amortizações e operações financeiras.

Geração ou consumo líquido = entradas - saídas totais.

Saldo final projetado = saldo inicial + entradas - saídas totais.

O saldo final de uma semana deve alimentar automaticamente o saldo inicial da semana seguinte.

A primeira semana utilizará como saldo inicial a soma das contas bancárias e aplicações financeiras consideradas disponíveis na data-base.

Não permitir fórmulas com referências quebradas. Toda alteração deverá recalcular automaticamente as semanas seguintes.

MOVIMENTAÇÕES

Criar uma base única de movimentações com os campos:

ID;

Empresa;

Filial;

Natureza: entrada ou saída;

Categoria;

Subcategoria;

Descrição;

Fornecedor ou cliente;

CPF/CNPJ;

Número do documento;

Tipo de documento;

Data de emissão;

Data de vencimento;

Data prevista de recebimento ou pagamento;

Data de baixa;

Valor original;

Valor líquido;

Valor baixado;

Saldo;

Banco ou conta;

Fonte da informação;

Data de importação;

Competência;

Semana de caixa;

Status financeiro;

Status da projeção;

Confirmado, estimado ou pendente;

Observação;

Responsável;

Versão do fluxo.

Disponibilizar filtros, pesquisa, ordenação, edição em lote e exportação.

DISPONIBILIDADES

Criar uma tela para registrar e importar saldos bancários e aplicações por empresa.

Campos:

Data-base;

Empresa;

Banco;

Agência;

Conta;

Tipo: conta corrente ou aplicação;

Produto;

Saldo;

Percentual do CDI;

Liquidez;

Data de vencimento;

Carência;

Disponível para resgate;

Valor bloqueado;

Observação;

Fonte;

Responsável pela atualização.

Mostrar:

Total por empresa;

Total por banco;

Total em conta corrente;

Total aplicado;

Valor com liquidez imediata;

Valor em carência;

Percentual de concentração por banco;

Data da última atualização.

RECEITAS PROJETADAS

Criar módulos para importação e lançamento de receitas.

Abate de bovinos:

Data do embarque;

Data do abate;

Data prevista de recebimento;

Categoria do animal;

Quantidade;

Peso estimado;

Mercado;

Destino;

Preço;

Faturamento projetado;

Faturamento realizado;

Status.

Cliente Touro:

Cliente;

Contrato;

Parcela;

Vencimento;

Valor;

Status.

Demais receitas:

Cana;

Soja;

Milho;

Látex;

Palmeiras;

Remuneração de aval;

Outros recebimentos;

Operações de crédito.

Toda receita deverá ser automaticamente direcionada para a semana correspondente à data prevista de recebimento.

PAGAMENTOS

Importar a base de contas a pagar do sistema financeiro.

A importação inicial poderá utilizar colunas semelhantes a:

Coligada;

Filial;

Natureza;

Status;

Data de emissão;

Data prevista de baixa;

Data de baixa;

Data de vencimento;

Número do documento;

Tipo de documento;

Valor líquido;

Valor original;

Fornecedor;

Plano financeiro;

Nome fantasia;

CPF/CNPJ;

Classificação contábil ou financeira;

Conta caixa;

Valor baixado.

Criar regras de classificação para transformar os planos financeiros e fornecedores nas categorias gerenciais do fluxo.

Exemplos:

Compra bovino → Compra de bovinos;

Tributos e guias → Impostos;

Folha e encargos → Folha salarial;

Fornecedores gerais → Despesas gerais;

Parcelamentos tributários → Parcelamentos;

Pagamentos a instituições financeiras → Dívidas e operações financeiras.

Criar uma tela de “Regras de classificação” na qual o usuário possa informar:

Campo analisado;

Condição;

Palavra-chave ou código;

Empresa;

Categoria de destino;

Subcategoria;

Prioridade da regra;

Data de vigência;

Status da regra.

Movimentações não classificadas devem ir para uma fila de pendências, nunca serem silenciosamente incluídas em “Outros”.

DÍVIDAS E OPERAÇÕES FINANCEIRAS

Criar um cadastro de contratos financeiros com:

Empresa;

Instituição financeira;

Tipo de operação;

Número do contrato;

Data de contratação;

Valor original;

Saldo devedor;

Indexador;

Taxa;

Data de vencimento;

Periodicidade;

Cronograma de principal;

Cronograma de juros;

Garantias;

Status;

Observações.

Gerar automaticamente o calendário de pagamentos futuros e direcionar cada parcela para a semana correta do fluxo.

Permitir cadastrar CRA, empréstimos bancários, financiamentos, swaps e demais operações.

IMPORTAÇÕES

Criar um assistente de importação em etapas:

Etapa 1: selecionar o tipo da fonte;
Etapa 2: enviar Excel ou CSV;
Etapa 3: selecionar a aba;
Etapa 4: mapear colunas;
Etapa 5: visualizar os dados;
Etapa 6: validar erros;
Etapa 7: confirmar a importação.

Fontes iniciais:

Contas a pagar;

Contas a receber;

Saldos bancários;

Aplicações;

Projeção de abate;

Impostos;

Dívidas;

Receitas manuais;

Planilha completa do fluxo anterior.

Na importação:

Não duplicar documentos já importados;

Identificar duplicidades;

Validar datas e valores;

Informar linhas rejeitadas;

Permitir corrigir o mapeamento;

Registrar nome do arquivo, data, usuário e quantidade de registros;

Manter o arquivo original vinculado à importação;

Permitir desfazer uma importação antes do fechamento da versão.

CONCILIAÇÃO E PENDÊNCIAS

Criar uma central de conferência com:

Movimentações sem categoria;

Documentos duplicados;

Valores sem empresa;

Datas inválidas;

Valores importados alterados manualmente;

Receitas vencidas e não recebidas;

Pagamentos vencidos e não baixados;

Saldos bancários não atualizados;

Contratos financeiros sem cronograma;

Semanas com saldo abaixo do limite mínimo;

Diferenças entre fonte e valor consolidado.

Apresentar no topo:

Status da versão: “Pronta”, “Com pendências” ou “Não conciliada”;

Quantidade de pendências críticas;

Quantidade de alertas;

Total financeiro afetado.

CENÁRIOS

Criar três cenários iniciais:

Base;

Conservador;

Otimista.

Permitir copiar um cenário existente e alterar:

Datas de recebimento;

Percentuais de realização das receitas;

Valores de abate;

Preço e volume;

Despesas gerais;

Compra de bovinos;

Novas operações de crédito;

Antecipações ou postergações de dívidas;

Saldo mínimo desejado.

Mostrar comparação entre cenários sem alterar o cenário oficial.

HISTÓRICO DE VERSÕES

Cada fechamento semanal deverá gerar uma versão imutável contendo:

Número da versão;

Data-base;

Período projetado;

Usuário responsável;

Data e hora;

Cenário;

Observações;

Valores consolidados;

Arquivos utilizados;

Ajustes manuais realizados;

Situação das pendências.

Permitir comparar duas versões e destacar:

Inclusões;

Exclusões;

Alterações de valor;

Mudanças de data;

Reclassificações;

Impacto no saldo final;

Impacto por semana e categoria.

AUDITORIA

Toda alteração manual deverá registrar:

Usuário;

Data e hora;

Valor anterior;

Valor novo;

Motivo;

Campo alterado;

Versão afetada.

Valores importados, calculados e ajustados manualmente devem ser visualmente identificáveis.

STATUS DAS INFORMAÇÕES

Utilizar:

Confirmado: informação validada e com fonte;

Estimado: projeção baseada em premissa;

Pendente: aguardando validação;

Realizado: já recebido ou pago;

Cancelado: não deve compor o fluxo.

Somente registros ativos e não cancelados devem compor o fluxo.

FUNCIONALIDADES DE APRESENTAÇÃO

Criar um “Modo Diretoria” em tela cheia, com:

Navegação simples entre semanas;

Cards ampliados;

Gráficos sem campos de edição;

Destaques automáticos;

Observações da semana;

Possibilidade de clicar nos números para consultar a composição;

Botão para gerar PDF executivo;

Botão para exportar a base detalhada em Excel.

No modo Diretoria, gerar automaticamente frases como:

“O menor saldo projetado ocorrerá na semana de XX/XX a XX/XX.”

“As amortizações financeiras representam X% das saídas do período.”

“A principal fonte de entrada é __________.”

“A maior concentração de pagamentos ocorrerá na semana __________.”

“O saldo final do cenário conservador é R$ ______ inferior ao cenário base.”

CONTROLES E VALIDAÇÕES

Criar verificações automáticas:

Saldo final da semana anterior igual ao saldo inicial da semana seguinte;

Total das receitas igual à soma das categorias;

Total dos pagamentos igual à soma das categorias;

Total das amortizações igual à soma das instituições;

Saldo inicial mais entradas menos saídas igual ao saldo final;

Importações reconciliadas com os totais das fontes;

Nenhuma movimentação duplicada;

Nenhum erro de referência;

Nenhum valor sem classificação compondo o fluxo oficial.

Exibir “FLUXO CONCILIADO” em verde somente quando todas as verificações obrigatórias forem aprovadas.

BANCO DE DADOS

Estruturar tabelas separadas para:

Usuários e perfis;

Empresas;

Contas bancárias;

Aplicações;

Movimentações;

Categorias;

Subcategorias;

Regras de classificação;

Contratos financeiros;

Parcelas de dívidas;

Receitas projetadas;

Importações;

Arquivos importados;

Cenários;

Versões;

Ajustes manuais;

Comentários;

Pendências;

Log de auditoria;

Parâmetros do sistema.

Criar relacionamentos adequados e utilizar Row Level Security no Supabase.

MVP – PRIMEIRA ETAPA

Na primeira entrega, priorize:

Login e perfis;

Cadastro de empresas e categorias;

Importação de Excel e CSV;

Mapeamento de colunas;

Base única de movimentações;

Regras de classificação;

Registro de disponibilidades;

Fluxo semanal automático;

Dashboard executivo;

Ajustes manuais com histórico;

Central de pendências;

Cenários;

Exportação para Excel e PDF;

Histórico de versões.

Não implemente integrações bancárias ou integrações diretas com ERP nesta primeira etapa. Deixe a arquitetura preparada para isso, mas utilize inicialmente importação de arquivos.

Crie dados demonstrativos realistas para que todas as páginas possam ser testadas, mas identifique claramente esses dados como “Demonstração”.

Não simplifique a aplicação para um dashboard estático. Ela deve permitir importar, classificar, conferir, ajustar, recalcular, versionar e apresentar o fluxo de caixa.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8b24b464-4a7a-4354-98ad-060d774ccbe9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
