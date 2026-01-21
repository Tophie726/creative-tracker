export interface Database {
  public: {
    Tables: {
      brand_assets: {
        Row: {
          id: string;
          user_id: string;
          asset_id: string;
          asset_type: string;
          asset_name: string;
          asset_url: string;
          creative_name: string | null;
          category: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          asset_id: string;
          asset_type: string;
          asset_name: string;
          asset_url: string;
          creative_name?: string | null;
          category?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          asset_id?: string;
          asset_type?: string;
          asset_name?: string;
          asset_url?: string;
          creative_name?: string | null;
          category?: string | null;
          updated_at?: string;
        };
      };
      campaign_data: {
        Row: {
          id: string;
          user_id: string;
          campaign_id: string;
          ad_group_id: string;
          ad_id: string;
          keyword_id: string;
          product_targeting_id: string;
          product_targeting_expression: string;
          campaign_name: string;
          ad_group_name: string;
          ad_name: string;
          keyword_text: string;
          match_type: string;
          video_asset_ids: string;
          impressions: number;
          clicks: number;
          spend: number;
          sales: number;
          orders: number;
          units: number;
          ctr: number;
          conversion_rate: number;
          acos: number;
          cpc: number;
          roas: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          campaign_id: string;
          ad_group_id: string;
          ad_id: string;
          keyword_id: string;
          product_targeting_id: string;
          product_targeting_expression: string;
          campaign_name: string;
          ad_group_name: string;
          ad_name: string;
          keyword_text: string;
          match_type: string;
          video_asset_ids: string;
          impressions: number;
          clicks: number;
          spend: number;
          sales: number;
          orders: number;
          units: number;
          ctr: number;
          conversion_rate: number;
          acos: number;
          cpc: number;
          roas: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          campaign_id?: string;
          ad_group_id?: string;
          ad_id?: string;
          keyword_id?: string;
          product_targeting_id?: string;
          product_targeting_expression?: string;
          campaign_name?: string;
          ad_group_name?: string;
          ad_name?: string;
          keyword_text?: string;
          match_type?: string;
          video_asset_ids?: string;
          impressions?: number;
          clicks?: number;
          spend?: number;
          sales?: number;
          orders?: number;
          units?: number;
          ctr?: number;
          conversion_rate?: number;
          acos?: number;
          cpc?: number;
          roas?: number;
        };
      };
    };
  };
}
