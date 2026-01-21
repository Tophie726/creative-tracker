import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { BrandAsset, CampaignData } from '../types';

interface DbBrandAsset {
  asset_id: string;
  asset_type: string;
  asset_name: string;
  asset_url: string;
  creative_name: string | null;
  category: string | null;
  thumbnail_url: string | null;
}

interface DbCampaignData {
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
}

export function useDataPersistence() {
  const { user, isAuthenticated } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Save data to Supabase
  const saveData = useCallback(async (
    assets: BrandAsset[],
    campaignData: CampaignData[]
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isAuthenticated || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    setIsSaving(true);
    try {
      // Delete existing data for this user
      await supabase.from('brand_assets').delete().eq('user_id', user.id);
      await supabase.from('campaign_data').delete().eq('user_id', user.id);

      // Insert brand assets
      if (assets.length > 0) {
        const assetsToInsert = assets.map(asset => ({
          user_id: user.id,
          asset_id: asset.assetId,
          asset_type: asset.assetType,
          asset_name: asset.assetName,
          asset_url: asset.assetUrl,
          creative_name: asset.creativeName || null,
          category: asset.category || null,
          thumbnail_url: asset.thumbnailUrl || null,
        }));

        const { error: assetsError } = await supabase
          .from('brand_assets')
          .insert(assetsToInsert);

        if (assetsError) throw assetsError;
      }

      // Insert campaign data in batches (Supabase has limits)
      if (campaignData.length > 0) {
        const batchSize = 500;
        for (let i = 0; i < campaignData.length; i += batchSize) {
          const batch = campaignData.slice(i, i + batchSize).map(campaign => ({
            user_id: user.id,
            campaign_id: campaign.campaignId,
            ad_group_id: campaign.adGroupId,
            ad_id: campaign.adId,
            keyword_id: campaign.keywordId,
            product_targeting_id: campaign.productTargetingId,
            product_targeting_expression: campaign.productTargetingExpression,
            campaign_name: campaign.campaignName,
            ad_group_name: campaign.adGroupName,
            ad_name: campaign.adName,
            keyword_text: campaign.keywordText,
            match_type: campaign.matchType,
            video_asset_ids: campaign.videoAssetIds,
            impressions: campaign.impressions,
            clicks: campaign.clicks,
            spend: campaign.spend,
            sales: campaign.sales,
            orders: campaign.orders,
            units: campaign.units,
            ctr: campaign.ctr,
            conversion_rate: campaign.conversionRate,
            acos: campaign.acos,
            cpc: campaign.cpc,
            roas: campaign.roas,
          }));

          const { error: campaignError } = await supabase
            .from('campaign_data')
            .insert(batch);

          if (campaignError) throw campaignError;
        }
      }

      setLastSaved(new Date());
      return { success: true };
    } catch (err) {
      console.error('Error saving data:', err);
      return { success: false, error: (err as Error).message };
    } finally {
      setIsSaving(false);
    }
  }, [isAuthenticated, user]);

  // Load data from Supabase
  const loadData = useCallback(async (): Promise<{
    assets: BrandAsset[];
    campaignData: CampaignData[];
    error?: string;
  }> => {
    if (!isAuthenticated || !user) {
      return { assets: [], campaignData: [], error: 'Not authenticated' };
    }

    setIsLoading(true);
    try {
      // Load brand assets
      const { data: assetsData, error: assetsError } = await supabase
        .from('brand_assets')
        .select('*')
        .eq('user_id', user.id);

      if (assetsError) throw assetsError;

      // Load campaign data
      const { data: campaignRows, error: campaignError } = await supabase
        .from('campaign_data')
        .select('*')
        .eq('user_id', user.id);

      if (campaignError) throw campaignError;

      const assets: BrandAsset[] = ((assetsData || []) as DbBrandAsset[]).map(row => ({
        assetId: row.asset_id,
        assetType: row.asset_type,
        assetName: row.asset_name,
        assetUrl: row.asset_url,
        creativeName: row.creative_name || '',
        category: row.category || '',
        thumbnailUrl: row.thumbnail_url || '',
      }));

      const campaignData: CampaignData[] = ((campaignRows || []) as DbCampaignData[]).map(row => ({
        campaignId: row.campaign_id,
        adGroupId: row.ad_group_id,
        adId: row.ad_id,
        keywordId: row.keyword_id,
        productTargetingId: row.product_targeting_id,
        productTargetingExpression: row.product_targeting_expression,
        campaignName: row.campaign_name,
        adGroupName: row.ad_group_name,
        adName: row.ad_name,
        keywordText: row.keyword_text,
        matchType: row.match_type,
        videoAssetIds: row.video_asset_ids,
        impressions: row.impressions,
        clicks: row.clicks,
        spend: Number(row.spend),
        sales: Number(row.sales),
        orders: row.orders,
        units: row.units,
        ctr: Number(row.ctr),
        conversionRate: Number(row.conversion_rate),
        acos: Number(row.acos),
        cpc: Number(row.cpc),
        roas: Number(row.roas),
      }));

      return { assets, campaignData };
    } catch (err) {
      console.error('Error loading data:', err);
      return { assets: [], campaignData: [], error: (err as Error).message };
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  // Update a single asset's labels
  const updateAssetLabels = useCallback(async (
    assetId: string,
    updates: { creativeName?: string; category?: string }
  ): Promise<{ success: boolean }> => {
    if (!isAuthenticated || !user) {
      return { success: false };
    }

    try {
      const { error } = await supabase
        .from('brand_assets')
        .update({
          creative_name: updates.creativeName,
          category: updates.category,
        })
        .eq('user_id', user.id)
        .eq('asset_id', assetId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Error updating asset:', err);
      return { success: false };
    }
  }, [isAuthenticated, user]);

  // Update a single asset's thumbnail
  const updateAssetThumbnail = useCallback(async (
    assetId: string,
    thumbnailUrl: string
  ): Promise<{ success: boolean }> => {
    if (!isAuthenticated || !user) {
      return { success: false };
    }

    try {
      const { error } = await supabase
        .from('brand_assets')
        .update({ thumbnail_url: thumbnailUrl })
        .eq('user_id', user.id)
        .eq('asset_id', assetId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Error updating thumbnail:', err);
      return { success: false };
    }
  }, [isAuthenticated, user]);

  return {
    saveData,
    loadData,
    updateAssetLabels,
    updateAssetThumbnail,
    isSaving,
    isLoading,
    lastSaved,
    canSave: isAuthenticated,
    userId: user?.id,
  };
}
