import * as XLSX from 'xlsx';
import type { BrandAsset, CampaignData, ParsedData } from '../types';

export function parseExcelFile(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        // Parse Brand Assets Data
        const brandAssets = parseBrandAssets(workbook);

        // Parse SB Multi Ad Group Campaigns
        const campaignData = parseCampaignData(workbook);

        resolve({ brandAssets, campaignData });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
}

function parseBrandAssets(workbook: XLSX.WorkBook): BrandAsset[] {
  const sheetName = 'Brand Assets Data (Read-only)';
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    console.warn('Brand Assets Data sheet not found');
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
    console.warn('Could not find header row in Brand Assets Data');
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

function parseCampaignData(workbook: XLSX.WorkBook): CampaignData[] {
  const campaigns: CampaignData[] = [];

  // Try multiple sheet names - different bulk report formats use different sheets
  const sheetNames = ['SB Multi Ad Group Campaigns', 'Sponsored Brands Campaigns'];

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

    // If we found data in this sheet, we can stop
    if (campaigns.length > 0) {
      console.log(`Found ${campaigns.length} campaign entries in ${sheetName}`);
      break;
    }
  }

  if (campaigns.length === 0) {
    console.warn('No campaign data with video assets found in any supported sheet');
  }

  return campaigns;
}
