# ATELIER — Visual Architecture, Database Blueprint & Operations Manual

---

## Executive Summary

**Atelier** is an enterprise-grade omnichannel luxury fashion platform built on a modern TypeScript monorepo architecture. It seamlessly unifies:
1. **High-Performance Consumer Storefront (`apps/storefront`)**: Next.js 14 App Router, Incremental Static Regeneration (ISR), luxury editorial aesthetics, Doorstep Try-On (Bolt 45m), and omnichannel checkout.
2. **Operations & WMS/OMS Admin Portal (`apps/admin`)**: Real-time warehouse fulfillment, bin-directed pick waves, physical barcode wedge scanner integration, purchase orders, goods receipts (GRN), inter-store stock transfers, and boutique POS cash register.
3. **Unified Supabase Architecture (`packages/supabase`)**: PostgreSQL relational engine, double-entry inventory ledger, Row-Level Security (RLS), atomic RPC transactions, PostgreSQL Realtime (`supabase_realtime`), and Supabase Storage with dedicated bucket partitions.
4. **Shared Component System (`packages/ui`)**: High-contrast, theme-aware luxury design tokens, Code 128 barcode rendering, print modals, and accessible interactive primitives.

---

# Part 1: Visual Architecture & System Blueprints

---

### 1. High-Level System & Monorepo Architecture

```mermaid
flowchart TB
    subgraph Clients["Clients & Edge Devices"]
        CustomerBrowser["Customer Browser<br/>(Desktop / Mobile)"]
        AdminBrowser["Admin / Warehouse Operator<br/>(Chrome / Safari)"]
        BarcodeScanner["Hardware USB/HID<br/>Barcode Scanner (Wedge)"]
        PosReceiptPrinter["Thermal Receipt & 4x6<br/>Label Printer"]
    end

    subgraph Apps["Next.js 14 Applications (Monorepo)"]
        subgraph StorefrontApp["apps/storefront (Port 3000)"]
            SF_Pages["Storefront App Router<br/>(/shop, /product, /cart, /orders)"]
            SF_APIs["API Routes<br/>(POST /api/orders, /api/revalidate)"]
            SF_ISR["ISR Engine & Fetch Cache<br/>(tags: ['products', 'collections'])"]
        end

        subgraph AdminApp["apps/admin (Port 3001)"]
            AD_Pages["Admin App Router<br/>(/procurement, /orders, /dispatch, /pos)"]
            AD_APIs["Admin API Endpoints<br/>(/api/admin/upload, /api/admin/metrics)"]
            AD_Revalidate["Cache Purge Dispatcher<br/>(triggerStorefrontRevalidation)"]
        end
    end

    subgraph SharedPackages["Shared Monorepo Packages"]
        RepoSupabase["@repo/supabase<br/>(Client Factories, RPCs, Schema Types)"]
        RepoUI["@repo/ui<br/>(Tailwind Tokens, Barcode, Tables)"]
    end

    subgraph SupabaseCloud["Supabase Managed Cloud Infrastructure"]
        subgraph PostgresEngine["PostgreSQL Relational Engine"]
            PublicTables[("Public Schema Tables<br/>(products, orders, ledger)")]
            StoredRPCs["ACID RPC Functions<br/>(atomic_create_order_and_reserve,<br/>receive_split_grn_and_putaway)"]
            RLS_Engine["Row Level Security (RLS)<br/>(anon, authenticated, service_role)"]
        end

        subgraph RealtimeEngine["PostgreSQL Realtime"]
            RealtimePub["supabase_realtime Publication<br/>(REPLICA IDENTITY FULL)"]
            RealtimeWS["WebSocket Push Channels<br/>(orders, inventory_levels, collections)"]
        end

        subgraph StorageEngine["Supabase Storage"]
            MediaBucket["product-media Bucket<br/>(/products, /categories, /collections, /banners)"]
            CDN["Global Edge CDN Cache"]
        end
    end

    %% Client Interactions
    CustomerBrowser -->|HTTPS / Browsing & Cart| SF_Pages
    CustomerBrowser -->|POST Checkout Payload| SF_APIs
    AdminBrowser -->|HTTPS / Management| AD_Pages
    BarcodeScanner -.->|Keystroke Wedge Simulation| AD_Pages
    AD_Pages -.->|Window Print Stream| PosReceiptPrinter

    %% Internal Monorepo Dependencies
    StorefrontApp --> RepoSupabase
    StorefrontApp --> RepoUI
    AdminApp --> RepoSupabase
    AdminApp --> RepoUI

    %% Server & Database Connectivity
    SF_APIs -->|Service Role / Elevated RPC| StoredRPCs
    SF_Pages -->|Anon / Cookie Client| PublicTables
    AD_APIs -->|Service Role / Elevated Privileges| PublicTables
    AD_APIs -->|Service Role Multipart Upload| MediaBucket
    AD_Revalidate -->|x-revalidation-secret HTTP| SF_APIs

    %% Realtime Data Synchronization
    PublicTables --> RealtimePub
    RealtimePub --> RealtimeWS
    RealtimeWS -.->|Subscribed Live Updates| CustomerBrowser
    RealtimeWS -.->|Subscribed Manifest Changes| AdminBrowser

    %% CDN Asset Serving
    MediaBucket --> CDN
    CDN -->|Optimized Images via next/image| CustomerBrowser
    CDN -->|Visual Previews| AdminBrowser
```

---

### 2. Full Entity Relationship Diagrams (ERDs)

#### ERD (A) — Catalog, Collections & Omnichannel Orders

```mermaid
erDiagram
    categories ||--o{ categories : "parent_id"
    categories ||--o{ products : "categorizes"
    categories ||--o{ collection_categories : "mapped_in"
    
    collections ||--o{ collection_categories : "includes"
    collections ||--o{ collection_products : "curates"
    products ||--o{ collection_products : "featured_in"

    products ||--o{ product_variants : "has_sizes_skus"
    products ||--o{ product_media : "gallery_assets"

    users ||--o{ orders : "places"
    users ||--o{ wishlist_items : "saves"
    products ||--o{ wishlist_items : "wishlisted"

    orders ||--o{ order_items : "contains"
    products ||--o{ order_items : "references"
    product_variants ||--o{ order_items : "fulfills_size"

    categories {
        uuid id PK
        uuid parent_id FK "Self-referencing parent"
        text name
        text slug
        text description
        text image_url
        integer sort_order
        boolean is_active
        timestamptz created_at
    }

    collections {
        uuid id PK
        text title
        text slug
        text description
        text banner_url
        varchar collection_type "occasion, seasonal, capsule"
        boolean is_featured
        boolean is_active
        integer sort_order
        timestamptz created_at
    }

    collection_categories {
        uuid id PK
        uuid collection_id FK
        uuid category_id FK
        timestamptz created_at
    }

    collection_products {
        uuid id PK
        uuid collection_id FK
        uuid product_id FK
        integer display_order
        timestamptz created_at
    }

    products {
        uuid id PK
        uuid category_id FK
        text title
        text slug
        text description
        numeric price
        numeric compare_at_price
        numeric cost_price
        text image_url
        text material
        text edition
        text silhouette
        text care_instructions
        varchar status "draft, active, archived"
        boolean is_featured
        timestamptz created_at
    }

    product_variants {
        uuid id PK
        uuid product_id FK
        text sku
        text size
        text color
        text barcode
        numeric price_override
        integer stock
        boolean is_active
        timestamptz created_at
    }

    product_media {
        uuid id PK
        uuid product_id FK
        text url
        text alt_text
        text media_type
        integer sort_order
        timestamptz created_at
    }

    users {
        uuid id PK
        text email
        text name
        text role "customer, admin, delivery, cashier"
        text phone
        timestamptz created_at
    }

    orders {
        uuid id PK
        uuid user_id FK "Customer or null for guest"
        text order_number
        varchar status "pending, processing, out_for_delivery, delivered, cancelled"
        varchar payment_status "pending, paid, refunded"
        varchar payment_method "cod, card, upi, split"
        varchar delivery_mode "standard, express, try_on"
        varchar try_on_status "fitting_in_progress, reconciled"
        uuid delivery_partner_id FK
        numeric total
        numeric subtotal
        numeric tax_total
        text shipping_address
        text tracking_barcode
        text invoice_number
        timestamptz created_at
    }

    order_items {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        uuid variant_id FK
        text size
        integer quantity
        numeric unit_price
        numeric total_price
        boolean is_kept "Bolt Try-On kept flag"
        varchar try_on_decision "pending, kept, rejected"
        text rejection_reason
    }

    wishlist_items {
        uuid id PK
        uuid user_id FK
        uuid product_id FK
        timestamptz created_at
    }
```

---

#### ERD (B) — WMS, Procurement, Inventory Topology & Audit Ledger

```mermaid
erDiagram
    locations ||--o{ location_zones : "subdivided_into"
    location_zones ||--o{ shelves : "contains_racks"
    
    locations ||--o{ inventory_levels : "holds_total_stock"
    product_variants ||--o{ inventory_levels : "stock_quantified"

    shelves ||--o{ shelf_inventory : "holds_bin_stock"
    product_variants ||--o{ shelf_inventory : "placed_in_bins"

    locations ||--o{ inventory_ledger : "facility_context"
    product_variants ||--o{ inventory_ledger : "transacted_item"
    shelves ||--o{ inventory_ledger : "from_shelf_bin"
    shelves ||--o{ inventory_ledger : "to_shelf_bin"

    suppliers ||--o{ purchase_orders : "issues_po_to"
    locations ||--o{ purchase_orders : "receiving_destination"
    purchase_orders ||--o{ purchase_order_items : "specifies"
    product_variants ||--o{ purchase_order_items : "ordered_sku"

    purchase_orders ||--o{ goods_receipts : "received_via_grn"
    goods_receipts ||--o{ goods_receipt_items : "inspects_and_counts"
    shelves ||--o{ goods_receipt_items : "putaway_shelf"

    locations ||--o{ stock_transfers : "origin_hub"
    locations ||--o{ stock_transfers : "destination_hub"
    stock_transfers ||--o{ stock_transfer_items : "transfers"

    locations {
        uuid id PK
        text code "BLR-WH01, BLR-ST01"
        text name
        text address
        varchar type "warehouse, store"
        boolean is_active
    }

    location_zones {
        uuid id PK
        uuid location_id FK
        text name "Bulk Storage, Pick Face, Quarantine"
        text zone_type "picking, bulk, return, quarantine"
    }

    shelves {
        uuid id PK
        uuid zone_id FK
        text coordinate "BLK-A-01-A1"
        text barcode "LOC-BLK-A-01-A1"
        integer capacity_units
        boolean is_active
    }

    inventory_levels {
        uuid id PK
        uuid variant_id FK
        uuid location_id FK
        integer on_hand
        integer reserved
        integer available
        integer reorder_point
        timestamptz updated_at
    }

    shelf_inventory {
        uuid id PK
        uuid shelf_id FK
        uuid variant_id FK
        integer quantity
        timestamptz updated_at
    }

    inventory_ledger {
        uuid id PK
        timestamptz transaction_timestamp
        uuid variant_id FK
        uuid location_id FK
        uuid from_shelf_id FK
        uuid to_shelf_id FK
        varchar movement_type "inbound_grn, pos_sale, online_fulfillment, transfer_out, transfer_in"
        integer quantity "Delta (+/-)"
        integer balance_after
        varchar reference_doc_type "PO, GRN, POS, ORDER, TRF, CYCLE"
        text reference_doc_id
        uuid operator_id FK
        text notes
    }

    suppliers {
        uuid id PK
        varchar vendor_code UK "SUP-001"
        text name
        varchar gstin
        text email
        varchar phone
        text city
        text state
        varchar payment_terms
        boolean is_active
    }

    purchase_orders {
        uuid id PK
        text po_number UK "PO-2026-001"
        uuid supplier_id FK
        uuid location_id FK
        varchar status "draft, issued, partially_received, received, cancelled"
        date issue_date
        date expected_delivery_date
        numeric subtotal
        numeric tax_total
        numeric total_amount
        uuid created_by FK
        timestamptz created_at
    }

    purchase_order_items {
        uuid id PK
        uuid purchase_order_id FK
        uuid variant_id FK
        integer quantity_ordered
        integer quantity_received
        numeric unit_cost
        numeric total_cost
    }

    goods_receipts {
        uuid id PK
        text grn_number UK "GRN-2026-001"
        uuid purchase_order_id FK
        uuid location_id FK
        varchar invoice_number
        date receipt_date
        uuid received_by FK
        varchar status "inspecting, completed, discrepancy"
        timestamptz created_at
    }

    goods_receipt_items {
        uuid id PK
        uuid goods_receipt_id FK
        uuid po_item_id FK
        uuid variant_id FK
        integer quantity_accepted
        integer quantity_rejected
        uuid putaway_shelf_id FK
        text rejection_reason
    }

    stock_transfers {
        uuid id PK
        text transfer_number UK "TRF-20261123-1001"
        uuid source_location_id FK
        uuid destination_location_id FK
        varchar status "draft, in_transit, completed, cancelled"
        text eway_bill_number
        timestamptz dispatched_at
        timestamptz received_at
    }

    stock_transfer_items {
        uuid id PK
        uuid stock_transfer_id FK
        uuid variant_id FK
        uuid source_shelf_id FK
        uuid destination_shelf_id FK
        integer quantity_requested
        integer quantity_transferred
    }
```

---

### 3. End-to-End Data Flow Diagrams (DFD)

#### DFD 1 — Inbound Supply Chain Flow (Vendor to Live Stock)

```mermaid
flowchart LR
    A["1. Supplier Registry<br/>(Admin /suppliers)"] -->|"Write SUP Details & GSTIN"| B[("public.suppliers")]
    B --> C["2. Commercial PO<br/>(Admin /procurement)"]
    C -->|"Select Variants & Unit Cost"| D[("purchase_orders & items<br/>(status: 'issued')")]
    D --> E["3. Physical Dock Arrival<br/>(Vendor Delivers Shipment)"]
    E --> F["4. Inward GRN & Putaway<br/>(Admin Inward Goods Modal)"]
    F -->|"Call receive_split_grn_and_putaway"| G{"PostgreSQL Atomic RPC"}
    
    G -->|"1. Record Receipt"| H[("public.goods_receipts & items")]
    G -->|"2. Increment Shelf Bin"| I[("public.shelf_inventory<br/>(e.g., BLK-A-01-A1)")]
    G -->|"3. Update Total Facility ATP"| J[("public.inventory_levels<br/>(on_hand + Qty)")]
    G -->|"4. Append Audit Entry"| K[("public.inventory_ledger<br/>(movement: 'inbound_grn')")]
    G -->|"5. Close PO"| L[("purchase_orders<br/>(status: 'received')")]

    J --> M["PostgreSQL Realtime<br/>(supabase_realtime)"]
    M --> N["5. Live Storefront Availability<br/>(Cart & PDP Instantly Purchasable)"]
```

---

#### DFD 2 — Omnichannel Order Placement & Stock Reservation Flow

```mermaid
flowchart LR
    Customer["Customer / Guest Checkout<br/>(Storefront /cart)"] -->|"POST /api/orders<br/>(JSON payload + items)"| OrderAPI["Storefront Order API<br/>(apps/storefront/src/app/api/orders)"]
    
    OrderAPI -->|"1. Server-Side Price Verification"| PriceCheck{"Verify Prices in<br/>public.products"}
    PriceCheck -->|"Prices Validated"| RPC{"Call atomic_create_order_and_reserve"}

    RPC -->|"Write Order Header"| OrdersTable[("public.orders<br/>(status: 'pending')")]
    RPC -->|"Write Line Items"| ItemsTable[("public.order_items")]
    RPC -->|"Reserve Inventory"| InvLevels[("public.inventory_levels<br/>(reserved + Qty, available - Qty)")]
    RPC -->|"Fallback Path"| Fallback["createOrderWithItems<br/>(if RPC missing in local test)"]

    OrdersTable --> RealtimeEngine["PostgreSQL Realtime Engine<br/>(supabase_realtime channel)"]
    
    RealtimeEngine -->|"WebSocket Push: INSERT"| AdminOrders["Admin Order Manifest<br/>(apps/admin /orders)"]
    AdminOrders -->|"Sound Alert & Flash Banner"| WarehouseOp["Warehouse Fulfillment Team"]
```

---

#### DFD 3 — Unified Media Upload Pipeline

```mermaid
flowchart LR
    AdminForm["Admin Form UI<br/>(Products / Categories / CMS)"] -->|"Drop JPEG, PNG, WebP, AVIF"| ClientValidate["Client Guardrails<br/>(File size < 10 MB)"]
    ClientValidate -->|"POST /api/admin/upload<br/>multipart/form-data"| UploadRoute["Upload API Route<br/>(apps/admin/src/app/api/admin/upload)"]
    
    UploadRoute -->|"1. Validate MIME Type"| MimeCheck{"Allowed MIME?<br/>(JPEG, PNG, WebP, AVIF)"}
    MimeCheck -->|No| RejectMime["HTTP 400: Invalid MIME"]
    MimeCheck -->|Yes| SizeCheck{"Size <= 10 MB?"}
    SizeCheck -->|No| RejectSize["HTTP 400: Over 10 MB"]
    
    SizeCheck -->|Yes| FolderPartition["Partition Folder<br/>(/products, /categories, /collections, /banners)"]
    FolderPartition --> GenUUID["Generate Clean Path<br/>folder/timestamp-random-slug.ext"]
    
    GenUUID --> StorageUpload["supabase.storage.from('product-media')<br/>.upload(path, buffer)"]
    StorageUpload --> GenURL["supabase.storage.getPublicUrl(path)"]
    
    GenURL -->|"Permanent Public CDN URL"| DBUpdate[("PostgreSQL DB Table<br/>(products.image_url / categories.image_url)")]
    DBUpdate --> PurgeISR["triggerStorefrontRevalidation()"]
    PurgeISR --> StorefrontCDN["Storefront next/image<br/>(Instant Cache Invalidation & Delivery)"]
```

---

### 4. Sequence Diagrams

#### Sequence 1 — Real-Time Order Lifecycle & Cross-App Sync

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer (Storefront)
    participant SF_API as Storefront API (/api/orders)
    participant Postgres as Supabase PostgreSQL
    participant Realtime as Supabase Realtime (WS)
    actor Admin as Admin Operator (/orders)
    participant Dispatch as Outbound Dispatch (/dispatch)

    Customer->>SF_API: Submit Order (Items, Delivery Mode, Pincode)
    SF_API->>Postgres: Execute atomic_create_order_and_reserve
    Postgres-->>SF_API: Order Created (ID: ord_123, status: 'pending')
    SF_API-->>Customer: HTTP 200 (Order Placed Successfully)
    
    Postgres->>Realtime: Broadcast INSERT on public.orders
    Realtime-->>Admin: Live Event Received (Banner: "New Order Received")
    Admin->>Admin: Review Order Dossier & Line Items
    
    Admin->>SF_API: PATCH /api/orders (status: 'processing', courier: 'Bluedart')
    SF_API->>Postgres: UPDATE orders SET status = 'processing'
    Postgres->>Realtime: Broadcast UPDATE on public.orders
    Realtime-->>Customer: Storefront /orders updates badge to "Pack In Progress"

    Admin->>Dispatch: Open Pick Wave (Zone -> Aisle -> Shelf)
    Dispatch->>Postgres: confirmShelfPick(shelf: 'BLK-A-01-A1', tote: 'TOTE-042')
    Dispatch->>Dispatch: Print 4x6 Thermal Shipping Label (AWB Assigned)
    Dispatch->>Postgres: UPDATE orders SET status = 'out_for_delivery'
    Postgres->>Realtime: Broadcast UPDATE on public.orders
    Realtime-->>Customer: Storefront /orders badge switches to "In Transit"
```

---

#### Sequence 2 — Occasions & Collections Publishing Flow

```mermaid
sequenceDiagram
    autonumber
    actor Merchandiser as Store Merchandiser (Admin)
    participant AdminUI as Admin (/collections)
    participant Supabase as Supabase Storage & DB
    participant RevalidateAPI as Storefront (/api/revalidate)
    actor Shopper as Online Shopper (Storefront)

    Merchandiser->>AdminUI: Click "+ New Occasion / Collection"
    Merchandiser->>AdminUI: Enter Title ("Diwali Gala"), Slug ("diwali-gala"), Description
    Merchandiser->>AdminUI: Upload Banner via /api/admin/upload (folder: 'collections')
    AdminUI->>Supabase: Upload Banner to product-media/collections/
    Supabase-->>AdminUI: Return Permanent CDN URL
    
    Merchandiser->>AdminUI: Multi-select Categories ("Kurta Sets", "Brocade") & Garments
    Merchandiser->>AdminUI: Click "Publish Occasion"
    
    AdminUI->>Supabase: INSERT INTO public.collections
    AdminUI->>Supabase: INSERT INTO public.collection_categories
    AdminUI->>Supabase: INSERT INTO public.collection_products
    
    AdminUI->>RevalidateAPI: triggerStorefrontRevalidation(path: '/shop')
    RevalidateAPI->>RevalidateAPI: Invalidate Next.js Data Cache tags ['collections']
    
    Shopper->>Shopper: Opens Storefront Homepage / Navbar
    Note over Shopper: Mega-Menu dynamically displays "Diwali Gala"<br/>with luxury editorial banner & curated products
```

---

### 5. State Machine Diagrams

#### Order Status State Machine (Including Bolt 45m Doorstep Try-On)

```mermaid
stateDiagram-v2
    [*] --> pending : Customer Checkout / POS Order

    pending --> processing : Staff Assigns Courier / Starts Pick
    pending --> cancelled : Customer Cancelled / Payment Failed

    processing --> out_for_delivery : Box Sealed & Thermal AWB Printed
    processing --> cancelled : Stock Discrepancy / Admin Cancel

    state Delivery_Mode_Fork <<fork>>
    out_for_delivery --> Delivery_Mode_Fork

    Delivery_Mode_Fork --> standard_transit : Standard E-Commerce
    Delivery_Mode_Fork --> try_on_fitting : Bolt 45m Doorstep Fitting

    standard_transit --> delivered : Recipient Signs Delivery Challan

    state try_on_fitting {
        [*] --> salon_doorstep : Valet Arrives with Curated Wardrobe
        salon_doorstep --> fitting_in_progress : Customer Tries Sizes (45-min timer)
        fitting_in_progress --> reconciled : Decision Made (Kept vs Rejected)
    }

    try_on_fitting --> delivered : All Items Kept
    try_on_fitting --> return_dock : 1+ Items Rejected / Returned

    return_dock --> dock_qc_inspection : Inwarded at Warehouse Dock
    dock_qc_inspection --> shelf_restocked : QC Passed (Restocked to Primary Shelf)
    dock_qc_inspection --> quarantine_bin : QC Failed (Damaged to QRN-BIN-01)
    shelf_restocked --> delivered : Final Reconciled Settlement
    quarantine_bin --> delivered : Insurance / Scrap Settlement

    delivered --> [*]
    cancelled --> [*]
```

---

#### Purchase Order & GRN Inbound State Machine

```mermaid
stateDiagram-v2
    [*] --> draft : Merchandiser Creates PO in /procurement

    draft --> issued : Supplier & Receiving Node Confirmed
    draft --> cancelled : Aborted by Operator

    issued --> inspecting_dock : Supplier Shipment Arrives at Dock
    issued --> cancelled : Vendor Default / Contract Cancelled

    state inspecting_dock {
        [*] --> count_and_qc : Count Quantities & Check Fabric GSM
        count_and_qc --> discrepancy : Count < Ordered or Damaged Goods
        count_and_qc --> accepted : Count == Ordered & Passed QC
    }

    inspecting_dock --> partially_received : Partial Shipment Inwarded
    partially_received --> inspecting_dock : Subsequent Balance Arrives

    inspecting_dock --> received : 100% Inwarded to Shelves (GRN Complete)
    partially_received --> received : Final Balance Inwarded

    received --> [*] : Inventory Available on Storefront
    cancelled --> [*]
```

---

# Part 2: Complete Operations Manual

---

## Section 1: Admin Panel Runbook (`apps/admin`)

### 1. Initial Setup: Facility Topology, Categories & Occasions

#### A. Multi-Facility Warehouse & Store Locations
- **Where to go:** `Sidebar → Inventory & WMS → Locations & Shelves` (`/locations`).
- **What to do:**
  1. Verify the active location selector in the top-right toolbar or sidebar header (e.g. `BLR-WH01 — Atelier Central Mother Hub` or `BLR-ST01 — Indiranagar Flagship Boutique`).
  2. Inspect Zones: Bulk Storage (`bulk`), Pick Face (`picking`), Returns Dock (`return`), and Quarantine (`quarantine`).
  3. Ensure physical shelf coordinates (e.g. `BLK-A-01-A1`, `QRN-BIN-01`) have barcodes generated.

#### B. Hierarchical Product Categories
- **Where to go:** `Sidebar → Catalog & CMS → Categories` (`/categories`).
- **What to do:**
  1. Click **`+ Add Category`** to open the creation drawer.
  2. Enter **Category Name** (e.g., `Anarkali Sets`), **Slug** (`anarkali-sets`), and optional **Parent Category** for nested subcategories (e.g., `Womenswear → Festive Sets → Anarkali Sets`).
  3. Upload an editorial high-resolution category thumbnail (PNG/WebP/JPEG up to 10 MB) via the upload dropzone. The image is uploaded through `/api/admin/upload` to `product-media/categories/`.
  4. Click **`Save Category`**. Next.js on-demand revalidation immediately synchronizes the storefront menu.

#### C. Collections & Occasions
- **Where to go:** `Sidebar → Catalog & CMS → Collections & Occasions` (`/collections`).
- **What to do:**
  1. Click **`+ New Occasion / Collection`**.
  2. Provide **Title** (e.g., `Royal Weddings`), **Slug** (`royal-weddings`), **Occasion Group Type** (`occasion`, `seasonal`, or `capsule`), and a brief editorial brief.
  3. Upload a wide landscape banner image (via `/api/admin/upload` to `product-media/collections/`).
  4. Tag participating categories and garments.
  5. Toggle **`Published`** and click **`Publish Occasion`**. The collection will immediately show in the Storefront navbar mega-menu and `/shop?collection=royal-weddings`.

---

### 2. Catalog Management: Launching Garments & Variants

- **Where to go:** `Sidebar → Inventory & WMS → Inventory Matrix` (`/inventory`) → Click **`Launch Garment`** (`/inventory/new`).
- **Step-by-step garment launch:**
  1. **Garment Provenance:** Enter Title (e.g., `Raw Silk Angrakha Kurti`), Category, Silhouette, Fabric & GSM specification (e.g., `450 GSM Pure Mulberry Silk`), and Care Instructions.
  2. **Edition / Drop Tag:** Specify limited batch tag (e.g., `Strict Edition // 120 Pieces`).
  3. **Editorial Imagery:** Drag and drop product photos. The upload route automatically stores them in `product-media/products/` and returns public URLs.
  4. **Size & SKU Matrix:** Specify sizes (`XS`, `S`, `M`, `L`, `XL`, `XXL`), assign unique SKUs (e.g., `KURTI-ANG-M`), initial launch stock, and optional size price overrides.
  5. Click **`Launch Garment into Catalog`**. The garment is written to `public.products`, variants to `public.product_variants`, and on-demand cache revalidation triggers automatically.

---

### 3. Inbound Supply Chain Operations (Supplier → PO → GRN → Live Stock)

Follow this exact 3-step workflow to register vendors, purchase inventory, and receive stock onto shelves:

#### Step 1: Register Supplier Vendor
- **Route:** `Sidebar → Supply Chain → Suppliers` (`/suppliers`).
- **Action:** Click **`+ Add Supplier`**.
- **Fields:** Vendor Name (e.g., `Bengaluru Loom Crafts`), Vendor Code (`SUP-0042`), GSTIN (15-character alphanumeric GST format, e.g. `29AABCU9603R1ZM`), Contact Person, Email, Phone, Address, City, State, State Code (`29` for Karnataka), and Payment Terms (`Net 30`).
- **Commit:** Click **`Save Supplier Vendor`**. Persists to `public.suppliers`.

#### Step 2: Issue Commercial Purchase Order (PO)
- **Route:** `Sidebar → Supply Chain → Purchase Orders & GRN` (`/procurement`).
- **Action:** Click **`+ Issue Purchase Order`**.
- **Drawer Controls:**
  1. Select **Supplier Vendor** from dropdown.
  2. Select **Default Receiving Node** (e.g., `BLR-WH01 — Atelier Central Mother Hub`).
  3. Set **Expected Delivery Date**.
  4. **Omnisearch & Quick-Add Products:** Use the search bar to filter by garment title, SKU, size, material, or category. Click any variant card to add it to the PO.
  5. Set **Ordered Quantity** and negotiated wholesale **Cost Price (₹)**.
  6. The system calculates Subtotal, 12% GST Tax, and Grand Total.
  7. Click **`Commit & Issue PO`**. The PO is recorded in `public.purchase_orders` with status `issued`.

#### Step 3: Inward Goods Receipt (GRN) & Shelf Putaway
- **Route:** `Sidebar → Supply Chain → Purchase Orders & GRN` (`/procurement`).
- **Action:** Locate the issued PO in the table and click **`Inward GRN & Putaway`**.
- **Inspection Modal:**
  1. Enter vendor Invoice Number and Delivery Challan Reference.
  2. For each SKU, enter **Accepted Quantity** and **Putaway Shelf Coordinate** (e.g., `BLK-A-01-A1`).
  3. If any garments are defective, enter **Rejected Quantity** and Rejection Reason (e.g., `Torn seam during transit`).
  4. Click **`Commit Goods Receipt & Putaway`**.
- **System Verification:**
  - `public.goods_receipts` logs the receipt.
  - `public.shelf_inventory` increments the bin count at `BLK-A-01-A1`.
  - `public.inventory_levels` increments the facility on-hand ATP stock.
  - `public.inventory_ledger` writes a permanent `inbound_grn` audit transaction with document reference `GRN-XXXX`.
  - The variant immediately becomes purchasable on the Storefront.

---

### 4. Order Fulfillment Runbook

- **Where to go:** `Sidebar → Operations → Orders` (`/orders`) and `Sidebar → Operations → Outbound Dispatch` (`/dispatch`).
- **Order Lifecycle Steps:**
  1. **New Order Alert:** The green `Realtime Sync: Connected` badge notifies staff of new incoming orders.
  2. **Assign Courier:** In `/orders`, select a delivery courier from the dropdown. Status automatically updates to `processing`.
  3. **Pick Wave Execution:** In `/dispatch` → `Pick Waves` tab, follow the bin-directed sequence. Scan the shelf barcode (`LOC-BLK-A-01-A1`) or garment barcode to verify the pick into tote `TOTE-042`.
  4. **Packing Station:** In `/dispatch` → `Packing Station` tab, enter package weight (`1.25 kg`), package dimensions, and carrier AWB code (`BD-XXXXX`). Click **`Print Shipping Label (4x6)`** to print the thermal parcel label.
  5. **Seal & Dispatch:** Click **`Complete Packing & Seal Box`**. Order transitions to `out_for_delivery`.
  6. **Doorstep Try-On (Bolt 45m):**
     - Customer receives fitting at doorstep.
     - Kept items are reconciled; rejected garments return to dock via `/dispatch` → `Try-On Dock Inwarding`.
     - Passed items restock to primary shelf; damaged items divert to `QRN-BIN-01`.

---

### 5. CMS & Storefront Merchandising

- **Where to go:** `Sidebar → Catalog & CMS → Storefront CMS` (`/cms`).
- **Operational Tabs:**
  1. **Announcement Bar:** Update marquee announcement text, discount coupon codes, link destination, and toggle visibility.
  2. **Hero Carousel:** Add, reorder, or edit homepage full-screen hero slides with editorial images, couture titles, and CTA links.
  3. **Homepage Sections:** Arrange grid blocks (`Hero Carousel`, `Shop by Category`, `Curated Occasions`, `Editor's Picks`, `Brand Heritage`).
  4. **Tokens Studio:** Fine-tune theme typography, letter-spacing, and gold/chrome color accents.
  5. **Commit:** Click **`Publish & Revalidate Storefront`** to purge edge caches instantly.

---

### 6. Admin Module Feature Matrix

| Module / Route | Exact Sidebar Path | What It Actually Does | Implementation Status |
| :--- | :--- | :--- | :--- |
| **Dashboard** | `Operations → Dashboard` (`/dashboard`) | Executive KPI overview: Today's GMV, active order count, low stock count, channel distribution. | **Working End-to-End** |
| **POS Terminal** | `Operations → POS Terminal` (`/pos`) | Omnichannel cash register: Barcode scanner input, product catalog, split payments (Cash, Card, UPI), parked carts, shift float management, BORIS returns, thermal receipt printer. | **Working End-to-End** |
| **Orders** | `Operations → Orders` (`/orders`) | Omnichannel order manifest: Realtime incoming alerts, channel filtering, status state machine, courier assignment, GST invoice generation. | **Working End-to-End** |
| **Outbound Dispatch** | `Operations → Outbound Dispatch` (`/dispatch`) | Fulfillment terminal: Bin-directed pick waves with barcode wedge scanning, packing station with 4x6 thermal shipping labels, Bolt try-on returns inwarding with QC quarantine. | **Working End-to-End** |
| **Bolt Try-On** | `Operations → Bolt Try-On` (`/bolt`) | Hyperlocal 45-min doorstep try-on management: Pincode serviceability mapping, hub proximity, delivery timeslots. | **Working End-to-End** |
| **Inventory Matrix** | `Inventory & WMS → Inventory Matrix` (`/inventory`) | Omnichannel stock grid: Multi-location Available-To-Promise (ATP) inventory, category filtering, search, low-stock warnings. | **Working End-to-End** |
| **Locations & Shelves** | `Inventory & WMS → Locations & Shelves` (`/locations`) | Physical WMS topology: Warehouse and boutique hubs, zone assignment (bulk, picking, quarantine), shelf coordinate barcodes. | **Working End-to-End** |
| **Stock Transfers** | `Inventory & WMS → Stock Transfers` (`/inventory/transfers`) | Inter-facility transfer state machine: Source/dest locations, SKU selection, E-Way bill generation, dispatch, receiving verification. | **Working End-to-End** |
| **Audit Ledger** | `Inventory & WMS → Audit Ledger` (`/inventory/ledger`) | Double-entry append-only immutable journal: Transaction timestamp, movement type, delta ($\Delta$), post balance, reference documents. | **Working End-to-End** |
| **Purchase Orders & GRN** | `Supply Chain → Purchase Orders & GRN` (`/procurement`) | Commercial procurement: Vendor linkage, product omnisearch, PO generation, goods receipt dock inwarding, automatic putaway into shelf inventory. | **Working End-to-End** |
| **Suppliers** | `Supply Chain → Suppliers` (`/suppliers`) | Vendor master directory: GSTIN tracking, lead times, contact details, payment terms, active toggle. | **Working End-to-End** |
| **Categories** | `Catalog & CMS → Categories` (`/categories`) | Category tree: Parent/child nested taxonomy, image upload via `/api/admin/upload`, revalidation trigger. | **Working End-to-End** |
| **Collections & Occasions**| `Catalog & CMS → Collections & Occasions` (`/collections`) | Occasion merchandising: Festive and seasonal curation, multi-category and product mapping, banner upload. | **Working End-to-End** |
| **Barcode Studio** | `Catalog & CMS → Barcode Studio` (`/barcodes`) | Barcode generation: Code 128 label printing for product variants and physical warehouse shelf locations. | **Working End-to-End** |
| **Customers & Staff** | `Catalog & CMS → Customers & Staff` (`/customers`) | Role-based user directory: Customers, store cashiers, warehouse managers, delivery couriers. | **Working End-to-End** |
| **Storefront CMS** | `Catalog & CMS → Storefront CMS` (`/cms`) | Merchandising command center: Marquee announcement bar, hero banners, section reordering, visual design tokens. | **Working End-to-End** |

---

## Section 2: Storefront Runbook (`apps/storefront`)

### 1. Customer Shopping Journey
1. **Discovery & Navigation:**
   - **Navbar Mega-Menu:** Displays live categories and curated occasions (e.g. *Festivals*, *Weddings*, *Workwear*) with visual banners.
   - **`/shop` Page:** High-speed server-rendered catalog with filters for Category, Occasion Collection, Price Range, and In-Stock availability.
2. **Product Detail Page (PDP):**
   - High-resolution zoomable editorial gallery.
   - Interactive size selector (`XS`, `S`, `M`, `L`, `XL`) displaying real-time stock levels.
   - Fabric, GSM, and provenance narrative tabs.
   - Wishlist toggle and Add-to-Cart drawer.
3. **Delivery Modes:**
   - **Standard Express Delivery:** Direct doorstep shipment via courier.
   - **Bolt 45-Minute Try-On:** Customer enters pincode; if serviceable, can select a 45-minute fitting timeslot where a valet brings multiple sizes to their door.
4. **Checkout (Authenticated or Guest):**
   - Supports registered patrons (profile sync) and guest checkouts.
   - Server-side price verification rejects any tampered client prices.
   - Atomic reservation RPC guarantees stock cannot be oversold.

### 2. Live Customer Order Tracking
- **Route:** Storefront `/orders` or `/orders?reference=ORD-XXXX`.
- **Experience:**
  - Realtime subscription listens for status updates from Admin or Delivery couriers.
  - Status badges update dynamically: `Pending` → `Pack In Progress` → `In Transit` → `Delivered`.
  - For Bolt Doorstep Try-On, customers view real-time fitting progress and reconciled kept items.

---

*Manual maintained by Atelier Engineering Team. All rights reserved.*
