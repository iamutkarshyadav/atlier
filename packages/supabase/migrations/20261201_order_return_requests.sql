-- =============================================================================
-- Migration: 20261201_order_return_requests.sql
-- Description: Post-purchase size exchange and return request persistence
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.return_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    request_type TEXT NOT NULL CHECK (request_type IN ('exchange', 'return')),
    replacement_size VARCHAR(50),
    reason TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'pickup_scheduled', 'completed', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_return_request_per_order_item UNIQUE (order_item_id)
);

CREATE INDEX IF NOT EXISTS idx_return_requests_order_id ON public.return_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_user_id ON public.return_requests(user_id);

ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own return requests" ON public.return_requests;
CREATE POLICY "Users can view own return requests"
ON public.return_requests
FOR SELECT
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('admin', 'store_manager')
    )
);

DROP POLICY IF EXISTS "Users can create return requests for own orders" ON public.return_requests;
CREATE POLICY "Users can create return requests for own orders"
ON public.return_requests
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_id AND o.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Staff can manage return requests" ON public.return_requests;
CREATE POLICY "Staff can manage return requests"
ON public.return_requests
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('admin', 'store_manager')
    )
);
