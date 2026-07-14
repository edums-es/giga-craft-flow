export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      customers: {
        Row: {
          cidade: string | null;
          created_at: string;
          email: string | null;
          empresa: string | null;
          id: string;
          nome: string;
          notas: string | null;
          whatsapp: string;
        };
        Insert: {
          cidade?: string | null;
          created_at?: string;
          email?: string | null;
          empresa?: string | null;
          id?: string;
          nome: string;
          notas?: string | null;
          whatsapp: string;
        };
        Update: {
          cidade?: string | null;
          created_at?: string;
          email?: string | null;
          empresa?: string | null;
          id?: string;
          nome?: string;
          notas?: string | null;
          whatsapp?: string;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          categoria: string | null;
          created_at: string;
          data: string;
          descricao: string;
          id: string;
          valor: number;
        };
        Insert: {
          categoria?: string | null;
          created_at?: string;
          data?: string;
          descricao: string;
          id?: string;
          valor: number;
        };
        Update: {
          categoria?: string | null;
          created_at?: string;
          data?: string;
          descricao?: string;
          id?: string;
          valor?: number;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          cliente_nome: string;
          cliente_whatsapp: string | null;
          created_at: string;
          entrega_prevista: string | null;
          id: string;
          notas: string | null;
          quote_id: string | null;
          status: Database["public"]["Enums"]["order_status"];
          total: number;
          updated_at: string;
        };
        Insert: {
          cliente_nome: string;
          cliente_whatsapp?: string | null;
          created_at?: string;
          entrega_prevista?: string | null;
          id?: string;
          notas?: string | null;
          quote_id?: string | null;
          status?: Database["public"]["Enums"]["order_status"];
          total?: number;
          updated_at?: string;
        };
        Update: {
          cliente_nome?: string;
          cliente_whatsapp?: string | null;
          created_at?: string;
          entrega_prevista?: string | null;
          id?: string;
          notas?: string | null;
          quote_id?: string | null;
          status?: Database["public"]["Enums"]["order_status"];
          total?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
        ];
      };
      pricing_params: {
        Row: {
          id: number;
          params: Json;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: number;
          params?: Json;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: number;
          params?: Json;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          id: string;
          nome: string | null;
          telefone: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          nome?: string | null;
          telefone?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          nome?: string | null;
          telefone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      quotes: {
        Row: {
          cliente_cidade: string | null;
          cliente_email: string | null;
          cliente_empresa: string | null;
          cliente_nome: string;
          cliente_whatsapp: string;
          codigo: string;
          created_at: string;
          customer_id: string | null;
          id: string;
          items: Json;
          observacao: string | null;
          prazo_dias: number;
          status: Database["public"]["Enums"]["quote_status"];
          total: number;
          updated_at: string;
        };
        Insert: {
          cliente_cidade?: string | null;
          cliente_email?: string | null;
          cliente_empresa?: string | null;
          cliente_nome: string;
          cliente_whatsapp: string;
          codigo: string;
          created_at?: string;
          customer_id?: string | null;
          id?: string;
          items?: Json;
          observacao?: string | null;
          prazo_dias?: number;
          status?: Database["public"]["Enums"]["quote_status"];
          total?: number;
          updated_at?: string;
        };
        Update: {
          cliente_cidade?: string | null;
          cliente_email?: string | null;
          cliente_empresa?: string | null;
          cliente_nome?: string;
          cliente_whatsapp?: string;
          codigo?: string;
          created_at?: string;
          customer_id?: string | null;
          id?: string;
          items?: Json;
          observacao?: string | null;
          prazo_dias?: number;
          status?: Database["public"]["Enums"]["quote_status"];
          total?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quotes_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      revenues: {
        Row: {
          created_at: string;
          data: string;
          descricao: string;
          id: string;
          order_id: string | null;
          quote_id: string | null;
          valor: number;
        };
        Insert: {
          created_at?: string;
          data?: string;
          descricao: string;
          id?: string;
          order_id?: string | null;
          quote_id?: string | null;
          valor: number;
        };
        Update: {
          created_at?: string;
          data?: string;
          descricao?: string;
          id?: string;
          order_id?: string | null;
          quote_id?: string | null;
          valor?: number;
        };
        Relationships: [
          {
            foreignKeyName: "revenues_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "revenues_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
        ];
      };
      site_config: {
        Row: {
          cidade: string | null;
          email: string | null;
          id: number;
          instagram: string | null;
          logo_url: string | null;
          nome: string;
          updated_at: string;
          whatsapp: string;
        };
        Insert: {
          cidade?: string | null;
          email?: string | null;
          id?: number;
          instagram?: string | null;
          logo_url?: string | null;
          nome?: string;
          updated_at?: string;
          whatsapp?: string;
        };
        Update: {
          cidade?: string | null;
          email?: string | null;
          id?: number;
          instagram?: string | null;
          logo_url?: string | null;
          nome?: string;
          updated_at?: string;
          whatsapp?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "staff";
      order_status:
        | "aguardando_arte"
        | "arte_aprovada"
        | "em_producao"
        | "acabamento"
        | "pronto"
        | "entregue"
        | "cancelado";
      quote_status: "novo" | "em_negociacao" | "aprovado" | "recusado" | "convertido";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff"],
      order_status: [
        "aguardando_arte",
        "arte_aprovada",
        "em_producao",
        "acabamento",
        "pronto",
        "entregue",
        "cancelado",
      ],
      quote_status: ["novo", "em_negociacao", "aprovado", "recusado", "convertido"],
    },
  },
} as const;
