ALTER TABLE public.events ADD COLUMN IF NOT EXISTS payment_tracking_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone;