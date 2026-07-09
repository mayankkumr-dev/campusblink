CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  device_name text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  order_ready boolean DEFAULT true,
  new_order boolean DEFAULT true,
  post_liked boolean DEFAULT true,
  post_commented boolean DEFAULT true,
  new_follower boolean DEFAULT true,
  announcement boolean DEFAULT true,
  marketplace_message boolean DEFAULT true,
  reputation_earned boolean DEFAULT true,
  professor_approved boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'push_subscriptions' AND policyname = 'Users manage own push subscriptions'
  ) THEN
    CREATE POLICY "Users manage own push subscriptions"
      ON public.push_subscriptions
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notification_preferences' AND policyname = 'Users manage own notification preferences'
  ) THEN
    CREATE POLICY "Users manage own notification preferences"
      ON public.notification_preferences
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'push_subscriptions' AND policyname = 'Service role can read all push subscriptions'
  ) THEN
    CREATE POLICY "Service role can read all push subscriptions"
      ON public.push_subscriptions
      FOR SELECT
      USING (true);
  END IF;
END $$;
