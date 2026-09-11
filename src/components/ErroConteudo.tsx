import { Component, type ReactNode } from "react";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode; chave: string };
type State = { erro: Error | null; chave: string };

/**
 * Isola falhas de uma tela: o menu e os filtros continuam funcionando e o
 * usuário pode tentar de novo sem recarregar a página (evita o loop de erro).
 */
export class ErroConteudo extends Component<Props, State> {
  override state: State = { erro: null, chave: this.props.chave };

  static getDerivedStateFromProps(props: Props, state: State): State | null {
    // Ao trocar de tela, limpa o erro anterior.
    if (props.chave !== state.chave) return { erro: null, chave: props.chave };
    return null;
  }

  static getDerivedStateFromError(erro: Error): Partial<State> {
    return { erro };
  }

  override componentDidCatch(erro: Error) {
    console.error(erro);
    reportLovableError(erro, { boundary: "conteudo_app_layout" });
  }

  override render() {
    const { erro } = this.state;
    if (!erro) return this.props.children;

    return (
      <div className="mx-auto mt-10 max-w-lg rounded-lg border bg-card p-6 text-center">
        <p className="text-base font-semibold">Não foi possível exibir estas informações</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Tente novamente ou escolha outro filtro. Se continuar, avise o time com a mensagem abaixo.
        </p>
        <p className="mt-3 break-words rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          {erro.message || "Erro desconhecido"}
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button onClick={() => this.setState({ erro: null })}>Tentar novamente</Button>
        </div>
      </div>
    );
  }
}
