import * as XLSX from 'xlsx';
import type { BrandAsset, CampaignData, ParsedData, ParseInfo } from '../types';

export function parseExcelFile(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        const warnings: string[] = [];

        // Parse Brand Assets Data
        const brandAssets = parseBrandAssets(workbook, warnings);

        // Parse Campaign Data (tries multiple sheets)
        const { campaigns: campaignData, source: campaignDataSource } = parseCampaignData(workbook, warnings);

        const parseInfo: ParseInfo = {
          hasBrandAssets: brandAssets.length > 0,
          hasCampaignData: campaignData.length > 0,
          campaignDataSource,
          warnings,
        };

        resolve({ brandAssets, campaignData, parseInfo });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
}

function parseBrandAssets(workbook: XLSX.WorkBook, warnings: string[]): BrandAsset[] {
  const sheetName = 'Brand Assets Data (Read-only)';
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    warnings.push('Missing "Brand Assets Data" sheet - make sure to check "Brand assets data" when downloading the bulk report');
    return [];
  }

  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];
  const assets: BrandAsset[] = [];

  // Find the header row (Asset Type, Brand Entity ID, Asset ID, Asset Name, Asset URL)
  let headerRowIndex = -1;
  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    if (row && row[0] === 'Asset Type') {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    warnings.push('Could not find header row in Brand Assets Data sheet');
    return [];
  }

  // Parse data rows after header
  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || !row[0]) continue;

    const assetType = String(row[0] || '').trim();
    const assetId = String(row[2] || '').trim();
    const assetName = String(row[3] || '').trim();
    const assetUrl = String(row[4] || '').trim();

    if (assetId && (assetType === 'Video' || assetType === 'Custom Image' || assetType === 'Other Image' || assetType === 'Brand Logo' || assetType === 'Product Image')) {
      assets.push({
        assetType,
        assetId,
        assetName,
        assetUrl,
        creativeName: '',
        category: '',
      });
    }
  }

  return assets;
}

function parseCampaignData(workbook: XLSX.WorkBook, warnings: string[]): { campaigns: CampaignData[]; source: string | null } {
  const campaigns: CampaignData[] = [];

  // Try multiple sheet names - different bulk report formats use different sheets
  const sheetNames = ['SB Multi Ad Group Campaigns', 'Sponsored Brands Campaigns'];
  let foundSheet: string | null = null;

  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rawData = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];

    for (const row of rawData) {
      // Try multiple column names for video asset IDs
      const videoAssetIds = String(
        row['Video Asset IDs'] || row['Video Media IDs'] || ''
      ).trim();
      if (!videoAssetIds) continue;

      campaigns.push({
        campaignId: String(row['Campaign ID'] || ''),
        adGroupId: String(row['Ad Group ID'] || ''),
        adId: String(row['Ad ID'] || ''),
        keywordId: String(row['Keyword ID'] || ''),
        productTargetingId: String(row['Product Targeting ID'] || ''),
        productTargetingExpression: String(row['Product Targeting Expression'] || ''),
        campaignName: String(row['Campaign Name'] || row['Campaign Name (Informational only)'] || ''),
        adGroupName: String(row['Ad Group Name'] || row['Ad Group Name (Informational only)'] || ''),
        adName: String(row['Ad Name'] || row['Campaign Name'] || ''),
        keywordText: String(row['Keyword Text'] || ''),
        matchType: String(row['Match Type'] || ''),
        videoAssetIds,
        impressions: Number(row['Impressions']) || 0,
        clicks: Number(row['Clicks']) || 0,
        spend: Number(row['Spend']) || 0,
        sales: Number(row['Sales']) || 0,
        orders: Number(row['Orders']) || 0,
        units: Number(row['Units']) || 0,
        ctr: Number(row['Click-through Rate']) || 0,
        conversionRate: Number(row['Conversion Rate']) || 0,
        acos: Number(row['ACOS']) || 0,
        cpc: Number(row['CPC']) || 0,
        roas: Number(row['ROAS']) || 0,
      });
    }

    // If we found data in this sheet, record it and stop
    if (campaigns.length > 0) {
      foundSheet = sheetName;
      break;
    }
  }

  // Check if sheets exist but have no video data
  const hasSBSheet = sheetNames.some(name => workbook.Sheets[name]);
  if (hasSBSheet && campaigns.length === 0) {
    warnings.push('Found Sponsored Brands data but no video ads - you may not have any video campaigns running');
  } else if (!hasSBSheet) {
    warnings.push('Missing Sponsored Brands data - make sure to check "Sponsored Brands data" and "Sponsored Brands multi-ad group data" when downloading');
  }

  return { campaigns, source: foundSheet };
}
