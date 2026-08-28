export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      auditoria: {
        Row: {
          campo: string | null
          created_at: string
          id: string
          motivo: string | null
          registro_id: string | null
          tabela: string
          usuario: string | null
          valor_anterior: string | null
          valor_novo: string | null
          versao_id: string | null
        }
        Insert: {
          campo?: string | null
          created_at?: string
          id?: string
          motivo?: string | null
          registro_id?: string | null
          tabela: string
          usuario?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
          versao_id?: string | null
        }
        Update: {
          campo?: string | null
          created_at?: string
          id?: string
          motivo?: string | null
          registro_id?: string | null
          tabela?: string
          usuario?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
          versao_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_versao_id_fkey"
            columns: ["versao_id"]
            isOneToOne: false
            referencedRelation: "versoes"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          ativa: boolean
          created_at: string
          grupo: string
          id: string
          nome: string
          ordem: number
          subcategoria: string | null
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          grupo: string
          id?: string
          nome: string
          ordem?: number
          subcategoria?: string | null
        }
        Update: {
          ativa?: boolean
          created_at?: string
          grupo?: string
          id?: string
          nome?: string
          ordem?: number
          subcategoria?: string | null
        }
        Relationships: []
      }
      cenarios: {
        Row: {
          created_at: string
          descricao: string | null
          fator_despesa: number
          fator_receita: number
          id: string
          nome: string
          oficial: boolean
          saldo_minimo: number
          tipo: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          fator_despesa?: number
          fator_receita?: number
          id?: string
          nome: string
          oficial?: boolean
          saldo_minimo?: number
          tipo?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          fator_despesa?: number
          fator_receita?: number
          id?: string
          nome?: string
          oficial?: boolean
          saldo_minimo?: number
          tipo?: string
        }
        Relationships: []
      }
      comentarios: {
        Row: {
          contexto: string
          created_at: string
          id: string
          referencia: string | null
          texto: string
          usuario: string | null
        }
        Insert: {
          contexto: string
          created_at?: string
          id?: string
          referencia?: string | null
          texto: string
          usuario?: string | null
        }
        Update: {
          contexto?: string
          created_at?: string
          id?: string
          referencia?: string | null
          texto?: string
          usuario?: string | null
        }
        Relationships: []
      }
      contratos_financeiros: {
        Row: {
          created_at: string
          data_contratacao: string | null
          data_vencimento: string | null
          demo: boolean
          empresa_id: string | null
          garantias: string | null
          id: string
          indexador: string | null
          instituicao: string
          numero_contrato: string | null
          observacoes: string | null
          periodicidade: string | null
          saldo_devedor: number
          status: string
          taxa: number | null
          tipo_operacao: string | null
          valor_original: number
        }
        Insert: {
          created_at?: string
          data_contratacao?: string | null
          data_vencimento?: string | null
          demo?: boolean
          empresa_id?: string | null
          garantias?: string | null
          id?: string
          indexador?: string | null
          instituicao: string
          numero_contrato?: string | null
          observacoes?: string | null
          periodicidade?: string | null
          saldo_devedor?: number
          status?: string
          taxa?: number | null
          tipo_operacao?: string | null
          valor_original?: number
        }
        Update: {
          created_at?: string
          data_contratacao?: string | null
          data_vencimento?: string | null
          demo?: boolean
          empresa_id?: string | null
          garantias?: string | null
          id?: string
          indexador?: string | null
          instituicao?: string
          numero_contrato?: string | null
          observacoes?: string | null
          periodicidade?: string | null
          saldo_devedor?: number
          status?: string
          taxa?: number | null
          tipo_operacao?: string | null
          valor_original?: number
        }
        Relationships: [
          {
            foreignKeyName: "contratos_financeiros_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      disponibilidades: {
        Row: {
          agencia: string | null
          banco: string
          carencia: string | null
          conta: string | null
          created_at: string
          data_base: string
          data_vencimento: string | null
          demo: boolean
          disponivel_resgate: boolean
          empresa_id: string | null
          fonte: string | null
          id: string
          liquidez: string | null
          observacao: string | null
          percentual_cdi: number | null
          produto: string | null
          responsavel: string | null
          saldo: number
          tipo: string
          valor_bloqueado: number
        }
        Insert: {
          agencia?: string | null
          banco: string
          carencia?: string | null
          conta?: string | null
          created_at?: string
          data_base: string
          data_vencimento?: string | null
          demo?: boolean
          disponivel_resgate?: boolean
          empresa_id?: string | null
          fonte?: string | null
          id?: string
          liquidez?: string | null
          observacao?: string | null
          percentual_cdi?: number | null
          produto?: string | null
          responsavel?: string | null
          saldo?: number
          tipo?: string
          valor_bloqueado?: number
        }
        Update: {
          agencia?: string | null
          banco?: string
          carencia?: string | null
          conta?: string | null
          created_at?: string
          data_base?: string
          data_vencimento?: string | null
          demo?: boolean
          disponivel_resgate?: boolean
          empresa_id?: string | null
          fonte?: string | null
          id?: string
          liquidez?: string | null
          observacao?: string | null
          percentual_cdi?: number | null
          produto?: string | null
          responsavel?: string | null
          saldo?: number
          tipo?: string
          valor_bloqueado?: number
        }
        Relationships: [
          {
            foreignKeyName: "disponibilidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          apelido: string | null
          ativa: boolean
          cnpj: string | null
          created_at: string
          demo: boolean
          grupo: string | null
          id: string
          nome: string
        }
        Insert: {
          apelido?: string | null
          ativa?: boolean
          cnpj?: string | null
          created_at?: string
          demo?: boolean
          grupo?: string | null
          id?: string
          nome: string
        }
        Update: {
          apelido?: string | null
          ativa?: boolean
          cnpj?: string | null
          created_at?: string
          demo?: boolean
          grupo?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      importacoes: {
        Row: {
          aba: string | null
          arquivo_nome: string | null
          created_at: string
          duplicadas: number
          id: string
          importadas: number
          mapeamento: Json | null
          rejeitadas: number
          status: string
          tipo_fonte: string
          total_linhas: number
          usuario: string | null
        }
        Insert: {
          aba?: string | null
          arquivo_nome?: string | null
          created_at?: string
          duplicadas?: number
          id?: string
          importadas?: number
          mapeamento?: Json | null
          rejeitadas?: number
          status?: string
          tipo_fonte: string
          total_linhas?: number
          usuario?: string | null
        }
        Update: {
          aba?: string | null
          arquivo_nome?: string | null
          created_at?: string
          duplicadas?: number
          id?: string
          importadas?: number
          mapeamento?: Json | null
          rejeitadas?: number
          status?: string
          tipo_fonte?: string
          total_linhas?: number
          usuario?: string | null
        }
        Relationships: []
      }
      movimentacoes: {
        Row: {
          banco: string | null
          categoria: string
          cenario_id: string | null
          competencia: string | null
          contraparte: string | null
          cpf_cnpj: string | null
          created_at: string
          data_baixa: string | null
          data_emissao: string | null
          data_prevista: string
          data_vencimento: string | null
          demo: boolean
          descricao: string | null
          documento: string | null
          editado_manual: boolean
          empresa_id: string | null
          filial: string | null
          fonte: string | null
          id: string
          importacao_id: string | null
          natureza: Database["public"]["Enums"]["natureza_mov"]
          observacao: string | null
          responsavel: string | null
          status: Database["public"]["Enums"]["status_info"]
          subcategoria: string | null
          tipo_documento: string | null
          updated_at: string
          valor_baixado: number
          valor_liquido: number
          valor_original: number
          versao_id: string | null
        }
        Insert: {
          banco?: string | null
          categoria?: string
          cenario_id?: string | null
          competencia?: string | null
          contraparte?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          data_baixa?: string | null
          data_emissao?: string | null
          data_prevista: string
          data_vencimento?: string | null
          demo?: boolean
          descricao?: string | null
          documento?: string | null
          editado_manual?: boolean
          empresa_id?: string | null
          filial?: string | null
          fonte?: string | null
          id?: string
          importacao_id?: string | null
          natureza: Database["public"]["Enums"]["natureza_mov"]
          observacao?: string | null
          responsavel?: string | null
          status?: Database["public"]["Enums"]["status_info"]
          subcategoria?: string | null
          tipo_documento?: string | null
          updated_at?: string
          valor_baixado?: number
          valor_liquido?: number
          valor_original?: number
          versao_id?: string | null
        }
        Update: {
          banco?: string | null
          categoria?: string
          cenario_id?: string | null
          competencia?: string | null
          contraparte?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          data_baixa?: string | null
          data_emissao?: string | null
          data_prevista?: string
          data_vencimento?: string | null
          demo?: boolean
          descricao?: string | null
          documento?: string | null
          editado_manual?: boolean
          empresa_id?: string | null
          filial?: string | null
          fonte?: string | null
          id?: string
          importacao_id?: string | null
          natureza?: Database["public"]["Enums"]["natureza_mov"]
          observacao?: string | null
          responsavel?: string | null
          status?: Database["public"]["Enums"]["status_info"]
          subcategoria?: string | null
          tipo_documento?: string | null
          updated_at?: string
          valor_baixado?: number
          valor_liquido?: number
          valor_original?: number
          versao_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_cenario_id_fkey"
            columns: ["cenario_id"]
            isOneToOne: false
            referencedRelation: "cenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_versao_id_fkey"
            columns: ["versao_id"]
            isOneToOne: false
            referencedRelation: "versoes"
            referencedColumns: ["id"]
          },
        ]
      }
      parametros: {
        Row: {
          chave: string
          descricao: string | null
          valor: string | null
        }
        Insert: {
          chave: string
          descricao?: string | null
          valor?: string | null
        }
        Update: {
          chave?: string
          descricao?: string | null
          valor?: string | null
        }
        Relationships: []
      }
      parcelas_divida: {
        Row: {
          contrato_id: string
          created_at: string
          id: string
          juros: number
          principal: number
          status: Database["public"]["Enums"]["status_info"]
          vencimento: string
        }
        Insert: {
          contrato_id: string
          created_at?: string
          id?: string
          juros?: number
          principal?: number
          status?: Database["public"]["Enums"]["status_info"]
          vencimento: string
        }
        Update: {
          contrato_id?: string
          created_at?: string
          id?: string
          juros?: number
          principal?: number
          status?: Database["public"]["Enums"]["status_info"]
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "parcelas_divida_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_financeiros"
            referencedColumns: ["id"]
          },
        ]
      }
      pendencias: {
        Row: {
          created_at: string
          descricao: string
          id: string
          referencia_id: string | null
          resolvida: boolean
          severidade: string
          tipo: string
          valor_afetado: number | null
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          referencia_id?: string | null
          resolvida?: boolean
          severidade?: string
          tipo: string
          valor_afetado?: number | null
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          referencia_id?: string | null
          resolvida?: boolean
          severidade?: string
          tipo?: string
          valor_afetado?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          nome?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
        }
        Relationships: []
      }
      receitas_abate: {
        Row: {
          categoria_animal: string | null
          created_at: string
          data_abate: string | null
          data_embarque: string | null
          data_prevista: string
          demo: boolean
          destino: string | null
          empresa_id: string | null
          faturamento_projetado: number
          faturamento_realizado: number | null
          id: string
          mercado: string | null
          peso_estimado: number | null
          preco: number | null
          quantidade: number
          status: Database["public"]["Enums"]["status_info"]
        }
        Insert: {
          categoria_animal?: string | null
          created_at?: string
          data_abate?: string | null
          data_embarque?: string | null
          data_prevista: string
          demo?: boolean
          destino?: string | null
          empresa_id?: string | null
          faturamento_projetado?: number
          faturamento_realizado?: number | null
          id?: string
          mercado?: string | null
          peso_estimado?: number | null
          preco?: number | null
          quantidade?: number
          status?: Database["public"]["Enums"]["status_info"]
        }
        Update: {
          categoria_animal?: string | null
          created_at?: string
          data_abate?: string | null
          data_embarque?: string | null
          data_prevista?: string
          demo?: boolean
          destino?: string | null
          empresa_id?: string | null
          faturamento_projetado?: number
          faturamento_realizado?: number | null
          id?: string
          mercado?: string | null
          peso_estimado?: number | null
          preco?: number | null
          quantidade?: number
          status?: Database["public"]["Enums"]["status_info"]
        }
        Relationships: [
          {
            foreignKeyName: "receitas_abate_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      regras_classificacao: {
        Row: {
          ativa: boolean
          campo: string
          categoria_destino: string
          condicao: string
          created_at: string
          empresa_id: string | null
          id: string
          prioridade: number
          subcategoria: string | null
          valor: string
          vigencia_inicio: string | null
        }
        Insert: {
          ativa?: boolean
          campo?: string
          categoria_destino: string
          condicao?: string
          created_at?: string
          empresa_id?: string | null
          id?: string
          prioridade?: number
          subcategoria?: string | null
          valor: string
          vigencia_inicio?: string | null
        }
        Update: {
          ativa?: boolean
          campo?: string
          categoria_destino?: string
          condicao?: string
          created_at?: string
          empresa_id?: string | null
          id?: string
          prioridade?: number
          subcategoria?: string | null
          valor?: string
          vigencia_inicio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regras_classificacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      versoes: {
        Row: {
          cenario_id: string | null
          consolidado: Json | null
          created_at: string
          data_base: string
          fechada_em: string | null
          id: string
          numero: number
          observacoes: string | null
          periodo_fim: string | null
          periodo_inicio: string | null
          responsavel: string | null
          status: string
        }
        Insert: {
          cenario_id?: string | null
          consolidado?: Json | null
          created_at?: string
          data_base: string
          fechada_em?: string | null
          id?: string
          numero: number
          observacoes?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          responsavel?: string | null
          status?: string
        }
        Update: {
          cenario_id?: string | null
          consolidado?: Json | null
          created_at?: string
          data_base?: string
          fechada_em?: string | null
          id?: string
          numero?: number
          observacoes?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          responsavel?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "versoes_cenario_id_fkey"
            columns: ["cenario_id"]
            isOneToOne: false
            referencedRelation: "cenarios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_editor: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "financeiro" | "diretoria"
      natureza_mov: "entrada" | "saida"
      status_info:
        | "confirmado"
        | "estimado"
        | "pendente"
        | "realizado"
        | "cancelado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "financeiro", "diretoria"],
      natureza_mov: ["entrada", "saida"],
      status_info: [
        "confirmado",
        "estimado",
        "pendente",
        "realizado",
        "cancelado",
      ],
    },
  },
} as const
