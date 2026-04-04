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
          compare_at_price: number | null;
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
          compare_at_price?: number | null;
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
          compare_at_price?: number | null;
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
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          label: string;
          sort_order: number;
          color_hex: string | null;
          image_urls: string[];
          image_thumb_urls: string[];
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          product_id: string;
          label: string;
          sort_order?: number;
          color_hex?: string | null;
          image_urls?: string[];
          image_thumb_urls?: string[];
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          product_id?: string;
          label?: string;
          sort_order?: number;
          color_hex?: string | null;
          image_urls?: string[];
          image_thumb_urls?: string[];
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
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
          variant_id: string;
          quantity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cart_id: string;
          product_id: string;
          variant_id: string;
          quantity: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cart_id?: string;
          product_id?: string;
          variant_id?: string;
          quantity?: number;
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
          {
            foreignKeyName: "cart_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
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
          hidden_from_account_list: boolean;
          link_access_token: string | null;
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
          hidden_from_account_list?: boolean;
          link_access_token?: string | null;
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
          hidden_from_account_list?: boolean;
          link_access_token?: string | null;
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
      custom_checkout_links: {
        Row: {
          id: string;
          token: string;
          cart_snapshot: Json;
          shipping_addr: Json;
          note: string | null;
          hide_from_account_list: boolean;
          claimed_user_id: string | null;
          payment_intent_id: string | null;
          order_id: string | null;
          payment_mode: string;
          creator_email: string | null;
          customer_email: string | null;
          created_by: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          token: string;
          cart_snapshot: Json;
          shipping_addr: Json;
          note?: string | null;
          hide_from_account_list?: boolean;
          claimed_user_id?: string | null;
          payment_intent_id?: string | null;
          order_id?: string | null;
          payment_mode?: string;
          creator_email?: string | null;
          customer_email?: string | null;
          created_by?: string | null;
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          token?: string;
          cart_snapshot?: Json;
          shipping_addr?: Json;
          note?: string | null;
          hide_from_account_list?: boolean;
          claimed_user_id?: string | null;
          payment_intent_id?: string | null;
          order_id?: string | null;
          payment_mode?: string;
          creator_email?: string | null;
          customer_email?: string | null;
          created_by?: string | null;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "custom_checkout_links_claimed_user_id_fkey";
            columns: ["claimed_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "custom_checkout_links_payment_intent_id_fkey";
            columns: ["payment_intent_id"];
            isOneToOne: false;
            referencedRelation: "payment_intents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "custom_checkout_links_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
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
          hidden_from_account_list: boolean;
          link_access_token: string | null;
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
          hidden_from_account_list?: boolean;
          link_access_token?: string | null;
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
          hidden_from_account_list?: boolean;
          link_access_token?: string | null;
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
          variant_id: string | null;
          quantity: number;
          unit_price: number;
          product_name_snapshot: string | null;
          variant_label_snapshot: string | null;
          variant_image_snapshot: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          variant_id?: string | null;
          quantity: number;
          unit_price: number;
          product_name_snapshot?: string | null;
          variant_label_snapshot?: string | null;
          variant_image_snapshot?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          variant_id?: string | null;
          quantity?: number;
          unit_price?: number;
          product_name_snapshot?: string | null;
          variant_label_snapshot?: string | null;
          variant_image_snapshot?: string | null;
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
          {
            foreignKeyName: "order_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
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
export type ProductVariantRow = Database["public"]["Tables"]["product_variants"]["Row"];
export type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
export type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
export type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];
export type OrderStageLogRow =
  Database["public"]["Tables"]["order_stage_logs"]["Row"];
