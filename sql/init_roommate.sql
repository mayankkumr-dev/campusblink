CREATE TABLE IF NOT EXISTS roommate_listings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name text,
  address text,
  rent text,
  note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE roommate_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roommates are viewable by everyone" ON roommate_listings FOR SELECT USING (true);
CREATE POLICY "Users can create their own listing" ON roommate_listings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own listing" ON roommate_listings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own listing" ON roommate_listings FOR DELETE USING (auth.uid() = user_id);
