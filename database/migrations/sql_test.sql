-- Check credits_log schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'credits_log';
