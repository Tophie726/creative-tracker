-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Brand Assets table
CREATE TABLE IF NOT EXISTS brand_assets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  asset_name TEXT NOT NULL,
  asset_url TEXT NOT NULL DEFAULT '',
  creative_name TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, asset_id)
);

-- Campaign Data table
CREATE TABLE IF NOT EXISTS campaign_data (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  ad_group_id TEXT NOT NULL,
  ad_id TEXT NOT NULL,
  keyword_id TEXT NOT NULL,
  product_targeting_id TEXT NOT NULL,
  product_targeting_expression TEXT NOT NULL DEFAULT '',
  campaign_name TEXT NOT NULL,
  ad_group_name TEXT NOT NULL,
  ad_name TEXT NOT NULL,
  keyword_text TEXT NOT NULL DEFAULT '',
  match_type TEXT NOT NULL DEFAULT '',
  video_asset_ids TEXT NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  spend DECIMAL(10,2) NOT NULL DEFAULT 0,
  sales DECIMAL(10,2) NOT NULL DEFAULT 0,
  orders INTEGER NOT NULL DEFAULT 0,
  units INTEGER NOT NULL DEFAULT 0,
  ctr DECIMAL(10,4) NOT NULL DEFAULT 0,
  conversion_rate DECIMAL(10,4) NOT NULL DEFAULT 0,
  acos DECIMAL(10,4) NOT NULL DEFAULT 0,
  cpc DECIMAL(10,4) NOT NULL DEFAULT 0,
  roas DECIMAL(10,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE brand_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_data ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only see/modify their own data
CREATE POLICY "Users can view own brand assets" ON brand_assets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own brand assets" ON brand_assets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own brand assets" ON brand_assets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own brand assets" ON brand_assets
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own campaign data" ON campaign_data
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own campaign data" ON campaign_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own campaign data" ON campaign_data
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_brand_assets_user_id ON brand_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_assets_asset_id ON brand_assets(asset_id);
CREATE INDEX IF NOT EXISTS idx_campaign_data_user_id ON campaign_data(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_data_video_asset_ids ON campaign_data(video_asset_ids);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for brand_assets
CREATE TRIGGER update_brand_assets_updated_at
  BEFORE UPDATE ON brand_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
