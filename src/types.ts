export interface BrandAsset {
  assetType: string;
  assetId: string;
  assetName: string;
  assetUrl: string;
  // User-defined labels
  creativeName?: string;
  category?: string;
}

export interface CampaignData {
  campaignId: string;
  adGroupId: string;
  adId: string;
  keywordId: string;
  productTargetingId: string;
  productTargetingExpression: string; // Contains ASIN for product targeting
  campaignName: string;
  adGroupName: string;
  adName: string;
  keywordText: string;
  matchType: string;
  videoAssetIds: string;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  units: number;
  ctr: number;
  conversionRate: number;
  acos: number;
  cpc: number;
  roas: number;
}

export interface AggregatedPerformance {
  creativeName: string;
  category: string;
  videoAssetId: string;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  units: number;
  ctr: number;
  conversionRate: number;
  cpc: number;
  roas: number;
  adCount: number;
}

export interface ParseInfo {
  hasBrandAssets: boolean;
  hasCampaignData: boolean;
  campaignDataSource: string | null; // Which sheet the campaign data came from
  warnings: string[];
}

export interface ParsedData {
  brandAssets: BrandAsset[];
  campaignData: CampaignData[];
  parseInfo: ParseInfo;
}
