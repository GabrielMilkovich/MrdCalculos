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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_lines: {
        Row: {
          calculadora: string
          competencia: string | null
          descricao: string | null
          formula: string | null
          id: string
          linha: number
          metadata: Json | null
          run_id: string
          valor_bruto: number | null
          valor_liquido: number | null
        }
        Insert: {
          calculadora: string
          competencia?: string | null
          descricao?: string | null
          formula?: string | null
          id?: string
          linha: number
          metadata?: Json | null
          run_id: string
          valor_bruto?: number | null
          valor_liquido?: number | null
        }
        Update: {
          calculadora?: string
          competencia?: string | null
          descricao?: string | null
          formula?: string | null
          id?: string
          linha?: number
          metadata?: Json | null
          run_id?: string
          valor_bruto?: number | null
          valor_liquido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_lines_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "calculation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          acao: string
          after_json: Json | null
          before_json: Json | null
          created_at: string
          entidade: string
          entidade_id: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          acao: string
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string
          entidade: string
          entidade_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string
          entidade?: string
          entidade_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      calc_lineage: {
        Row: {
          created_at: string
          formula_aplicada: string | null
          hash_reproducao: string | null
          id: string
          inputs: Json
          output_tipo: string | null
          output_valor: number | null
          parametros: Json | null
          result_item_id: string | null
          rule_codigo: string | null
          rule_id: string | null
          rule_versao: string | null
          snapshot_id: string
        }
        Insert: {
          created_at?: string
          formula_aplicada?: string | null
          hash_reproducao?: string | null
          id?: string
          inputs?: Json
          output_tipo?: string | null
          output_valor?: number | null
          parametros?: Json | null
          result_item_id?: string | null
          rule_codigo?: string | null
          rule_id?: string | null
          rule_versao?: string | null
          snapshot_id: string
        }
        Update: {
          created_at?: string
          formula_aplicada?: string | null
          hash_reproducao?: string | null
          id?: string
          inputs?: Json
          output_tipo?: string | null
          output_valor?: number | null
          parametros?: Json | null
          result_item_id?: string | null
          rule_codigo?: string | null
          rule_id?: string | null
          rule_versao?: string | null
          snapshot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calc_lineage_result_item_id_fkey"
            columns: ["result_item_id"]
            isOneToOne: false
            referencedRelation: "calc_result_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calc_lineage_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "calc_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calc_lineage_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "calc_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      calc_result_items: {
        Row: {
          base_calculo: number | null
          competencia: string | null
          created_at: string
          dependencias: Json | null
          fator: number | null
          id: string
          memoria_detalhada: Json | null
          ordem: number | null
          percentual: number | null
          periodo_fim: string | null
          periodo_inicio: string | null
          quantidade: number | null
          rubrica_codigo: string
          rubrica_nome: string | null
          snapshot_id: string
          valor_bruto: number
          valor_liquido: number | null
        }
        Insert: {
          base_calculo?: number | null
          competencia?: string | null
          created_at?: string
          dependencias?: Json | null
          fator?: number | null
          id?: string
          memoria_detalhada?: Json | null
          ordem?: number | null
          percentual?: number | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          quantidade?: number | null
          rubrica_codigo: string
          rubrica_nome?: string | null
          snapshot_id: string
          valor_bruto: number
          valor_liquido?: number | null
        }
        Update: {
          base_calculo?: number | null
          competencia?: string | null
          created_at?: string
          dependencias?: Json | null
          fator?: number | null
          id?: string
          memoria_detalhada?: Json | null
          ordem?: number | null
          percentual?: number | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          quantidade?: number | null
          rubrica_codigo?: string
          rubrica_nome?: string | null
          snapshot_id?: string
          valor_bruto?: number
          valor_liquido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "calc_result_items_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "calc_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      calc_rules: {
        Row: {
          ativo: boolean | null
          categoria: string
          codigo: string
          created_at: string
          descricao: string | null
          formula: Json
          id: string
          nome: string
          parametros_requeridos: Json | null
          versao: string
          versao_numero: number
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria: string
          codigo: string
          created_at?: string
          descricao?: string | null
          formula?: Json
          id?: string
          nome: string
          parametros_requeridos?: Json | null
          versao?: string
          versao_numero?: number
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string
          codigo?: string
          created_at?: string
          descricao?: string | null
          formula?: Json
          id?: string
          nome?: string
          parametros_requeridos?: Json | null
          versao?: string
          versao_numero?: number
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: []
      }
      calc_scenarios: {
        Row: {
          ativo: boolean | null
          case_id: string
          created_at: string
          created_by: string | null
          descricao: string | null
          divisor: number
          dsr_fator: number | null
          hash_config: string | null
          id: string
          indice_correcao: string | null
          media_variaveis_metodo: string | null
          metodo_dsr: string
          metodo_he: string
          nome: string
          premissas_completas: Json | null
          prescricao_data_limite: string | null
          prescricao_tipo: string | null
          taxa_juros: number | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          case_id: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          divisor?: number
          dsr_fator?: number | null
          hash_config?: string | null
          id?: string
          indice_correcao?: string | null
          media_variaveis_metodo?: string | null
          metodo_dsr?: string
          metodo_he?: string
          nome: string
          premissas_completas?: Json | null
          prescricao_data_limite?: string | null
          prescricao_tipo?: string | null
          taxa_juros?: number | null
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          case_id?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          divisor?: number
          dsr_fator?: number | null
          hash_config?: string | null
          id?: string
          indice_correcao?: string | null
          media_variaveis_metodo?: string | null
          metodo_dsr?: string
          metodo_he?: string
          nome?: string
          premissas_completas?: Json | null
          prescricao_data_limite?: string | null
          prescricao_tipo?: string | null
          taxa_juros?: number | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calc_scenarios_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "calc_scenarios_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      calc_snapshots: {
        Row: {
          alertas_consistencia: Json | null
          aprovado_em: string | null
          aprovado_por: string | null
          calendario_hash: string | null
          case_id: string
          created_at: string
          created_by: string
          diff_anterior: Json | null
          engine_version: string
          id: string
          inputs_snapshot: Json
          observacoes: string | null
          pendencias: Json | null
          periodo_fim: string | null
          periodo_inicio: string | null
          prescricao_aplicada: string | null
          profile_id: string | null
          qualidade_score: number | null
          resultado_bruto: Json | null
          resultado_liquido: Json | null
          ruleset_hash: string | null
          scenario_id: string | null
          status: Database["public"]["Enums"]["snapshot_status"]
          total_bruto: number | null
          total_descontos: number | null
          total_liquido: number | null
          versao: number
          warnings: Json | null
        }
        Insert: {
          alertas_consistencia?: Json | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          calendario_hash?: string | null
          case_id: string
          created_at?: string
          created_by: string
          diff_anterior?: Json | null
          engine_version?: string
          id?: string
          inputs_snapshot?: Json
          observacoes?: string | null
          pendencias?: Json | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          prescricao_aplicada?: string | null
          profile_id?: string | null
          qualidade_score?: number | null
          resultado_bruto?: Json | null
          resultado_liquido?: Json | null
          ruleset_hash?: string | null
          scenario_id?: string | null
          status?: Database["public"]["Enums"]["snapshot_status"]
          total_bruto?: number | null
          total_descontos?: number | null
          total_liquido?: number | null
          versao?: number
          warnings?: Json | null
        }
        Update: {
          alertas_consistencia?: Json | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          calendario_hash?: string | null
          case_id?: string
          created_at?: string
          created_by?: string
          diff_anterior?: Json | null
          engine_version?: string
          id?: string
          inputs_snapshot?: Json
          observacoes?: string | null
          pendencias?: Json | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          prescricao_aplicada?: string | null
          profile_id?: string | null
          qualidade_score?: number | null
          resultado_bruto?: Json | null
          resultado_liquido?: Json | null
          ruleset_hash?: string | null
          scenario_id?: string | null
          status?: Database["public"]["Enums"]["snapshot_status"]
          total_bruto?: number | null
          total_descontos?: number | null
          total_liquido?: number | null
          versao?: number
          warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "calc_snapshots_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "calc_snapshots_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calc_snapshots_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "calculation_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calc_snapshots_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "calc_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      calculation_cases: {
        Row: {
          ajuizamento_data: string | null
          case_id: string
          categoria: string | null
          cct_act: string | null
          cidade: string | null
          created_at: string
          id: string
          observacoes: string | null
          periodo_fim: string | null
          periodo_inicio: string | null
          tipo_contrato: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          ajuizamento_data?: string | null
          case_id: string
          categoria?: string | null
          cct_act?: string | null
          cidade?: string | null
          created_at?: string
          id?: string
          observacoes?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          tipo_contrato?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ajuizamento_data?: string | null
          case_id?: string
          categoria?: string | null
          cct_act?: string | null
          cidade?: string | null
          created_at?: string
          id?: string
          observacoes?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          tipo_contrato?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calculation_cases_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "calculation_cases_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      calculation_profiles: {
        Row: {
          ativo: boolean | null
          calculadoras_incluidas: string[] | null
          config: Json | null
          criado_em: string | null
          criado_por: string | null
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          calculadoras_incluidas?: string[] | null
          config?: Json | null
          criado_em?: string | null
          criado_por?: string | null
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean | null
          calculadoras_incluidas?: string[] | null
          config?: Json | null
          criado_em?: string | null
          criado_por?: string | null
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      calculation_runs: {
        Row: {
          calculators_used: Json | null
          case_id: string
          executado_em: string | null
          executado_por: string | null
          facts_snapshot: Json | null
          id: string
          profile_id: string | null
          resultado_bruto: Json | null
          resultado_liquido: Json | null
          warnings: Json | null
        }
        Insert: {
          calculators_used?: Json | null
          case_id: string
          executado_em?: string | null
          executado_por?: string | null
          facts_snapshot?: Json | null
          id?: string
          profile_id?: string | null
          resultado_bruto?: Json | null
          resultado_liquido?: Json | null
          warnings?: Json | null
        }
        Update: {
          calculators_used?: Json | null
          case_id?: string
          executado_em?: string | null
          executado_por?: string | null
          facts_snapshot?: Json | null
          id?: string
          profile_id?: string | null
          resultado_bruto?: Json | null
          resultado_liquido?: Json | null
          warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "calculation_runs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "calculation_runs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calculation_runs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "calculation_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calculator_versions: {
        Row: {
          ativo: boolean | null
          calculator_id: string
          changelog: string | null
          codigo_ref: string | null
          criado_em: string | null
          criado_por: string | null
          id: string
          regras: Json | null
          versao: string
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        Insert: {
          ativo?: boolean | null
          calculator_id: string
          changelog?: string | null
          codigo_ref?: string | null
          criado_em?: string | null
          criado_por?: string | null
          id?: string
          regras?: Json | null
          versao: string
          vigencia_fim?: string | null
          vigencia_inicio: string
        }
        Update: {
          ativo?: boolean | null
          calculator_id?: string
          changelog?: string | null
          codigo_ref?: string | null
          criado_em?: string | null
          criado_por?: string | null
          id?: string
          regras?: Json | null
          versao?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Relationships: [
          {
            foreignKeyName: "calculator_versions_calculator_id_fkey"
            columns: ["calculator_id"]
            isOneToOne: false
            referencedRelation: "calculators"
            referencedColumns: ["id"]
          },
        ]
      }
      calculators: {
        Row: {
          ativo: boolean | null
          categoria: string
          criado_em: string | null
          descricao: string | null
          id: string
          inputs_esperados: Json | null
          nome: string
          outputs: Json | null
          tags: string[] | null
        }
        Insert: {
          ativo?: boolean | null
          categoria: string
          criado_em?: string | null
          descricao?: string | null
          id?: string
          inputs_esperados?: Json | null
          nome: string
          outputs?: Json | null
          tags?: string[] | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string
          criado_em?: string | null
          descricao?: string | null
          id?: string
          inputs_esperados?: Json | null
          nome?: string
          outputs?: Json | null
          tags?: string[] | null
        }
        Relationships: []
      }
      calendars: {
        Row: {
          ano: number
          ativo: boolean | null
          created_at: string
          feriados: Json
          fonte: string | null
          hash_versao: string
          id: string
          municipio: string | null
          nome: string
          uf: string
        }
        Insert: {
          ano: number
          ativo?: boolean | null
          created_at?: string
          feriados?: Json
          fonte?: string | null
          hash_versao: string
          id?: string
          municipio?: string | null
          nome: string
          uf: string
        }
        Update: {
          ano?: number
          ativo?: boolean | null
          created_at?: string
          feriados?: Json
          fonte?: string | null
          hash_versao?: string
          id?: string
          municipio?: string | null
          nome?: string
          uf?: string
        }
        Relationships: []
      }
      case_briefings: {
        Row: {
          case_id: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          updated_at: string
        }
        Insert: {
          case_id: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          case_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_briefings_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "case_briefings_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_controversies: {
        Row: {
          campo: string
          case_id: string
          created_at: string
          created_by: string | null
          descricao: string
          document_ids: string[] | null
          fact_ids: string[] | null
          fundamentacao_legal: string | null
          id: string
          impacto_estimado: number | null
          justificativa: string | null
          prioridade: string | null
          resolvido_em: string | null
          resolvido_por: string | null
          status: string
          updated_at: string
          valor_escolhido: string | null
        }
        Insert: {
          campo: string
          case_id: string
          created_at?: string
          created_by?: string | null
          descricao: string
          document_ids?: string[] | null
          fact_ids?: string[] | null
          fundamentacao_legal?: string | null
          id?: string
          impacto_estimado?: number | null
          justificativa?: string | null
          prioridade?: string | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          status: string
          updated_at?: string
          valor_escolhido?: string | null
        }
        Update: {
          campo?: string
          case_id?: string
          created_at?: string
          created_by?: string | null
          descricao?: string
          document_ids?: string[] | null
          fact_ids?: string[] | null
          fundamentacao_legal?: string | null
          id?: string
          impacto_estimado?: number | null
          justificativa?: string | null
          prioridade?: string | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          status?: string
          updated_at?: string
          valor_escolhido?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_controversies_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "case_controversies_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_inputs: {
        Row: {
          case_id: string
          created_at: string
          data_fim: string | null
          data_inicio: string
          id: string
          metadata_json: Json | null
          observacoes: string | null
          quantidade: number | null
          source_document_id: string | null
          tipo_evento: string
          valor: number | null
        }
        Insert: {
          case_id: string
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          id?: string
          metadata_json?: Json | null
          observacoes?: string | null
          quantidade?: number | null
          source_document_id?: string | null
          tipo_evento: string
          valor?: number | null
        }
        Update: {
          case_id?: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          id?: string
          metadata_json?: Json | null
          observacoes?: string | null
          quantidade?: number | null
          source_document_id?: string | null
          tipo_evento?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "case_inputs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "case_inputs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_inputs_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      case_outputs: {
        Row: {
          base_calculo: number | null
          case_id: string
          created_at: string
          descontos_json: Json | null
          formula_aplicada: string | null
          id: string
          legal_basis_json: Json | null
          memoria_json: Json | null
          ordem: number | null
          periodo_ref: string | null
          reflexos_json: Json | null
          snapshot_id: string | null
          valor_bruto: number
          valor_liquido: number | null
          verba_codigo: string
          verba_nome: string | null
        }
        Insert: {
          base_calculo?: number | null
          case_id: string
          created_at?: string
          descontos_json?: Json | null
          formula_aplicada?: string | null
          id?: string
          legal_basis_json?: Json | null
          memoria_json?: Json | null
          ordem?: number | null
          periodo_ref?: string | null
          reflexos_json?: Json | null
          snapshot_id?: string | null
          valor_bruto: number
          valor_liquido?: number | null
          verba_codigo: string
          verba_nome?: string | null
        }
        Update: {
          base_calculo?: number | null
          case_id?: string
          created_at?: string
          descontos_json?: Json | null
          formula_aplicada?: string | null
          id?: string
          legal_basis_json?: Json | null
          memoria_json?: Json | null
          ordem?: number | null
          periodo_ref?: string | null
          reflexos_json?: Json | null
          snapshot_id?: string | null
          valor_bruto?: number
          valor_liquido?: number | null
          verba_codigo?: string
          verba_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_outputs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "case_outputs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_outputs_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "calc_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      case_risk_analysis: {
        Row: {
          analisado_em: string
          analisado_por: string | null
          case_id: string
          fatores: Json
          id: string
          nivel_risco: string
          recomendacoes: string[] | null
          resumo: string | null
          score_risco: number | null
          snapshot_id: string | null
        }
        Insert: {
          analisado_em?: string
          analisado_por?: string | null
          case_id: string
          fatores?: Json
          id?: string
          nivel_risco: string
          recomendacoes?: string[] | null
          resumo?: string | null
          score_risco?: number | null
          snapshot_id?: string | null
        }
        Update: {
          analisado_em?: string
          analisado_por?: string | null
          case_id?: string
          fatores?: Json
          id?: string
          nivel_risco?: string
          recomendacoes?: string[] | null
          resumo?: string | null
          score_risco?: number | null
          snapshot_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_risk_analysis_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "case_risk_analysis_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_risk_analysis_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "calc_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          atualizado_em: string | null
          cliente: string
          criado_em: string | null
          criado_por: string | null
          id: string
          numero_processo: string | null
          status: Database["public"]["Enums"]["case_status"] | null
          tags: string[] | null
          tribunal: string | null
        }
        Insert: {
          atualizado_em?: string | null
          cliente: string
          criado_em?: string | null
          criado_por?: string | null
          id?: string
          numero_processo?: string | null
          status?: Database["public"]["Enums"]["case_status"] | null
          tags?: string[] | null
          tribunal?: string | null
        }
        Update: {
          atualizado_em?: string | null
          cliente?: string
          criado_em?: string | null
          criado_por?: string | null
          id?: string
          numero_processo?: string | null
          status?: Database["public"]["Enums"]["case_status"] | null
          tags?: string[] | null
          tribunal?: string | null
        }
        Relationships: []
      }
      doc_chunks: {
        Row: {
          document_id: string
          embedding: string | null
          id: string
          metadata: Json | null
          texto: string
        }
        Insert: {
          document_id: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          texto: string
        }
        Update: {
          document_id?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_chunks: {
        Row: {
          case_id: string
          chunk_index: number
          content: string
          content_hash: string | null
          created_at: string
          doc_type: string | null
          document_id: string
          embedding: string | null
          id: string
          metadata: Json
          page_number: number | null
        }
        Insert: {
          case_id: string
          chunk_index?: number
          content: string
          content_hash?: string | null
          created_at?: string
          doc_type?: string | null
          document_id: string
          embedding?: string | null
          id?: string
          metadata?: Json
          page_number?: number | null
        }
        Update: {
          case_id?: string
          chunk_index?: number
          content?: string
          content_hash?: string | null
          created_at?: string
          doc_type?: string | null
          document_id?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          page_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "document_chunks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_pipeline: {
        Row: {
          case_id: string
          created_at: string
          document_id: string
          empresa_detectada: string | null
          hash: string | null
          id: string
          metadata: Json | null
          pages_count: number | null
          periodo_detectado_fim: string | null
          periodo_detectado_inicio: string | null
          pipeline_type: Database["public"]["Enums"]["pipeline_doc_type"]
          status: string
          template_detectado: string | null
          template_version: string | null
          updated_at: string
          user_id: string
          validation_warnings: Json | null
        }
        Insert: {
          case_id: string
          created_at?: string
          document_id: string
          empresa_detectada?: string | null
          hash?: string | null
          id?: string
          metadata?: Json | null
          pages_count?: number | null
          periodo_detectado_fim?: string | null
          periodo_detectado_inicio?: string | null
          pipeline_type?: Database["public"]["Enums"]["pipeline_doc_type"]
          status?: string
          template_detectado?: string | null
          template_version?: string | null
          updated_at?: string
          user_id: string
          validation_warnings?: Json | null
        }
        Update: {
          case_id?: string
          created_at?: string
          document_id?: string
          empresa_detectada?: string | null
          hash?: string | null
          id?: string
          metadata?: Json | null
          pages_count?: number | null
          periodo_detectado_fim?: string | null
          periodo_detectado_inicio?: string | null
          pipeline_type?: Database["public"]["Enums"]["pipeline_doc_type"]
          status?: string
          template_detectado?: string | null
          template_version?: string | null
          updated_at?: string
          user_id?: string
          validation_warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "document_pipeline_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "document_pipeline_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_pipeline_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_queue: {
        Row: {
          case_id: string
          completed_at: string | null
          created_at: string | null
          document_id: string
          error_message: string | null
          id: string
          metadata: Json | null
          priority: number | null
          retry_count: number | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          case_id: string
          completed_at?: string | null
          created_at?: string | null
          document_id: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          priority?: number | null
          retry_count?: number | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          case_id?: string
          completed_at?: string | null
          created_at?: string | null
          document_id?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          priority?: number | null
          retry_count?: number | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_queue_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "document_queue_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_queue_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          arquivo_url: string | null
          case_id: string
          competencia: string | null
          error_message: string | null
          file_name: string | null
          hash: string | null
          hash_integridade: string | null
          id: string
          max_retries: number | null
          metadata: Json
          mime_type: string | null
          ocr_confianca: number | null
          ocr_confidence: number | null
          owner_user_id: string | null
          page_count: number | null
          periodo_fim: string | null
          periodo_inicio: string | null
          periodo_referencia_fim: string | null
          periodo_referencia_inicio: string | null
          processing_completed_at: string | null
          processing_started_at: string | null
          queue_priority: number | null
          queued_at: string | null
          retry_count: number | null
          status: string
          storage_path: string | null
          tipo: Database["public"]["Enums"]["doc_type"] | null
          updated_at: string | null
          uploaded_em: string | null
          validado: boolean | null
          validado_em: string | null
          validado_por: string | null
          versao_documento: number | null
        }
        Insert: {
          arquivo_url?: string | null
          case_id: string
          competencia?: string | null
          error_message?: string | null
          file_name?: string | null
          hash?: string | null
          hash_integridade?: string | null
          id?: string
          max_retries?: number | null
          metadata?: Json
          mime_type?: string | null
          ocr_confianca?: number | null
          ocr_confidence?: number | null
          owner_user_id?: string | null
          page_count?: number | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          periodo_referencia_fim?: string | null
          periodo_referencia_inicio?: string | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          queue_priority?: number | null
          queued_at?: string | null
          retry_count?: number | null
          status?: string
          storage_path?: string | null
          tipo?: Database["public"]["Enums"]["doc_type"] | null
          updated_at?: string | null
          uploaded_em?: string | null
          validado?: boolean | null
          validado_em?: string | null
          validado_por?: string | null
          versao_documento?: number | null
        }
        Update: {
          arquivo_url?: string | null
          case_id?: string
          competencia?: string | null
          error_message?: string | null
          file_name?: string | null
          hash?: string | null
          hash_integridade?: string | null
          id?: string
          max_retries?: number | null
          metadata?: Json
          mime_type?: string | null
          ocr_confianca?: number | null
          ocr_confidence?: number | null
          owner_user_id?: string | null
          page_count?: number | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          periodo_referencia_fim?: string | null
          periodo_referencia_inicio?: string | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          queue_priority?: number | null
          queued_at?: string | null
          retry_count?: number | null
          status?: string
          storage_path?: string | null
          tipo?: Database["public"]["Enums"]["doc_type"] | null
          updated_at?: string | null
          uploaded_em?: string | null
          validado?: boolean | null
          validado_em?: string | null
          validado_por?: string | null
          versao_documento?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      employment_contracts: {
        Row: {
          case_id: string
          created_at: string
          data_admissao: string
          data_demissao: string | null
          funcao: string | null
          historico_salarial: Json | null
          id: string
          jornada_contratual: Json | null
          local_trabalho: string | null
          observacoes: string | null
          salario_inicial: number | null
          sindicato: string | null
          tipo_demissao: Database["public"]["Enums"]["termination_type"] | null
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          data_admissao: string
          data_demissao?: string | null
          funcao?: string | null
          historico_salarial?: Json | null
          id?: string
          jornada_contratual?: Json | null
          local_trabalho?: string | null
          observacoes?: string | null
          salario_inicial?: number | null
          sindicato?: string | null
          tipo_demissao?: Database["public"]["Enums"]["termination_type"] | null
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          data_admissao?: string
          data_demissao?: string | null
          funcao?: string | null
          historico_salarial?: Json | null
          id?: string
          jornada_contratual?: Json | null
          local_trabalho?: string | null
          observacoes?: string | null
          salario_inicial?: number | null
          sindicato?: string | null
          tipo_demissao?: Database["public"]["Enums"]["termination_type"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employment_contracts_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "employment_contracts_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      extracao_item: {
        Row: {
          bbox: Json | null
          case_id: string
          competencia: string | null
          confidence: number | null
          created_at: string
          evidence_text: string | null
          field_key: string
          id: string
          page: number | null
          pipeline_id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_doc_id: string | null
          status: Database["public"]["Enums"]["extracao_status"]
          target_field: string | null
          target_table: string | null
          valor: string | null
        }
        Insert: {
          bbox?: Json | null
          case_id: string
          competencia?: string | null
          confidence?: number | null
          created_at?: string
          evidence_text?: string | null
          field_key: string
          id?: string
          page?: number | null
          pipeline_id: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_doc_id?: string | null
          status?: Database["public"]["Enums"]["extracao_status"]
          target_field?: string | null
          target_table?: string | null
          valor?: string | null
        }
        Update: {
          bbox?: Json | null
          case_id?: string
          competencia?: string | null
          confidence?: number | null
          created_at?: string
          evidence_text?: string | null
          field_key?: string
          id?: string
          page?: number | null
          pipeline_id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_doc_id?: string | null
          status?: Database["public"]["Enums"]["extracao_status"]
          target_field?: string | null
          target_table?: string | null
          valor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extracao_item_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "extracao_item_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracao_item_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "document_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracao_item_source_doc_id_fkey"
            columns: ["source_doc_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      extraction_tasks: {
        Row: {
          case_id: string
          chunks_analyzed: number | null
          created_at: string
          error_message: string | null
          filters: Json
          id: string
          owner_user_id: string
          processing_time_ms: number | null
          query: string
          result_json: Json | null
          similarity_threshold: number | null
          status: string
          task_type: string
          top_k: number
          updated_at: string
        }
        Insert: {
          case_id: string
          chunks_analyzed?: number | null
          created_at?: string
          error_message?: string | null
          filters?: Json
          id?: string
          owner_user_id: string
          processing_time_ms?: number | null
          query: string
          result_json?: Json | null
          similarity_threshold?: number | null
          status?: string
          task_type: string
          top_k?: number
          updated_at?: string
        }
        Update: {
          case_id?: string
          chunks_analyzed?: number | null
          created_at?: string
          error_message?: string | null
          filters?: Json
          id?: string
          owner_user_id?: string
          processing_time_ms?: number | null
          query?: string
          result_json?: Json | null
          similarity_threshold?: number | null
          status?: string
          task_type?: string
          top_k?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "extraction_tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "extraction_tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      extractions: {
        Row: {
          campo: string
          case_id: string
          confianca: number | null
          created_at: string
          document_id: string
          id: string
          metodo: string | null
          origem: Json
          status: string | null
          tipo_valor: string
          valor_proposto: string
        }
        Insert: {
          campo: string
          case_id: string
          confianca?: number | null
          created_at?: string
          document_id: string
          id?: string
          metodo?: string | null
          origem?: Json
          status?: string | null
          tipo_valor?: string
          valor_proposto: string
        }
        Update: {
          campo?: string
          case_id?: string
          confianca?: number | null
          created_at?: string
          document_id?: string
          id?: string
          metodo?: string | null
          origem?: Json
          status?: string | null
          tipo_valor?: string
          valor_proposto?: string
        }
        Relationships: [
          {
            foreignKeyName: "extractions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "extractions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extractions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      fact_evidences: {
        Row: {
          case_id: string
          chunk_id: string
          confidence: number | null
          created_at: string
          document_id: string
          fact_id: string
          id: string
          page_number: number | null
          quote: string
        }
        Insert: {
          case_id: string
          chunk_id: string
          confidence?: number | null
          created_at?: string
          document_id: string
          fact_id: string
          id?: string
          page_number?: number | null
          quote: string
        }
        Update: {
          case_id?: string
          chunk_id?: string
          confidence?: number | null
          created_at?: string
          document_id?: string
          fact_id?: string
          id?: string
          page_number?: number | null
          quote?: string
        }
        Relationships: [
          {
            foreignKeyName: "fact_evidences_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "fact_evidences_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fact_evidences_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "document_chunks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fact_evidences_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fact_evidences_fact_id_fkey"
            columns: ["fact_id"]
            isOneToOne: false
            referencedRelation: "facts"
            referencedColumns: ["id"]
          },
        ]
      }
      fact_sources: {
        Row: {
          document_id: string
          fact_id: string
          id: string
          pagina: number | null
          trecho: string | null
        }
        Insert: {
          document_id: string
          fact_id: string
          id?: string
          pagina?: number | null
          trecho?: string | null
        }
        Update: {
          document_id?: string
          fact_id?: string
          id?: string
          pagina?: number | null
          trecho?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fact_sources_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fact_sources_fact_id_fkey"
            columns: ["fact_id"]
            isOneToOne: false
            referencedRelation: "facts"
            referencedColumns: ["id"]
          },
        ]
      }
      facts: {
        Row: {
          case_id: string
          chave: string
          chunk_id: string | null
          citacao: string | null
          confianca: number | null
          confirmado: boolean | null
          confirmado_em: string | null
          confirmado_por: string | null
          criado_em: string | null
          id: string
          justificativa_validacao: string | null
          origem: Database["public"]["Enums"]["fact_origem"]
          pagina: number | null
          prova_qualidade: string | null
          status_pericial: string | null
          tipo: Database["public"]["Enums"]["fact_type"]
          valor: string
        }
        Insert: {
          case_id: string
          chave: string
          chunk_id?: string | null
          citacao?: string | null
          confianca?: number | null
          confirmado?: boolean | null
          confirmado_em?: string | null
          confirmado_por?: string | null
          criado_em?: string | null
          id?: string
          justificativa_validacao?: string | null
          origem?: Database["public"]["Enums"]["fact_origem"]
          pagina?: number | null
          prova_qualidade?: string | null
          status_pericial?: string | null
          tipo?: Database["public"]["Enums"]["fact_type"]
          valor: string
        }
        Update: {
          case_id?: string
          chave?: string
          chunk_id?: string | null
          citacao?: string | null
          confianca?: number | null
          confirmado?: boolean | null
          confirmado_em?: string | null
          confirmado_por?: string | null
          criado_em?: string | null
          id?: string
          justificativa_validacao?: string | null
          origem?: Database["public"]["Enums"]["fact_origem"]
          pagina?: number | null
          prova_qualidade?: string | null
          status_pericial?: string | null
          tipo?: Database["public"]["Enums"]["fact_type"]
          valor?: string
        }
        Relationships: [
          {
            foreignKeyName: "facts_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "facts_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facts_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "doc_chunks"
            referencedColumns: ["id"]
          },
        ]
      }
      fonte_conflito: {
        Row: {
          campo: string
          case_id: string
          competencia: string
          created_at: string
          fonte_a_doc_id: string | null
          fonte_b_doc_id: string | null
          id: string
          justificativa: string | null
          resolvido_em: string | null
          resolvido_por: string | null
          status: string
          valor_escolhido: string | null
          valor_fonte_a: string | null
          valor_fonte_b: string | null
        }
        Insert: {
          campo: string
          case_id: string
          competencia: string
          created_at?: string
          fonte_a_doc_id?: string | null
          fonte_b_doc_id?: string | null
          id?: string
          justificativa?: string | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          status?: string
          valor_escolhido?: string | null
          valor_fonte_a?: string | null
          valor_fonte_b?: string | null
        }
        Update: {
          campo?: string
          case_id?: string
          competencia?: string
          created_at?: string
          fonte_a_doc_id?: string | null
          fonte_b_doc_id?: string | null
          id?: string
          justificativa?: string | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          status?: string
          valor_escolhido?: string | null
          valor_fonte_a?: string | null
          valor_fonte_b?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fonte_conflito_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "fonte_conflito_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fonte_conflito_fonte_a_doc_id_fkey"
            columns: ["fonte_a_doc_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fonte_conflito_fonte_b_doc_id_fkey"
            columns: ["fonte_b_doc_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      index_series: {
        Row: {
          competencia: string
          criado_em: string | null
          fonte: string | null
          id: string
          nome: string
          valor: number
          versao: number | null
        }
        Insert: {
          competencia: string
          criado_em?: string | null
          fonte?: string | null
          id?: string
          nome: string
          valor: number
          versao?: number | null
        }
        Update: {
          competencia?: string
          criado_em?: string | null
          fonte?: string | null
          id?: string
          nome?: string
          valor?: number
          versao?: number | null
        }
        Relationships: []
      }
      indices_oficiais: {
        Row: {
          data_referencia: string
          serie_id: number
          ultima_atualizacao: string | null
          valor: number
        }
        Insert: {
          data_referencia: string
          serie_id: number
          ultima_atualizacao?: string | null
          valor: number
        }
        Update: {
          data_referencia?: string
          serie_id?: number
          ultima_atualizacao?: string | null
          valor?: number
        }
        Relationships: []
      }
      legal_rules: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          codigo: string
          created_at: string
          descricao: string | null
          flag_controversia: boolean | null
          formula_texto: string | null
          id: string
          jurisdicao: string
          link_ref: string | null
          parametros_json: Json | null
          prioridade: number | null
          referencia: string | null
          referencia_curta: string | null
          source_id: string | null
          status: string
          tese_opcoes: Json | null
          titulo: string
          updated_at: string
          versao: number | null
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          codigo: string
          created_at?: string
          descricao?: string | null
          flag_controversia?: boolean | null
          formula_texto?: string | null
          id?: string
          jurisdicao?: string
          link_ref?: string | null
          parametros_json?: Json | null
          prioridade?: number | null
          referencia?: string | null
          referencia_curta?: string | null
          source_id?: string | null
          status?: string
          tese_opcoes?: Json | null
          titulo: string
          updated_at?: string
          versao?: number | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          codigo?: string
          created_at?: string
          descricao?: string | null
          flag_controversia?: boolean | null
          formula_texto?: string | null
          id?: string
          jurisdicao?: string
          link_ref?: string | null
          parametros_json?: Json | null
          prioridade?: number | null
          referencia?: string | null
          referencia_curta?: string | null
          source_id?: string | null
          status?: string
          tese_opcoes?: Json | null
          titulo?: string
          updated_at?: string
          versao?: number | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_rules_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "legal_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_sources: {
        Row: {
          ativo: boolean | null
          created_at: string
          id: string
          nome: string
          notas: string | null
          observado_em: string | null
          orgao: string
          publicado_em: string | null
          status: string
          tipo: string
          updated_at: string
          url: string | null
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          id?: string
          nome: string
          notas?: string | null
          observado_em?: string | null
          orgao: string
          publicado_em?: string | null
          status?: string
          tipo: string
          updated_at?: string
          url?: string | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          id?: string
          nome?: string
          notas?: string | null
          observado_em?: string | null
          orgao?: string
          publicado_em?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          url?: string | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: []
      }
      parties: {
        Row: {
          case_id: string
          contato: Json | null
          created_at: string
          documento: string | null
          documento_tipo: string | null
          id: string
          nome: string
          tipo: Database["public"]["Enums"]["party_type"]
          updated_at: string
        }
        Insert: {
          case_id: string
          contato?: Json | null
          created_at?: string
          documento?: string | null
          documento_tipo?: string | null
          id?: string
          nome: string
          tipo: Database["public"]["Enums"]["party_type"]
          updated_at?: string
        }
        Update: {
          case_id?: string
          contato?: Json | null
          created_at?: string
          documento?: string | null
          documento_tipo?: string | null
          id?: string
          nome?: string
          tipo?: Database["public"]["Enums"]["party_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parties_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "parties_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      petition_templates: {
        Row: {
          ativo: boolean | null
          content_markdown: string | null
          created_at: string
          descricao: string | null
          estrutura: Json
          id: string
          is_default: boolean | null
          nome: string
          tipo: string
          variaveis: Json | null
        }
        Insert: {
          ativo?: boolean | null
          content_markdown?: string | null
          created_at?: string
          descricao?: string | null
          estrutura?: Json
          id: string
          is_default?: boolean | null
          nome: string
          tipo: string
          variaveis?: Json | null
        }
        Update: {
          ativo?: boolean | null
          content_markdown?: string | null
          created_at?: string
          descricao?: string | null
          estrutura?: Json
          id?: string
          is_default?: boolean | null
          nome?: string
          tipo?: string
          variaveis?: Json | null
        }
        Relationships: []
      }
      petitions: {
        Row: {
          ai_model_used: string | null
          calculation_run_id: string | null
          case_id: string
          conteudo_completo: string | null
          created_at: string
          created_by: string | null
          facts_snapshot: Json | null
          fundamentacao_juridica: string | null
          generation_config: Json | null
          generation_time_ms: number | null
          id: string
          last_edited_by: string | null
          memoria_calculo_html: string | null
          narrativa_fatos: string | null
          pedidos: Json | null
          ressalvas: string | null
          status: string
          template_id: string | null
          theses_used: Json | null
          tipo: string
          titulo: string | null
          updated_at: string
        }
        Insert: {
          ai_model_used?: string | null
          calculation_run_id?: string | null
          case_id: string
          conteudo_completo?: string | null
          created_at?: string
          created_by?: string | null
          facts_snapshot?: Json | null
          fundamentacao_juridica?: string | null
          generation_config?: Json | null
          generation_time_ms?: number | null
          id?: string
          last_edited_by?: string | null
          memoria_calculo_html?: string | null
          narrativa_fatos?: string | null
          pedidos?: Json | null
          ressalvas?: string | null
          status?: string
          template_id?: string | null
          theses_used?: Json | null
          tipo?: string
          titulo?: string | null
          updated_at?: string
        }
        Update: {
          ai_model_used?: string | null
          calculation_run_id?: string | null
          case_id?: string
          conteudo_completo?: string | null
          created_at?: string
          created_by?: string | null
          facts_snapshot?: Json | null
          fundamentacao_juridica?: string | null
          generation_config?: Json | null
          generation_time_ms?: number | null
          id?: string
          last_edited_by?: string | null
          memoria_calculo_html?: string | null
          narrativa_fatos?: string | null
          pedidos?: Json | null
          ressalvas?: string | null
          status?: string
          template_id?: string | null
          theses_used?: Json | null
          tipo?: string
          titulo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "petitions_calculation_run_id_fkey"
            columns: ["calculation_run_id"]
            isOneToOne: false
            referencedRelation: "calculation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petitions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "petitions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      pjc_import_jobs: {
        Row: {
          arquivo_hash: string | null
          arquivo_nome: string | null
          calculo_id: string
          case_id: string
          completed_at: string | null
          created_at: string | null
          historicos_importados: number | null
          id: string
          reflexos_importados: number | null
          resultado: Json | null
          status: string | null
          user_id: string
          verbas_importadas: number | null
          warnings: Json | null
        }
        Insert: {
          arquivo_hash?: string | null
          arquivo_nome?: string | null
          calculo_id: string
          case_id: string
          completed_at?: string | null
          created_at?: string | null
          historicos_importados?: number | null
          id?: string
          reflexos_importados?: number | null
          resultado?: Json | null
          status?: string | null
          user_id: string
          verbas_importadas?: number | null
          warnings?: Json | null
        }
        Update: {
          arquivo_hash?: string | null
          arquivo_nome?: string | null
          calculo_id?: string
          case_id?: string
          completed_at?: string | null
          created_at?: string | null
          historicos_importados?: number | null
          id?: string
          reflexos_importados?: number | null
          resultado?: Json | null
          status?: string | null
          user_id?: string
          verbas_importadas?: number | null
          warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "pjc_import_jobs_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjc_import_jobs_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_correcao_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjc_import_jobs_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_cs_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjc_import_jobs_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_custas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjc_import_jobs_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_dados_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjc_import_jobs_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_fgts_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjc_import_jobs_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjc_import_jobs_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_ir_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjc_import_jobs_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_multas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjc_import_jobs_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_parametros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjc_import_jobs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjc_import_jobs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_apuracao_diaria: {
        Row: {
          calculo_id: string
          created_at: string | null
          data: string
          documento_id: string | null
          feriado_nome: string | null
          frequencia_str: string | null
          horas_extras_diaria: number | null
          horas_extras_semanal: number | null
          horas_noturnas: number | null
          horas_trabalhadas: number | null
          id: string
          is_afastamento: boolean | null
          is_compensado: boolean | null
          is_dsr: boolean | null
          is_falta: boolean | null
          is_feriado: boolean | null
          is_ferias: boolean | null
          minutos_art253: number | null
          minutos_art384: number | null
          minutos_extra_diaria: number | null
          minutos_extra_feriado: number | null
          minutos_extra_repouso: number | null
          minutos_extra_semanal: number | null
          minutos_interjornada: number | null
          minutos_intrajornada: number | null
          minutos_noturno: number | null
          minutos_trabalhados: number | null
          origem: string | null
          pagina: number | null
        }
        Insert: {
          calculo_id: string
          created_at?: string | null
          data: string
          documento_id?: string | null
          feriado_nome?: string | null
          frequencia_str?: string | null
          horas_extras_diaria?: number | null
          horas_extras_semanal?: number | null
          horas_noturnas?: number | null
          horas_trabalhadas?: number | null
          id?: string
          is_afastamento?: boolean | null
          is_compensado?: boolean | null
          is_dsr?: boolean | null
          is_falta?: boolean | null
          is_feriado?: boolean | null
          is_ferias?: boolean | null
          minutos_art253?: number | null
          minutos_art384?: number | null
          minutos_extra_diaria?: number | null
          minutos_extra_feriado?: number | null
          minutos_extra_repouso?: number | null
          minutos_extra_semanal?: number | null
          minutos_interjornada?: number | null
          minutos_intrajornada?: number | null
          minutos_noturno?: number | null
          minutos_trabalhados?: number | null
          origem?: string | null
          pagina?: number | null
        }
        Update: {
          calculo_id?: string
          created_at?: string | null
          data?: string
          documento_id?: string | null
          feriado_nome?: string | null
          frequencia_str?: string | null
          horas_extras_diaria?: number | null
          horas_extras_semanal?: number | null
          horas_noturnas?: number | null
          horas_trabalhadas?: number | null
          id?: string
          is_afastamento?: boolean | null
          is_compensado?: boolean | null
          is_dsr?: boolean | null
          is_falta?: boolean | null
          is_feriado?: boolean | null
          is_ferias?: boolean | null
          minutos_art253?: number | null
          minutos_art384?: number | null
          minutos_extra_diaria?: number | null
          minutos_extra_feriado?: number | null
          minutos_extra_repouso?: number | null
          minutos_extra_semanal?: number | null
          minutos_interjornada?: number | null
          minutos_intrajornada?: number | null
          minutos_noturno?: number | null
          minutos_trabalhados?: number | null
          origem?: string | null
          pagina?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_apuracao_diaria_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_apuracao_diaria_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_correcao_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_apuracao_diaria_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_cs_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_apuracao_diaria_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_custas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_apuracao_diaria_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_dados_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_apuracao_diaria_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_fgts_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_apuracao_diaria_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_apuracao_diaria_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_ir_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_apuracao_diaria_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_multas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_apuracao_diaria_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_parametros"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_atualizacao_config: {
        Row: {
          calculo_id: string
          combinacoes_indice: string | null
          combinacoes_juros: string | null
          created_at: string | null
          id: string
          observacoes: string | null
          regime_padrao: string | null
          regimes: Json
          tipo: string
        }
        Insert: {
          calculo_id: string
          combinacoes_indice?: string | null
          combinacoes_juros?: string | null
          created_at?: string | null
          id?: string
          observacoes?: string | null
          regime_padrao?: string | null
          regimes?: Json
          tipo: string
        }
        Update: {
          calculo_id?: string
          combinacoes_indice?: string | null
          combinacoes_juros?: string | null
          created_at?: string | null
          id?: string
          observacoes?: string | null
          regime_padrao?: string | null
          regimes?: Json
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_atualizacao_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_atualizacao_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_correcao_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_atualizacao_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_cs_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_atualizacao_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_custas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_atualizacao_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_dados_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_atualizacao_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_fgts_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_atualizacao_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_atualizacao_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_ir_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_atualizacao_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_multas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_atualizacao_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_parametros"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_audit_log: {
        Row: {
          acao: string
          campo: string | null
          case_id: string
          created_at: string | null
          id: string
          justificativa: string | null
          metadata: Json | null
          modulo: string
          user_id: string | null
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          acao: string
          campo?: string | null
          case_id: string
          created_at?: string | null
          id?: string
          justificativa?: string | null
          metadata?: Json | null
          modulo: string
          user_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          acao?: string
          campo?: string | null
          case_id?: string
          created_at?: string | null
          id?: string
          justificativa?: string | null
          metadata?: Json | null
          modulo?: string
          user_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: []
      }
      pjecalc_calculos: {
        Row: {
          aviso_previo_dias: number | null
          aviso_previo_tipo: string | null
          case_id: string
          considera_feriado_estadual: boolean | null
          considera_feriado_municipal: boolean | null
          created_at: string | null
          cs_aliquota_empresa: number | null
          cs_aliquota_sat: number | null
          cs_aliquota_terceiros: number | null
          cs_cobrar_reclamante: boolean | null
          cs_sobre_salarios_pagos: boolean | null
          custas_limite: number | null
          custas_percentual: number | null
          data_admissao: string | null
          data_ajuizamento: string | null
          data_demissao: string | null
          data_fim_calculo: string | null
          data_inicio_calculo: string | null
          data_liquidacao: string | null
          dia_fechamento: number | null
          divisor_horas: number | null
          duplicado_de: string | null
          hash_estado: string | null
          honorarios_percentual: number | null
          honorarios_sobre: string | null
          id: string
          jornada_contratual_horas: number | null
          limitar_avos: boolean | null
          multa_467_habilitada: boolean | null
          multa_477_habilitada: boolean | null
          observacoes: string | null
          percentual_adicional_noturno: number | null
          percentual_he_100: number | null
          percentual_he_50: number | null
          pjc_import_metadata: Json | null
          prescricao_fgts: boolean | null
          prescricao_quinquenal: boolean | null
          processo_cnj: string | null
          projeta_aviso: boolean | null
          reclamado_cnpj: string | null
          reclamado_nome: string | null
          reclamante_cpf: string | null
          reclamante_nome: string | null
          sabado_dia_util: boolean | null
          status: string | null
          tipo_demissao: string | null
          tribunal: string | null
          updated_at: string | null
          user_id: string
          vara: string | null
          versao: number | null
          zera_negativo: boolean | null
        }
        Insert: {
          aviso_previo_dias?: number | null
          aviso_previo_tipo?: string | null
          case_id: string
          considera_feriado_estadual?: boolean | null
          considera_feriado_municipal?: boolean | null
          created_at?: string | null
          cs_aliquota_empresa?: number | null
          cs_aliquota_sat?: number | null
          cs_aliquota_terceiros?: number | null
          cs_cobrar_reclamante?: boolean | null
          cs_sobre_salarios_pagos?: boolean | null
          custas_limite?: number | null
          custas_percentual?: number | null
          data_admissao?: string | null
          data_ajuizamento?: string | null
          data_demissao?: string | null
          data_fim_calculo?: string | null
          data_inicio_calculo?: string | null
          data_liquidacao?: string | null
          dia_fechamento?: number | null
          divisor_horas?: number | null
          duplicado_de?: string | null
          hash_estado?: string | null
          honorarios_percentual?: number | null
          honorarios_sobre?: string | null
          id?: string
          jornada_contratual_horas?: number | null
          limitar_avos?: boolean | null
          multa_467_habilitada?: boolean | null
          multa_477_habilitada?: boolean | null
          observacoes?: string | null
          percentual_adicional_noturno?: number | null
          percentual_he_100?: number | null
          percentual_he_50?: number | null
          pjc_import_metadata?: Json | null
          prescricao_fgts?: boolean | null
          prescricao_quinquenal?: boolean | null
          processo_cnj?: string | null
          projeta_aviso?: boolean | null
          reclamado_cnpj?: string | null
          reclamado_nome?: string | null
          reclamante_cpf?: string | null
          reclamante_nome?: string | null
          sabado_dia_util?: boolean | null
          status?: string | null
          tipo_demissao?: string | null
          tribunal?: string | null
          updated_at?: string | null
          user_id: string
          vara?: string | null
          versao?: number | null
          zera_negativo?: boolean | null
        }
        Update: {
          aviso_previo_dias?: number | null
          aviso_previo_tipo?: string | null
          case_id?: string
          considera_feriado_estadual?: boolean | null
          considera_feriado_municipal?: boolean | null
          created_at?: string | null
          cs_aliquota_empresa?: number | null
          cs_aliquota_sat?: number | null
          cs_aliquota_terceiros?: number | null
          cs_cobrar_reclamante?: boolean | null
          cs_sobre_salarios_pagos?: boolean | null
          custas_limite?: number | null
          custas_percentual?: number | null
          data_admissao?: string | null
          data_ajuizamento?: string | null
          data_demissao?: string | null
          data_fim_calculo?: string | null
          data_inicio_calculo?: string | null
          data_liquidacao?: string | null
          dia_fechamento?: number | null
          divisor_horas?: number | null
          duplicado_de?: string | null
          hash_estado?: string | null
          honorarios_percentual?: number | null
          honorarios_sobre?: string | null
          id?: string
          jornada_contratual_horas?: number | null
          limitar_avos?: boolean | null
          multa_467_habilitada?: boolean | null
          multa_477_habilitada?: boolean | null
          observacoes?: string | null
          percentual_adicional_noturno?: number | null
          percentual_he_100?: number | null
          percentual_he_50?: number | null
          pjc_import_metadata?: Json | null
          prescricao_fgts?: boolean | null
          prescricao_quinquenal?: boolean | null
          processo_cnj?: string | null
          projeta_aviso?: boolean | null
          reclamado_cnpj?: string | null
          reclamado_nome?: string | null
          reclamante_cpf?: string | null
          reclamante_nome?: string | null
          sabado_dia_util?: boolean | null
          status?: string | null
          tipo_demissao?: string | null
          tribunal?: string | null
          updated_at?: string | null
          user_id?: string
          vara?: string | null
          versao?: number | null
          zera_negativo?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_duplicado_de_fkey"
            columns: ["duplicado_de"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_duplicado_de_fkey"
            columns: ["duplicado_de"]
            isOneToOne: false
            referencedRelation: "pjecalc_correcao_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_duplicado_de_fkey"
            columns: ["duplicado_de"]
            isOneToOne: false
            referencedRelation: "pjecalc_cs_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_duplicado_de_fkey"
            columns: ["duplicado_de"]
            isOneToOne: false
            referencedRelation: "pjecalc_custas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_duplicado_de_fkey"
            columns: ["duplicado_de"]
            isOneToOne: false
            referencedRelation: "pjecalc_dados_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_duplicado_de_fkey"
            columns: ["duplicado_de"]
            isOneToOne: false
            referencedRelation: "pjecalc_fgts_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_duplicado_de_fkey"
            columns: ["duplicado_de"]
            isOneToOne: false
            referencedRelation: "pjecalc_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_duplicado_de_fkey"
            columns: ["duplicado_de"]
            isOneToOne: false
            referencedRelation: "pjecalc_ir_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_duplicado_de_fkey"
            columns: ["duplicado_de"]
            isOneToOne: false
            referencedRelation: "pjecalc_multas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_duplicado_de_fkey"
            columns: ["duplicado_de"]
            isOneToOne: false
            referencedRelation: "pjecalc_parametros"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_contribuicao_social: {
        Row: {
          aliquota: number
          competencia: string
          created_at: string
          faixa: number
          id: string
          teto_beneficio: number | null
          teto_maximo: number | null
          tipo: string
          valor_final: number
          valor_inicial: number
          version_id: string | null
        }
        Insert: {
          aliquota: number
          competencia: string
          created_at?: string
          faixa?: number
          id?: string
          teto_beneficio?: number | null
          teto_maximo?: number | null
          tipo?: string
          valor_final: number
          valor_inicial?: number
          version_id?: string | null
        }
        Update: {
          aliquota?: number
          competencia?: string
          created_at?: string
          faixa?: number
          id?: string
          teto_beneficio?: number | null
          teto_maximo?: number | null
          tipo?: string
          valor_final?: number
          valor_inicial?: number
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_contribuicao_social_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "reference_table_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_correcao_monetaria: {
        Row: {
          acumulado: number | null
          competencia: string
          created_at: string
          fonte: string | null
          id: string
          indice: string
          valor: number
          version_id: string | null
        }
        Insert: {
          acumulado?: number | null
          competencia: string
          created_at?: string
          fonte?: string | null
          id?: string
          indice: string
          valor: number
          version_id?: string | null
        }
        Update: {
          acumulado?: number | null
          competencia?: string
          created_at?: string
          fonte?: string | null
          id?: string
          indice?: string
          valor?: number
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_correcao_monetaria_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "reference_table_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_evento_intervalo: {
        Row: {
          calculo_id: string
          confianca: number | null
          created_at: string | null
          data_fim: string
          data_inicio: string
          documento_id: string | null
          ferias_abono: boolean | null
          ferias_aquisitivo_fim: string | null
          ferias_aquisitivo_inicio: string | null
          ferias_concessivo_fim: string | null
          ferias_concessivo_inicio: string | null
          ferias_dias: number | null
          ferias_dias_abono: number | null
          ferias_dobra: boolean | null
          ferias_gozo2_fim: string | null
          ferias_gozo2_inicio: string | null
          ferias_gozo3_fim: string | null
          ferias_gozo3_inicio: string | null
          ferias_situacao: string | null
          id: string
          justificado: boolean | null
          motivo: string | null
          observacoes: string | null
          pagina: number | null
          status_revisao: string | null
          tipo: string
        }
        Insert: {
          calculo_id: string
          confianca?: number | null
          created_at?: string | null
          data_fim: string
          data_inicio: string
          documento_id?: string | null
          ferias_abono?: boolean | null
          ferias_aquisitivo_fim?: string | null
          ferias_aquisitivo_inicio?: string | null
          ferias_concessivo_fim?: string | null
          ferias_concessivo_inicio?: string | null
          ferias_dias?: number | null
          ferias_dias_abono?: number | null
          ferias_dobra?: boolean | null
          ferias_gozo2_fim?: string | null
          ferias_gozo2_inicio?: string | null
          ferias_gozo3_fim?: string | null
          ferias_gozo3_inicio?: string | null
          ferias_situacao?: string | null
          id?: string
          justificado?: boolean | null
          motivo?: string | null
          observacoes?: string | null
          pagina?: number | null
          status_revisao?: string | null
          tipo: string
        }
        Update: {
          calculo_id?: string
          confianca?: number | null
          created_at?: string | null
          data_fim?: string
          data_inicio?: string
          documento_id?: string | null
          ferias_abono?: boolean | null
          ferias_aquisitivo_fim?: string | null
          ferias_aquisitivo_inicio?: string | null
          ferias_concessivo_fim?: string | null
          ferias_concessivo_inicio?: string | null
          ferias_dias?: number | null
          ferias_dias_abono?: number | null
          ferias_dobra?: boolean | null
          ferias_gozo2_fim?: string | null
          ferias_gozo2_inicio?: string | null
          ferias_gozo3_fim?: string | null
          ferias_gozo3_inicio?: string | null
          ferias_situacao?: string | null
          id?: string
          justificado?: boolean | null
          motivo?: string | null
          observacoes?: string | null
          pagina?: number | null
          status_revisao?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_evento_intervalo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_evento_intervalo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_correcao_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_evento_intervalo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_cs_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_evento_intervalo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_custas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_evento_intervalo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_dados_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_evento_intervalo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_fgts_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_evento_intervalo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_evento_intervalo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_ir_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_evento_intervalo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_multas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_evento_intervalo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_parametros"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_feriados: {
        Row: {
          created_at: string
          data: string
          fonte: string | null
          id: string
          municipio: string | null
          municipio_ibge: string | null
          nome: string
          scope: string
          uf: string | null
          version_id: string | null
        }
        Insert: {
          created_at?: string
          data: string
          fonte?: string | null
          id?: string
          municipio?: string | null
          municipio_ibge?: string | null
          nome: string
          scope?: string
          uf?: string | null
          version_id?: string | null
        }
        Update: {
          created_at?: string
          data?: string
          fonte?: string | null
          id?: string
          municipio?: string | null
          municipio_ibge?: string | null
          nome?: string
          scope?: string
          uf?: string | null
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_feriados_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "reference_table_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_fgts_saldos_saques: {
        Row: {
          calculo_id: string
          case_id: string
          created_at: string
          data: string
          descricao: string | null
          id: string
          observacoes: string | null
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          calculo_id: string
          case_id: string
          created_at?: string
          data: string
          descricao?: string | null
          id?: string
          observacoes?: string | null
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          calculo_id?: string
          case_id?: string
          created_at?: string
          data?: string
          descricao?: string | null
          id?: string
          observacoes?: string | null
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_fgts_saldos_saques_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_fgts_saldos_saques_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_correcao_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_fgts_saldos_saques_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_cs_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_fgts_saldos_saques_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_custas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_fgts_saldos_saques_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_dados_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_fgts_saldos_saques_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_fgts_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_fgts_saldos_saques_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_fgts_saldos_saques_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_ir_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_fgts_saldos_saques_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_multas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_fgts_saldos_saques_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_parametros"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_hist_salarial: {
        Row: {
          calculo_id: string
          created_at: string | null
          id: string
          incide_fgts: boolean | null
          incide_inss: boolean | null
          incide_ir: boolean | null
          nome: string
          observacoes: string | null
          tipo_variacao: string | null
          valor_fixo: number | null
        }
        Insert: {
          calculo_id: string
          created_at?: string | null
          id?: string
          incide_fgts?: boolean | null
          incide_inss?: boolean | null
          incide_ir?: boolean | null
          nome: string
          observacoes?: string | null
          tipo_variacao?: string | null
          valor_fixo?: number | null
        }
        Update: {
          calculo_id?: string
          created_at?: string | null
          id?: string
          incide_fgts?: boolean | null
          incide_inss?: boolean | null
          incide_ir?: boolean | null
          nome?: string
          observacoes?: string | null
          tipo_variacao?: string | null
          valor_fixo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_hist_salarial_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_hist_salarial_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_correcao_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_hist_salarial_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_cs_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_hist_salarial_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_custas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_hist_salarial_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_dados_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_hist_salarial_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_fgts_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_hist_salarial_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_hist_salarial_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_ir_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_hist_salarial_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_multas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_hist_salarial_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_parametros"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_hist_salarial_mes: {
        Row: {
          calculo_id: string
          competencia: string
          created_at: string | null
          documento_id: string | null
          hist_salarial_id: string
          id: string
          origem: string | null
          valor: number
        }
        Insert: {
          calculo_id: string
          competencia: string
          created_at?: string | null
          documento_id?: string | null
          hist_salarial_id: string
          id?: string
          origem?: string | null
          valor?: number
        }
        Update: {
          calculo_id?: string
          competencia?: string
          created_at?: string | null
          documento_id?: string | null
          hist_salarial_id?: string
          id?: string
          origem?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_hist_salarial_mes_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_hist_salarial_mes_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_correcao_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_hist_salarial_mes_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_cs_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_hist_salarial_mes_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_custas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_hist_salarial_mes_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_dados_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_hist_salarial_mes_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_fgts_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_hist_salarial_mes_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_hist_salarial_mes_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_ir_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_hist_salarial_mes_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_multas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_hist_salarial_mes_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_parametros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_hist_salarial_mes_hist_salarial_id_fkey"
            columns: ["hist_salarial_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_hist_salarial"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_hist_salarial_mes_hist_salarial_id_fkey"
            columns: ["hist_salarial_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_historico_salarial"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_imposto_renda: {
        Row: {
          competencia: string
          created_at: string
          deducao_aposentado_65: number
          deducao_dependente: number
          id: string
        }
        Insert: {
          competencia: string
          created_at?: string
          deducao_aposentado_65?: number
          deducao_dependente?: number
          id?: string
        }
        Update: {
          competencia?: string
          created_at?: string
          deducao_aposentado_65?: number
          deducao_dependente?: number
          id?: string
        }
        Relationships: []
      }
      pjecalc_imposto_renda_faixas: {
        Row: {
          aliquota: number
          created_at: string
          faixa: number
          id: string
          ir_id: string
          parcela_deduzir: number
          valor_final: number | null
          valor_inicial: number
        }
        Insert: {
          aliquota?: number
          created_at?: string
          faixa?: number
          id?: string
          ir_id: string
          parcela_deduzir?: number
          valor_final?: number | null
          valor_inicial?: number
        }
        Update: {
          aliquota?: number
          created_at?: string
          faixa?: number
          id?: string
          ir_id?: string
          parcela_deduzir?: number
          valor_final?: number | null
          valor_inicial?: number
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_imposto_renda_faixas_ir_id_fkey"
            columns: ["ir_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_imposto_renda"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_inss_faixas: {
        Row: {
          aliquota: number
          competencia_fim: string | null
          competencia_inicio: string
          created_at: string | null
          faixa: number
          id: string
          valor_ate: number
        }
        Insert: {
          aliquota: number
          competencia_fim?: string | null
          competencia_inicio: string
          created_at?: string | null
          faixa: number
          id?: string
          valor_ate: number
        }
        Update: {
          aliquota?: number
          competencia_fim?: string | null
          competencia_inicio?: string
          created_at?: string | null
          faixa?: number
          id?: string
          valor_ate?: number
        }
        Relationships: []
      }
      pjecalc_juros_mora: {
        Row: {
          acumulado: number | null
          competencia: string
          created_at: string
          id: string
          taxa_mensal: number
          tipo: string
        }
        Insert: {
          acumulado?: number | null
          competencia: string
          created_at?: string
          id?: string
          taxa_mensal: number
          tipo?: string
        }
        Update: {
          acumulado?: number | null
          competencia?: string
          created_at?: string
          id?: string
          taxa_mensal?: number
          tipo?: string
        }
        Relationships: []
      }
      pjecalc_observacoes: {
        Row: {
          case_id: string
          created_at: string
          created_by: string | null
          id: string
          modulo: string
          texto: string
          tipo: string
        }
        Insert: {
          case_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          modulo: string
          texto: string
          tipo?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string
          texto?: string
          tipo?: string
        }
        Relationships: []
      }
      pjecalc_ocorrencia_calculo: {
        Row: {
          ativa: boolean | null
          base_integral: number | null
          base_valor: number | null
          calculo_id: string
          competencia: string
          correcao: number | null
          created_at: string | null
          devido: number | null
          devido_integral: number | null
          diferenca: number | null
          divisor: number | null
          dobra: number | null
          fator_correcao: number | null
          id: string
          indice_acumulado: number | null
          indice_usado: string | null
          juros: number | null
          juros_regime_usado: string | null
          multiplicador: number | null
          nome: string
          origem: string | null
          pago: number | null
          pago_integral: number | null
          parametros_snapshot: Json | null
          quantidade: number | null
          quantidade_integral: number | null
          reflexo_id: string | null
          taxa_juros: number | null
          tipo: string
          total: number | null
          updated_at: string | null
          verba_base_id: string | null
        }
        Insert: {
          ativa?: boolean | null
          base_integral?: number | null
          base_valor?: number | null
          calculo_id: string
          competencia: string
          correcao?: number | null
          created_at?: string | null
          devido?: number | null
          devido_integral?: number | null
          diferenca?: number | null
          divisor?: number | null
          dobra?: number | null
          fator_correcao?: number | null
          id?: string
          indice_acumulado?: number | null
          indice_usado?: string | null
          juros?: number | null
          juros_regime_usado?: string | null
          multiplicador?: number | null
          nome: string
          origem?: string | null
          pago?: number | null
          pago_integral?: number | null
          parametros_snapshot?: Json | null
          quantidade?: number | null
          quantidade_integral?: number | null
          reflexo_id?: string | null
          taxa_juros?: number | null
          tipo: string
          total?: number | null
          updated_at?: string | null
          verba_base_id?: string | null
        }
        Update: {
          ativa?: boolean | null
          base_integral?: number | null
          base_valor?: number | null
          calculo_id?: string
          competencia?: string
          correcao?: number | null
          created_at?: string | null
          devido?: number | null
          devido_integral?: number | null
          diferenca?: number | null
          divisor?: number | null
          dobra?: number | null
          fator_correcao?: number | null
          id?: string
          indice_acumulado?: number | null
          indice_usado?: string | null
          juros?: number | null
          juros_regime_usado?: string | null
          multiplicador?: number | null
          nome?: string
          origem?: string | null
          pago?: number | null
          pago_integral?: number | null
          parametros_snapshot?: Json | null
          quantidade?: number | null
          quantidade_integral?: number | null
          reflexo_id?: string | null
          taxa_juros?: number | null
          tipo?: string
          total?: number | null
          updated_at?: string | null
          verba_base_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_correcao_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_cs_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_custas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_dados_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_fgts_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_ir_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_multas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_parametros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_reflexo_id_fkey"
            columns: ["reflexo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_reflexo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_verba_base_id_fkey"
            columns: ["verba_base_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_verba_base"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_verba_base_id_fkey"
            columns: ["verba_base_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_verbas"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_pensao_alimenticia_config: {
        Row: {
          apurar: boolean
          base_incidencia: string | null
          beneficiario: string | null
          calculo_id: string
          created_at: string
          id: string
          observacoes: string | null
          percentual: number | null
          tipo: string
          updated_at: string
          valor_fixo: number | null
        }
        Insert: {
          apurar?: boolean
          base_incidencia?: string | null
          beneficiario?: string | null
          calculo_id: string
          created_at?: string
          id?: string
          observacoes?: string | null
          percentual?: number | null
          tipo?: string
          updated_at?: string
          valor_fixo?: number | null
        }
        Update: {
          apurar?: boolean
          base_incidencia?: string | null
          beneficiario?: string | null
          calculo_id?: string
          created_at?: string
          id?: string
          observacoes?: string | null
          percentual?: number | null
          tipo?: string
          updated_at?: string
          valor_fixo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_pensao_alimenticia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_pensao_alimenticia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_correcao_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_pensao_alimenticia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_cs_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_pensao_alimenticia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_custas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_pensao_alimenticia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_dados_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_pensao_alimenticia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_fgts_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_pensao_alimenticia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_pensao_alimenticia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_ir_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_pensao_alimenticia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_multas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_pensao_alimenticia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_parametros"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_pisos_salariais: {
        Row: {
          categoria: string | null
          competencia: string
          created_at: string
          fonte_doc: string | null
          id: string
          nome: string
          sindicato: string | null
          uf: string
          valor: number
          version_id: string | null
        }
        Insert: {
          categoria?: string | null
          competencia: string
          created_at?: string
          fonte_doc?: string | null
          id?: string
          nome: string
          sindicato?: string | null
          uf: string
          valor: number
          version_id?: string | null
        }
        Update: {
          categoria?: string | null
          competencia?: string
          created_at?: string
          fonte_doc?: string | null
          id?: string
          nome?: string
          sindicato?: string | null
          uf?: string
          valor?: number
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_pisos_salariais_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "reference_table_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_prev_privada_config: {
        Row: {
          apurar: boolean
          calculo_id: string
          created_at: string
          entidade: string | null
          id: string
          observacoes: string | null
          percentual_empregado: number | null
          percentual_empregador: number | null
          updated_at: string
        }
        Insert: {
          apurar?: boolean
          calculo_id: string
          created_at?: string
          entidade?: string | null
          id?: string
          observacoes?: string | null
          percentual_empregado?: number | null
          percentual_empregador?: number | null
          updated_at?: string
        }
        Update: {
          apurar?: boolean
          calculo_id?: string
          created_at?: string
          entidade?: string | null
          id?: string
          observacoes?: string | null
          percentual_empregado?: number | null
          percentual_empregador?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_prev_privada_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_prev_privada_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_correcao_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_prev_privada_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_cs_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_prev_privada_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_custas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_prev_privada_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_dados_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_prev_privada_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_fgts_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_prev_privada_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_prev_privada_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_ir_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_prev_privada_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_multas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_prev_privada_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_parametros"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_reflexo: {
        Row: {
          ativa: boolean | null
          calculo_id: string
          codigo: string | null
          comportamento_reflexo: string | null
          created_at: string | null
          divisor: number | null
          divisor_tipo: string | null
          gerar_principal: boolean | null
          gerar_reflexo: boolean | null
          id: string
          incide_fgts: boolean | null
          incide_inss: boolean | null
          incide_ir: boolean | null
          media_meses: number | null
          media_tipo: string | null
          multiplicador: number | null
          nome: string
          observacoes: string | null
          ordem: number | null
          periodo_fim: string | null
          periodo_inicio: string | null
          periodo_media_reflexo: string | null
          pjc_id: string | null
          quantidade_tipo: string | null
          tipo: string
          tratamento_fracao_mes: string | null
        }
        Insert: {
          ativa?: boolean | null
          calculo_id: string
          codigo?: string | null
          comportamento_reflexo?: string | null
          created_at?: string | null
          divisor?: number | null
          divisor_tipo?: string | null
          gerar_principal?: boolean | null
          gerar_reflexo?: boolean | null
          id?: string
          incide_fgts?: boolean | null
          incide_inss?: boolean | null
          incide_ir?: boolean | null
          media_meses?: number | null
          media_tipo?: string | null
          multiplicador?: number | null
          nome: string
          observacoes?: string | null
          ordem?: number | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          periodo_media_reflexo?: string | null
          pjc_id?: string | null
          quantidade_tipo?: string | null
          tipo: string
          tratamento_fracao_mes?: string | null
        }
        Update: {
          ativa?: boolean | null
          calculo_id?: string
          codigo?: string | null
          comportamento_reflexo?: string | null
          created_at?: string | null
          divisor?: number | null
          divisor_tipo?: string | null
          gerar_principal?: boolean | null
          gerar_reflexo?: boolean | null
          id?: string
          incide_fgts?: boolean | null
          incide_inss?: boolean | null
          incide_ir?: boolean | null
          media_meses?: number | null
          media_tipo?: string | null
          multiplicador?: number | null
          nome?: string
          observacoes?: string | null
          ordem?: number | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          periodo_media_reflexo?: string | null
          pjc_id?: string | null
          quantidade_tipo?: string | null
          tipo?: string
          tratamento_fracao_mes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_reflexo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_reflexo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_correcao_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_reflexo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_cs_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_reflexo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_custas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_reflexo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_dados_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_reflexo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_fgts_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_reflexo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_reflexo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_ir_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_reflexo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_multas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_reflexo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_parametros"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_reflexo_base_verba: {
        Row: {
          id: string
          integralizar: boolean | null
          reflexo_id: string
          verba_base_id: string
        }
        Insert: {
          id?: string
          integralizar?: boolean | null
          reflexo_id: string
          verba_base_id: string
        }
        Update: {
          id?: string
          integralizar?: boolean | null
          reflexo_id?: string
          verba_base_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_reflexo_base_verba_reflexo_id_fkey"
            columns: ["reflexo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_reflexo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_reflexo_base_verba_verba_base_id_fkey"
            columns: ["verba_base_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_verba_base"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_reflexo_base_verba_verba_base_id_fkey"
            columns: ["verba_base_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_verbas"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_resultado: {
        Row: {
          calculado_em: string | null
          calculo_id: string
          created_at: string | null
          custas: number | null
          desconto_inss_reclamado: number | null
          desconto_inss_reclamante: number | null
          desconto_ir: number | null
          engine_version: string | null
          fgts_depositar: number | null
          fgts_multa_40: number | null
          hash_resultado: string | null
          honorarios: number | null
          id: string
          multa_467: number | null
          multa_477: number | null
          resumo_verbas: Json | null
          total_bruto: number | null
          total_correcao: number | null
          total_diferenca: number | null
          total_juros: number | null
          total_liquido_antes_descontos: number | null
          total_pago: number | null
          total_reclamado: number | null
          total_reclamante: number | null
        }
        Insert: {
          calculado_em?: string | null
          calculo_id: string
          created_at?: string | null
          custas?: number | null
          desconto_inss_reclamado?: number | null
          desconto_inss_reclamante?: number | null
          desconto_ir?: number | null
          engine_version?: string | null
          fgts_depositar?: number | null
          fgts_multa_40?: number | null
          hash_resultado?: string | null
          honorarios?: number | null
          id?: string
          multa_467?: number | null
          multa_477?: number | null
          resumo_verbas?: Json | null
          total_bruto?: number | null
          total_correcao?: number | null
          total_diferenca?: number | null
          total_juros?: number | null
          total_liquido_antes_descontos?: number | null
          total_pago?: number | null
          total_reclamado?: number | null
          total_reclamante?: number | null
        }
        Update: {
          calculado_em?: string | null
          calculo_id?: string
          created_at?: string | null
          custas?: number | null
          desconto_inss_reclamado?: number | null
          desconto_inss_reclamante?: number | null
          desconto_ir?: number | null
          engine_version?: string | null
          fgts_depositar?: number | null
          fgts_multa_40?: number | null
          hash_resultado?: string | null
          honorarios?: number | null
          id?: string
          multa_467?: number | null
          multa_477?: number | null
          resumo_verbas?: Json | null
          total_bruto?: number | null
          total_correcao?: number | null
          total_diferenca?: number | null
          total_juros?: number | null
          total_liquido_antes_descontos?: number | null
          total_pago?: number | null
          total_reclamado?: number | null
          total_reclamante?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_resultado_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_resultado_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_correcao_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_resultado_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_cs_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_resultado_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_custas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_resultado_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_dados_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_resultado_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_fgts_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_resultado_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_resultado_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_ir_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_resultado_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_multas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_resultado_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_parametros"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_rubrica_map: {
        Row: {
          ativo: boolean | null
          categoria: string
          codigo_match: string | null
          conceito: string
          created_at: string | null
          descricao_regex: string | null
          empresa_cnpj: string | null
          id: string
          prioridade: number | null
        }
        Insert: {
          ativo?: boolean | null
          categoria: string
          codigo_match?: string | null
          conceito: string
          created_at?: string | null
          descricao_regex?: string | null
          empresa_cnpj?: string | null
          id?: string
          prioridade?: number | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string
          codigo_match?: string | null
          conceito?: string
          created_at?: string | null
          descricao_regex?: string | null
          empresa_cnpj?: string | null
          id?: string
          prioridade?: number | null
        }
        Relationships: []
      }
      pjecalc_rubrica_raw: {
        Row: {
          calculo_id: string
          classificacao: string
          codigo: string | null
          competencia: string
          confianca: number | null
          created_at: string | null
          descricao: string
          documento_id: string | null
          id: string
          pagina: number | null
          tipo_documento: string | null
          valor: number
        }
        Insert: {
          calculo_id: string
          classificacao: string
          codigo?: string | null
          competencia: string
          confianca?: number | null
          created_at?: string | null
          descricao: string
          documento_id?: string | null
          id?: string
          pagina?: number | null
          tipo_documento?: string | null
          valor: number
        }
        Update: {
          calculo_id?: string
          classificacao?: string
          codigo?: string | null
          competencia?: string
          confianca?: number | null
          created_at?: string | null
          descricao?: string
          documento_id?: string | null
          id?: string
          pagina?: number | null
          tipo_documento?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_rubrica_raw_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_rubrica_raw_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_correcao_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_rubrica_raw_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_cs_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_rubrica_raw_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_custas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_rubrica_raw_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_dados_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_rubrica_raw_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_fgts_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_rubrica_raw_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_rubrica_raw_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_ir_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_rubrica_raw_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_multas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_rubrica_raw_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_parametros"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_sal_familia_config: {
        Row: {
          apurar: boolean
          calculo_id: string
          created_at: string
          id: string
          numero_filhos: number | null
          observacoes: string | null
          updated_at: string
        }
        Insert: {
          apurar?: boolean
          calculo_id: string
          created_at?: string
          id?: string
          numero_filhos?: number | null
          observacoes?: string | null
          updated_at?: string
        }
        Update: {
          apurar?: boolean
          calculo_id?: string
          created_at?: string
          id?: string
          numero_filhos?: number | null
          observacoes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_sal_familia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_sal_familia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_correcao_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_sal_familia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_cs_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_sal_familia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_custas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_sal_familia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_dados_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_sal_familia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_fgts_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_sal_familia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_sal_familia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_ir_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_sal_familia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_multas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_sal_familia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_parametros"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_salario_familia: {
        Row: {
          competencia: string
          created_at: string
          faixa: number
          id: string
          valor_cota: number
          valor_final: number
          valor_inicial: number
          version_id: string | null
        }
        Insert: {
          competencia: string
          created_at?: string
          faixa?: number
          id?: string
          valor_cota: number
          valor_final: number
          valor_inicial?: number
          version_id?: string | null
        }
        Update: {
          competencia?: string
          created_at?: string
          faixa?: number
          id?: string
          valor_cota?: number
          valor_final?: number
          valor_inicial?: number
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_salario_familia_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "reference_table_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_salario_minimo: {
        Row: {
          competencia: string
          created_at: string
          id: string
          valor: number
          version_id: string | null
        }
        Insert: {
          competencia: string
          created_at?: string
          id?: string
          valor: number
          version_id?: string | null
        }
        Update: {
          competencia?: string
          created_at?: string
          id?: string
          valor?: number
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_salario_minimo_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "reference_table_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_seguro_desemprego: {
        Row: {
          competencia: string
          created_at: string
          faixa: number
          id: string
          percentual: number
          valor_final: number
          valor_inicial: number
          valor_piso: number
          valor_soma: number | null
          valor_teto: number | null
          version_id: string | null
        }
        Insert: {
          competencia: string
          created_at?: string
          faixa?: number
          id?: string
          percentual: number
          valor_final: number
          valor_inicial?: number
          valor_piso: number
          valor_soma?: number | null
          valor_teto?: number | null
          version_id?: string | null
        }
        Update: {
          competencia?: string
          created_at?: string
          faixa?: number
          id?: string
          percentual?: number
          valor_final?: number
          valor_inicial?: number
          valor_piso?: number
          valor_soma?: number | null
          valor_teto?: number | null
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_seguro_desemprego_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "reference_table_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_seguro_desemprego_config: {
        Row: {
          apurar: boolean
          calculo_id: string
          created_at: string
          id: string
          observacoes: string | null
          parcelas: number
          recebeu: boolean
          updated_at: string
          valor_parcela: number | null
        }
        Insert: {
          apurar?: boolean
          calculo_id: string
          created_at?: string
          id?: string
          observacoes?: string | null
          parcelas?: number
          recebeu?: boolean
          updated_at?: string
          valor_parcela?: number | null
        }
        Update: {
          apurar?: boolean
          calculo_id?: string
          created_at?: string
          id?: string
          observacoes?: string | null
          parcelas?: number
          recebeu?: boolean
          updated_at?: string
          valor_parcela?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_seguro_desemprego_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_seguro_desemprego_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_correcao_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_seguro_desemprego_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_cs_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_seguro_desemprego_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_custas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_seguro_desemprego_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_dados_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_seguro_desemprego_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_fgts_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_seguro_desemprego_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_seguro_desemprego_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_ir_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_seguro_desemprego_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_multas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_seguro_desemprego_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_parametros"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_verba_base: {
        Row: {
          ativa: boolean | null
          base_tabelada: string | null
          calculo_id: string
          caracteristica: string | null
          codigo: string | null
          compor_principal: boolean | null
          created_at: string | null
          divisor: number | null
          divisor_tipo: string | null
          excluir_falta_justificada: boolean | null
          excluir_falta_nao_justificada: boolean | null
          excluir_ferias_gozadas: boolean | null
          fonte: string | null
          gerar_principal: string | null
          gerar_reflexo: string | null
          hist_salarial_nome: string | null
          id: string
          incide_fgts: boolean | null
          incide_inss: boolean | null
          incide_ir: boolean | null
          multiplicador: number | null
          nome: string
          observacoes: string | null
          ordem: number | null
          periodicidade: string | null
          periodo_fim: string | null
          periodo_inicio: string | null
          pjc_id: string | null
          quantidade_tipo: string | null
          quantidade_valor: number | null
          tipo_variacao: string | null
          updated_at: string | null
          valor: string
          valor_informado_devido: number | null
          valor_informado_pago: number | null
          verba_principal_id: string | null
        }
        Insert: {
          ativa?: boolean | null
          base_tabelada?: string | null
          calculo_id: string
          caracteristica?: string | null
          codigo?: string | null
          compor_principal?: boolean | null
          created_at?: string | null
          divisor?: number | null
          divisor_tipo?: string | null
          excluir_falta_justificada?: boolean | null
          excluir_falta_nao_justificada?: boolean | null
          excluir_ferias_gozadas?: boolean | null
          fonte?: string | null
          gerar_principal?: string | null
          gerar_reflexo?: string | null
          hist_salarial_nome?: string | null
          id?: string
          incide_fgts?: boolean | null
          incide_inss?: boolean | null
          incide_ir?: boolean | null
          multiplicador?: number | null
          nome: string
          observacoes?: string | null
          ordem?: number | null
          periodicidade?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          pjc_id?: string | null
          quantidade_tipo?: string | null
          quantidade_valor?: number | null
          tipo_variacao?: string | null
          updated_at?: string | null
          valor?: string
          valor_informado_devido?: number | null
          valor_informado_pago?: number | null
          verba_principal_id?: string | null
        }
        Update: {
          ativa?: boolean | null
          base_tabelada?: string | null
          calculo_id?: string
          caracteristica?: string | null
          codigo?: string | null
          compor_principal?: boolean | null
          created_at?: string | null
          divisor?: number | null
          divisor_tipo?: string | null
          excluir_falta_justificada?: boolean | null
          excluir_falta_nao_justificada?: boolean | null
          excluir_ferias_gozadas?: boolean | null
          fonte?: string | null
          gerar_principal?: string | null
          gerar_reflexo?: string | null
          hist_salarial_nome?: string | null
          id?: string
          incide_fgts?: boolean | null
          incide_inss?: boolean | null
          incide_ir?: boolean | null
          multiplicador?: number | null
          nome?: string
          observacoes?: string | null
          ordem?: number | null
          periodicidade?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          pjc_id?: string | null
          quantidade_tipo?: string | null
          quantidade_valor?: number | null
          tipo_variacao?: string | null
          updated_at?: string | null
          valor?: string
          valor_informado_devido?: number | null
          valor_informado_pago?: number | null
          verba_principal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_verba_base_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_verba_base_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_correcao_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_verba_base_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_cs_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_verba_base_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_custas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_verba_base_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_dados_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_verba_base_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_fgts_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_verba_base_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_verba_base_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_ir_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_verba_base_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_multas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_verba_base_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_parametros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_verba_base_verba_principal_id_fkey"
            columns: ["verba_principal_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_verba_base"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_verba_base_verba_principal_id_fkey"
            columns: ["verba_principal_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_verbas"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_calculators: {
        Row: {
          calculator_version_id: string
          criado_em: string | null
          profile_id: string
        }
        Insert: {
          calculator_version_id: string
          criado_em?: string | null
          profile_id: string
        }
        Update: {
          calculator_version_id?: string
          criado_em?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_calculators_calculator_version_id_fkey"
            columns: ["calculator_version_id"]
            isOneToOne: false
            referencedRelation: "calculator_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_calculators_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "calculation_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reference_import_runs: {
        Row: {
          created_at: string
          errors: Json | null
          finished_at: string | null
          id: string
          performed_by: string | null
          raw_file_hash: string | null
          raw_file_path: string | null
          result: string
          started_at: string
          stats: Json | null
          table_slug: string
          trigger: string
        }
        Insert: {
          created_at?: string
          errors?: Json | null
          finished_at?: string | null
          id?: string
          performed_by?: string | null
          raw_file_hash?: string | null
          raw_file_path?: string | null
          result?: string
          started_at?: string
          stats?: Json | null
          table_slug: string
          trigger?: string
        }
        Update: {
          created_at?: string
          errors?: Json | null
          finished_at?: string | null
          id?: string
          performed_by?: string | null
          raw_file_hash?: string | null
          raw_file_path?: string | null
          result?: string
          started_at?: string
          stats?: Json | null
          table_slug?: string
          trigger?: string
        }
        Relationships: []
      }
      reference_sources: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          notes: string | null
          type: string
          url: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          type?: string
          url?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          type?: string
          url?: string | null
        }
        Relationships: []
      }
      reference_table_registry: {
        Row: {
          created_at: string
          id: string
          is_auto_importable: boolean
          last_import_at: string | null
          last_import_result: Json | null
          name: string
          requires_manual_input: boolean
          slug: string
          source_id: string | null
          status: string
          update_frequency: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_auto_importable?: boolean
          last_import_at?: string | null
          last_import_result?: Json | null
          name: string
          requires_manual_input?: boolean
          slug: string
          source_id?: string | null
          status?: string
          update_frequency?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_auto_importable?: boolean
          last_import_at?: string | null
          last_import_result?: Json | null
          name?: string
          requires_manual_input?: boolean
          slug?: string
          source_id?: string | null
          status?: string
          update_frequency?: string
        }
        Relationships: [
          {
            foreignKeyName: "reference_table_registry_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "reference_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_table_versions: {
        Row: {
          competency_month: number | null
          competency_year: number
          created_at: string
          created_by: string | null
          id: string
          import_run_id: string | null
          notes: string | null
          source_snapshot: Json | null
          status: string
          table_slug: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          competency_month?: number | null
          competency_year: number
          created_at?: string
          created_by?: string | null
          id?: string
          import_run_id?: string | null
          notes?: string | null
          source_snapshot?: Json | null
          status?: string
          table_slug: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          competency_month?: number | null
          competency_year?: number
          created_at?: string
          created_by?: string | null
          id?: string
          import_run_id?: string | null
          notes?: string | null
          source_snapshot?: Json | null
          status?: string
          table_slug?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reference_table_versions_import_run_id_fkey"
            columns: ["import_run_id"]
            isOneToOne: false
            referencedRelation: "reference_import_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_tables: {
        Row: {
          ativo: boolean | null
          coletado_em: string | null
          competencia: string
          created_at: string
          dados_json: Json
          hash_integridade: string | null
          id: string
          nome: string
          notas: string | null
          source_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          coletado_em?: string | null
          competencia: string
          created_at?: string
          dados_json?: Json
          hash_integridade?: string | null
          id?: string
          nome: string
          notas?: string | null
          source_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          coletado_em?: string | null
          competencia?: string
          created_at?: string
          dados_json?: Json
          hash_integridade?: string | null
          id?: string
          nome?: string
          notas?: string | null
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reference_tables_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "legal_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      rubrica_map: {
        Row: {
          categoria: string | null
          codigo_original: string
          created_at: string
          created_by: string | null
          descricao_original: string
          empresa_pattern: string | null
          id: string
          is_pgto: boolean | null
          priority: number | null
          regex_pattern: string | null
          rubrica_destino: string
          updated_at: string
          version: number | null
        }
        Insert: {
          categoria?: string | null
          codigo_original: string
          created_at?: string
          created_by?: string | null
          descricao_original: string
          empresa_pattern?: string | null
          id?: string
          is_pgto?: boolean | null
          priority?: number | null
          regex_pattern?: string | null
          rubrica_destino: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          categoria?: string | null
          codigo_original?: string
          created_at?: string
          created_by?: string | null
          descricao_original?: string
          empresa_pattern?: string | null
          id?: string
          is_pgto?: boolean | null
          priority?: number | null
          regex_pattern?: string | null
          rubrica_destino?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: []
      }
      rubrica_requirements: {
        Row: {
          alerta_sem_prova: string | null
          created_at: string
          descricao_requisito: string | null
          documentos_requeridos: string[]
          fatos_requeridos: string[]
          id: string
          nivel_exigencia: string | null
          rubrica_codigo: string
          rubrica_nome: string
        }
        Insert: {
          alerta_sem_prova?: string | null
          created_at?: string
          descricao_requisito?: string | null
          documentos_requeridos?: string[]
          fatos_requeridos?: string[]
          id?: string
          nivel_exigencia?: string | null
          rubrica_codigo: string
          rubrica_nome: string
        }
        Update: {
          alerta_sem_prova?: string | null
          created_at?: string
          descricao_requisito?: string | null
          documentos_requeridos?: string[]
          fatos_requeridos?: string[]
          id?: string
          nivel_exigencia?: string | null
          rubrica_codigo?: string
          rubrica_nome?: string
        }
        Relationships: []
      }
      sentenca_rulesets: {
        Row: {
          apply_days: string[] | null
          ativo: boolean
          case_id: string
          created_at: string
          date_range_end: string | null
          date_range_start: string | null
          id: string
          nome: string
          rules: Json
          texto_sentenca: string | null
          updated_at: string
        }
        Insert: {
          apply_days?: string[] | null
          ativo?: boolean
          case_id: string
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          id?: string
          nome?: string
          rules?: Json
          texto_sentenca?: string | null
          updated_at?: string
        }
        Update: {
          apply_days?: string[] | null
          ativo?: boolean
          case_id?: string
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          id?: string
          nome?: string
          rules?: Json
          texto_sentenca?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sentenca_rulesets_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "sentenca_rulesets_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_status: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          last_processed_date: string | null
          last_sync_attempt: string | null
          serie_id: number
          serie_nome: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_processed_date?: string | null
          last_sync_attempt?: string | null
          serie_id: number
          serie_nome?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_processed_date?: string | null
          last_sync_attempt?: string | null
          serie_id?: number
          serie_nome?: string | null
          status?: string | null
        }
        Relationships: []
      }
      tax_tables: {
        Row: {
          criado_em: string | null
          faixas: Json
          id: string
          tipo: string
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        Insert: {
          criado_em?: string | null
          faixas?: Json
          id?: string
          tipo: string
          vigencia_fim?: string | null
          vigencia_inicio: string
        }
        Update: {
          criado_em?: string | null
          faixas?: Json
          id?: string
          tipo?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Relationships: []
      }
      test_scenarios: {
        Row: {
          ativo: boolean | null
          created_at: string
          descricao: string | null
          id: string
          inputs: Json
          nome: string
          resultados_esperados: Json
          ultima_execucao: string | null
          ultimo_diff: Json | null
          ultimo_resultado: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          id?: string
          inputs?: Json
          nome: string
          resultados_esperados?: Json
          ultima_execucao?: string | null
          ultimo_diff?: Json | null
          ultimo_resultado?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          id?: string
          inputs?: Json
          nome?: string
          resultados_esperados?: Json
          ultima_execucao?: string | null
          ultimo_diff?: Json | null
          ultimo_resultado?: string | null
        }
        Relationships: []
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
      validations: {
        Row: {
          acao: Database["public"]["Enums"]["validation_action"]
          campo: string
          case_id: string
          extraction_id: string | null
          id: string
          justificativa: string | null
          metadata: Json | null
          snapshot_id: string | null
          usuario_id: string
          validated_at: string
          valor_anterior: string | null
          valor_validado: string | null
        }
        Insert: {
          acao: Database["public"]["Enums"]["validation_action"]
          campo: string
          case_id: string
          extraction_id?: string | null
          id?: string
          justificativa?: string | null
          metadata?: Json | null
          snapshot_id?: string | null
          usuario_id: string
          validated_at?: string
          valor_anterior?: string | null
          valor_validado?: string | null
        }
        Update: {
          acao?: Database["public"]["Enums"]["validation_action"]
          campo?: string
          case_id?: string
          extraction_id?: string | null
          id?: string
          justificativa?: string | null
          metadata?: Json | null
          snapshot_id?: string | null
          usuario_id?: string
          validated_at?: string
          valor_anterior?: string | null
          valor_validado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "validations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "validations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validations_extraction_id_fkey"
            columns: ["extraction_id"]
            isOneToOne: false
            referencedRelation: "extractions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validations_snapshot_fk"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "calc_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      worktime_adjustments: {
        Row: {
          adjusted_json: Json
          applied_rules: string[] | null
          case_id: string
          created_at: string
          data: string
          extras_diarias: number | null
          flags: string[] | null
          horas_trabalhadas_ajustadas: number | null
          horas_trabalhadas_original: number | null
          id: string
          original_json: Json
          ponto_diario_id: string | null
        }
        Insert: {
          adjusted_json?: Json
          applied_rules?: string[] | null
          case_id: string
          created_at?: string
          data: string
          extras_diarias?: number | null
          flags?: string[] | null
          horas_trabalhadas_ajustadas?: number | null
          horas_trabalhadas_original?: number | null
          id?: string
          original_json?: Json
          ponto_diario_id?: string | null
        }
        Update: {
          adjusted_json?: Json
          applied_rules?: string[] | null
          case_id?: string
          created_at?: string
          data?: string
          extras_diarias?: number | null
          flags?: string[] | null
          horas_trabalhadas_ajustadas?: number | null
          horas_trabalhadas_original?: number | null
          id?: string
          original_json?: Json
          ponto_diario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worktime_adjustments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "worktime_adjustments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      case_processing_stats: {
        Row: {
          case_id: string | null
          failed_documents: number | null
          indexed_documents: number | null
          last_processed_at: string | null
          owner_id: string | null
          pending_documents: number | null
          processing_documents: number | null
          total_chunks: number | null
          total_documents: number | null
        }
        Relationships: []
      }
      pjecalc_cartao_ponto: {
        Row: {
          calculo_id: string | null
          case_id: string | null
          competencia: string | null
          created_at: string | null
          dias_dsr: number | null
          dias_falta: number | null
          dias_feriado: number | null
          horas_extras_100: number | null
          horas_extras_50: number | null
          horas_interjornada: number | null
          horas_intrajornada: number | null
          horas_noturnas: number | null
          horas_trabalhadas: number | null
          id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_apuracao_diaria_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_apuracao_diaria_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_correcao_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_apuracao_diaria_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_cs_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_apuracao_diaria_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_custas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_apuracao_diaria_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_dados_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_apuracao_diaria_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_fgts_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_apuracao_diaria_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_apuracao_diaria_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_ir_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_apuracao_diaria_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_multas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_apuracao_diaria_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_parametros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_correcao_config: {
        Row: {
          case_id: string | null
          combinacoes_indice: string | null
          combinacoes_juros: string | null
          created_at: string | null
          data_citacao: string | null
          data_fixa: string | null
          data_liquidacao: string | null
          epoca: string | null
          id: string | null
          indice: string | null
          indice_pos_citacao: string | null
          juros_inicio: string | null
          juros_percentual: number | null
          juros_pro_rata: boolean | null
          juros_tipo: string | null
          multa_467: boolean | null
          multa_467_percentual: number | null
          multa_523: boolean | null
          multa_523_percentual: number | null
          transicao_adc58: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_cs_config: {
        Row: {
          aliquota_empresa: number | null
          aliquota_sat: number | null
          aliquota_terceiros: number | null
          case_id: string | null
          cobrar_reclamante: boolean | null
          created_at: string | null
          cs_sobre_salarios_pagos: boolean | null
          habilitado: boolean | null
          id: string | null
          regime: string | null
        }
        Insert: {
          aliquota_empresa?: never
          aliquota_sat?: never
          aliquota_terceiros?: never
          case_id?: string | null
          cobrar_reclamante?: never
          created_at?: string | null
          cs_sobre_salarios_pagos?: never
          habilitado?: never
          id?: string | null
          regime?: never
        }
        Update: {
          aliquota_empresa?: never
          aliquota_sat?: never
          aliquota_terceiros?: never
          case_id?: string | null
          cobrar_reclamante?: never
          created_at?: string | null
          cs_sobre_salarios_pagos?: never
          habilitado?: never
          id?: string | null
          regime?: never
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_cs_ocorrencias: {
        Row: {
          ativa: boolean | null
          base_valor: number | null
          calculo_id: string | null
          case_id: string | null
          competencia: string | null
          correcao: number | null
          created_at: string | null
          devido: number | null
          diferenca: number | null
          divisor_valor: number | null
          dobra: number | null
          id: string | null
          juros: number | null
          multiplicador_valor: number | null
          origem: string | null
          pago: number | null
          quantidade_valor: number | null
          total: number | null
          updated_at: string | null
          verba_id: string | null
          verba_nome: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_correcao_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_cs_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_custas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_dados_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_fgts_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_ir_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_multas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_parametros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_verba_base_id_fkey"
            columns: ["verba_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_verba_base"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_verba_base_id_fkey"
            columns: ["verba_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_verbas"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_custas_config: {
        Row: {
          case_id: string | null
          created_at: string | null
          id: string | null
          limite: number | null
          percentual: number | null
        }
        Insert: {
          case_id?: string | null
          created_at?: string | null
          id?: string | null
          limite?: number | null
          percentual?: number | null
        }
        Update: {
          case_id?: string | null
          created_at?: string | null
          id?: string | null
          limite?: number | null
          percentual?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_dados_processo: {
        Row: {
          case_id: string | null
          comarca: string | null
          created_at: string | null
          id: string | null
          numero_processo: string | null
          objeto: string | null
          reclamada_cnpj: string | null
          reclamada_nome: string | null
          reclamante_cpf: string | null
          reclamante_nome: string | null
          updated_at: string | null
          vara: string | null
        }
        Insert: {
          case_id?: string | null
          comarca?: never
          created_at?: string | null
          id?: string | null
          numero_processo?: string | null
          objeto?: never
          reclamada_cnpj?: string | null
          reclamada_nome?: string | null
          reclamante_cpf?: string | null
          reclamante_nome?: string | null
          updated_at?: string | null
          vara?: string | null
        }
        Update: {
          case_id?: string | null
          comarca?: never
          created_at?: string | null
          id?: string | null
          numero_processo?: string | null
          objeto?: never
          reclamada_cnpj?: string | null
          reclamada_nome?: string | null
          reclamante_cpf?: string | null
          reclamante_nome?: string | null
          updated_at?: string | null
          vara?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_faltas: {
        Row: {
          calculo_id: string | null
          case_id: string | null
          created_at: string | null
          data_final: string | null
          data_inicial: string | null
          id: string | null
          justificada: boolean | null
          motivo: string | null
          observacoes: string | null
          tipo_falta: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_evento_intervalo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_evento_intervalo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_correcao_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_evento_intervalo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_cs_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_evento_intervalo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_custas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_evento_intervalo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_dados_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_evento_intervalo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_fgts_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_evento_intervalo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_evento_intervalo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_ir_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_evento_intervalo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_multas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_evento_intervalo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_parametros"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_ferias: {
        Row: {
          abono: boolean | null
          calculo_id: string | null
          case_id: string | null
          created_at: string | null
          dias: number | null
          dias_abono: number | null
          dobra: boolean | null
          gozo_fim: string | null
          gozo_inicio: string | null
          gozo2_fim: string | null
          gozo2_inicio: string | null
          gozo3_fim: string | null
          gozo3_inicio: string | null
          id: string | null
          observacoes: string | null
          periodo_aquisitivo_fim: string | null
          periodo_aquisitivo_inicio: string | null
          periodo_concessivo_fim: string | null
          periodo_concessivo_inicio: string | null
          situacao: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_evento_intervalo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_evento_intervalo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_correcao_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_evento_intervalo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_cs_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_evento_intervalo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_custas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_evento_intervalo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_dados_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_evento_intervalo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_fgts_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_evento_intervalo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_evento_intervalo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_ir_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_evento_intervalo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_multas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_evento_intervalo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_parametros"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_fgts_config: {
        Row: {
          case_id: string | null
          created_at: string | null
          habilitado: boolean | null
          id: string | null
          percentual_deposito: number | null
          percentual_multa: number | null
        }
        Insert: {
          case_id?: string | null
          created_at?: string | null
          habilitado?: never
          id?: string | null
          percentual_deposito?: never
          percentual_multa?: never
        }
        Update: {
          case_id?: string | null
          created_at?: string | null
          habilitado?: never
          id?: string | null
          percentual_deposito?: never
          percentual_multa?: never
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_fgts_ocorrencias: {
        Row: {
          ativa: boolean | null
          base_valor: number | null
          calculo_id: string | null
          case_id: string | null
          competencia: string | null
          correcao: number | null
          created_at: string | null
          devido: number | null
          diferenca: number | null
          divisor_valor: number | null
          dobra: number | null
          id: string | null
          juros: number | null
          multiplicador_valor: number | null
          origem: string | null
          pago: number | null
          quantidade_valor: number | null
          total: number | null
          updated_at: string | null
          verba_id: string | null
          verba_nome: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_correcao_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_cs_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_custas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_dados_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_fgts_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_ir_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_multas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_parametros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_verba_base_id_fkey"
            columns: ["verba_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_verba_base"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_verba_base_id_fkey"
            columns: ["verba_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_verbas"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_historico_ocorrencias: {
        Row: {
          case_id: string | null
          competencia: string | null
          created_at: string | null
          historico_id: string | null
          id: string | null
          tipo: string | null
          valor: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_hist_salarial_mes_hist_salarial_id_fkey"
            columns: ["historico_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_hist_salarial"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_hist_salarial_mes_hist_salarial_id_fkey"
            columns: ["historico_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_historico_salarial"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_historico_salarial: {
        Row: {
          calculo_id: string | null
          case_id: string | null
          created_at: string | null
          id: string | null
          incidencia_cs: boolean | null
          incidencia_fgts: boolean | null
          nome: string | null
          observacoes: string | null
          periodo_fim: string | null
          periodo_inicio: string | null
          tipo_valor: string | null
          valor_informado: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_hist_salarial_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_hist_salarial_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_correcao_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_hist_salarial_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_cs_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_hist_salarial_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_custas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_hist_salarial_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_dados_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_hist_salarial_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_fgts_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_hist_salarial_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_hist_salarial_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_ir_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_hist_salarial_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_multas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_hist_salarial_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_parametros"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_honorarios: {
        Row: {
          case_id: string | null
          created_at: string | null
          id: string | null
          percentual: number | null
          sobre: string | null
        }
        Insert: {
          case_id?: string | null
          created_at?: string | null
          id?: string | null
          percentual?: number | null
          sobre?: string | null
        }
        Update: {
          case_id?: string | null
          created_at?: string | null
          id?: string | null
          percentual?: number | null
          sobre?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_ir_config: {
        Row: {
          case_id: string | null
          created_at: string | null
          dependentes: number | null
          habilitado: boolean | null
          id: string | null
          metodo: string | null
        }
        Insert: {
          case_id?: string | null
          created_at?: string | null
          dependentes?: never
          habilitado?: never
          id?: string | null
          metodo?: never
        }
        Update: {
          case_id?: string | null
          created_at?: string | null
          dependentes?: never
          habilitado?: never
          id?: string | null
          metodo?: never
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_ir_faixas: {
        Row: {
          aliquota: number | null
          competencia_inicio: string | null
          deducao_dependente: number | null
          faixa: number | null
          id: string | null
          parcela_deduzir: number | null
          valor_final: number | null
          valor_inicial: number | null
        }
        Relationships: []
      }
      pjecalc_liquidacao_resultado: {
        Row: {
          calculado_em: string | null
          calculo_id: string | null
          case_id: string | null
          created_at: string | null
          custas: number | null
          engine_version: string | null
          fgts_depositar: number | null
          fgts_multa_40: number | null
          honorarios: number | null
          id: string | null
          inss_patronal: number | null
          inss_segurado: number | null
          irrf: number | null
          resultado: Json | null
          total_bruto: number | null
          total_liquido: number | null
          total_reclamado: number | null
          total_reclamante: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_resultado_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_resultado_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_correcao_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_resultado_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_cs_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_resultado_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_custas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_resultado_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_dados_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_resultado_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_fgts_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_resultado_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_resultado_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_ir_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_resultado_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_multas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_resultado_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_parametros"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_multas_config: {
        Row: {
          case_id: string | null
          created_at: string | null
          id: string | null
          multa_467: boolean | null
          multa_477: boolean | null
        }
        Insert: {
          case_id?: string | null
          created_at?: string | null
          id?: string | null
          multa_467?: boolean | null
          multa_477?: boolean | null
        }
        Update: {
          case_id?: string | null
          created_at?: string | null
          id?: string | null
          multa_467?: boolean | null
          multa_477?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_ocorrencias: {
        Row: {
          ativa: boolean | null
          base_valor: number | null
          calculo_id: string | null
          case_id: string | null
          competencia: string | null
          correcao: number | null
          created_at: string | null
          devido: number | null
          diferenca: number | null
          divisor_valor: number | null
          dobra: number | null
          id: string | null
          juros: number | null
          multiplicador_valor: number | null
          origem: string | null
          pago: number | null
          quantidade_valor: number | null
          total: number | null
          updated_at: string | null
          verba_id: string | null
          verba_nome: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_correcao_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_cs_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_custas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_dados_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_fgts_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_ir_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_multas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_parametros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_verba_base_id_fkey"
            columns: ["verba_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_verba_base"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_verba_base_id_fkey"
            columns: ["verba_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_verbas"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_parametros: {
        Row: {
          carga_horaria_padrao: number | null
          case_id: string | null
          comentarios: string | null
          considerar_feriado_estadual: boolean | null
          considerar_feriado_municipal: boolean | null
          created_at: string | null
          data_admissao: string | null
          data_ajuizamento: string | null
          data_demissao: string | null
          data_final: string | null
          data_inicial: string | null
          estado: string | null
          id: string | null
          limitar_avos_periodo: boolean | null
          maior_remuneracao: number | null
          municipio: string | null
          prazo_aviso_dias: string | null
          prazo_aviso_previo: string | null
          prescricao_fgts: boolean | null
          prescricao_quinquenal: boolean | null
          projetar_aviso_indenizado: boolean | null
          regime_trabalho: string | null
          sabado_dia_util: boolean | null
          ultima_remuneracao: number | null
          updated_at: string | null
          zerar_valor_negativo: boolean | null
        }
        Insert: {
          carga_horaria_padrao?: number | null
          case_id?: string | null
          comentarios?: string | null
          considerar_feriado_estadual?: never
          considerar_feriado_municipal?: never
          created_at?: string | null
          data_admissao?: never
          data_ajuizamento?: never
          data_demissao?: never
          data_final?: never
          data_inicial?: never
          estado?: string | null
          id?: string | null
          limitar_avos_periodo?: never
          maior_remuneracao?: never
          municipio?: string | null
          prazo_aviso_dias?: never
          prazo_aviso_previo?: string | null
          prescricao_fgts?: never
          prescricao_quinquenal?: never
          projetar_aviso_indenizado?: never
          regime_trabalho?: never
          sabado_dia_util?: never
          ultima_remuneracao?: never
          updated_at?: string | null
          zerar_valor_negativo?: never
        }
        Update: {
          carga_horaria_padrao?: number | null
          case_id?: string | null
          comentarios?: string | null
          considerar_feriado_estadual?: never
          considerar_feriado_municipal?: never
          created_at?: string | null
          data_admissao?: never
          data_ajuizamento?: never
          data_demissao?: never
          data_final?: never
          data_inicial?: never
          estado?: string | null
          id?: string | null
          limitar_avos_periodo?: never
          maior_remuneracao?: never
          municipio?: string | null
          prazo_aviso_dias?: never
          prazo_aviso_previo?: string | null
          prescricao_fgts?: never
          prescricao_quinquenal?: never
          projetar_aviso_indenizado?: never
          regime_trabalho?: never
          sabado_dia_util?: never
          ultima_remuneracao?: never
          updated_at?: string | null
          zerar_valor_negativo?: never
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_pensao_config: {
        Row: {
          apurar: boolean | null
          base_incidencia: string | null
          beneficiario: string | null
          calculo_id: string | null
          case_id: string | null
          created_at: string | null
          id: string | null
          observacoes: string | null
          percentual: number | null
          tipo: string | null
          updated_at: string | null
          valor_fixo: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_pensao_alimenticia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_pensao_alimenticia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_correcao_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_pensao_alimenticia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_cs_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_pensao_alimenticia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_custas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_pensao_alimenticia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_dados_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_pensao_alimenticia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_fgts_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_pensao_alimenticia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_pensao_alimenticia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_ir_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_pensao_alimenticia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_multas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_pensao_alimenticia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_parametros"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_previdencia_privada_config: {
        Row: {
          apurar: boolean | null
          calculo_id: string | null
          case_id: string | null
          created_at: string | null
          entidade: string | null
          id: string | null
          observacoes: string | null
          percentual_empregado: number | null
          percentual_empregador: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_prev_privada_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_prev_privada_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_correcao_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_prev_privada_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_cs_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_prev_privada_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_custas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_prev_privada_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_dados_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_prev_privada_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_fgts_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_prev_privada_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_prev_privada_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_ir_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_prev_privada_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_multas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_prev_privada_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_parametros"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_salario_familia_config: {
        Row: {
          apurar: boolean | null
          calculo_id: string | null
          case_id: string | null
          created_at: string | null
          id: string | null
          numero_filhos: number | null
          observacoes: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_sal_familia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_sal_familia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_correcao_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_sal_familia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_cs_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_sal_familia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_custas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_sal_familia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_dados_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_sal_familia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_fgts_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_sal_familia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_sal_familia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_ir_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_sal_familia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_multas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_sal_familia_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_parametros"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_seguro_config: {
        Row: {
          apurar: boolean | null
          calculo_id: string | null
          case_id: string | null
          created_at: string | null
          id: string | null
          observacoes: string | null
          parcelas: number | null
          recebeu: boolean | null
          updated_at: string | null
          valor_parcela: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_seguro_desemprego_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_seguro_desemprego_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_correcao_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_seguro_desemprego_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_cs_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_seguro_desemprego_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_custas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_seguro_desemprego_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_dados_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_seguro_desemprego_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_fgts_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_seguro_desemprego_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_seguro_desemprego_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_ir_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_seguro_desemprego_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_multas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_seguro_desemprego_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: true
            referencedRelation: "pjecalc_parametros"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_verba_ocorrencias: {
        Row: {
          ativa: boolean | null
          base_valor: number | null
          calculo_id: string | null
          case_id: string | null
          competencia: string | null
          correcao: number | null
          created_at: string | null
          devido: number | null
          diferenca: number | null
          divisor_valor: number | null
          dobra: number | null
          id: string | null
          juros: number | null
          multiplicador_valor: number | null
          origem: string | null
          pago: number | null
          quantidade_valor: number | null
          total: number | null
          updated_at: string | null
          verba_id: string | null
          verba_nome: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_correcao_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_cs_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_custas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_dados_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_fgts_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_ir_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_multas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_parametros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_verba_base_id_fkey"
            columns: ["verba_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_verba_base"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_ocorrencia_calculo_verba_base_id_fkey"
            columns: ["verba_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_verbas"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_verbas: {
        Row: {
          ativa: boolean | null
          base_calculo: Json | null
          calculo_id: string | null
          caracteristica: string | null
          case_id: string | null
          codigo: string | null
          created_at: string | null
          divisor_informado: number | null
          hist_salarial_nome: string | null
          id: string | null
          incide_fgts: boolean | null
          incide_inss: boolean | null
          incide_ir: boolean | null
          incidencias: Json | null
          multiplicador: number | null
          nome: string | null
          observacoes: string | null
          ocorrencia_pagamento: string | null
          ordem: number | null
          periodo_fim: string | null
          periodo_inicio: string | null
          tipo: string | null
          updated_at: string | null
          valor: string | null
          valor_informado_devido: number | null
          valor_informado_pago: number | null
          verba_principal_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_processing_stats"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "pjecalc_calculos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_verba_base_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_verba_base_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_correcao_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_verba_base_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_cs_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_verba_base_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_custas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_verba_base_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_dados_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_verba_base_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_fgts_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_verba_base_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_verba_base_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_ir_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_verba_base_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_multas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_verba_base_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_parametros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_verba_base_verba_principal_id_fkey"
            columns: ["verba_principal_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_verba_base"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_verba_base_verba_principal_id_fkey"
            columns: ["verba_principal_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_verbas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      apply_correction: {
        Args: {
          p_from_date: string
          p_index?: string
          p_to_date: string
          p_value: number
        }
        Returns: Json
      }
      calc_inss: { Args: { p_base: number; p_date: string }; Returns: Json }
      calc_irrf: {
        Args: { p_base: number; p_date?: string; p_dependentes?: number }
        Returns: Json
      }
      calc_juros: {
        Args: {
          p_from_date: string
          p_rule?: string
          p_to_date: string
          p_value: number
        }
        Returns: Json
      }
      get_next_queued_document: {
        Args: never
        Returns: {
          case_id: string
          document_id: string
          priority: number
          queue_id: string
        }[]
      }
      get_reference_version: {
        Args: { p_date: string; p_table_slug: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_document_chunks: {
        Args: {
          p_case_id: string
          p_doc_types?: string[]
          p_query_embedding: string
          p_top_k: number
        }
        Returns: {
          chunk_id: string
          content: string
          doc_type: string
          document_id: string
          page_number: number
          similarity: number
        }[]
      }
      pjecalc_batch_update_ocorrencias: {
        Args: { p_calculo_id: string; p_changes: Json; p_filtro: Json }
        Returns: number
      }
      pjecalc_calc_horas_entre: {
        Args: { h_fim: string; h_inicio: string }
        Returns: number
      }
      pjecalc_get_calculo_id: {
        Args: { p_case_id: string; p_user_id?: string }
        Returns: string
      }
      queue_case_documents: {
        Args: { p_case_id: string; p_priority?: number }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      case_status: "rascunho" | "em_analise" | "calculado" | "revisado"
      doc_type:
        | "peticao"
        | "trct"
        | "holerite"
        | "cartao_ponto"
        | "sentenca"
        | "outro"
        | "ctps"
        | "contrato"
        | "cct"
        | "fgts"
        | "ponto"
      extracao_status: "AUTO" | "REVISAR" | "CONFIRMADO" | "REJEITADO"
      fact_origem: "ia_extracao" | "usuario" | "documento"
      fact_type: "data" | "moeda" | "numero" | "texto" | "boolean"
      party_type: "reclamante" | "reclamada"
      pipeline_doc_type:
        | "CTPS"
        | "CARTAO_PONTO"
        | "FICHA_FINANCEIRA"
        | "CONTRACHEQUE"
        | "PJC"
        | "OUTRO"
      processing_status:
        | "pending"
        | "queued"
        | "processing"
        | "chunking"
        | "embedding"
        | "completed"
        | "failed"
        | "retrying"
      snapshot_status: "gerado" | "revisao" | "aprovado"
      termination_type:
        | "sem_justa_causa"
        | "justa_causa"
        | "pedido_demissao"
        | "rescisao_indireta"
        | "acordo"
      validation_action: "aprovar" | "editar" | "rejeitar"
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
      app_role: ["admin", "moderator", "user"],
      case_status: ["rascunho", "em_analise", "calculado", "revisado"],
      doc_type: [
        "peticao",
        "trct",
        "holerite",
        "cartao_ponto",
        "sentenca",
        "outro",
        "ctps",
        "contrato",
        "cct",
        "fgts",
        "ponto",
      ],
      extracao_status: ["AUTO", "REVISAR", "CONFIRMADO", "REJEITADO"],
      fact_origem: ["ia_extracao", "usuario", "documento"],
      fact_type: ["data", "moeda", "numero", "texto", "boolean"],
      party_type: ["reclamante", "reclamada"],
      pipeline_doc_type: [
        "CTPS",
        "CARTAO_PONTO",
        "FICHA_FINANCEIRA",
        "CONTRACHEQUE",
        "PJC",
        "OUTRO",
      ],
      processing_status: [
        "pending",
        "queued",
        "processing",
        "chunking",
        "embedding",
        "completed",
        "failed",
        "retrying",
      ],
      snapshot_status: ["gerado", "revisao", "aprovado"],
      termination_type: [
        "sem_justa_causa",
        "justa_causa",
        "pedido_demissao",
        "rescisao_indireta",
        "acordo",
      ],
      validation_action: ["aprovar", "editar", "rejeitar"],
    },
  },
} as const
