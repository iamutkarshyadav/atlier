export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'customer' | 'delivery'
export type OrderStatus = 'pending' | 'processing' | 'out_for_delivery' | 'delivered' | 'cancelled'
export type DeliveryMode = 'direct' | 'try_on'
export type TryOnStatus =
  | 'pending'
  | 'active_timer'
  | 'reconciling'
  | 'completed'
  | 'fitting_in_progress'
  | 'reconciled'
  | 'failed_absent'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          role: UserRole
          name: string
          email: string | null
          phone: string | null
          street_address: string | null
          city: string | null
          postal_code: string | null
          country: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: UserRole
          name: string
          email?: string | null
          phone?: string | null
          street_address?: string | null
          city?: string | null
          postal_code?: string | null
          country?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: UserRole
          name?: string
          email?: string | null
          phone?: string | null
          street_address?: string | null
          city?: string | null
          postal_code?: string | null
          country?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          image_url: string | null
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          image_url?: string | null
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          image_url?: string | null
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      addresses: {
        Row: {
          id: string
          user_id: string
          recipient_name: string
          street_address: string
          unit_or_suite: string | null
          city: string
          state_or_province: string | null
          postal_code: string
          country: string
          phone: string | null
          instructions: string | null
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          recipient_name: string
          street_address: string
          unit_or_suite?: string | null
          city: string
          state_or_province?: string | null
          postal_code: string
          country?: string
          phone?: string | null
          instructions?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          recipient_name?: string
          street_address?: string
          unit_or_suite?: string | null
          city?: string
          state_or_province?: string | null
          postal_code?: string
          country?: string
          phone?: string | null
          instructions?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      products: {
        Row: {
          id: string
          title: string
          description: string | null
          price: number
          stock: number
          image_url: string | null
          category_id: string | null
          category: string | null
          material: string | null
          edition: string | null
          is_archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          price: number
          stock?: number
          image_url?: string | null
          category_id?: string | null
          category?: string | null
          material?: string | null
          edition?: string | null
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          price?: number
          stock?: number
          image_url?: string | null
          category_id?: string | null
          category?: string | null
          material?: string | null
          edition?: string | null
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      orders: {
        Row: {
          id: string
          order_number: string | null
          user_id: string
          status: OrderStatus
          delivery_mode: DeliveryMode
          try_on_status: TryOnStatus | null
          try_on_window_start: string | null
          try_on_window_end: string | null
          fitting_started_at: string | null
          fitting_duration_minutes: number
          reconciled_at: string | null
          original_total: number | null
          total: number
          invoice_number: string | null
          tracking_barcode: string | null
          tax_amount: number
          shipping_fee: number
          invoice_url: string | null
          delivery_partner_id: string | null
          shipping_address: string | null
          delivery_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number?: string | null
          user_id: string
          status?: OrderStatus
          delivery_mode?: DeliveryMode
          try_on_status?: TryOnStatus | null
          try_on_window_start?: string | null
          try_on_window_end?: string | null
          fitting_started_at?: string | null
          fitting_duration_minutes?: number
          reconciled_at?: string | null
          original_total?: number | null
          total: number
          invoice_number?: string | null
          tracking_barcode?: string | null
          tax_amount?: number
          shipping_fee?: number
          invoice_url?: string | null
          delivery_partner_id?: string | null
          shipping_address?: string | null
          delivery_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_number?: string | null
          user_id?: string
          status?: OrderStatus
          delivery_mode?: DeliveryMode
          try_on_status?: TryOnStatus | null
          try_on_window_start?: string | null
          try_on_window_end?: string | null
          fitting_started_at?: string | null
          fitting_duration_minutes?: number
          reconciled_at?: string | null
          original_total?: number | null
          total?: number
          invoice_number?: string | null
          tracking_barcode?: string | null
          tax_amount?: number
          shipping_fee?: number
          invoice_url?: string | null
          delivery_partner_id?: string | null
          shipping_address?: string | null
          delivery_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_partner_id_fkey"
            columns: ["delivery_partner_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
          size: string | null
          is_kept: boolean | null
          rejection_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          quantity?: number
          unit_price: number
          size?: string | null
          is_kept?: boolean | null
          rejection_reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
          size?: string | null
          is_kept?: boolean | null
          rejection_reason?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      product_media: {
        Row: {
          id: string
          product_id: string
          url: string
          alt_text: string | null
          display_order: number
          is_primary: boolean
          media_type: string
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          url: string
          alt_text?: string | null
          display_order?: number
          is_primary?: boolean
          media_type?: string
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          url?: string
          alt_text?: string | null
          display_order?: number
          is_primary?: boolean
          media_type?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      product_variants: {
        Row: {
          id: string
          product_id: string
          sku: string
          size: string
          color: string | null
          stock: number
          price_override: number | null
          barcode: string | null
          barcode_data: string | null
          barcode_url: string | null
          weight_grams: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          sku: string
          size: string
          color?: string | null
          stock?: number
          price_override?: number | null
          barcode?: string | null
          barcode_data?: string | null
          barcode_url?: string | null
          weight_grams?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          sku?: string
          size?: string
          color?: string | null
          stock?: number
          price_override?: number | null
          barcode?: string | null
          barcode_data?: string | null
          barcode_url?: string | null
          weight_grams?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      storefront_config: {
        Row: {
          id: string
          key: string
          value: Json
          description: string | null
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: Json
          description?: string | null
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: Json
          description?: string | null
          updated_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_config_updated_by_fkey"
            columns: ["updated_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      promotional_banners: {
        Row: {
          id: string
          title: string
          subtitle: string | null
          badge_text: string | null
          image_url: string | null
          cta_label: string
          cta_link: string
          display_order: number
          is_active: boolean
          start_date: string | null
          end_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          subtitle?: string | null
          badge_text?: string | null
          image_url?: string | null
          cta_label?: string
          cta_link?: string
          display_order?: number
          is_active?: boolean
          start_date?: string | null
          end_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          subtitle?: string | null
          badge_text?: string | null
          image_url?: string | null
          cta_label?: string
          cta_link?: string
          display_order?: number
          is_active?: boolean
          start_date?: string | null
          end_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { user_id: string }
        Returns: UserRole
      }
      set_user_role: {
        Args: { target_user_id: string; new_role: UserRole }
        Returns: void
      }
    }
    Enums: {
      user_role: UserRole
      order_status: OrderStatus
      delivery_mode: DeliveryMode
      try_on_status: TryOnStatus
    }
  }
}

// Model Type Aliases
export type UserProfile = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type Category = Database['public']['Tables']['categories']['Row']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']
export type CategoryUpdate = Database['public']['Tables']['categories']['Update']

export type Address = Database['public']['Tables']['addresses']['Row']
export type AddressInsert = Database['public']['Tables']['addresses']['Insert']
export type AddressUpdate = Database['public']['Tables']['addresses']['Update']

export type Product = Database['public']['Tables']['products']['Row']
export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type ProductUpdate = Database['public']['Tables']['products']['Update']

export type ProductMedia = Database['public']['Tables']['product_media']['Row']
export type ProductMediaInsert = Database['public']['Tables']['product_media']['Insert']
export type ProductMediaUpdate = Database['public']['Tables']['product_media']['Update']

export type ProductVariant = Database['public']['Tables']['product_variants']['Row']
export type ProductVariantInsert = Database['public']['Tables']['product_variants']['Insert']
export type ProductVariantUpdate = Database['public']['Tables']['product_variants']['Update']

export type StorefrontConfig = Database['public']['Tables']['storefront_config']['Row']
export type StorefrontConfigInsert = Database['public']['Tables']['storefront_config']['Insert']
export type StorefrontConfigUpdate = Database['public']['Tables']['storefront_config']['Update']

export type PromotionalBanner = Database['public']['Tables']['promotional_banners']['Row']
export type PromotionalBannerInsert = Database['public']['Tables']['promotional_banners']['Insert']
export type PromotionalBannerUpdate = Database['public']['Tables']['promotional_banners']['Update']

export type Order = Database['public']['Tables']['orders']['Row']
export type OrderInsert = Database['public']['Tables']['orders']['Insert']
export type OrderUpdate = Database['public']['Tables']['orders']['Update']

export type OrderItem = Database['public']['Tables']['order_items']['Row']
export type OrderItemInsert = Database['public']['Tables']['order_items']['Insert']
export type OrderItemUpdate = Database['public']['Tables']['order_items']['Update']

export interface OrderItemWithProduct extends OrderItem {
  product?: {
    id: string
    title: string
    image_url: string | null
    price: number
    material?: string | null
    category?: string | null
  } | null
}

export interface OrderWithItems extends Order {
  order_items?: OrderItemWithProduct[]
  user?: UserProfile | null
  courier?: UserProfile | null
}

