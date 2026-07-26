-- 1. Create daily_sequences table
CREATE TABLE IF NOT EXISTS public.daily_sequences (
    shop_id UUID NOT NULL,
    sequence_date DATE NOT NULL,
    counter INT NOT NULL,
    PRIMARY KEY (shop_id, sequence_date)
);

-- Ensure RLS is enabled and no one can mess with it directly
ALTER TABLE public.daily_sequences ENABLE ROW LEVEL SECURITY;
-- No policies defined means strictly accessed by backend/RPC triggers (postgres roles bypass RLS in triggers).

-- 2. Add short_id column to orders
ALTER TABLE public.canteen_orders ADD COLUMN IF NOT EXISTS short_id TEXT;
ALTER TABLE public.print_orders ADD COLUMN IF NOT EXISTS short_id TEXT;

-- 3. Create the sequence generator function
CREATE OR REPLACE FUNCTION public.generate_daily_order_number(p_shop_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    today_date DATE := CURRENT_DATE;
    new_counter INT;
    padded_string TEXT;
BEGIN
    -- Try to lock existing row for the shop for today
    SELECT counter INTO new_counter
    FROM public.daily_sequences
    WHERE shop_id = p_shop_id AND sequence_date = today_date
    FOR UPDATE;

    IF FOUND THEN
        new_counter := new_counter + 1;
        UPDATE public.daily_sequences
        SET counter = new_counter
        WHERE shop_id = p_shop_id AND sequence_date = today_date;
    ELSE
        -- Insert new row (handle concurrent insert via ON CONFLICT)
        INSERT INTO public.daily_sequences (shop_id, sequence_date, counter)
        VALUES (p_shop_id, today_date, 1)
        ON CONFLICT (shop_id, sequence_date) 
        DO UPDATE SET counter = public.daily_sequences.counter + 1
        RETURNING counter INTO new_counter;
    END IF;

    -- Pad with zeros, e.g. 001
    padded_string := LPAD(new_counter::text, 3, '0');
    RETURN padded_string;
END;
$$;

-- 4. Triggers to auto-assign on insert
CREATE OR REPLACE FUNCTION public.set_canteen_order_short_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.short_id IS NULL THEN
        NEW.short_id := public.generate_daily_order_number(NEW.canteen_id);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_canteen_orders_short_id ON public.canteen_orders;
CREATE TRIGGER trg_canteen_orders_short_id
BEFORE INSERT ON public.canteen_orders
FOR EACH ROW
EXECUTE FUNCTION public.set_canteen_order_short_id();

CREATE OR REPLACE FUNCTION public.set_print_order_short_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.short_id IS NULL THEN
        NEW.short_id := public.generate_daily_order_number(NEW.print_shop_id);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_print_orders_short_id ON public.print_orders;
CREATE TRIGGER trg_print_orders_short_id
BEFORE INSERT ON public.print_orders
FOR EACH ROW
EXECUTE FUNCTION public.set_print_order_short_id();
