import * as XLSX from 'xlsx';
import type { BrandAsset, CampaignData, ParsedData, ParseInfo } from '../types';

// Helper to find sheet by case-insensitive name
function findSheet(workbook: XLSX.WorkBook, targetName: string): XLSX.WorkSheet | null {
  const lowerTarget = targetName.toLowerCase();
  const sheetName = workbook.SheetNames.find(name => name.toLowerCase() === lowerTarget);
  return sheetName ? workbook.Sheets[sheetName] : null;
}

// Helper to get value from row with case-insensitive key matching
function getRowValue(row: Record<string, unknown>, ...keys: string[]): string {
  // Create lowercase key map
  const lowerKeys = Object.keys(row).reduce((acc, key) => {
    acc[key.toLowerCase()] = key;
    return acc;
  }, {} as Record<string, string>);

  for (const key of keys) {
    const actualKey = lowerKeys[key.toLowerCase()];
    if (actualKey && row[actualKey] !== undefined && row[actualKey] !== null && row[actualKey] !== '') {
      return String(row[actualKey]).trim();
    }
  }
  return '';
}

// Helper to get numeric value from row
function getRowNumber(row: Record<string, unknown>, ...keys: string[]): number {
  const val = getRowValue(row, ...keys);
  return Number(val) || 0;
}

export function parseExcelFile(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        const warnings: string[] = [];

        // Parse Brand Assets Data
        let brandAssets = parseBrandAssets(workbook, warnings);

        // Parse Campaign Data (tries multiple sheets)
        const { campaigns: campaignData, source: campaignDataSource } = parseCampaignData(workbook, warnings);

        // If we have campaign data but no brand assets, create placeholder assets from video IDs
        if (campaignData.length > 0 && brandAssets.length === 0) {
          brandAssets = createPlaceholderAssets(campaignData);
          if (brandAssets.length > 0) {
            warnings.push('Video thumbnails unavailable - check "Brand assets data" when downloading for thumbnails');
          }
        }

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

// Create placeholder assets from video IDs found in campaign data
function createPlaceholderAssets(campaigns: CampaignData[]): BrandAsset[] {
  const uniqueVideoIds = new Set<string>();

  for (const campaign of campaigns) {
    if (campaign.videoAssetIds) {
      // Video IDs might be comma-separated
      const ids = campaign.videoAssetIds.split(',').map(id => id.trim()).filter(Boolean);
      ids.forEach(id => uniqueVideoIds.add(id));
    }
  }

  return Array.from(uniqueVideoIds).map(assetId => ({
    assetType: 'Video',
    assetId,
    assetName: `Video ${assetId.slice(-8)}`, // Use last 8 chars as name
    assetUrl: '', // No URL available without Brand Assets sheet
    creativeName: '',
    category: '',
  }));
}

function parseBrandAssets(workbook: XLSX.WorkBook, warnings: string[]): BrandAsset[] {
  const sheet = findSheet(workbook, 'Brand Assets Data (Read-only)');

  if (!sheet) {
    // Don't add warning here - we'll add a more specific warning later if needed
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
  // Use case-insensitive matching to handle UK vs US format differences
  const sheetPatterns = ['SB Multi Ad Group Campaigns', 'Sponsored Brands Campaigns'];
  let foundSheet: string | null = null;

  for (const pattern of sheetPatterns) {
    const sheet = findSheet(workbook, pattern);
    if (!sheet) continue;

    const rawData = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];

    for (const row of rawData) {
      // Try multiple column names for video asset IDs (case-insensitive)
      const videoAssetIds = getRowValue(row, 'Video Asset IDs', 'Video Media IDs');
      if (!videoAssetIds) continue;

      campaigns.push({
        campaignId: getRowValue(row, 'Campaign ID'),
        adGroupId: getRowValue(row, 'Ad Group ID'),
        adId: getRowValue(row, 'Ad ID'),
        keywordId: getRowValue(row, 'Keyword ID'),
        productTargetingId: getRowValue(row, 'Product Targeting ID'),
        productTargetingExpression: getRowValue(row, 'Product Targeting Expression'),
        campaignName: getRowValue(row, 'Campaign Name', 'Campaign Name (Informational only)', 'Campaign name', 'Campaign name (Informational only)'),
        adGroupName: getRowValue(row, 'Ad Group Name', 'Ad Group Name (Informational only)', 'Ad group name', 'Ad group name (Informational only)'),
        adName: getRowValue(row, 'Ad Name', 'Ad name', 'Campaign Name', 'Campaign name'),
        keywordText: getRowValue(row, 'Keyword Text', 'Keyword text'),
        matchType: getRowValue(row, 'Match Type', 'Match type'),
        videoAssetIds,
        impressions: getRowNumber(row, 'Impressions'),
        clicks: getRowNumber(row, 'Clicks'),
        spend: getRowNumber(row, 'Spend'),
        sales: getRowNumber(row, 'Sales'),
        orders: getRowNumber(row, 'Orders'),
        units: getRowNumber(row, 'Units'),
        ctr: getRowNumber(row, 'Click-through Rate', 'Click-through rate'),
        conversionRate: getRowNumber(row, 'Conversion Rate', 'Conversion rate'),
        acos: getRowNumber(row, 'ACOS'),
        cpc: getRowNumber(row, 'CPC'),
        roas: getRowNumber(row, 'ROAS'),
      });
    }

    // If we found data in this sheet, record it and stop
    if (campaigns.length > 0) {
      foundSheet = pattern;
      break;
    }
  }

  // Check if sheets exist but have no video data (case-insensitive)
  const hasSBSheet = sheetPatterns.some(pattern => findSheet(workbook, pattern) !== null);
  if (hasSBSheet && campaigns.length === 0) {
    warnings.push('Found Sponsored Brands data but no video ads - you may not have any video campaigns running');
  } else if (!hasSBSheet) {
    warnings.push('Missing Sponsored Brands data - make sure to check "Sponsored Brands data" and "Sponsored Brands multi-ad group data" when downloading');
  }

  return { campaigns, source: foundSheet };
}
