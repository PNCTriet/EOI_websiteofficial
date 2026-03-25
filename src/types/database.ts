export type OrderStage =
  | "pending_payment"
  | "paid"
  | "processing"
  | "printing"
  | "shipped"
  | "delivered"
  | "expired"
  | "cancelled";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price: number | null;
          availability: string;
          material: string | null;
          category: string | null;
          delivery_days_min: number;
          delivery_days_max: number;
          image_urls: string[] | null;
          image_thumb_urls: string[] | null;
          stl_url: string | null;
          is_active: boolean;
          colors: string[] | null;
          accent_bg: string | null;
          badge: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          price?: number | null;
          availability?: string;
          material?: string | null;
          category?: string | null;
          delivery_days_min?: number;
          delivery_days_max?: number;
          image_urls?: string[] | null;
          image_thumb_urls?: string[] | null;
          stl_url?: string | null;
          is_active?: boolean;
          colors?: string[] | null;
          accent_bg?: string | null;
          badge?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          price?: number | null;
          availability?: string;
          material?: string | null;
          category?: string | null;
          delivery_days_min?: number;
          delivery_days_max?: number;
          image_urls?: string[] | null;
          image_thumb_urls?: string[] | null;
          stl_url?: string | null;
          is_active?: boolean;
          colors?: string[] | null;
          accent_bg?: string | null;
          badge?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      carts: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cart_items: {
        Row: {
          id: string;
          cart_id: string;
          product_id: string;
          quantity: number;
          color_index: number;
          color_hex: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cart_id: string;
          product_id: string;
          quantity: number;
          color_index?: number;
          color_hex?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cart_id?: string;
          product_id?: string;
          quantity?: number;
          color_index?: number;
          color_hex?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey";
            columns: ["cart_id"];
            isOneToOne: false;
            referencedRelation: "carts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cart_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      user_profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          default_address: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          default_address?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          default_address?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payment_intents: {
        Row: {
          id: string;
          user_id: string;
          sepay_ref: string;
          amount: number;
          cart_snapshot: Json;
          shipping_addr: Json | null;
          note: string | null;
          expires_at: string;
          status: string;
          order_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          sepay_ref: string;
          amount: number;
          cart_snapshot: Json;
          shipping_addr?: Json | null;
          note?: string | null;
          expires_at: string;
          status?: string;
          order_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          sepay_ref?: string;
          amount?: number;
          cart_snapshot?: Json;
          shipping_addr?: Json | null;
          note?: string | null;
          expires_at?: string;
          status?: string;
          order_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_intents_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          sepay_ref: string | null;
          customer_id: string | null;
          user_id: string | null;
          total_amount: number;
          stage: OrderStage;
          paid_at: string | null;
          expires_at: string | null;
          payment_method: string;
          shipping_addr: Json | null;
          note: string | null;
          created_at: string;
          tracking_number: string | null;
          shipping_carrier: string | null;
        };
        Insert: {
          id?: string;
          sepay_ref?: string | null;
          customer_id?: string | null;
          user_id?: string | null;
          total_amount: number;
          stage?: OrderStage;
          paid_at?: string | null;
          expires_at?: string | null;
          payment_method?: string;
          shipping_addr?: Json | null;
          note?: string | null;
          created_at?: string;
          tracking_number?: string | null;
          shipping_carrier?: string | null;
        };
        Update: {
          id?: string;
          sepay_ref?: string | null;
          customer_id?: string | null;
          user_id?: string | null;
          total_amount?: number;
          stage?: OrderStage;
          paid_at?: string | null;
          expires_at?: string | null;
          payment_method?: string;
          shipping_addr?: Json | null;
          note?: string | null;
          created_at?: string;
          tracking_number?: string | null;
          shipping_carrier?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          quantity: number;
          unit_price: number;
          product_name_snapshot: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          quantity: number;
          unit_price: number;
          product_name_snapshot?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          quantity?: number;
          unit_price?: number;
          product_name_snapshot?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      order_stage_logs: {
        Row: {
          id: string;
          order_id: string;
          from_stage: OrderStage | null;
          to_stage: OrderStage;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          from_stage?: OrderStage | null;
          to_stage: OrderStage;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          from_stage?: OrderStage | null;
          to_stage?: OrderStage;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_stage_logs_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      sepay_logs: {
        Row: {
          id: string;
          raw_payload: Json;
          amount: number | null;
          matched: boolean;
          order_id: string | null;
          received_at: string;
        };
        Insert: {
          id?: string;
          raw_payload: Json;
          amount?: number | null;
          matched?: boolean;
          order_id?: string | null;
          received_at?: string;
        };
        Update: {
          id?: string;
          raw_payload?: Json;
          amount?: number | null;
          matched?: boolean;
          order_id?: string | null;
          received_at?: string;
        };
        Relationships: [];
      };
      email_templates: {
        Row: {
          key: string;
          name: string;
          subject: string;
          html: string;
          enabled: boolean;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          key: string;
          name: string;
          subject: string;
          html: string;
          enabled?: boolean;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          key?: string;
          name?: string;
          subject?: string;
          html?: string;
          enabled?: boolean;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      email_campaigns: {
        Row: {
          id: string;
          name: string;
          template_key: string | null;
          audience: string;
          custom_recipients: string[];
          status: string;
          recipient_count: number;
          sent_count: number;
          failed_count: number;
          last_error: string | null;
          sent_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          template_key?: string | null;
          audience?: string;
          custom_recipients?: string[];
          status?: string;
          recipient_count?: number;
          sent_count?: number;
          failed_count?: number;
          last_error?: string | null;
          sent_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          template_key?: string | null;
          audience?: string;
          custom_recipients?: string[];
          status?: string;
          recipient_count?: number;
          sent_count?: number;
          failed_count?: number;
          last_error?: string | null;
          sent_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      email_logs: {
        Row: {
          id: string;
          provider: string;
          provider_message_id: string | null;
          event_type: string;
          status: string;
          recipient_email: string;
          subject: string;
          template_key: string | null;
          order_id: string | null;
          campaign_id: string | null;
          payload: Json | null;
          error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider?: string;
          provider_message_id?: string | null;
          event_type?: string;
          status?: string;
          recipient_email: string;
          subject: string;
          template_key?: string | null;
          order_id?: string | null;
          campaign_id?: string | null;
          payload?: Json | null;
          error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          provider?: string;
          provider_message_id?: string | null;
          event_type?: string;
          status?: string;
          recipient_email?: string;
          subject?: string;
          template_key?: string | null;
          order_id?: string | null;
          campaign_id?: string | null;
          payload?: Json | null;
          error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      track_order_by_ref_email: {
        Args: { p_ref: string; p_email: string };
        Returns: {
          id: string;
          sepay_ref: string | null;
          stage: OrderStage;
          total_amount: number;
          created_at: string;
          paid_at: string | null;
          tracking_number: string | null;
          shipping_carrier: string | null;
          shipping_addr: Json | null;
        }[];
      };
    };
    Enums: {
      order_stage: OrderStage;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type ProductRow = Database["public"]["Tables"]["products"]["Row"];
export type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
export type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
export type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];
export type OrderStageLogRow =
  Database["public"]["Tables"]["order_stage_logs"]["Row"];
