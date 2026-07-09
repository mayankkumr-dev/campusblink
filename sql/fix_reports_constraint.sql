ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_reason_check;
ALTER TABLE reports ADD CONSTRAINT reports_reason_check CHECK (char_length(reason) > 0);
