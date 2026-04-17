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
      ai_agent_logs: {
        Row: {
          agent_name: string | null
          created_at: string
          duration_ms: number | null
          error: string | null
          id: string
          input_summary: Json | null
          output_summary: Json | null
          run_id: string | null
          step: string | null
          tokens_used: number | null
        }
        Insert: {
          agent_name?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          input_summary?: Json | null
          output_summary?: Json | null
          run_id?: string | null
          step?: string | null
          tokens_used?: number | null
        }
        Update: {
          agent_name?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          input_summary?: Json | null
          output_summary?: Json | null
          run_id?: string | null
          step?: string | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_logs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ai_audit_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_audit_findings: {
        Row: {
          agent_name: string | null
          code: string | null
          confidence: number | null
          created_at: string
          field: string | null
          finding_type: string | null
          id: string
          metadata: Json | null
          module: string | null
          recommended_action: string | null
          requires_human_confirmation: boolean | null
          resolution_note: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          run_id: string | null
          severity: string | null
          source_basis: string | null
          technical_message: string | null
          title: string | null
          user_message: string | null
        }
        Insert: {
          agent_name?: string | null
          code?: string | null
          confidence?: number | null
          created_at?: string
          field?: string | null
          finding_type?: string | null
          id?: string
          metadata?: Json | null
          module?: string | null
          recommended_action?: string | null
          requires_human_confirmation?: boolean | null
          resolution_note?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          run_id?: string | null
          severity?: string | null
          source_basis?: string | null
          technical_message?: string | null
          title?: string | null
          user_message?: string | null
        }
        Update: {
          agent_name?: string | null
          code?: string | null
          confidence?: number | null
          created_at?: string
          field?: string | null
          finding_type?: string | null
          id?: string
          metadata?: Json | null
          module?: string | null
          recommended_action?: string | null
          requires_human_confirmation?: boolean | null
          resolution_note?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          run_id?: string | null
          severity?: string | null
          source_basis?: string | null
          technical_message?: string | null
          title?: string | null
          user_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_audit_findings_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ai_audit_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_audit_runs: {
        Row: {
          calculo_id: string | null
          case_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          execution_time_ms: number | null
          id: string
          input_hash: string | null
          model_used: string | null
          overall_confidence: number | null
          overall_status: string | null
          prompt_version: string | null
          run_type: string | null
          status: string
        }
        Insert: {
          calculo_id?: string | null
          case_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          execution_time_ms?: number | null
          id?: string
          input_hash?: string | null
          model_used?: string | null
          overall_confidence?: number | null
          overall_status?: string | null
          prompt_version?: string | null
          run_type?: string | null
          status?: string
        }
        Update: {
          calculo_id?: string | null
          case_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          execution_time_ms?: number | null
          id?: string
          input_hash?: string | null
          model_used?: string | null
          overall_confidence?: number | null
          overall_status?: string | null
          prompt_version?: string | null
          run_type?: string | null
          status?: string
        }
        Relationships: []
      }
      ai_canonical_inputs: {
        Row: {
          case_id: string | null
          created_at: string
          id: string
          input_hash: string | null
          input_snapshot: Json
          run_id: string | null
          source_summary: Json | null
          version: number | null
        }
        Insert: {
          case_id?: string | null
          created_at?: string
          id?: string
          input_hash?: string | null
          input_snapshot?: Json
          run_id?: string | null
          source_summary?: Json | null
          version?: number | null
        }
        Update: {
          case_id?: string | null
          created_at?: string
          id?: string
          input_hash?: string | null
          input_snapshot?: Json
          run_id?: string | null
          source_summary?: Json | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_canonical_inputs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ai_audit_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_confidence_scores: {
        Row: {
          absent_count: number | null
          blocker_count: number | null
          created_at: string
          details: Json | null
          field_count: number | null
          id: string
          inferred_count: number | null
          label: string | null
          module: string | null
          resolved_count: number | null
          run_id: string | null
          score: number
        }
        Insert: {
          absent_count?: number | null
          blocker_count?: number | null
          created_at?: string
          details?: Json | null
          field_count?: number | null
          id?: string
          inferred_count?: number | null
          label?: string | null
          module?: string | null
          resolved_count?: number | null
          run_id?: string | null
          score?: number
        }
        Update: {
          absent_count?: number | null
          blocker_count?: number | null
          created_at?: string
          details?: Json | null
          field_count?: number | null
          id?: string
          inferred_count?: number | null
          label?: string | null
          module?: string | null
          resolved_count?: number | null
          run_id?: string | null
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_confidence_scores_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ai_audit_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_reconciliation_reports: {
        Row: {
          case_id: string | null
          closure_divergences: Json | null
          created_at: string
          delta_bruto: number | null
          delta_liquido: number | null
          delta_percentual: number | null
          id: string
          mrd_total_bruto: number | null
          mrd_total_liquido: number | null
          overall_assessment: string | null
          parameter_divergences: Json | null
          pje_total_bruto: number | null
          pje_total_liquido: number | null
          root_causes: Json | null
          rubric_divergences: Json | null
          run_id: string | null
        }
        Insert: {
          case_id?: string | null
          closure_divergences?: Json | null
          created_at?: string
          delta_bruto?: number | null
          delta_liquido?: number | null
          delta_percentual?: number | null
          id?: string
          mrd_total_bruto?: number | null
          mrd_total_liquido?: number | null
          overall_assessment?: string | null
          parameter_divergences?: Json | null
          pje_total_bruto?: number | null
          pje_total_liquido?: number | null
          root_causes?: Json | null
          rubric_divergences?: Json | null
          run_id?: string | null
        }
        Update: {
          case_id?: string | null
          closure_divergences?: Json | null
          created_at?: string
          delta_bruto?: number | null
          delta_liquido?: number | null
          delta_percentual?: number | null
          id?: string
          mrd_total_bruto?: number | null
          mrd_total_liquido?: number | null
          overall_assessment?: string | null
          parameter_divergences?: Json | null
          pje_total_bruto?: number | null
          pje_total_liquido?: number | null
          root_causes?: Json | null
          rubric_divergences?: Json | null
          run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_reconciliation_reports_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ai_audit_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      case_briefings: {
        Row: {
          case_id: string | null
          content: string | null
          created_at: string
          created_by: string | null
          id: string
          updated_at: string
        }
        Insert: {
          case_id?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          case_id?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      case_controversies: {
        Row: {
          campo: string | null
          case_id: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          document_ids: string[] | null
          fact_ids: string[] | null
          fundamentacao_legal: string | null
          id: string
          impacto_estimado: number | null
          justificativa: string | null
          prioridade: string | null
          resolvido_em: string | null
          resolvido_por: string | null
          status: string | null
          updated_at: string
          valor_escolhido: string | null
        }
        Insert: {
          campo?: string | null
          case_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          document_ids?: string[] | null
          fact_ids?: string[] | null
          fundamentacao_legal?: string | null
          id?: string
          impacto_estimado?: number | null
          justificativa?: string | null
          prioridade?: string | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          status?: string | null
          updated_at?: string
          valor_escolhido?: string | null
        }
        Update: {
          campo?: string | null
          case_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          document_ids?: string[] | null
          fact_ids?: string[] | null
          fundamentacao_legal?: string | null
          id?: string
          impacto_estimado?: number | null
          justificativa?: string | null
          prioridade?: string | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          status?: string | null
          updated_at?: string
          valor_escolhido?: string | null
        }
        Relationships: []
      }
      case_inputs: {
        Row: {
          case_id: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          id: string
          metadata_json: Json | null
          observacoes: string | null
          quantidade: number | null
          source_document_id: string | null
          tipo_evento: string | null
          valor: number | null
        }
        Insert: {
          case_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          metadata_json?: Json | null
          observacoes?: string | null
          quantidade?: number | null
          source_document_id?: string | null
          tipo_evento?: string | null
          valor?: number | null
        }
        Update: {
          case_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          metadata_json?: Json | null
          observacoes?: string | null
          quantidade?: number | null
          source_document_id?: string | null
          tipo_evento?: string | null
          valor?: number | null
        }
        Relationships: [
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
          case_id: string | null
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
          valor_bruto: number | null
          valor_liquido: number | null
          verba_codigo: string | null
          verba_nome: string | null
        }
        Insert: {
          base_calculo?: number | null
          case_id?: string | null
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
          valor_bruto?: number | null
          valor_liquido?: number | null
          verba_codigo?: string | null
          verba_nome?: string | null
        }
        Update: {
          base_calculo?: number | null
          case_id?: string | null
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
          valor_bruto?: number | null
          valor_liquido?: number | null
          verba_codigo?: string | null
          verba_nome?: string | null
        }
        Relationships: []
      }
      case_risk_analysis: {
        Row: {
          analisado_em: string
          analisado_por: string | null
          case_id: string | null
          fatores: Json
          id: string
          nivel_risco: string | null
          recomendacoes: string[] | null
          resumo: string | null
          score_risco: number | null
          snapshot_id: string | null
        }
        Insert: {
          analisado_em?: string
          analisado_por?: string | null
          case_id?: string | null
          fatores?: Json
          id?: string
          nivel_risco?: string | null
          recomendacoes?: string[] | null
          resumo?: string | null
          score_risco?: number | null
          snapshot_id?: string | null
        }
        Update: {
          analisado_em?: string
          analisado_por?: string | null
          case_id?: string | null
          fatores?: Json
          id?: string
          nivel_risco?: string | null
          recomendacoes?: string[] | null
          resumo?: string | null
          score_risco?: number | null
          snapshot_id?: string | null
        }
        Relationships: []
      }
      cases: {
        Row: {
          atualizado_em: string | null
          cliente: string | null
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
          cliente?: string | null
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
          cliente?: string | null
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
      document_chunks: {
        Row: {
          case_id: string | null
          chunk_index: number
          content: string | null
          content_hash: string | null
          created_at: string
          doc_type: string | null
          document_id: string | null
          embedding: string | null
          id: string
          metadata: Json
          page_number: number | null
        }
        Insert: {
          case_id?: string | null
          chunk_index?: number
          content?: string | null
          content_hash?: string | null
          created_at?: string
          doc_type?: string | null
          document_id?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json
          page_number?: number | null
        }
        Update: {
          case_id?: string | null
          chunk_index?: number
          content?: string | null
          content_hash?: string | null
          created_at?: string
          doc_type?: string | null
          document_id?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json
          page_number?: number | null
        }
        Relationships: [
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
          case_id: string | null
          created_at: string
          document_id: string | null
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
          user_id: string | null
          validation_warnings: Json | null
        }
        Insert: {
          case_id?: string | null
          created_at?: string
          document_id?: string | null
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
          user_id?: string | null
          validation_warnings?: Json | null
        }
        Update: {
          case_id?: string | null
          created_at?: string
          document_id?: string | null
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
          user_id?: string | null
          validation_warnings?: Json | null
        }
        Relationships: [
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
          case_id: string | null
          completed_at: string | null
          created_at: string | null
          document_id: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          priority: number | null
          retry_count: number | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          case_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          document_id?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          priority?: number | null
          retry_count?: number | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          case_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          document_id?: string | null
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
          case_id: string | null
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
          case_id?: string | null
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
          case_id?: string | null
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
        Relationships: []
      }
      employment_contracts: {
        Row: {
          case_id: string | null
          created_at: string
          data_admissao: string | null
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
          case_id?: string | null
          created_at?: string
          data_admissao?: string | null
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
          case_id?: string | null
          created_at?: string
          data_admissao?: string | null
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
        Relationships: []
      }
      extracao_item: {
        Row: {
          bbox: Json | null
          case_id: string | null
          competencia: string | null
          confidence: number | null
          created_at: string
          evidence_text: string | null
          field_key: string | null
          id: string
          page: number | null
          pipeline_id: string | null
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
          case_id?: string | null
          competencia?: string | null
          confidence?: number | null
          created_at?: string
          evidence_text?: string | null
          field_key?: string | null
          id?: string
          page?: number | null
          pipeline_id?: string | null
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
          case_id?: string | null
          competencia?: string | null
          confidence?: number | null
          created_at?: string
          evidence_text?: string | null
          field_key?: string | null
          id?: string
          page?: number | null
          pipeline_id?: string | null
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
          case_id: string | null
          chunks_analyzed: number | null
          created_at: string
          error_message: string | null
          filters: Json
          id: string
          owner_user_id: string | null
          processing_time_ms: number | null
          query: string | null
          result_json: Json | null
          similarity_threshold: number | null
          status: string
          task_type: string | null
          top_k: number
          updated_at: string
        }
        Insert: {
          case_id?: string | null
          chunks_analyzed?: number | null
          created_at?: string
          error_message?: string | null
          filters?: Json
          id?: string
          owner_user_id?: string | null
          processing_time_ms?: number | null
          query?: string | null
          result_json?: Json | null
          similarity_threshold?: number | null
          status?: string
          task_type?: string | null
          top_k?: number
          updated_at?: string
        }
        Update: {
          case_id?: string | null
          chunks_analyzed?: number | null
          created_at?: string
          error_message?: string | null
          filters?: Json
          id?: string
          owner_user_id?: string | null
          processing_time_ms?: number | null
          query?: string | null
          result_json?: Json | null
          similarity_threshold?: number | null
          status?: string
          task_type?: string | null
          top_k?: number
          updated_at?: string
        }
        Relationships: []
      }
      extractions: {
        Row: {
          campo: string | null
          case_id: string | null
          confianca: number | null
          created_at: string
          document_id: string | null
          id: string
          metodo: string | null
          origem: Json
          status: string | null
          tipo_valor: string
          valor_proposto: string | null
        }
        Insert: {
          campo?: string | null
          case_id?: string | null
          confianca?: number | null
          created_at?: string
          document_id?: string | null
          id?: string
          metodo?: string | null
          origem?: Json
          status?: string | null
          tipo_valor?: string
          valor_proposto?: string | null
        }
        Update: {
          campo?: string | null
          case_id?: string | null
          confianca?: number | null
          created_at?: string
          document_id?: string | null
          id?: string
          metodo?: string | null
          origem?: Json
          status?: string | null
          tipo_valor?: string
          valor_proposto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extractions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      fonte_conflito: {
        Row: {
          campo: string | null
          case_id: string | null
          competencia: string | null
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
          campo?: string | null
          case_id?: string | null
          competencia?: string | null
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
          campo?: string | null
          case_id?: string | null
          competencia?: string | null
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
      inconsistency_flags: {
        Row: {
          case_id: string | null
          categoria: string | null
          competencia: string | null
          created_at: string
          descricao: string | null
          id: string
          resolvido: boolean
          resolvido_em: string | null
          resolvido_por: string | null
          rubric_code: string | null
          scenario_id: string | null
          severidade: string | null
          sugestao: string | null
        }
        Insert: {
          case_id?: string | null
          categoria?: string | null
          competencia?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          resolvido?: boolean
          resolvido_em?: string | null
          resolvido_por?: string | null
          rubric_code?: string | null
          scenario_id?: string | null
          severidade?: string | null
          sugestao?: string | null
        }
        Update: {
          case_id?: string | null
          categoria?: string | null
          competencia?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          resolvido?: boolean
          resolvido_em?: string | null
          resolvido_por?: string | null
          rubric_code?: string | null
          scenario_id?: string | null
          severidade?: string | null
          sugestao?: string | null
        }
        Relationships: []
      }
      judicial_rules: {
        Row: {
          created_at: string
          descricao: string
          fonte: string | null
          id: string
          observacoes: string | null
          parametros: Json
          periodo_fim: string | null
          periodo_inicio: string | null
          prioridade: number
          rubric_code: string | null
          substitui_rule_id: string | null
          tipo: string | null
          title_version_id: string | null
        }
        Insert: {
          created_at?: string
          descricao?: string
          fonte?: string | null
          id?: string
          observacoes?: string | null
          parametros?: Json
          periodo_fim?: string | null
          periodo_inicio?: string | null
          prioridade?: number
          rubric_code?: string | null
          substitui_rule_id?: string | null
          tipo?: string | null
          title_version_id?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string
          fonte?: string | null
          id?: string
          observacoes?: string | null
          parametros?: Json
          periodo_fim?: string | null
          periodo_inicio?: string | null
          prioridade?: number
          rubric_code?: string | null
          substitui_rule_id?: string | null
          tipo?: string | null
          title_version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "judicial_rules_substitui_rule_id_fkey"
            columns: ["substitui_rule_id"]
            isOneToOne: false
            referencedRelation: "judicial_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judicial_rules_title_version_id_fkey"
            columns: ["title_version_id"]
            isOneToOne: false
            referencedRelation: "judicial_title_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      judicial_title_versions: {
        Row: {
          case_id: string | null
          created_at: string
          created_by: string | null
          data_decisao: string | null
          descricao: string
          fonte_documento_id: string | null
          id: string
          tipo: string | null
          versao: number
        }
        Insert: {
          case_id?: string | null
          created_at?: string
          created_by?: string | null
          data_decisao?: string | null
          descricao?: string
          fonte_documento_id?: string | null
          id?: string
          tipo?: string | null
          versao?: number
        }
        Update: {
          case_id?: string | null
          created_at?: string
          created_by?: string | null
          data_decisao?: string | null
          descricao?: string
          fonte_documento_id?: string | null
          id?: string
          tipo?: string | null
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "judicial_title_versions_fonte_documento_id_fkey"
            columns: ["fonte_documento_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_rules: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          codigo: string | null
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
          titulo: string | null
          updated_at: string
          versao: number | null
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          codigo?: string | null
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
          titulo?: string | null
          updated_at?: string
          versao?: number | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          codigo?: string | null
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
          titulo?: string | null
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
          nome: string | null
          notas: string | null
          observado_em: string | null
          orgao: string | null
          publicado_em: string | null
          status: string
          tipo: string | null
          updated_at: string
          url: string | null
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          id?: string
          nome?: string | null
          notas?: string | null
          observado_em?: string | null
          orgao?: string | null
          publicado_em?: string | null
          status?: string
          tipo?: string | null
          updated_at?: string
          url?: string | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          id?: string
          nome?: string | null
          notas?: string | null
          observado_em?: string | null
          orgao?: string | null
          publicado_em?: string | null
          status?: string
          tipo?: string | null
          updated_at?: string
          url?: string | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: []
      }
      liquidation_ai_runs: {
        Row: {
          ai_model_used: string | null
          blockers: Json | null
          calculo_id: string | null
          canonical_input_snapshot: Json | null
          case_id: string | null
          completed_at: string | null
          confidence_score: number | null
          confidence_status: string | null
          conflicts_detected: number | null
          corrections_applied: number | null
          corrections_log: Json | null
          created_at: string | null
          created_by: string | null
          current_step: string | null
          documents_analyzed: Json | null
          documents_read: number | null
          engine_version: string | null
          execution_time_ms: number | null
          final_result_snapshot: Json | null
          id: string
          max_recalculations: number | null
          module_scores: Json | null
          pipeline_mode: string
          pje_comparison_available: boolean | null
          post_calc_audit_id: string | null
          pre_calc_audit_id: string | null
          recalculation_count: number | null
          reconciliation_result: Json | null
          started_at: string | null
          status: string
          steps_completed: Json | null
          total_steps: number | null
          warnings: Json | null
        }
        Insert: {
          ai_model_used?: string | null
          blockers?: Json | null
          calculo_id?: string | null
          canonical_input_snapshot?: Json | null
          case_id?: string | null
          completed_at?: string | null
          confidence_score?: number | null
          confidence_status?: string | null
          conflicts_detected?: number | null
          corrections_applied?: number | null
          corrections_log?: Json | null
          created_at?: string | null
          created_by?: string | null
          current_step?: string | null
          documents_analyzed?: Json | null
          documents_read?: number | null
          engine_version?: string | null
          execution_time_ms?: number | null
          final_result_snapshot?: Json | null
          id?: string
          max_recalculations?: number | null
          module_scores?: Json | null
          pipeline_mode?: string
          pje_comparison_available?: boolean | null
          post_calc_audit_id?: string | null
          pre_calc_audit_id?: string | null
          recalculation_count?: number | null
          reconciliation_result?: Json | null
          started_at?: string | null
          status?: string
          steps_completed?: Json | null
          total_steps?: number | null
          warnings?: Json | null
        }
        Update: {
          ai_model_used?: string | null
          blockers?: Json | null
          calculo_id?: string | null
          canonical_input_snapshot?: Json | null
          case_id?: string | null
          completed_at?: string | null
          confidence_score?: number | null
          confidence_status?: string | null
          conflicts_detected?: number | null
          corrections_applied?: number | null
          corrections_log?: Json | null
          created_at?: string | null
          created_by?: string | null
          current_step?: string | null
          documents_analyzed?: Json | null
          documents_read?: number | null
          engine_version?: string | null
          execution_time_ms?: number | null
          final_result_snapshot?: Json | null
          id?: string
          max_recalculations?: number | null
          module_scores?: Json | null
          pipeline_mode?: string
          pje_comparison_available?: boolean | null
          post_calc_audit_id?: string | null
          pre_calc_audit_id?: string | null
          recalculation_count?: number | null
          reconciliation_result?: Json | null
          started_at?: string | null
          status?: string
          steps_completed?: Json | null
          total_steps?: number | null
          warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "liquidation_ai_runs_post_calc_audit_id_fkey"
            columns: ["post_calc_audit_id"]
            isOneToOne: false
            referencedRelation: "ai_audit_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquidation_ai_runs_pre_calc_audit_id_fkey"
            columns: ["pre_calc_audit_id"]
            isOneToOne: false
            referencedRelation: "ai_audit_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      parties: {
        Row: {
          case_id: string | null
          contato: Json | null
          created_at: string
          documento: string | null
          documento_tipo: string | null
          id: string
          nome: string | null
          tipo: Database["public"]["Enums"]["party_type"] | null
          updated_at: string
        }
        Insert: {
          case_id?: string | null
          contato?: Json | null
          created_at?: string
          documento?: string | null
          documento_tipo?: string | null
          id?: string
          nome?: string | null
          tipo?: Database["public"]["Enums"]["party_type"] | null
          updated_at?: string
        }
        Update: {
          case_id?: string | null
          contato?: Json | null
          created_at?: string
          documento?: string | null
          documento_tipo?: string | null
          id?: string
          nome?: string | null
          tipo?: Database["public"]["Enums"]["party_type"] | null
          updated_at?: string
        }
        Relationships: []
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
          nome: string | null
          tipo: string | null
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
          nome?: string | null
          tipo?: string | null
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
          nome?: string | null
          tipo?: string | null
          variaveis?: Json | null
        }
        Relationships: []
      }
      petitions: {
        Row: {
          ai_model_used: string | null
          calculation_run_id: string | null
          case_id: string | null
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
          case_id?: string | null
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
          case_id?: string | null
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
        Relationships: []
      }
      pjc_import_jobs: {
        Row: {
          arquivo_hash: string | null
          arquivo_nome: string | null
          calculo_id: string | null
          case_id: string | null
          completed_at: string | null
          created_at: string | null
          historicos_importados: number | null
          id: string
          reflexos_importados: number | null
          resultado: Json | null
          status: string | null
          user_id: string | null
          verbas_importadas: number | null
          warnings: Json | null
        }
        Insert: {
          arquivo_hash?: string | null
          arquivo_nome?: string | null
          calculo_id?: string | null
          case_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          historicos_importados?: number | null
          id?: string
          reflexos_importados?: number | null
          resultado?: Json | null
          status?: string | null
          user_id?: string | null
          verbas_importadas?: number | null
          warnings?: Json | null
        }
        Update: {
          arquivo_hash?: string | null
          arquivo_nome?: string | null
          calculo_id?: string | null
          case_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          historicos_importados?: number | null
          id?: string
          reflexos_importados?: number | null
          resultado?: Json | null
          status?: string | null
          user_id?: string | null
          verbas_importadas?: number | null
          warnings?: Json | null
        }
        Relationships: []
      }
      pjecalc_advogados: {
        Row: {
          ativo: boolean | null
          calculo_id: string | null
          cpf: string | null
          created_at: string | null
          email: string | null
          id: string
          nome: string | null
          oab: string | null
          oab_uf: string | null
          participante_id: string | null
          representa: string | null
          telefone: string | null
        }
        Insert: {
          ativo?: boolean | null
          calculo_id?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string | null
          oab?: string | null
          oab_uf?: string | null
          participante_id?: string | null
          representa?: string | null
          telefone?: string | null
        }
        Update: {
          ativo?: boolean | null
          calculo_id?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string | null
          oab?: string | null
          oab_uf?: string | null
          participante_id?: string | null
          representa?: string | null
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_advogados_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_advogados_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_participantes"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_apuracao_diaria: {
        Row: {
          calculo_id: string | null
          created_at: string | null
          data: string | null
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
          calculo_id?: string | null
          created_at?: string | null
          data?: string | null
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
          calculo_id?: string | null
          created_at?: string | null
          data?: string | null
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
        Relationships: []
      }
      pjecalc_atualizacao_config: {
        Row: {
          a_partir_de_lei_11941: string | null
          a_partir_de_lei_11941_multa: string | null
          a_partir_de_lei_11941_pago: string | null
          a_partir_de_outro_indice: string | null
          aplicar_multa_salarios_devidos_inss: boolean | null
          aplicar_multa_salarios_pagos_inss: boolean | null
          calculo_id: string | null
          combinacoes_indice: string | null
          combinacoes_juros: string | null
          combinar_outro_indice: boolean | null
          correcao_previdenciaria_salarios_devidos_inss: boolean | null
          correcao_previdenciaria_salarios_pagos_inss: boolean | null
          correcao_trabalhista_salarios_devidos_inss: boolean | null
          correcao_trabalhista_salarios_pagos_inss: boolean | null
          created_at: string | null
          data_liquidacao: string | null
          id: string
          ignorar_taxa_correcao_negativa: boolean | null
          indice_fgts: string | null
          indice_irpf: string | null
          indice_previdenciario: string | null
          indice_trabalhista: string | null
          juros_apos_deducao_cs: boolean | null
          lei_11941: boolean | null
          lei_11941_multa: boolean | null
          lei_11941_pago: boolean | null
          observacoes: string | null
          oj_394_juros_pos_ir: boolean | null
          outro_indice_trabalhista: string | null
          regime_padrao: string | null
          regimes: Json
          salario_devido_forma_aplicacao: string | null
          salario_pago_forma_aplicacao: string | null
          tipo: string | null
        }
        Insert: {
          a_partir_de_lei_11941?: string | null
          a_partir_de_lei_11941_multa?: string | null
          a_partir_de_lei_11941_pago?: string | null
          a_partir_de_outro_indice?: string | null
          aplicar_multa_salarios_devidos_inss?: boolean | null
          aplicar_multa_salarios_pagos_inss?: boolean | null
          calculo_id?: string | null
          combinacoes_indice?: string | null
          combinacoes_juros?: string | null
          combinar_outro_indice?: boolean | null
          correcao_previdenciaria_salarios_devidos_inss?: boolean | null
          correcao_previdenciaria_salarios_pagos_inss?: boolean | null
          correcao_trabalhista_salarios_devidos_inss?: boolean | null
          correcao_trabalhista_salarios_pagos_inss?: boolean | null
          created_at?: string | null
          data_liquidacao?: string | null
          id?: string
          ignorar_taxa_correcao_negativa?: boolean | null
          indice_fgts?: string | null
          indice_irpf?: string | null
          indice_previdenciario?: string | null
          indice_trabalhista?: string | null
          juros_apos_deducao_cs?: boolean | null
          lei_11941?: boolean | null
          lei_11941_multa?: boolean | null
          lei_11941_pago?: boolean | null
          observacoes?: string | null
          oj_394_juros_pos_ir?: boolean | null
          outro_indice_trabalhista?: string | null
          regime_padrao?: string | null
          regimes?: Json
          salario_devido_forma_aplicacao?: string | null
          salario_pago_forma_aplicacao?: string | null
          tipo?: string | null
        }
        Update: {
          a_partir_de_lei_11941?: string | null
          a_partir_de_lei_11941_multa?: string | null
          a_partir_de_lei_11941_pago?: string | null
          a_partir_de_outro_indice?: string | null
          aplicar_multa_salarios_devidos_inss?: boolean | null
          aplicar_multa_salarios_pagos_inss?: boolean | null
          calculo_id?: string | null
          combinacoes_indice?: string | null
          combinacoes_juros?: string | null
          combinar_outro_indice?: boolean | null
          correcao_previdenciaria_salarios_devidos_inss?: boolean | null
          correcao_previdenciaria_salarios_pagos_inss?: boolean | null
          correcao_trabalhista_salarios_devidos_inss?: boolean | null
          correcao_trabalhista_salarios_pagos_inss?: boolean | null
          created_at?: string | null
          data_liquidacao?: string | null
          id?: string
          ignorar_taxa_correcao_negativa?: boolean | null
          indice_fgts?: string | null
          indice_irpf?: string | null
          indice_previdenciario?: string | null
          indice_trabalhista?: string | null
          juros_apos_deducao_cs?: boolean | null
          lei_11941?: boolean | null
          lei_11941_multa?: boolean | null
          lei_11941_pago?: boolean | null
          observacoes?: string | null
          oj_394_juros_pos_ir?: boolean | null
          outro_indice_trabalhista?: string | null
          regime_padrao?: string | null
          regimes?: Json
          salario_devido_forma_aplicacao?: string | null
          salario_pago_forma_aplicacao?: string | null
          tipo?: string | null
        }
        Relationships: []
      }
      pjecalc_audit_log: {
        Row: {
          acao: string | null
          campo: string | null
          case_id: string | null
          created_at: string | null
          id: string
          justificativa: string | null
          metadata: Json | null
          modulo: string | null
          user_id: string | null
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          acao?: string | null
          campo?: string | null
          case_id?: string | null
          created_at?: string | null
          id?: string
          justificativa?: string | null
          metadata?: Json | null
          modulo?: string | null
          user_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          acao?: string | null
          campo?: string | null
          case_id?: string | null
          created_at?: string | null
          id?: string
          justificativa?: string | null
          metadata?: Json | null
          modulo?: string | null
          user_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: []
      }
      pjecalc_calculos: {
        Row: {
          ativo: boolean | null
          atualizacao_monetaria: string | null
          aviso_previo_dias: number | null
          aviso_previo_tipo: string | null
          calculo_externo: boolean | null
          case_id: string | null
          considera_feriado_estadual: boolean | null
          considera_feriado_municipal: boolean | null
          considera_feriado_nacional: boolean | null
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
          data_citacao: string | null
          data_demissao: string | null
          data_fim_calculo: string | null
          data_inicio_calculo: string | null
          data_liquidacao: string | null
          data_prescricao_quinquenal: string | null
          data_ultima_atualizacao: string | null
          dia_fechamento: number | null
          dia_fechamento_mes: number | null
          divisor_horas: number | null
          duplicado_de: string | null
          engine_version: string | null
          fase: string | null
          hash_atualizacao: string | null
          hash_calculo: string | null
          hash_estado: string | null
          honorarios_percentual: number | null
          honorarios_sobre: string | null
          id: string
          ignorar_taxa_correcao_negativa: boolean | null
          indices_acumulados: string | null
          instancia: string | null
          jornada_contratual_horas: number | null
          last_calculated_at: string | null
          limitar_avos: boolean | null
          limitar_avos_periodo_calculo: boolean | null
          multa_467_habilitada: boolean | null
          multa_477_habilitada: boolean | null
          municipio_ibge: string | null
          observacoes: string | null
          ordem: number | null
          percentual_adicional_noturno: number | null
          percentual_he_100: number | null
          percentual_he_50: number | null
          pjc_import_metadata: Json | null
          prescricao_fgts: boolean | null
          prescricao_quinquenal: boolean | null
          processo_cnj: string | null
          projeta_aviso: boolean | null
          projetar_aviso_indenizado: boolean | null
          reclamado_cnpj: string | null
          reclamado_nome: string | null
          reclamante_cpf: string | null
          reclamante_nome: string | null
          regime_contrato: string | null
          sabado_dia_util: boolean | null
          status: string | null
          tags: string[] | null
          tipo_demissao: string | null
          titulo: string | null
          tribunal: string | null
          uf: string | null
          updated_at: string | null
          user_id: string | null
          validado: boolean | null
          valor_maior_remuneracao: number | null
          valor_ultima_remuneracao: number | null
          vara: string | null
          versao: number | null
          zera_negativo: boolean | null
          zera_valor_negativo: boolean | null
        }
        Insert: {
          ativo?: boolean | null
          atualizacao_monetaria?: string | null
          aviso_previo_dias?: number | null
          aviso_previo_tipo?: string | null
          calculo_externo?: boolean | null
          case_id?: string | null
          considera_feriado_estadual?: boolean | null
          considera_feriado_municipal?: boolean | null
          considera_feriado_nacional?: boolean | null
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
          data_citacao?: string | null
          data_demissao?: string | null
          data_fim_calculo?: string | null
          data_inicio_calculo?: string | null
          data_liquidacao?: string | null
          data_prescricao_quinquenal?: string | null
          data_ultima_atualizacao?: string | null
          dia_fechamento?: number | null
          dia_fechamento_mes?: number | null
          divisor_horas?: number | null
          duplicado_de?: string | null
          engine_version?: string | null
          fase?: string | null
          hash_atualizacao?: string | null
          hash_calculo?: string | null
          hash_estado?: string | null
          honorarios_percentual?: number | null
          honorarios_sobre?: string | null
          id?: string
          ignorar_taxa_correcao_negativa?: boolean | null
          indices_acumulados?: string | null
          instancia?: string | null
          jornada_contratual_horas?: number | null
          last_calculated_at?: string | null
          limitar_avos?: boolean | null
          limitar_avos_periodo_calculo?: boolean | null
          multa_467_habilitada?: boolean | null
          multa_477_habilitada?: boolean | null
          municipio_ibge?: string | null
          observacoes?: string | null
          ordem?: number | null
          percentual_adicional_noturno?: number | null
          percentual_he_100?: number | null
          percentual_he_50?: number | null
          pjc_import_metadata?: Json | null
          prescricao_fgts?: boolean | null
          prescricao_quinquenal?: boolean | null
          processo_cnj?: string | null
          projeta_aviso?: boolean | null
          projetar_aviso_indenizado?: boolean | null
          reclamado_cnpj?: string | null
          reclamado_nome?: string | null
          reclamante_cpf?: string | null
          reclamante_nome?: string | null
          regime_contrato?: string | null
          sabado_dia_util?: boolean | null
          status?: string | null
          tags?: string[] | null
          tipo_demissao?: string | null
          titulo?: string | null
          tribunal?: string | null
          uf?: string | null
          updated_at?: string | null
          user_id?: string | null
          validado?: boolean | null
          valor_maior_remuneracao?: number | null
          valor_ultima_remuneracao?: number | null
          vara?: string | null
          versao?: number | null
          zera_negativo?: boolean | null
          zera_valor_negativo?: boolean | null
        }
        Update: {
          ativo?: boolean | null
          atualizacao_monetaria?: string | null
          aviso_previo_dias?: number | null
          aviso_previo_tipo?: string | null
          calculo_externo?: boolean | null
          case_id?: string | null
          considera_feriado_estadual?: boolean | null
          considera_feriado_municipal?: boolean | null
          considera_feriado_nacional?: boolean | null
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
          data_citacao?: string | null
          data_demissao?: string | null
          data_fim_calculo?: string | null
          data_inicio_calculo?: string | null
          data_liquidacao?: string | null
          data_prescricao_quinquenal?: string | null
          data_ultima_atualizacao?: string | null
          dia_fechamento?: number | null
          dia_fechamento_mes?: number | null
          divisor_horas?: number | null
          duplicado_de?: string | null
          engine_version?: string | null
          fase?: string | null
          hash_atualizacao?: string | null
          hash_calculo?: string | null
          hash_estado?: string | null
          honorarios_percentual?: number | null
          honorarios_sobre?: string | null
          id?: string
          ignorar_taxa_correcao_negativa?: boolean | null
          indices_acumulados?: string | null
          instancia?: string | null
          jornada_contratual_horas?: number | null
          last_calculated_at?: string | null
          limitar_avos?: boolean | null
          limitar_avos_periodo_calculo?: boolean | null
          multa_467_habilitada?: boolean | null
          multa_477_habilitada?: boolean | null
          municipio_ibge?: string | null
          observacoes?: string | null
          ordem?: number | null
          percentual_adicional_noturno?: number | null
          percentual_he_100?: number | null
          percentual_he_50?: number | null
          pjc_import_metadata?: Json | null
          prescricao_fgts?: boolean | null
          prescricao_quinquenal?: boolean | null
          processo_cnj?: string | null
          projeta_aviso?: boolean | null
          projetar_aviso_indenizado?: boolean | null
          reclamado_cnpj?: string | null
          reclamado_nome?: string | null
          reclamante_cpf?: string | null
          reclamante_nome?: string | null
          regime_contrato?: string | null
          sabado_dia_util?: boolean | null
          status?: string | null
          tags?: string[] | null
          tipo_demissao?: string | null
          titulo?: string | null
          tribunal?: string | null
          uf?: string | null
          updated_at?: string | null
          user_id?: string | null
          validado?: boolean | null
          valor_maior_remuneracao?: number | null
          valor_ultima_remuneracao?: number | null
          vara?: string | null
          versao?: number | null
          zera_negativo?: boolean | null
          zera_valor_negativo?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_calculo_case"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_controversies"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_cnae_aliquotas: {
        Row: {
          cnae: string | null
          created_at: string | null
          descricao: string | null
          fap: number | null
          id: string
          sat_rat: number
          terceiros: number
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          cnae?: string | null
          created_at?: string | null
          descricao?: string | null
          fap?: number | null
          id?: string
          sat_rat?: number
          terceiros?: number
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          cnae?: string | null
          created_at?: string | null
          descricao?: string | null
          fap?: number | null
          id?: string
          sat_rat?: number
          terceiros?: number
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: []
      }
      pjecalc_contribuicao_social: {
        Row: {
          aliquota: number | null
          competencia: string | null
          created_at: string
          faixa: number
          id: string
          teto_beneficio: number | null
          teto_maximo: number | null
          tipo: string
          valor_final: number | null
          valor_inicial: number
          version_id: string | null
        }
        Insert: {
          aliquota?: number | null
          competencia?: string | null
          created_at?: string
          faixa?: number
          id?: string
          teto_beneficio?: number | null
          teto_maximo?: number | null
          tipo?: string
          valor_final?: number | null
          valor_inicial?: number
          version_id?: string | null
        }
        Update: {
          aliquota?: number | null
          competencia?: string | null
          created_at?: string
          faixa?: number
          id?: string
          teto_beneficio?: number | null
          teto_maximo?: number | null
          tipo?: string
          valor_final?: number | null
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
          competencia: string | null
          created_at: string
          fonte: string | null
          id: string
          indice: string | null
          valor: number | null
          version_id: string | null
        }
        Insert: {
          acumulado?: number | null
          competencia?: string | null
          created_at?: string
          fonte?: string | null
          id?: string
          indice?: string | null
          valor?: number | null
          version_id?: string | null
        }
        Update: {
          acumulado?: number | null
          competencia?: string | null
          created_at?: string
          fonte?: string | null
          id?: string
          indice?: string | null
          valor?: number | null
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
      pjecalc_custas_config: {
        Row: {
          ativo: boolean | null
          base: string | null
          calculo_id: string | null
          created_at: string | null
          data_pagamento: string | null
          descricao: string | null
          gru_numero: string | null
          id: string
          ja_paga: boolean | null
          ordem: number | null
          percentual: number | null
          responsavel: string | null
          tipo: string | null
          valor_fixo: number | null
          valor_informado: number | null
          valor_maximo: number | null
          valor_minimo: number | null
          valor_pago: number | null
        }
        Insert: {
          ativo?: boolean | null
          base?: string | null
          calculo_id?: string | null
          created_at?: string | null
          data_pagamento?: string | null
          descricao?: string | null
          gru_numero?: string | null
          id?: string
          ja_paga?: boolean | null
          ordem?: number | null
          percentual?: number | null
          responsavel?: string | null
          tipo?: string | null
          valor_fixo?: number | null
          valor_informado?: number | null
          valor_maximo?: number | null
          valor_minimo?: number | null
          valor_pago?: number | null
        }
        Update: {
          ativo?: boolean | null
          base?: string | null
          calculo_id?: string | null
          created_at?: string | null
          data_pagamento?: string | null
          descricao?: string | null
          gru_numero?: string | null
          id?: string
          ja_paga?: boolean | null
          ordem?: number | null
          percentual?: number | null
          responsavel?: string | null
          tipo?: string | null
          valor_fixo?: number | null
          valor_informado?: number | null
          valor_maximo?: number | null
          valor_minimo?: number | null
          valor_pago?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_custas_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_custas_judiciais: {
        Row: {
          created_at: string | null
          criterios: Json | null
          id: string
          teto_custas: number | null
          teto_custas_autos: number | null
          uf: string | null
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          created_at?: string | null
          criterios?: Json | null
          id?: string
          teto_custas?: number | null
          teto_custas_autos?: number | null
          uf?: string | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          created_at?: string | null
          criterios?: Json | null
          id?: string
          teto_custas?: number | null
          teto_custas_autos?: number | null
          uf?: string | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: []
      }
      pjecalc_evento_intervalo: {
        Row: {
          calculo_id: string | null
          confianca: number | null
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
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
          tipo: string | null
        }
        Insert: {
          calculo_id?: string | null
          confianca?: number | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
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
          tipo?: string | null
        }
        Update: {
          calculo_id?: string | null
          confianca?: number | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
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
          tipo?: string | null
        }
        Relationships: []
      }
      pjecalc_excecao_juros: {
        Row: {
          calculo_id: string | null
          created_at: string | null
          fundamento: string | null
          id: string
          motivo: string | null
          percentual: number | null
          periodo_fim: string | null
          periodo_inicio: string | null
          tipo_juros: string | null
        }
        Insert: {
          calculo_id?: string | null
          created_at?: string | null
          fundamento?: string | null
          id?: string
          motivo?: string | null
          percentual?: number | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          tipo_juros?: string | null
        }
        Update: {
          calculo_id?: string | null
          created_at?: string | null
          fundamento?: string | null
          id?: string
          motivo?: string | null
          percentual?: number | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          tipo_juros?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_excecao_juros_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_excecoes_carga: {
        Row: {
          carga_horaria_mensal: number | null
          case_id: string | null
          created_at: string | null
          id: string
          periodo_fim: string | null
          periodo_inicio: string | null
        }
        Insert: {
          carga_horaria_mensal?: number | null
          case_id?: string | null
          created_at?: string | null
          id?: string
          periodo_fim?: string | null
          periodo_inicio?: string | null
        }
        Update: {
          carga_horaria_mensal?: number | null
          case_id?: string | null
          created_at?: string | null
          id?: string
          periodo_fim?: string | null
          periodo_inicio?: string | null
        }
        Relationships: []
      }
      pjecalc_excecoes_sabado: {
        Row: {
          case_id: string | null
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          id: string
          sabado_dia_util: boolean
        }
        Insert: {
          case_id?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          sabado_dia_util?: boolean
        }
        Update: {
          case_id?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          sabado_dia_util?: boolean
        }
        Relationships: []
      }
      pjecalc_faltas: {
        Row: {
          calculo_id: string | null
          created_at: string | null
          data_final: string | null
          data_inicial: string | null
          documento_id: string | null
          id: string
          justificada: boolean
          motivo: string | null
          reiniciar_ferias: boolean | null
        }
        Insert: {
          calculo_id?: string | null
          created_at?: string | null
          data_final?: string | null
          data_inicial?: string | null
          documento_id?: string | null
          id?: string
          justificada?: boolean
          motivo?: string | null
          reiniciar_ferias?: boolean | null
        }
        Update: {
          calculo_id?: string | null
          created_at?: string | null
          data_final?: string | null
          data_inicial?: string | null
          documento_id?: string | null
          id?: string
          justificada?: boolean
          motivo?: string | null
          reiniciar_ferias?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_faltas_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_feriados: {
        Row: {
          created_at: string
          data: string | null
          fonte: string | null
          id: string
          municipio: string | null
          municipio_ibge: string | null
          nome: string | null
          scope: string
          uf: string | null
          version_id: string | null
        }
        Insert: {
          created_at?: string
          data?: string | null
          fonte?: string | null
          id?: string
          municipio?: string | null
          municipio_ibge?: string | null
          nome?: string | null
          scope?: string
          uf?: string | null
          version_id?: string | null
        }
        Update: {
          created_at?: string
          data?: string | null
          fonte?: string | null
          id?: string
          municipio?: string | null
          municipio_ibge?: string | null
          nome?: string | null
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
      pjecalc_ferias: {
        Row: {
          abono: boolean | null
          abono_dias: number | null
          calculo_id: string | null
          created_at: string | null
          dobra_geral: boolean | null
          gozo_1_dobra: boolean | null
          gozo_1_fim: string | null
          gozo_1_inicio: string | null
          gozo_2_dobra: boolean | null
          gozo_2_fim: string | null
          gozo_2_inicio: string | null
          gozo_3_dobra: boolean | null
          gozo_3_fim: string | null
          gozo_3_inicio: string | null
          id: string
          observacoes: string | null
          periodo_aquisitivo_fim: string | null
          periodo_aquisitivo_inicio: string | null
          periodo_concessivo_fim: string | null
          periodo_concessivo_inicio: string | null
          prazo_dias: number
          situacao: string
          updated_at: string | null
        }
        Insert: {
          abono?: boolean | null
          abono_dias?: number | null
          calculo_id?: string | null
          created_at?: string | null
          dobra_geral?: boolean | null
          gozo_1_dobra?: boolean | null
          gozo_1_fim?: string | null
          gozo_1_inicio?: string | null
          gozo_2_dobra?: boolean | null
          gozo_2_fim?: string | null
          gozo_2_inicio?: string | null
          gozo_3_dobra?: boolean | null
          gozo_3_fim?: string | null
          gozo_3_inicio?: string | null
          id?: string
          observacoes?: string | null
          periodo_aquisitivo_fim?: string | null
          periodo_aquisitivo_inicio?: string | null
          periodo_concessivo_fim?: string | null
          periodo_concessivo_inicio?: string | null
          prazo_dias?: number
          situacao?: string
          updated_at?: string | null
        }
        Update: {
          abono?: boolean | null
          abono_dias?: number | null
          calculo_id?: string | null
          created_at?: string | null
          dobra_geral?: boolean | null
          gozo_1_dobra?: boolean | null
          gozo_1_fim?: string | null
          gozo_1_inicio?: string | null
          gozo_2_dobra?: boolean | null
          gozo_2_fim?: string | null
          gozo_2_inicio?: string | null
          gozo_3_dobra?: boolean | null
          gozo_3_fim?: string | null
          gozo_3_inicio?: string | null
          id?: string
          observacoes?: string | null
          periodo_aquisitivo_fim?: string | null
          periodo_aquisitivo_inicio?: string | null
          periodo_concessivo_fim?: string | null
          periodo_concessivo_inicio?: string | null
          prazo_dias?: number
          situacao?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_ferias_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_fgts_saldos_saques: {
        Row: {
          calculo_id: string | null
          case_id: string | null
          created_at: string
          data: string | null
          descricao: string | null
          id: string
          observacoes: string | null
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          calculo_id?: string | null
          case_id?: string | null
          created_at?: string
          data?: string | null
          descricao?: string | null
          id?: string
          observacoes?: string | null
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          calculo_id?: string | null
          case_id?: string | null
          created_at?: string
          data?: string | null
          descricao?: string | null
          id?: string
          observacoes?: string | null
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      pjecalc_hist_salarial: {
        Row: {
          calculo_id: string | null
          created_at: string | null
          id: string
          incide_fgts: boolean | null
          incide_inss: boolean | null
          incide_ir: boolean | null
          nome: string | null
          observacoes: string | null
          tipo_variacao: string | null
          valor_fixo: number | null
        }
        Insert: {
          calculo_id?: string | null
          created_at?: string | null
          id?: string
          incide_fgts?: boolean | null
          incide_inss?: boolean | null
          incide_ir?: boolean | null
          nome?: string | null
          observacoes?: string | null
          tipo_variacao?: string | null
          valor_fixo?: number | null
        }
        Update: {
          calculo_id?: string | null
          created_at?: string | null
          id?: string
          incide_fgts?: boolean | null
          incide_inss?: boolean | null
          incide_ir?: boolean | null
          nome?: string | null
          observacoes?: string | null
          tipo_variacao?: string | null
          valor_fixo?: number | null
        }
        Relationships: []
      }
      pjecalc_hist_salarial_mes: {
        Row: {
          calculo_id: string | null
          competencia: string | null
          created_at: string | null
          documento_id: string | null
          hist_salarial_id: string | null
          id: string
          origem: string | null
          valor: number
        }
        Insert: {
          calculo_id?: string | null
          competencia?: string | null
          created_at?: string | null
          documento_id?: string | null
          hist_salarial_id?: string | null
          id?: string
          origem?: string | null
          valor?: number
        }
        Update: {
          calculo_id?: string | null
          competencia?: string | null
          created_at?: string | null
          documento_id?: string | null
          hist_salarial_id?: string | null
          id?: string
          origem?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_hist_salarial_mes_hist_salarial_id_fkey"
            columns: ["hist_salarial_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_hist_salarial"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_honorarios_config: {
        Row: {
          aliquota_iss: number | null
          ativo: boolean | null
          base: string | null
          calculo_id: string | null
          com_juros: boolean | null
          corrigido: boolean | null
          created_at: string | null
          credor: string | null
          deduzir_cs_segurado: boolean | null
          deduzir_fgts_depositar: boolean | null
          deduzir_honorarios_contratuais: boolean | null
          deduzir_ir: boolean | null
          faixas: Json | null
          id: string
          incide_iss: boolean | null
          observacoes: string | null
          ordem: number | null
          percentual: number | null
          tipo: string | null
          usar_faixas: boolean | null
          valor_informado: number | null
        }
        Insert: {
          aliquota_iss?: number | null
          ativo?: boolean | null
          base?: string | null
          calculo_id?: string | null
          com_juros?: boolean | null
          corrigido?: boolean | null
          created_at?: string | null
          credor?: string | null
          deduzir_cs_segurado?: boolean | null
          deduzir_fgts_depositar?: boolean | null
          deduzir_honorarios_contratuais?: boolean | null
          deduzir_ir?: boolean | null
          faixas?: Json | null
          id?: string
          incide_iss?: boolean | null
          observacoes?: string | null
          ordem?: number | null
          percentual?: number | null
          tipo?: string | null
          usar_faixas?: boolean | null
          valor_informado?: number | null
        }
        Update: {
          aliquota_iss?: number | null
          ativo?: boolean | null
          base?: string | null
          calculo_id?: string | null
          com_juros?: boolean | null
          corrigido?: boolean | null
          created_at?: string | null
          credor?: string | null
          deduzir_cs_segurado?: boolean | null
          deduzir_fgts_depositar?: boolean | null
          deduzir_honorarios_contratuais?: boolean | null
          deduzir_ir?: boolean | null
          faixas?: Json | null
          id?: string
          incide_iss?: boolean | null
          observacoes?: string | null
          ordem?: number | null
          percentual?: number | null
          tipo?: string | null
          usar_faixas?: boolean | null
          valor_informado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_honorarios_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_imposto_renda: {
        Row: {
          competencia: string | null
          created_at: string
          deducao_aposentado_65: number
          deducao_dependente: number
          id: string
        }
        Insert: {
          competencia?: string | null
          created_at?: string
          deducao_aposentado_65?: number
          deducao_dependente?: number
          id?: string
        }
        Update: {
          competencia?: string | null
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
          ir_id: string | null
          parcela_deduzir: number
          valor_final: number | null
          valor_inicial: number
        }
        Insert: {
          aliquota?: number
          created_at?: string
          faixa?: number
          id?: string
          ir_id?: string | null
          parcela_deduzir?: number
          valor_final?: number | null
          valor_inicial?: number
        }
        Update: {
          aliquota?: number
          created_at?: string
          faixa?: number
          id?: string
          ir_id?: string | null
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
          aliquota: number | null
          competencia_fim: string | null
          competencia_inicio: string | null
          created_at: string | null
          descricao: string | null
          faixa: number | null
          id: string
          progressiva: boolean | null
          teto_previdenciario: number | null
          valor_ate: number | null
        }
        Insert: {
          aliquota?: number | null
          competencia_fim?: string | null
          competencia_inicio?: string | null
          created_at?: string | null
          descricao?: string | null
          faixa?: number | null
          id?: string
          progressiva?: boolean | null
          teto_previdenciario?: number | null
          valor_ate?: number | null
        }
        Update: {
          aliquota?: number | null
          competencia_fim?: string | null
          competencia_inicio?: string | null
          created_at?: string | null
          descricao?: string | null
          faixa?: number | null
          id?: string
          progressiva?: boolean | null
          teto_previdenciario?: number | null
          valor_ate?: number | null
        }
        Relationships: []
      }
      pjecalc_inss_faixas_domestico: {
        Row: {
          aliquota: number | null
          competencia_fim: string | null
          competencia_inicio: string | null
          created_at: string | null
          faixa: number | null
          id: string
          progressiva: boolean | null
          teto_previdenciario: number | null
          valor_ate: number | null
          version_id: string | null
        }
        Insert: {
          aliquota?: number | null
          competencia_fim?: string | null
          competencia_inicio?: string | null
          created_at?: string | null
          faixa?: number | null
          id?: string
          progressiva?: boolean | null
          teto_previdenciario?: number | null
          valor_ate?: number | null
          version_id?: string | null
        }
        Update: {
          aliquota?: number | null
          competencia_fim?: string | null
          competencia_inicio?: string | null
          created_at?: string | null
          faixa?: number | null
          id?: string
          progressiva?: boolean | null
          teto_previdenciario?: number | null
          valor_ate?: number | null
          version_id?: string | null
        }
        Relationships: []
      }
      pjecalc_inss_multa: {
        Row: {
          competencia_fim: string | null
          competencia_inicio: string | null
          created_at: string | null
          fundamento: string | null
          id: string
          percentual_maximo: number | null
          percentual_por_mes: number | null
        }
        Insert: {
          competencia_fim?: string | null
          competencia_inicio?: string | null
          created_at?: string | null
          fundamento?: string | null
          id?: string
          percentual_maximo?: number | null
          percentual_por_mes?: number | null
        }
        Update: {
          competencia_fim?: string | null
          competencia_inicio?: string | null
          created_at?: string | null
          fundamento?: string | null
          id?: string
          percentual_maximo?: number | null
          percentual_por_mes?: number | null
        }
        Relationships: []
      }
      pjecalc_jam: {
        Row: {
          competencia: string | null
          created_at: string | null
          dia: number | null
          id: string
          valor_acumulado: number | null
          valor_indice: number | null
        }
        Insert: {
          competencia?: string | null
          created_at?: string | null
          dia?: number | null
          id?: string
          valor_acumulado?: number | null
          valor_indice?: number | null
        }
        Update: {
          competencia?: string | null
          created_at?: string | null
          dia?: number | null
          id?: string
          valor_acumulado?: number | null
          valor_indice?: number | null
        }
        Relationships: []
      }
      pjecalc_juros_mora: {
        Row: {
          acumulado: number | null
          competencia: string | null
          created_at: string
          id: string
          taxa_mensal: number | null
          tipo: string
        }
        Insert: {
          acumulado?: number | null
          competencia?: string | null
          created_at?: string
          id?: string
          taxa_mensal?: number | null
          tipo?: string
        }
        Update: {
          acumulado?: number | null
          competencia?: string | null
          created_at?: string
          id?: string
          taxa_mensal?: number | null
          tipo?: string
        }
        Relationships: []
      }
      pjecalc_justificativas: {
        Row: {
          autor_id: string | null
          calculo_id: string | null
          contexto: string | null
          created_at: string | null
          descricao: string | null
          entidade_id: string | null
          fundamento_legal: string | null
          id: string
          titulo: string | null
        }
        Insert: {
          autor_id?: string | null
          calculo_id?: string | null
          contexto?: string | null
          created_at?: string | null
          descricao?: string | null
          entidade_id?: string | null
          fundamento_legal?: string | null
          id?: string
          titulo?: string | null
        }
        Update: {
          autor_id?: string | null
          calculo_id?: string | null
          contexto?: string | null
          created_at?: string | null
          descricao?: string | null
          entidade_id?: string | null
          fundamento_legal?: string | null
          id?: string
          titulo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_justificativas_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_multas_config: {
        Row: {
          ativo: boolean | null
          base: string | null
          calculo_id: string | null
          com_juros: boolean | null
          corrigida: boolean | null
          created_at: string | null
          descricao: string | null
          fundamento_legal: string | null
          id: string
          multiplicador: number | null
          ordem: number | null
          percentual: number | null
          responsavel: string | null
          tipo: string | null
          valor_informado: number | null
        }
        Insert: {
          ativo?: boolean | null
          base?: string | null
          calculo_id?: string | null
          com_juros?: boolean | null
          corrigida?: boolean | null
          created_at?: string | null
          descricao?: string | null
          fundamento_legal?: string | null
          id?: string
          multiplicador?: number | null
          ordem?: number | null
          percentual?: number | null
          responsavel?: string | null
          tipo?: string | null
          valor_informado?: number | null
        }
        Update: {
          ativo?: boolean | null
          base?: string | null
          calculo_id?: string | null
          com_juros?: boolean | null
          corrigida?: boolean | null
          created_at?: string | null
          descricao?: string | null
          fundamento_legal?: string | null
          id?: string
          multiplicador?: number | null
          ordem?: number | null
          percentual?: number | null
          responsavel?: string | null
          tipo?: string | null
          valor_informado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_multas_config_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_observacoes: {
        Row: {
          case_id: string | null
          created_at: string
          created_by: string | null
          id: string
          modulo: string | null
          texto: string | null
          tipo: string
        }
        Insert: {
          case_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string | null
          texto?: string | null
          tipo?: string
        }
        Update: {
          case_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string | null
          texto?: string | null
          tipo?: string
        }
        Relationships: []
      }
      pjecalc_ocorrencia_calculo: {
        Row: {
          ativa: boolean | null
          base_integral: number | null
          base_valor: number | null
          calculo_id: string | null
          competencia: string | null
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
          nome: string | null
          origem: string | null
          pago: number | null
          pago_integral: number | null
          parametros_snapshot: Json | null
          quantidade: number | null
          quantidade_integral: number | null
          reflexo_id: string | null
          taxa_juros: number | null
          tipo: string | null
          total: number | null
          updated_at: string | null
          verba_base_id: string | null
        }
        Insert: {
          ativa?: boolean | null
          base_integral?: number | null
          base_valor?: number | null
          calculo_id?: string | null
          competencia?: string | null
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
          nome?: string | null
          origem?: string | null
          pago?: number | null
          pago_integral?: number | null
          parametros_snapshot?: Json | null
          quantidade?: number | null
          quantidade_integral?: number | null
          reflexo_id?: string | null
          taxa_juros?: number | null
          tipo?: string | null
          total?: number | null
          updated_at?: string | null
          verba_base_id?: string | null
        }
        Update: {
          ativa?: boolean | null
          base_integral?: number | null
          base_valor?: number | null
          calculo_id?: string | null
          competencia?: string | null
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
          nome?: string | null
          origem?: string | null
          pago?: number | null
          pago_integral?: number | null
          parametros_snapshot?: Json | null
          quantidade?: number | null
          quantidade_integral?: number | null
          reflexo_id?: string | null
          taxa_juros?: number | null
          tipo?: string | null
          total?: number | null
          updated_at?: string | null
          verba_base_id?: string | null
        }
        Relationships: [
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
        ]
      }
      pjecalc_pagamentos: {
        Row: {
          abatimento_global: boolean | null
          calculo_id: string | null
          competencia: string | null
          created_at: string | null
          data_pagamento: string | null
          descricao: string | null
          documento_id: string | null
          id: string
          reflexo_id: string | null
          tipo: string | null
          valor: number
          verba_base_id: string | null
        }
        Insert: {
          abatimento_global?: boolean | null
          calculo_id?: string | null
          competencia?: string | null
          created_at?: string | null
          data_pagamento?: string | null
          descricao?: string | null
          documento_id?: string | null
          id?: string
          reflexo_id?: string | null
          tipo?: string | null
          valor?: number
          verba_base_id?: string | null
        }
        Update: {
          abatimento_global?: boolean | null
          calculo_id?: string | null
          competencia?: string | null
          created_at?: string | null
          data_pagamento?: string | null
          descricao?: string | null
          documento_id?: string | null
          id?: string
          reflexo_id?: string | null
          tipo?: string | null
          valor?: number
          verba_base_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_pagamentos_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_pagamentos_reflexo_id_fkey"
            columns: ["reflexo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_reflexo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjecalc_pagamentos_verba_base_id_fkey"
            columns: ["verba_base_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_verba_base"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_parametros: {
        Row: {
          carga_horaria_padrao: number | null
          case_id: string | null
          created_at: string | null
          data_admissao: string | null
          data_demissao: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          carga_horaria_padrao?: number | null
          case_id?: string | null
          created_at?: string | null
          data_admissao?: string | null
          data_demissao?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          carga_horaria_padrao?: number | null
          case_id?: string | null
          created_at?: string | null
          data_admissao?: string | null
          data_demissao?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_parametros_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_participantes: {
        Row: {
          ativo: boolean | null
          calculo_id: string | null
          created_at: string | null
          documento: string | null
          documento_tipo: string | null
          endereco: Json | null
          id: string
          nome: string | null
          observacoes: string | null
          ordem: number | null
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          calculo_id?: string | null
          created_at?: string | null
          documento?: string | null
          documento_tipo?: string | null
          endereco?: Json | null
          id?: string
          nome?: string | null
          observacoes?: string | null
          ordem?: number | null
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          calculo_id?: string | null
          created_at?: string | null
          documento?: string | null
          documento_tipo?: string | null
          endereco?: Json | null
          id?: string
          nome?: string | null
          observacoes?: string | null
          ordem?: number | null
          tipo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_participantes_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_pensao_alimenticia_config: {
        Row: {
          apurar: boolean
          base_incidencia: string | null
          beneficiario: string | null
          calculo_id: string | null
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
          calculo_id?: string | null
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
          calculo_id?: string | null
          created_at?: string
          id?: string
          observacoes?: string | null
          percentual?: number | null
          tipo?: string
          updated_at?: string
          valor_fixo?: number | null
        }
        Relationships: []
      }
      pjecalc_pensao_ocorrencia: {
        Row: {
          base: number
          beneficiario_cpf: string | null
          beneficiario_nome: string | null
          calculo_id: string | null
          competencia: string | null
          created_at: string | null
          id: string
          percentual: number | null
          valor: number
        }
        Insert: {
          base?: number
          beneficiario_cpf?: string | null
          beneficiario_nome?: string | null
          calculo_id?: string | null
          competencia?: string | null
          created_at?: string | null
          id?: string
          percentual?: number | null
          valor?: number
        }
        Update: {
          base?: number
          beneficiario_cpf?: string | null
          beneficiario_nome?: string | null
          calculo_id?: string | null
          competencia?: string | null
          created_at?: string | null
          id?: string
          percentual?: number | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_pensao_ocorrencia_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_pisos_salariais: {
        Row: {
          categoria: string | null
          competencia: string | null
          created_at: string
          fonte_doc: string | null
          id: string
          nome: string | null
          sindicato: string | null
          uf: string | null
          valor: number | null
          version_id: string | null
        }
        Insert: {
          categoria?: string | null
          competencia?: string | null
          created_at?: string
          fonte_doc?: string | null
          id?: string
          nome?: string | null
          sindicato?: string | null
          uf?: string | null
          valor?: number | null
          version_id?: string | null
        }
        Update: {
          categoria?: string | null
          competencia?: string | null
          created_at?: string
          fonte_doc?: string | null
          id?: string
          nome?: string | null
          sindicato?: string | null
          uf?: string | null
          valor?: number | null
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
          calculo_id: string | null
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
          calculo_id?: string | null
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
          calculo_id?: string | null
          created_at?: string
          entidade?: string | null
          id?: string
          observacoes?: string | null
          percentual_empregado?: number | null
          percentual_empregador?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      pjecalc_prev_privada_ocorrencia: {
        Row: {
          base: number
          calculo_id: string | null
          competencia: string | null
          created_at: string | null
          deduzir_ir: boolean | null
          id: string
          percentual: number | null
          valor_empregado: number | null
          valor_empregador: number | null
        }
        Insert: {
          base?: number
          calculo_id?: string | null
          competencia?: string | null
          created_at?: string | null
          deduzir_ir?: boolean | null
          id?: string
          percentual?: number | null
          valor_empregado?: number | null
          valor_empregador?: number | null
        }
        Update: {
          base?: number
          calculo_id?: string | null
          competencia?: string | null
          created_at?: string | null
          deduzir_ir?: boolean | null
          id?: string
          percentual?: number | null
          valor_empregado?: number | null
          valor_empregador?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_prev_privada_ocorrencia_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_reflexo: {
        Row: {
          ativa: boolean | null
          calculo_id: string | null
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
          nome: string | null
          observacoes: string | null
          ordem: number | null
          periodo_fim: string | null
          periodo_inicio: string | null
          periodo_media_reflexo: string | null
          pjc_id: string | null
          quantidade_tipo: string | null
          tipo: string | null
          tratamento_fracao_mes: string | null
        }
        Insert: {
          ativa?: boolean | null
          calculo_id?: string | null
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
          nome?: string | null
          observacoes?: string | null
          ordem?: number | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          periodo_media_reflexo?: string | null
          pjc_id?: string | null
          quantidade_tipo?: string | null
          tipo?: string | null
          tratamento_fracao_mes?: string | null
        }
        Update: {
          ativa?: boolean | null
          calculo_id?: string | null
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
          nome?: string | null
          observacoes?: string | null
          ordem?: number | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          periodo_media_reflexo?: string | null
          pjc_id?: string | null
          quantidade_tipo?: string | null
          tipo?: string | null
          tratamento_fracao_mes?: string | null
        }
        Relationships: []
      }
      pjecalc_reflexo_base_verba: {
        Row: {
          id: string
          integralizar: boolean | null
          reflexo_id: string | null
          verba_base_id: string | null
        }
        Insert: {
          id?: string
          integralizar?: boolean | null
          reflexo_id?: string | null
          verba_base_id?: string | null
        }
        Update: {
          id?: string
          integralizar?: boolean | null
          reflexo_id?: string | null
          verba_base_id?: string | null
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
        ]
      }
      pjecalc_relatorios: {
        Row: {
          calculo_id: string | null
          conteudo_html: string | null
          created_at: string | null
          formato: string | null
          gerado_em: string | null
          gerado_por: string | null
          id: string
          parametros: Json | null
          storage_path: string | null
          tipo: string | null
        }
        Insert: {
          calculo_id?: string | null
          conteudo_html?: string | null
          created_at?: string | null
          formato?: string | null
          gerado_em?: string | null
          gerado_por?: string | null
          id?: string
          parametros?: Json | null
          storage_path?: string | null
          tipo?: string | null
        }
        Update: {
          calculo_id?: string | null
          conteudo_html?: string | null
          created_at?: string | null
          formato?: string | null
          gerado_em?: string | null
          gerado_por?: string | null
          id?: string
          parametros?: Json | null
          storage_path?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_relatorios_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_resultado: {
        Row: {
          calculado_em: string | null
          calculo_id: string | null
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
          calculo_id?: string | null
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
          calculo_id?: string | null
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
        Relationships: []
      }
      pjecalc_rubrica_map: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          codigo_match: string | null
          conceito: string | null
          created_at: string | null
          descricao_regex: string | null
          empresa_cnpj: string | null
          id: string
          prioridade: number | null
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          codigo_match?: string | null
          conceito?: string | null
          created_at?: string | null
          descricao_regex?: string | null
          empresa_cnpj?: string | null
          id?: string
          prioridade?: number | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          codigo_match?: string | null
          conceito?: string | null
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
          calculo_id: string | null
          classificacao: string | null
          codigo: string | null
          competencia: string | null
          confianca: number | null
          created_at: string | null
          descricao: string | null
          documento_id: string | null
          id: string
          pagina: number | null
          tipo_documento: string | null
          valor: number | null
        }
        Insert: {
          calculo_id?: string | null
          classificacao?: string | null
          codigo?: string | null
          competencia?: string | null
          confianca?: number | null
          created_at?: string | null
          descricao?: string | null
          documento_id?: string | null
          id?: string
          pagina?: number | null
          tipo_documento?: string | null
          valor?: number | null
        }
        Update: {
          calculo_id?: string | null
          classificacao?: string | null
          codigo?: string | null
          competencia?: string | null
          confianca?: number | null
          created_at?: string | null
          descricao?: string | null
          documento_id?: string | null
          id?: string
          pagina?: number | null
          tipo_documento?: string | null
          valor?: number | null
        }
        Relationships: []
      }
      pjecalc_sal_familia_config: {
        Row: {
          apurar: boolean
          calculo_id: string | null
          created_at: string
          id: string
          numero_filhos: number | null
          observacoes: string | null
          updated_at: string
        }
        Insert: {
          apurar?: boolean
          calculo_id?: string | null
          created_at?: string
          id?: string
          numero_filhos?: number | null
          observacoes?: string | null
          updated_at?: string
        }
        Update: {
          apurar?: boolean
          calculo_id?: string | null
          created_at?: string
          id?: string
          numero_filhos?: number | null
          observacoes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pjecalc_salario_categoria: {
        Row: {
          ativo: boolean | null
          cct_numero: string | null
          cct_vigencia_fim: string | null
          cct_vigencia_inicio: string | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string | null
          sindicato: string | null
          uf: string | null
          version_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          cct_numero?: string | null
          cct_vigencia_fim?: string | null
          cct_vigencia_inicio?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string | null
          sindicato?: string | null
          uf?: string | null
          version_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          cct_numero?: string | null
          cct_vigencia_fim?: string | null
          cct_vigencia_inicio?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string | null
          sindicato?: string | null
          uf?: string | null
          version_id?: string | null
        }
        Relationships: []
      }
      pjecalc_salario_categoria_ocorrencia: {
        Row: {
          carga_horaria: number | null
          competencia: string | null
          created_at: string | null
          id: string
          salario_categoria_id: string | null
          valor: number | null
        }
        Insert: {
          carga_horaria?: number | null
          competencia?: string | null
          created_at?: string | null
          id?: string
          salario_categoria_id?: string | null
          valor?: number | null
        }
        Update: {
          carga_horaria?: number | null
          competencia?: string | null
          created_at?: string | null
          id?: string
          salario_categoria_id?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_salario_categoria_ocorrencia_salario_categoria_id_fkey"
            columns: ["salario_categoria_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_salario_categoria"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_salario_familia: {
        Row: {
          competencia: string | null
          created_at: string
          faixa: number
          id: string
          valor_cota: number | null
          valor_final: number | null
          valor_inicial: number
          version_id: string | null
        }
        Insert: {
          competencia?: string | null
          created_at?: string
          faixa?: number
          id?: string
          valor_cota?: number | null
          valor_final?: number | null
          valor_inicial?: number
          version_id?: string | null
        }
        Update: {
          competencia?: string | null
          created_at?: string
          faixa?: number
          id?: string
          valor_cota?: number | null
          valor_final?: number | null
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
          competencia: string | null
          created_at: string
          id: string
          valor: number | null
          version_id: string | null
        }
        Insert: {
          competencia?: string | null
          created_at?: string
          id?: string
          valor?: number | null
          version_id?: string | null
        }
        Update: {
          competencia?: string | null
          created_at?: string
          id?: string
          valor?: number | null
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
          competencia: string | null
          created_at: string
          faixa: number
          id: string
          percentual: number | null
          valor_final: number | null
          valor_inicial: number
          valor_piso: number | null
          valor_soma: number | null
          valor_teto: number | null
          version_id: string | null
        }
        Insert: {
          competencia?: string | null
          created_at?: string
          faixa?: number
          id?: string
          percentual?: number | null
          valor_final?: number | null
          valor_inicial?: number
          valor_piso?: number | null
          valor_soma?: number | null
          valor_teto?: number | null
          version_id?: string | null
        }
        Update: {
          competencia?: string | null
          created_at?: string
          faixa?: number
          id?: string
          percentual?: number | null
          valor_final?: number | null
          valor_inicial?: number
          valor_piso?: number | null
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
          calculo_id: string | null
          created_at: string
          habilitado_pelo_calculo: boolean | null
          id: string
          media_salarios: number | null
          meses_trabalhados: number | null
          motivo_dispensa: string | null
          numero_parcelas: number | null
          observacoes: string | null
          parcelas: number
          recebeu: boolean
          updated_at: string
          valor_parcela: number | null
        }
        Insert: {
          apurar?: boolean
          calculo_id?: string | null
          created_at?: string
          habilitado_pelo_calculo?: boolean | null
          id?: string
          media_salarios?: number | null
          meses_trabalhados?: number | null
          motivo_dispensa?: string | null
          numero_parcelas?: number | null
          observacoes?: string | null
          parcelas?: number
          recebeu?: boolean
          updated_at?: string
          valor_parcela?: number | null
        }
        Update: {
          apurar?: boolean
          calculo_id?: string | null
          created_at?: string
          habilitado_pelo_calculo?: boolean | null
          id?: string
          media_salarios?: number | null
          meses_trabalhados?: number | null
          motivo_dispensa?: string | null
          numero_parcelas?: number | null
          observacoes?: string | null
          parcelas?: number
          recebeu?: boolean
          updated_at?: string
          valor_parcela?: number | null
        }
        Relationships: []
      }
      pjecalc_tabela_unica_jt: {
        Row: {
          created_at: string | null
          data: string | null
          fonte: string | null
          id: string
          taxa_juros: number | null
          tipo: string | null
          valor_acumulado: number | null
          valor_indice: number | null
        }
        Insert: {
          created_at?: string | null
          data?: string | null
          fonte?: string | null
          id?: string
          taxa_juros?: number | null
          tipo?: string | null
          valor_acumulado?: number | null
          valor_indice?: number | null
        }
        Update: {
          created_at?: string | null
          data?: string | null
          fonte?: string | null
          id?: string
          taxa_juros?: number | null
          tipo?: string | null
          valor_acumulado?: number | null
          valor_indice?: number | null
        }
        Relationships: []
      }
      pjecalc_taxa_legal: {
        Row: {
          competencia: string | null
          created_at: string | null
          fundamento: string | null
          id: string
          taxa_diaria: number | null
          taxa_mensal: number | null
        }
        Insert: {
          competencia?: string | null
          created_at?: string | null
          fundamento?: string | null
          id?: string
          taxa_diaria?: number | null
          taxa_mensal?: number | null
        }
        Update: {
          competencia?: string | null
          created_at?: string | null
          fundamento?: string | null
          id?: string
          taxa_diaria?: number | null
          taxa_mensal?: number | null
        }
        Relationships: []
      }
      pjecalc_ufir: {
        Row: {
          coeficiente: number | null
          competencia: string | null
          created_at: string | null
          fonte: string | null
          id: string
          valor: number | null
        }
        Insert: {
          coeficiente?: number | null
          competencia?: string | null
          created_at?: string | null
          fonte?: string | null
          id?: string
          valor?: number | null
        }
        Update: {
          coeficiente?: number | null
          competencia?: string | null
          created_at?: string | null
          fonte?: string | null
          id?: string
          valor?: number | null
        }
        Relationships: []
      }
      pjecalc_vale_transporte: {
        Row: {
          calculo_id: string | null
          competencia: string | null
          created_at: string | null
          desconto_empregado: number | null
          fornecido: boolean | null
          id: string
          observacoes: string | null
          quantidade_dias: number | null
          valor: number
        }
        Insert: {
          calculo_id?: string | null
          competencia?: string | null
          created_at?: string | null
          desconto_empregado?: number | null
          fornecido?: boolean | null
          id?: string
          observacoes?: string | null
          quantidade_dias?: number | null
          valor?: number
        }
        Update: {
          calculo_id?: string | null
          competencia?: string | null
          created_at?: string | null
          desconto_empregado?: number | null
          fornecido?: boolean | null
          id?: string
          observacoes?: string | null
          quantidade_dias?: number | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_vale_transporte_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_vale_transporte_config: {
        Row: {
          apurar: boolean
          calculo_id: string | null
          created_at: string
          desconto_empregado_pct: number
          id: string
          observacoes: string | null
        }
        Insert: {
          apurar?: boolean
          calculo_id?: string | null
          created_at?: string
          desconto_empregado_pct?: number
          id?: string
          observacoes?: string | null
        }
        Update: {
          apurar?: boolean
          calculo_id?: string | null
          created_at?: string
          desconto_empregado_pct?: number
          id?: string
          observacoes?: string | null
        }
        Relationships: []
      }
      pjecalc_vale_transporte_linhas: {
        Row: {
          config_id: string | null
          created_at: string
          data_encerramento: string | null
          descricao: string | null
          id: string
          quantidade_dia: number
          tipo: string
          valor_passagem: number
        }
        Insert: {
          config_id?: string | null
          created_at?: string
          data_encerramento?: string | null
          descricao?: string | null
          id?: string
          quantidade_dia?: number
          tipo?: string
          valor_passagem?: number
        }
        Update: {
          config_id?: string | null
          created_at?: string
          data_encerramento?: string | null
          descricao?: string | null
          id?: string
          quantidade_dia?: number
          tipo?: string
          valor_passagem?: number
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_vale_transporte_linhas_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_vale_transporte_config"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_verba_base: {
        Row: {
          ativa: boolean | null
          base_tabelada: string | null
          base_tabelas: string[] | null
          calculo_id: string | null
          caracteristica: string | null
          codigo: string | null
          compor_principal: boolean | null
          comportamento_reflexo: string | null
          constante_mensal: number | null
          created_at: string | null
          divisor: number | null
          divisor_tipo: string | null
          dobrar_valor_devido: boolean | null
          excluir_falta_justificada: boolean | null
          excluir_falta_nao_justificada: boolean | null
          excluir_ferias_gozadas: boolean | null
          fonte: string | null
          fracao_mes_modo: string | null
          gerar_principal: string | null
          gerar_reflexo: string | null
          hist_salarial_nome: string | null
          hora_noturna_ficticia: boolean | null
          id: string
          incide_fgts: boolean | null
          incide_inss: boolean | null
          incide_ir: boolean | null
          multiplicador: number | null
          nome: string | null
          observacoes: string | null
          ordem: number | null
          periodicidade: string | null
          periodo_fim: string | null
          periodo_inicio: string | null
          periodo_media_reflexo: string | null
          pjc_id: string | null
          quantidade_proporcionalizar: boolean | null
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
          base_tabelas?: string[] | null
          calculo_id?: string | null
          caracteristica?: string | null
          codigo?: string | null
          compor_principal?: boolean | null
          comportamento_reflexo?: string | null
          constante_mensal?: number | null
          created_at?: string | null
          divisor?: number | null
          divisor_tipo?: string | null
          dobrar_valor_devido?: boolean | null
          excluir_falta_justificada?: boolean | null
          excluir_falta_nao_justificada?: boolean | null
          excluir_ferias_gozadas?: boolean | null
          fonte?: string | null
          fracao_mes_modo?: string | null
          gerar_principal?: string | null
          gerar_reflexo?: string | null
          hist_salarial_nome?: string | null
          hora_noturna_ficticia?: boolean | null
          id?: string
          incide_fgts?: boolean | null
          incide_inss?: boolean | null
          incide_ir?: boolean | null
          multiplicador?: number | null
          nome?: string | null
          observacoes?: string | null
          ordem?: number | null
          periodicidade?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          periodo_media_reflexo?: string | null
          pjc_id?: string | null
          quantidade_proporcionalizar?: boolean | null
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
          base_tabelas?: string[] | null
          calculo_id?: string | null
          caracteristica?: string | null
          codigo?: string | null
          compor_principal?: boolean | null
          comportamento_reflexo?: string | null
          constante_mensal?: number | null
          created_at?: string | null
          divisor?: number | null
          divisor_tipo?: string | null
          dobrar_valor_devido?: boolean | null
          excluir_falta_justificada?: boolean | null
          excluir_falta_nao_justificada?: boolean | null
          excluir_ferias_gozadas?: boolean | null
          fonte?: string | null
          fracao_mes_modo?: string | null
          gerar_principal?: string | null
          gerar_reflexo?: string | null
          hist_salarial_nome?: string | null
          hora_noturna_ficticia?: boolean | null
          id?: string
          incide_fgts?: boolean | null
          incide_inss?: boolean | null
          incide_ir?: boolean | null
          multiplicador?: number | null
          nome?: string | null
          observacoes?: string | null
          ordem?: number | null
          periodicidade?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          periodo_media_reflexo?: string | null
          pjc_id?: string | null
          quantidade_proporcionalizar?: boolean | null
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
            foreignKeyName: "pjecalc_verba_base_verba_principal_id_fkey"
            columns: ["verba_principal_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_verba_base"
            referencedColumns: ["id"]
          },
        ]
      }
      pjecalc_versoes: {
        Row: {
          autor_id: string | null
          calculo_id: string | null
          created_at: string | null
          descricao: string | null
          hash_conteudo: string | null
          id: string
          numero_versao: number | null
          snapshot: Json | null
          total_bruto: number | null
          total_liquido: number | null
        }
        Insert: {
          autor_id?: string | null
          calculo_id?: string | null
          created_at?: string | null
          descricao?: string | null
          hash_conteudo?: string | null
          id?: string
          numero_versao?: number | null
          snapshot?: Json | null
          total_bruto?: number | null
          total_liquido?: number | null
        }
        Update: {
          autor_id?: string | null
          calculo_id?: string | null
          created_at?: string | null
          descricao?: string | null
          hash_conteudo?: string | null
          id?: string
          numero_versao?: number | null
          snapshot?: Json | null
          total_bruto?: number | null
          total_liquido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pjecalc_versoes_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "pjecalc_calculos"
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
          table_slug: string | null
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
          table_slug?: string | null
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
          table_slug?: string | null
          trigger?: string
        }
        Relationships: []
      }
      reference_sources: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string | null
          notes: string | null
          type: string
          url: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string | null
          notes?: string | null
          type?: string
          url?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string | null
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
          name: string | null
          requires_manual_input: boolean
          slug: string | null
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
          name?: string | null
          requires_manual_input?: boolean
          slug?: string | null
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
          name?: string | null
          requires_manual_input?: boolean
          slug?: string | null
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
          competency_year: number | null
          created_at: string
          created_by: string | null
          id: string
          import_run_id: string | null
          notes: string | null
          source_snapshot: Json | null
          status: string
          table_slug: string | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          competency_month?: number | null
          competency_year?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          import_run_id?: string | null
          notes?: string | null
          source_snapshot?: Json | null
          status?: string
          table_slug?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          competency_month?: number | null
          competency_year?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          import_run_id?: string | null
          notes?: string | null
          source_snapshot?: Json | null
          status?: string
          table_slug?: string | null
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
      rubric_classifications: {
        Row: {
          canonical_code: string | null
          canonical_name: string | null
          case_id: string | null
          confidence: number
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          method: string | null
          source_name: string | null
        }
        Insert: {
          canonical_code?: string | null
          canonical_name?: string | null
          case_id?: string | null
          confidence?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          method?: string | null
          source_name?: string | null
        }
        Update: {
          canonical_code?: string | null
          canonical_name?: string | null
          case_id?: string | null
          confidence?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          method?: string | null
          source_name?: string | null
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
          rubrica_codigo: string | null
          rubrica_nome: string | null
        }
        Insert: {
          alerta_sem_prova?: string | null
          created_at?: string
          descricao_requisito?: string | null
          documentos_requeridos?: string[]
          fatos_requeridos?: string[]
          id?: string
          nivel_exigencia?: string | null
          rubrica_codigo?: string | null
          rubrica_nome?: string | null
        }
        Update: {
          alerta_sem_prova?: string | null
          created_at?: string
          descricao_requisito?: string | null
          documentos_requeridos?: string[]
          fatos_requeridos?: string[]
          id?: string
          nivel_exigencia?: string | null
          rubrica_codigo?: string | null
          rubrica_nome?: string | null
        }
        Relationships: []
      }
      sentenca_rulesets: {
        Row: {
          apply_days: string[] | null
          ativo: boolean
          case_id: string | null
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
          case_id?: string | null
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
          case_id?: string | null
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          id?: string
          nome?: string
          rules?: Json
          texto_sentenca?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sync_status: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          last_processed_date: string | null
          last_sync_attempt: string | null
          serie_id: number | null
          serie_nome: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_processed_date?: string | null
          last_sync_attempt?: string | null
          serie_id?: number | null
          serie_nome?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_processed_date?: string | null
          last_sync_attempt?: string | null
          serie_id?: number | null
          serie_nome?: string | null
          status?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"] | null
          user_id?: string | null
        }
        Relationships: []
      }
      validations: {
        Row: {
          acao: Database["public"]["Enums"]["validation_action"] | null
          campo: string | null
          case_id: string | null
          extraction_id: string | null
          id: string
          justificativa: string | null
          metadata: Json | null
          snapshot_id: string | null
          usuario_id: string | null
          validated_at: string
          valor_anterior: string | null
          valor_validado: string | null
        }
        Insert: {
          acao?: Database["public"]["Enums"]["validation_action"] | null
          campo?: string | null
          case_id?: string | null
          extraction_id?: string | null
          id?: string
          justificativa?: string | null
          metadata?: Json | null
          snapshot_id?: string | null
          usuario_id?: string | null
          validated_at?: string
          valor_anterior?: string | null
          valor_validado?: string | null
        }
        Update: {
          acao?: Database["public"]["Enums"]["validation_action"] | null
          campo?: string | null
          case_id?: string | null
          extraction_id?: string | null
          id?: string
          justificativa?: string | null
          metadata?: Json | null
          snapshot_id?: string | null
          usuario_id?: string | null
          validated_at?: string
          valor_anterior?: string | null
          valor_validado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "validations_extraction_id_fkey"
            columns: ["extraction_id"]
            isOneToOne: false
            referencedRelation: "extractions"
            referencedColumns: ["id"]
          },
        ]
      }
      worktime_adjustments: {
        Row: {
          adjusted_json: Json
          applied_rules: string[] | null
          case_id: string | null
          created_at: string
          data: string | null
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
          case_id?: string | null
          created_at?: string
          data?: string | null
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
          case_id?: string | null
          created_at?: string
          data?: string | null
          extras_diarias?: number | null
          flags?: string[] | null
          horas_trabalhadas_ajustadas?: number | null
          horas_trabalhadas_original?: number | null
          id?: string
          original_json?: Json
          ponto_diario_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      pjecalc_indice_cobertura: {
        Row: {
          cobertura_fim: string | null
          cobertura_inicio: string | null
          esta_atualizado: boolean | null
          indice: string | null
          meses_atrasado: number | null
          total_meses: number | null
        }
        Relationships: []
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
      pjecalc_recompute_acumulado: {
        Args: { p_indice: string }
        Returns: undefined
      }
      queue_case_documents: {
        Args: { p_case_id: string; p_priority?: number }
        Returns: number
      }
      user_owns_calculo: { Args: { p_calculo_id: string }; Returns: boolean }
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
