-- Fix push_subscriptions schema for Firebase Cloud Messaging (FCM)
-- Run this script in your Supabase SQL Editor

-- 1. Make old WebPush columns nullable since FCM doesn't use them
ALTER TABLE public.push_subscriptions ALTER COLUMN endpoint DROP NOT NULL;
ALTER TABLE public.push_subscriptions ALTER COLUMN p256dh DROP NOT NULL;
ALTER TABLE public.push_subscriptions ALTER COLUMN auth DROP NOT NULL;

-- 2. Ensure fcm_token column exists
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS fcm_token text;

-- 3. Drop the old unique constraint that caused conflicts
ALTER TABLE public.push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_endpoint_key;

-- 4. Add the new unique constraint required by the backend API upsert
ALTER TABLE public.push_subscriptions ADD CONSTRAINT push_subscriptions_user_id_fcm_token_key UNIQUE (user_id, fcm_token);
