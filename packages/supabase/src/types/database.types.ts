export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole =
  | 'admin'
  | 'customer'
  | 'delivery'
  | 'warehouse_manager'
  | 'store_manager'
  | 'pos_cashier'

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'

export type DeliveryMode = 'direct' | 'try_on'

export type TryOnStatus =
  | 'pending'
  | 'active_timer'
  | 'reconciling'
  | 'completed'
  | 'fitting_in_progress'
  | 'reconciled'
  | 'failed_absent'

export type OrderType = 'standard' | 'bolt_try_on'
export type BoltSessionStatus = 'scheduled' | 'en_route' | 'at_doorstep' | 'completed' | 'cancelled'
export type TryOnDecision = 'pending' | 'kept' | 'rejected'

export type LocationType = 'warehouse' | 'boutique' | 'quarantine'
export type ZoneType =
  | 'receiving_dock'
  | 'bulk_storage'
  | 'sales_floor'
  | 'backroom_stock'
  | 'fitting_room_quarantine'
  | 'packing_bay'
  | 'dispatch_bay'

export type InventoryMovementType =
  | 'inbound_grn'
  | 'shelf_putaway'
  | 'shelf_transfer'
  | 'pos_sale'
  | 'pos_return_restock'
  | 'online_reservation'
  | 'online_pick'
  | 'online_dispatch'
  | 'transfer_out'
  | 'transfer_in'
  | 'tryon_return_restock'
  | 'cycle_count_adjustment'
  | 'damaged_quarantine'

export type PoStatus = 'draft' | 'issued' | 'partially_received' | 'received' | 'cancelled'
export type QcStatus = 'accepted' | 'rejected_damaged' | 'pending_qc'
export type TransferStatus = 'draft' | 'requested' | 'picked' | 'in_transit' | 'received' | 'cancelled'
export type PosPaymentMethod = 'cash' | 'upi' | 'card' | 'store_credit' | 'split'

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
          assigned_location_id: string | null
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
          assigned_location_id?: string | null
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
          assigned_location_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_assigned_location_id_fkey"
            columns: ["assigned_location_id"]
            referencedRelation: "locations"
            referencedColumns: ["id"]
          }
        ]
      }
      locations: {
        Row: {
          id: string
          code: string
          name: string
          type: LocationType
          gstin: string
          state_code: string
          address_line1: string
          address_line2: string | null
          city: string
          state: string
          pincode: string
          phone: string
          email: string | null
          is_active: boolean
          online_fulfillment_priority: number
          online_safety_buffer: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          type?: LocationType
          gstin: string
          state_code: string
          address_line1: string
          address_line2?: string | null
          city: string
          state: string
          pincode: string
          phone: string
          email?: string | null
          is_active?: boolean
          online_fulfillment_priority?: number
          online_safety_buffer?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          type?: LocationType
          gstin?: string
          state_code?: string
          address_line1?: string
          address_line2?: string | null
          city?: string
          state?: string
          pincode?: string
          phone?: string
          email?: string | null
          is_active?: boolean
          online_fulfillment_priority?: number
          online_safety_buffer?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      location_zones: {
        Row: {
          id: string
          location_id: string
          code: string
          name: string
          type: ZoneType
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          location_id: string
          code: string
          name: string
          type: ZoneType
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          location_id?: string
          code?: string
          name?: string
          type?: ZoneType
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_zones_location_id_fkey"
            columns: ["location_id"]
            referencedRelation: "locations"
            referencedColumns: ["id"]
          }
        ]
      }
      shelves: {
        Row: {
          id: string
          location_id: string
          zone_id: string
          coordinate: string
          barcode: string
          assigned_category_id: string | null
          max_unit_capacity: number
          is_active: boolean
          last_cycle_count_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          location_id: string
          zone_id: string
          coordinate: string
          barcode: string
          assigned_category_id?: string | null
          max_unit_capacity?: number
          is_active?: boolean
          last_cycle_count_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          location_id?: string
          zone_id?: string
          coordinate?: string
          barcode?: string
          assigned_category_id?: string | null
          max_unit_capacity?: number
          is_active?: boolean
          last_cycle_count_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shelves_location_id_fkey"
            columns: ["location_id"]
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shelves_zone_id_fkey"
            columns: ["zone_id"]
            referencedRelation: "location_zones"
            referencedColumns: ["id"]
          }
        ]
      }
      shelf_inventory: {
        Row: {
          id: string
          shelf_id: string
          variant_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          id?: string
          shelf_id: string
          variant_id: string
          quantity: number
          updated_at?: string
        }
        Update: {
          id?: string
          shelf_id?: string
          variant_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shelf_inventory_shelf_id_fkey"
            columns: ["shelf_id"]
            referencedRelation: "shelves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shelf_inventory_variant_id_fkey"
            columns: ["variant_id"]
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          }
        ]
      }
      inventory_levels: {
        Row: {
          id: string
          location_id: string
          variant_id: string
          on_hand: number
          reserved: number
          available: number
          reorder_point: number
          reorder_quantity: number
          updated_at: string
        }
        Insert: {
          id?: string
          location_id: string
          variant_id: string
          on_hand?: number
          reserved?: number
          reorder_point?: number
          reorder_quantity?: number
          updated_at?: string
        }
        Update: {
          id?: string
          location_id?: string
          variant_id?: string
          on_hand?: number
          reserved?: number
          reorder_point?: number
          reorder_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_levels_location_id_fkey"
            columns: ["location_id"]
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_levels_variant_id_fkey"
            columns: ["variant_id"]
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          }
        ]
      }
      inventory_ledger: {
        Row: {
          id: string
          transaction_timestamp: string
          variant_id: string
          location_id: string
          from_shelf_id: string | null
          to_shelf_id: string | null
          movement_type: InventoryMovementType
          quantity: number
          balance_after: number
          reference_doc_type: string
          reference_doc_id: string
          operator_id: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          transaction_timestamp?: string
          variant_id: string
          location_id: string
          from_shelf_id?: string | null
          to_shelf_id?: string | null
          movement_type: InventoryMovementType
          quantity: number
          balance_after: number
          reference_doc_type: string
          reference_doc_id: string
          operator_id?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          transaction_timestamp?: string
          variant_id?: string
          location_id?: string
          from_shelf_id?: string | null
          to_shelf_id?: string | null
          movement_type?: InventoryMovementType
          quantity?: number
          balance_after?: number
          reference_doc_type?: string
          reference_doc_id?: string
          operator_id?: string | null
          notes?: string | null
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          id: string
          vendor_code: string
          name: string
          gstin: string
          contact_person: string | null
          email: string
          phone: string
          address_line1: string
          city: string
          state: string
          state_code: string
          pincode: string
          lead_time_days: number
          payment_terms: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vendor_code: string
          name: string
          gstin: string
          contact_person?: string | null
          email: string
          phone: string
          address_line1: string
          city: string
          state: string
          state_code: string
          pincode: string
          lead_time_days?: number
          payment_terms?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vendor_code?: string
          name?: string
          gstin?: string
          contact_person?: string | null
          email?: string
          phone?: string
          address_line1?: string
          city?: string
          state?: string
          state_code?: string
          pincode?: string
          lead_time_days?: number
          payment_terms?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          id: string
          po_number: string
          supplier_id: string
          destination_location_id: string
          status: PoStatus
          expected_delivery_date: string
          subtotal: number
          tax_amount: number
          total_amount: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          po_number: string
          supplier_id: string
          destination_location_id: string
          status?: PoStatus
          expected_delivery_date: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          po_number?: string
          supplier_id?: string
          destination_location_id?: string
          status?: PoStatus
          expected_delivery_date?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_destination_location_id_fkey"
            columns: ["destination_location_id"]
            referencedRelation: "locations"
            referencedColumns: ["id"]
          }
        ]
      }
      purchase_order_items: {
        Row: {
          id: string
          po_id: string
          variant_id: string
          hsn_code: string
          quantity_ordered: number
          quantity_received: number
          unit_cost: number
          tax_rate_percent: number
          tax_amount: number
          line_total: number
          created_at: string
        }
        Insert: {
          id?: string
          po_id: string
          variant_id: string
          hsn_code?: string
          quantity_ordered: number
          quantity_received?: number
          unit_cost: number
          tax_rate_percent?: number
          tax_amount?: number
          line_total?: number
          created_at?: string
        }
        Update: {
          id?: string
          po_id?: string
          variant_id?: string
          hsn_code?: string
          quantity_ordered?: number
          quantity_received?: number
          unit_cost?: number
          tax_rate_percent?: number
          tax_amount?: number
          line_total?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_variant_id_fkey"
            columns: ["variant_id"]
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          }
        ]
      }
      goods_receipts: {
        Row: {
          id: string
          grn_number: string
          po_id: string
          location_id: string
          received_by: string | null
          invoice_reference: string | null
          received_at: string
        }
        Insert: {
          id?: string
          grn_number: string
          po_id: string
          location_id: string
          received_by?: string | null
          invoice_reference?: string | null
          received_at?: string
        }
        Update: {
          id?: string
          grn_number?: string
          po_id?: string
          location_id?: string
          received_by?: string | null
          invoice_reference?: string | null
          received_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipts_po_id_fkey"
            columns: ["po_id"]
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_location_id_fkey"
            columns: ["location_id"]
            referencedRelation: "locations"
            referencedColumns: ["id"]
          }
        ]
      }
      goods_receipt_items: {
        Row: {
          id: string
          grn_id: string
          variant_id: string
          quantity_accepted: number
          quantity_rejected: number
          qc_status: QcStatus
          rejection_notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          grn_id: string
          variant_id: string
          quantity_accepted?: number
          quantity_rejected?: number
          qc_status?: QcStatus
          rejection_notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          grn_id?: string
          variant_id?: string
          quantity_accepted?: number
          quantity_rejected?: number
          qc_status?: QcStatus
          rejection_notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipt_items_grn_id_fkey"
            columns: ["grn_id"]
            referencedRelation: "goods_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_items_variant_id_fkey"
            columns: ["variant_id"]
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          }
        ]
      }
      stock_transfers: {
        Row: {
          id: string
          transfer_number: string
          source_location_id: string
          destination_location_id: string
          status: TransferStatus
          eway_bill_number: string | null
          dispatched_at: string | null
          received_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          transfer_number: string
          source_location_id: string
          destination_location_id: string
          status?: TransferStatus
          eway_bill_number?: string | null
          dispatched_at?: string | null
          received_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          transfer_number?: string
          source_location_id?: string
          destination_location_id?: string
          status?: TransferStatus
          eway_bill_number?: string | null
          dispatched_at?: string | null
          received_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_source_location_id_fkey"
            columns: ["source_location_id"]
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_destination_location_id_fkey"
            columns: ["destination_location_id"]
            referencedRelation: "locations"
            referencedColumns: ["id"]
          }
        ]
      }
      stock_transfer_items: {
        Row: {
          id: string
          transfer_id: string
          variant_id: string
          source_shelf_id: string | null
          quantity_requested: number
          quantity_shipped: number
          quantity_received: number
        }
        Insert: {
          id?: string
          transfer_id: string
          variant_id: string
          source_shelf_id?: string | null
          quantity_requested: number
          quantity_shipped?: number
          quantity_received?: number
        }
        Update: {
          id?: string
          transfer_id?: string
          variant_id?: string
          source_shelf_id?: string | null
          quantity_requested?: number
          quantity_shipped?: number
          quantity_received?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            referencedRelation: "stock_transfers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfer_items_variant_id_fkey"
            columns: ["variant_id"]
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          }
        ]
      }
      pos_sessions: {
        Row: {
          id: string
          location_id: string
          terminal_id: string
          cashier_id: string
          opening_cash_float: number
          closing_cash_actual: number | null
          cash_discrepancy: number | null
          opened_at: string
          closed_at: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          location_id: string
          terminal_id: string
          cashier_id: string
          opening_cash_float?: number
          closing_cash_actual?: number | null
          cash_discrepancy?: number | null
          opened_at?: string
          closed_at?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          location_id?: string
          terminal_id?: string
          cashier_id?: string
          opening_cash_float?: number
          closing_cash_actual?: number | null
          cash_discrepancy?: number | null
          opened_at?: string
          closed_at?: string | null
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "pos_sessions_location_id_fkey"
            columns: ["location_id"]
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sessions_cashier_id_fkey"
            columns: ["cashier_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_addresses: {
        Row: {
          id: string
          user_id: string | null
          recipient_name: string
          phone: string
          alternate_phone: string | null
          flat_building: string
          street_area: string
          landmark: string | null
          city: string
          state: string
          state_code: string
          pincode: string
          country: string
          latitude: number | null
          longitude: number | null
          address_type: string
          is_default_shipping: boolean
          is_default_billing: boolean
          gstin: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          recipient_name: string
          phone: string
          alternate_phone?: string | null
          flat_building: string
          street_area: string
          landmark?: string | null
          city: string
          state: string
          state_code: string
          pincode: string
          country?: string
          latitude?: number | null
          longitude?: number | null
          address_type?: string
          is_default_shipping?: boolean
          is_default_billing?: boolean
          gstin?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          recipient_name?: string
          phone?: string
          alternate_phone?: string | null
          flat_building?: string
          street_area?: string
          landmark?: string | null
          city?: string
          state?: string
          state_code?: string
          pincode?: string
          country?: string
          latitude?: number | null
          longitude?: number | null
          address_type?: string
          is_default_shipping?: boolean
          is_default_billing?: boolean
          gstin?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_addresses_user_id_fkey"
            columns: ["user_id"]
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
          hsn_code?: string
          cost_price?: number
          mrp?: number
          tax_rate_percent?: number
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
          hsn_code?: string
          cost_price?: number
          mrp?: number
          tax_rate_percent?: number
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
          hsn_code?: string
          cost_price?: number
          mrp?: number
          tax_rate_percent?: number
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
      orders: {
        Row: {
          id: string
          order_number: string | null
          user_id: string
          order_type: OrderType
          bolt_pincode: string | null
          bolt_timeslot_id: string | null
          bolt_session_status: BoltSessionStatus | null
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
          source_location_id?: string | null
          fulfillment_location_id?: string | null
          pos_session_id?: string | null
          is_pos_order?: boolean
          is_endless_aisle?: boolean
          billing_address_json?: Json | null
          shipping_address_json?: Json | null
          pos_payment_method?: PosPaymentMethod | null
          pos_payment_details?: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number?: string | null
          user_id: string
          order_type?: OrderType
          bolt_pincode?: string | null
          bolt_timeslot_id?: string | null
          bolt_session_status?: BoltSessionStatus | null
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
          source_location_id?: string | null
          fulfillment_location_id?: string | null
          pos_session_id?: string | null
          is_pos_order?: boolean
          is_endless_aisle?: boolean
          billing_address_json?: Json | null
          shipping_address_json?: Json | null
          pos_payment_method?: PosPaymentMethod | null
          pos_payment_details?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_number?: string | null
          user_id?: string
          order_type?: OrderType
          bolt_pincode?: string | null
          bolt_timeslot_id?: string | null
          bolt_session_status?: BoltSessionStatus | null
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
          source_location_id?: string | null
          fulfillment_location_id?: string | null
          pos_session_id?: string | null
          is_pos_order?: boolean
          is_endless_aisle?: boolean
          billing_address_json?: Json | null
          shipping_address_json?: Json | null
          pos_payment_method?: PosPaymentMethod | null
          pos_payment_details?: Json | null
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
          },
          {
            foreignKeyName: "orders_bolt_timeslot_id_fkey"
            columns: ["bolt_timeslot_id"]
            referencedRelation: "bolt_timeslots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_source_location_id_fkey"
            columns: ["source_location_id"]
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_fulfillment_location_id_fkey"
            columns: ["fulfillment_location_id"]
            referencedRelation: "locations"
            referencedColumns: ["id"]
          }
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          variant_id?: string | null
          quantity: number
          unit_price: number
          size: string | null
          is_kept: boolean | null
          try_on_decision: TryOnDecision
          rejection_reason: string | null
          picked_from_shelf_id?: string | null
          hsn_code?: string | null
          cgst_rate?: number | null
          cgst_amount?: number | null
          sgst_rate?: number | null
          sgst_amount?: number | null
          igst_rate?: number | null
          igst_amount?: number | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          variant_id?: string | null
          quantity?: number
          unit_price: number
          size?: string | null
          is_kept?: boolean | null
          try_on_decision?: TryOnDecision
          rejection_reason?: string | null
          picked_from_shelf_id?: string | null
          hsn_code?: string | null
          cgst_rate?: number | null
          cgst_amount?: number | null
          sgst_rate?: number | null
          sgst_amount?: number | null
          igst_rate?: number | null
          igst_amount?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          variant_id?: string | null
          quantity?: number
          unit_price?: number
          size?: string | null
          is_kept?: boolean | null
          try_on_decision?: TryOnDecision
          rejection_reason?: string | null
          picked_from_shelf_id?: string | null
          hsn_code?: string | null
          cgst_rate?: number | null
          cgst_amount?: number | null
          sgst_rate?: number | null
          sgst_amount?: number | null
          igst_rate?: number | null
          igst_amount?: number | null
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
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            referencedRelation: "product_variants"
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
        Relationships: []
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
      bolt_pincodes: {
        Row: {
          id: string
          pincode: string
          city: string
          state: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          pincode: string
          city: string
          state?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          pincode?: string
          city?: string
          state?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      bolt_timeslots: {
        Row: {
          id: string
          label: string
          slot_start: string | null
          slot_end: string | null
          cutoff_time: string
          max_daily_capacity: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          label: string
          slot_start?: string | null
          slot_end?: string | null
          cutoff_time?: string
          max_daily_capacity?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          label?: string
          slot_start?: string | null
          slot_end?: string | null
          cutoff_time?: string
          max_daily_capacity?: number
          is_active?: boolean
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
      adjust_variant_stock: {
        Args: {
          p_variant_id: string
          p_delta: number
        }
        Returns: {
          variant_id: string
          new_stock: number
          product_id: string
          new_product_stock: number
        }[]
      }
      receive_grn_and_putaway: {
        Args: {
          p_po_id: string
          p_location_id: string
          p_target_shelf_id: string
          p_operator_id: string
          p_received_items: Json
        }
        Returns: Json
      }
      process_pos_checkout: {
        Args: {
          p_location_id: string
          p_pos_session_id: string
          p_cashier_id: string
          p_customer_id: string | null
          p_customer_info: Json
          p_cart_items: Json
          p_payment_method: PosPaymentMethod
          p_payment_details: Json
          p_subtotal: number
          p_tax_amount: number
          p_discount_amount: number
          p_total: number
          p_is_endless_aisle?: boolean
          p_shipping_address?: Json | null
        }
        Returns: Json
      }
      move_shelf_stock: {
        Args: {
          p_location_id: string
          p_from_shelf_id: string
          p_to_shelf_id: string
          p_variant_id: string
          p_quantity: number
          p_operator_id: string
          p_notes?: string | null
        }
        Returns: Json
      }
      execute_stock_transfer: {
        Args: {
          p_transfer_id: string
          p_action: string
          p_target_shelf_id?: string | null
          p_operator_id?: string | null
          p_notes?: string | null
        }
        Returns: Json
      }
      allocate_and_pick_online_order: {
        Args: {
          p_order_id: string
          p_action: string
          p_location_id?: string | null
          p_picks?: Json | null
          p_operator_id?: string | null
        }
        Returns: Json
      }
      process_boris_return: {
        Args: {
          p_order_id: string
          p_order_item_id: string
          p_location_id: string
          p_target_shelf_id: string
          p_condition: QcStatus
          p_refund_mode: string
          p_operator_id: string
          p_notes?: string | null
        }
        Returns: Json
      }
    }
    Enums: {
      user_role: UserRole
      order_status: OrderStatus
      delivery_mode: DeliveryMode
      try_on_status: TryOnStatus
      order_type: OrderType
      bolt_session_status: BoltSessionStatus
      try_on_decision: TryOnDecision
      location_type: LocationType
      zone_type: ZoneType
      inventory_movement_type: InventoryMovementType
      po_status: PoStatus
      qc_status: QcStatus
      transfer_status: TransferStatus
      pos_payment_method: PosPaymentMethod
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Model Type Aliases
export type StoreLocation = Database['public']['Tables']['locations']['Row']
export type Location = StoreLocation
export type LocationInsert = Database['public']['Tables']['locations']['Insert']
export type LocationUpdate = Database['public']['Tables']['locations']['Update']

export type LocationZone = Database['public']['Tables']['location_zones']['Row']
export type LocationZoneInsert = Database['public']['Tables']['location_zones']['Insert']
export type LocationZoneUpdate = Database['public']['Tables']['location_zones']['Update']

export type Shelf = Database['public']['Tables']['shelves']['Row']
export type ShelfInsert = Database['public']['Tables']['shelves']['Insert']
export type ShelfUpdate = Database['public']['Tables']['shelves']['Update']

export type ShelfInventory = Database['public']['Tables']['shelf_inventory']['Row']
export type ShelfInventoryInsert = Database['public']['Tables']['shelf_inventory']['Insert']
export type ShelfInventoryUpdate = Database['public']['Tables']['shelf_inventory']['Update']

export type InventoryLevel = Database['public']['Tables']['inventory_levels']['Row']
export type InventoryLevelInsert = Database['public']['Tables']['inventory_levels']['Insert']
export type InventoryLevelUpdate = Database['public']['Tables']['inventory_levels']['Update']

export type InventoryLedgerEntry = Database['public']['Tables']['inventory_ledger']['Row']
export type InventoryLedgerInsert = Database['public']['Tables']['inventory_ledger']['Insert']

export type Supplier = Database['public']['Tables']['suppliers']['Row']
export type SupplierInsert = Database['public']['Tables']['suppliers']['Insert']
export type SupplierUpdate = Database['public']['Tables']['suppliers']['Update']

export type PurchaseOrder = Database['public']['Tables']['purchase_orders']['Row']
export type PurchaseOrderInsert = Database['public']['Tables']['purchase_orders']['Insert']
export type PurchaseOrderUpdate = Database['public']['Tables']['purchase_orders']['Update']

export type PurchaseOrderItem = Database['public']['Tables']['purchase_order_items']['Row']
export type PurchaseOrderItemInsert = Database['public']['Tables']['purchase_order_items']['Insert']
export type PurchaseOrderItemUpdate = Database['public']['Tables']['purchase_order_items']['Update']

export type GoodsReceipt = Database['public']['Tables']['goods_receipts']['Row']
export type GoodsReceiptInsert = Database['public']['Tables']['goods_receipts']['Insert']

export type GoodsReceiptItem = Database['public']['Tables']['goods_receipt_items']['Row']
export type GoodsReceiptItemInsert = Database['public']['Tables']['goods_receipt_items']['Insert']

export type StockTransfer = Database['public']['Tables']['stock_transfers']['Row']
export type StockTransferInsert = Database['public']['Tables']['stock_transfers']['Insert']
export type StockTransferUpdate = Database['public']['Tables']['stock_transfers']['Update']

export type StockTransferItem = Database['public']['Tables']['stock_transfer_items']['Row']
export type StockTransferItemInsert = Database['public']['Tables']['stock_transfer_items']['Insert']

export type PosSession = Database['public']['Tables']['pos_sessions']['Row']
export type PosSessionInsert = Database['public']['Tables']['pos_sessions']['Insert']
export type PosSessionUpdate = Database['public']['Tables']['pos_sessions']['Update']

export type UserAddress = Database['public']['Tables']['user_addresses']['Row']
export type UserAddressInsert = Database['public']['Tables']['user_addresses']['Insert']
export type UserAddressUpdate = Database['public']['Tables']['user_addresses']['Update']

export type BoltPincode = Database['public']['Tables']['bolt_pincodes']['Row']
export type BoltPincodeInsert = Database['public']['Tables']['bolt_pincodes']['Insert']
export type BoltPincodeUpdate = Database['public']['Tables']['bolt_pincodes']['Update']

export type BoltTimeslot = Database['public']['Tables']['bolt_timeslots']['Row']
export type BoltTimeslotInsert = Database['public']['Tables']['bolt_timeslots']['Insert']
export type BoltTimeslotUpdate = Database['public']['Tables']['bolt_timeslots']['Update']

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
  variant?: ProductVariant | null
}

export interface OrderWithItems extends Order {
  order_items?: OrderItemWithProduct[]
  user?: UserProfile | null
  courier?: UserProfile | null
  bolt_timeslot?: BoltTimeslot | null
  source_location?: Location | null
  fulfillment_location?: Location | null
}
