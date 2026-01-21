import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { Trophy, ChevronDown, ChevronRight, Target, Package, Layers, Play, X, ExternalLink, FolderOpen, Tag } from 'lucide-react';
import type { BrandAsset, CampaignData } from '../types';

interface ABTestViewProps {
  assets: BrandAsset[];
  campaignData: CampaignData[];
}

interface CreativePerformance {
  creativeName: string;
  videoAssetId: string;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  ctr: number;
  conversionRate: number;
  roas: number;
  isWinner: boolean;
}

interface ABTestGroup {
  target: string;
  targetType: 'keyword' | 'asin' | 'adgroup' | 'campaign' | 'category';
  matchType?: string;
  creatives: CreativePerformance[];
  totalSpend: number;
  totalImpressions: number;
}

type GroupByTarget = 'adgroup' | 'campaign' | 'category' | 'keyword' | 'asin';
type SortBy = 'spend' | 'impressions' | 'creatives';

const MIN_SPEND_FOR_WINNER = 10;

export function ABTestView({ assets, campaignData }: ABTestViewProps) {
  const [groupBy, setGroupBy] = useState<GroupByTarget>('adgroup');
  const [sortBy, setSortBy] = useState<SortBy>('spend');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showOnlyABTests, setShowOnlyABTests] = useState(true);
  const [previewAsset, setPreviewAsset] = useState<BrandAsset | null>(null);

  // Create asset lookup map
  const assetMap = useMemo(() => {
    const map = new Map<string, BrandAsset>();
    assets.forEach((asset) => map.set(asset.assetId, asset));
    return map;
  }, [assets]);

  // Group and aggregate data
  const abTestGroups = useMemo(() => {
    const groups = new Map<string, ABTestGroup>();

    campaignData.forEach((campaign) => {
      // Determine target based on groupBy
      let target: string;
      let targetType: GroupByTarget;
      let matchType: string | undefined;

      if (groupBy === 'campaign' && campaign.campaignName) {
        target = campaign.campaignName;
        targetType = 'campaign';
      } else if (groupBy === 'adgroup' && campaign.adGroupName) {
        target = campaign.adGroupName;
        targetType = 'adgroup';
      } else if (groupBy === 'category') {
        // Group by creative category (user-defined)
        const asset = assetMap.get(campaign.videoAssetIds);
        target = asset?.category || 'Uncategorized';
        targetType = 'category';
      } else if (groupBy === 'keyword' && campaign.keywordText) {
        target = campaign.keywordText;
        targetType = 'keyword';
        matchType = campaign.matchType;
      } else if (groupBy === 'asin') {
        // Try to extract ASIN from product targeting expression or ID
        let asin: string | null = null;

        if (campaign.productTargetingExpression) {
          // Try patterns like: asin="B08XYZ123", asin:B08XYZ123, or just the ASIN
          const asinMatch = campaign.productTargetingExpression.match(/(?:asin[=:]?"?)?([A-Z0-9]{10})(?:")?/i);
          if (asinMatch) {
            asin = asinMatch[1].toUpperCase();
          }
        }

        // Fallback to productTargetingId if it looks like an ASIN
        if (!asin && campaign.productTargetingId) {
          const idMatch = campaign.productTargetingId.match(/([A-Z0-9]{10})/i);
          if (idMatch) {
            asin = idMatch[1].toUpperCase();
          }
        }

        if (asin) {
          target = asin;
          targetType = 'asin';
        } else {
          return; // Skip if no ASIN found
        }
      } else {
        return; // Skip if no valid target
      }

      if (!target) return;

      const groupKey = `${targetType}:${target}:${matchType || ''}`;
      const asset = assetMap.get(campaign.videoAssetIds);
      const creativeName = asset?.creativeName || campaign.videoAssetIds;

      let group = groups.get(groupKey);
      if (!group) {
        group = {
          target,
          targetType,
          matchType,
          creatives: [],
          totalSpend: 0,
          totalImpressions: 0,
        };
        groups.set(groupKey, group);
      }

      // Find or create creative entry in this group
      let creative = group.creatives.find(c => c.videoAssetId === campaign.videoAssetIds);
      if (!creative) {
        creative = {
          creativeName,
          videoAssetId: campaign.videoAssetIds,
          impressions: 0,
          clicks: 0,
          spend: 0,
          sales: 0,
          orders: 0,
          ctr: 0,
          conversionRate: 0,
          roas: 0,
          isWinner: false,
        };
        group.creatives.push(creative);
      }

      // Aggregate metrics
      creative.impressions += campaign.impressions;
      creative.clicks += campaign.clicks;
      creative.spend += campaign.spend;
      creative.sales += campaign.sales;
      creative.orders += campaign.orders;

      group.totalSpend += campaign.spend;
      group.totalImpressions += campaign.impressions;
    });

    // Calculate derived metrics and determine winners
    groups.forEach((group) => {
      let bestRoas = -1;
      let winnerId: string | null = null;

      group.creatives.forEach((creative) => {
        creative.ctr = creative.impressions > 0 ? (creative.clicks / creative.impressions) * 100 : 0;
        creative.conversionRate = creative.clicks > 0 ? (creative.orders / creative.clicks) * 100 : 0;
        creative.roas = creative.spend > 0 ? creative.sales / creative.spend : 0;

        // Determine winner (must have min spend)
        if (creative.spend >= MIN_SPEND_FOR_WINNER && creative.roas > bestRoas) {
          bestRoas = creative.roas;
          winnerId = creative.videoAssetId;
        }
      });

      // Mark the winner
      if (winnerId && group.creatives.length > 1) {
        const winner = group.creatives.find(c => c.videoAssetId === winnerId);
        if (winner) winner.isWinner = true;
      }

      // Sort creatives by ROAS descending
      group.creatives.sort((a, b) => b.roas - a.roas);
    });

    return Array.from(groups.values());
  }, [campaignData, assetMap, groupBy]);

  // Filter and sort groups
  const filteredGroups = useMemo(() => {
    let result = abTestGroups;

    // Filter to only show actual A/B tests (2+ creatives)
    if (showOnlyABTests) {
      result = result.filter(g => g.creatives.length >= 2);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'spend':
          return b.totalSpend - a.totalSpend;
        case 'impressions':
          return b.totalImpressions - a.totalImpressions;
        case 'creatives':
          return b.creatives.length - a.creatives.length;
        default:
          return 0;
      }
    });

    return result;
  }, [abTestGroups, showOnlyABTests, sortBy]);

  const toggleGroup = (target: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(target)) {
      newExpanded.delete(target);
    } else {
      newExpanded.add(target);
    }
    setExpandedGroups(newExpanded);
  };

  // Stats
  const totalABTests = abTestGroups.filter(g => g.creatives.length >= 2).length;
  const totalTargets = abTestGroups.length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Targets</p>
          <p className="text-2xl font-bold text-gray-900">{totalTargets}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">A/B Tests</p>
          <p className="text-2xl font-bold text-blue-600">{totalABTests}</p>
          <p className="text-xs text-gray-400">2+ creatives competing</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Showing</p>
          <p className="text-2xl font-bold text-gray-900">{filteredGroups.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Min Spend for Winner</p>
          <p className="text-2xl font-bold text-gray-900">${MIN_SPEND_FOR_WINNER}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">Group by:</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setGroupBy('campaign')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                groupBy === 'campaign'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              Campaign
            </button>
            <button
              onClick={() => setGroupBy('adgroup')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                groupBy === 'adgroup'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              Ad Group
            </button>
            <button
              onClick={() => setGroupBy('category')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                groupBy === 'category'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Tag className="w-4 h-4" />
              Category
            </button>
            <button
              onClick={() => setGroupBy('keyword')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                groupBy === 'keyword'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Target className="w-4 h-4" />
              Keyword
            </button>
            <button
              onClick={() => setGroupBy('asin')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                groupBy === 'asin'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Package className="w-4 h-4" />
              ASIN
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showOnlyABTests}
              onChange={(e) => setShowOnlyABTests(e.target.checked)}
              className="rounded border-gray-300"
            />
            Only show A/B tests (2+ creatives)
          </label>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="px-3 py-2 border rounded-lg text-sm bg-white"
          >
            <option value="spend">Sort by Spend</option>
            <option value="impressions">Sort by Impressions</option>
            <option value="creatives">Sort by # Creatives</option>
          </select>
        </div>
      </div>

      {/* A/B Test Groups */}
      <div className="space-y-3">
        {filteredGroups.length === 0 ? (
          <div className="bg-white rounded-xl p-8 shadow-sm border text-center">
            <p className="text-gray-500">
              {showOnlyABTests
                ? 'No A/B tests found. Try unchecking "Only show A/B tests" or switch between Keyword/ASIN grouping.'
                : 'No targeting data found for this grouping.'}
            </p>
          </div>
        ) : (
          filteredGroups.map((group) => (
            <ABTestGroupCard
              key={`${group.targetType}:${group.target}:${group.matchType || ''}`}
              group={group}
              isExpanded={expandedGroups.has(group.target)}
              onToggle={() => toggleGroup(group.target)}
              assetMap={assetMap}
              onPreviewAsset={setPreviewAsset}
            />
          ))
        )}
      </div>

      {/* Preview Modal */}
      {previewAsset && (
        <CreativePreviewModal
          asset={previewAsset}
          onClose={() => setPreviewAsset(null)}
        />
      )}
    </div>
  );
}

interface ABTestGroupCardProps {
  group: ABTestGroup;
  isExpanded: boolean;
  onToggle: () => void;
  assetMap: Map<string, BrandAsset>;
  onPreviewAsset: (asset: BrandAsset) => void;
}

function ABTestGroupCard({ group, isExpanded, onToggle, assetMap, onPreviewAsset }: ABTestGroupCardProps) {
  const hasWinner = group.creatives.some(c => c.isWinner);

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}

          <div className="flex items-center gap-2">
            {group.targetType === 'campaign' ? (
              <FolderOpen className="w-4 h-4 text-emerald-500" />
            ) : group.targetType === 'adgroup' ? (
              <Layers className="w-4 h-4 text-indigo-500" />
            ) : group.targetType === 'category' ? (
              <Tag className="w-4 h-4 text-pink-500" />
            ) : group.targetType === 'keyword' ? (
              <Target className="w-4 h-4 text-blue-500" />
            ) : (
              <Package className="w-4 h-4 text-purple-500" />
            )}
            <span className="font-medium text-gray-900">{group.target}</span>
            {group.matchType && (
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                {group.matchType}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {hasWinner && (
            <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded">
              <Trophy className="w-3 h-3" />
              Winner identified
            </span>
          )}
          <span className="text-sm text-gray-500">
            {group.creatives.length} creative{group.creatives.length !== 1 ? 's' : ''}
          </span>
          <span className="text-sm font-medium text-gray-700">
            ${group.totalSpend.toFixed(2)} spend
          </span>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Creative</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Impressions</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Clicks</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">CTR</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Spend</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Sales</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Orders</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Conv. Rate</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {group.creatives.map((creative, i) => (
                <tr
                  key={creative.videoAssetId}
                  className={`border-t ${creative.isWinner ? 'bg-green-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {creative.isWinner && (
                        <Trophy className="w-4 h-4 text-amber-500" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const asset = assetMap.get(creative.videoAssetId);
                          if (asset) onPreviewAsset(asset);
                        }}
                        className={`flex items-center gap-1 hover:underline text-left ${creative.isWinner ? 'font-medium text-green-700' : 'text-blue-600 hover:text-blue-800'}`}
                        title="Click to preview creative"
                      >
                        <Play className="w-3 h-3" />
                        {creative.creativeName}
                      </button>
                      {creative.spend < MIN_SPEND_FOR_WINNER && (
                        <span className="text-xs text-gray-400">(low spend)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">{creative.impressions.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{creative.clicks.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{creative.ctr.toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right">${creative.spend.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">${creative.sales.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">{creative.orders}</td>
                  <td className="px-4 py-3 text-right">{creative.conversionRate.toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${
                      creative.isWinner
                        ? 'text-green-600'
                        : creative.roas >= 1
                          ? 'text-green-600'
                          : 'text-red-600'
                    }`}>
                      {creative.roas.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface CreativePreviewModalProps {
  asset: BrandAsset;
  onClose: () => void;
}

function CreativePreviewModal({ asset, onClose }: CreativePreviewModalProps) {
  const isVideo = asset.assetType === 'Video';
  const videoRef = useRef<HTMLVideoElement>(null);

  // Stop video when modal closes
  const handleClose = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
      videoRef.current.load();
    }
    onClose();
  }, [onClose]);

  // Cleanup on unmount
  useEffect(() => {
    const video = videoRef.current;
    return () => {
      if (video) {
        video.pause();
        video.src = '';
      }
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="relative max-w-3xl w-full bg-white rounded-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="aspect-video bg-black">
          {isVideo && asset.assetUrl ? (
            <video
              ref={videoRef}
              src={asset.assetUrl}
              controls
              autoPlay
              className="w-full h-full"
            />
          ) : asset.assetUrl ? (
            <img
              src={asset.assetUrl}
              alt={asset.assetName}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white">
              Preview not available
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="font-medium text-lg">
            {asset.creativeName || asset.assetName || 'Unnamed Asset'}
          </h3>
          {asset.category && (
            <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
              {asset.category}
            </span>
          )}
          <p className="text-xs text-gray-400 mt-2">{asset.assetName}</p>
          {asset.assetUrl && (
            <a
              href={asset.assetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open in Amazon
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
