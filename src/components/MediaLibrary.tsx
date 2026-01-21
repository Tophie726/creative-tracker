import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Video, Image, ExternalLink, X, Play, Zap, ChevronDown, ChevronUp, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import type { BrandAsset, CampaignData } from '../types';
import { generateAndUploadThumbnail } from '../utils/thumbnails';

const ITEMS_PER_PAGE = 24; // 6 columns x 4 rows

interface MediaLibraryProps {
  assets: BrandAsset[];
  campaignData: CampaignData[];
  onUpdateAsset: (assetId: string, updates: Partial<BrandAsset>) => void;
  categories: string[];
  onAddCategory: (category: string) => void;
  userId?: string;
  onUpdateThumbnail?: (assetId: string, thumbnailUrl: string) => void;
}

export function MediaLibrary({ assets, campaignData, onUpdateAsset, userId, onUpdateThumbnail }: MediaLibraryProps) {
  const [filter, setFilter] = useState<'inAds' | 'all' | 'video' | 'image'>('inAds');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<BrandAsset | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Get unique video asset IDs that are actually used in ads + their campaign info with metrics
  const assetAdInfo = useMemo(() => {
    const info = new Map<string, {
      campaigns: Set<string>;
      adGroups: Set<string>;
      ads: Array<{ name: string; sales: number; roas: number; spend: number; impressions: number }>;
      targets: Set<string>;
      adCount: number;
    }>();

    campaignData.forEach((campaign) => {
      if (!campaign.videoAssetIds) return;

      const existing = info.get(campaign.videoAssetIds) || {
        campaigns: new Set<string>(),
        adGroups: new Set<string>(),
        ads: [],
        targets: new Set<string>(),
        adCount: 0,
      };

      if (campaign.campaignName) existing.campaigns.add(campaign.campaignName);
      if (campaign.adGroupName) existing.adGroups.add(campaign.adGroupName);

      // Store full ad data for sorting
      if (campaign.adName) {
        existing.ads.push({
          name: campaign.adName,
          sales: campaign.sales,
          roas: campaign.spend > 0 ? campaign.sales / campaign.spend : 0,
          spend: campaign.spend,
          impressions: campaign.impressions,
        });
      }

      // Add targeting info (keywords or product targets)
      if (campaign.keywordText) {
        existing.targets.add(`KW: ${campaign.keywordText}`);
      } else if (campaign.productTargetingId) {
        existing.targets.add(`ASIN Target`);
      }

      existing.adCount++;
      info.set(campaign.videoAssetIds, existing);
    });

    // Sort ads by sales descending for each asset
    info.forEach((assetInfo) => {
      assetInfo.ads.sort((a, b) => b.sales - a.sales);
    });

    return info;
  }, [campaignData]);

  const assetIdsInAds = useMemo(() => {
    return new Set(assetAdInfo.keys());
  }, [assetAdInfo]);

  // Get categories actually in use
  const categoriesInUse = useMemo(() => {
    const cats = new Set<string>();
    assets.forEach((asset) => {
      if (asset.category) cats.add(asset.category);
    });
    return Array.from(cats).sort();
  }, [assets]);

  // Filter assets based on selection and search
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      // Type/status filter
      if (filter === 'inAds' && !assetIdsInAds.has(asset.assetId)) return false;
      if (filter === 'video' && asset.assetType !== 'Video') return false;
      if (filter === 'image' && asset.assetType === 'Video') return false;

      // Category filter
      if (selectedCategory && asset.category !== selectedCategory) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = asset.creativeName?.toLowerCase().includes(query);
        const matchesCategory = asset.category?.toLowerCase().includes(query);
        const matchesAssetName = asset.assetName?.toLowerCase().includes(query);
        if (!matchesName && !matchesCategory && !matchesAssetName) return false;
      }

      return true;
    });
  }, [assets, filter, assetIdsInAds, searchQuery, selectedCategory]);

  // Pagination
  const totalPages = Math.ceil(filteredAssets.length / ITEMS_PER_PAGE);
  const paginatedAssets = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAssets.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAssets, currentPage]);

  // Reset page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [filter, searchQuery, selectedCategory]);

  const inAdsCount = assets.filter((a) => assetIdsInAds.has(a.assetId)).length;
  const videoCount = assets.filter((a) => a.assetType === 'Video').length;
  const imageCount = assets.filter((a) => a.assetType !== 'Video').length;
  const labeledCount = assets.filter((a) => a.creativeName).length;
  const labeledInAdsCount = assets.filter((a) => assetIdsInAds.has(a.assetId) && a.creativeName).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 shadow-sm border border-orange-200">
          <p className="text-sm text-orange-600 font-medium">Used in Ads</p>
          <p className="text-2xl font-bold text-orange-700">{inAdsCount}</p>
          <p className="text-xs text-orange-500 mt-1">{labeledInAdsCount} labeled</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-sm text-gray-500">Total Assets</p>
          <p className="text-2xl font-bold text-gray-900">{assets.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-sm text-gray-500">Videos</p>
          <p className="text-2xl font-bold text-blue-600">{videoCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-sm text-gray-500">Images</p>
          <p className="text-2xl font-bold text-purple-600">{imageCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-sm text-gray-500">Labeled</p>
          <p className="text-2xl font-bold text-green-600">{labeledCount}/{assets.length}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('inAds')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              filter === 'inAds'
                ? 'bg-orange-500 text-white'
                : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            In Ads ({inAdsCount})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All ({assets.length})
          </button>
          <button
            onClick={() => setFilter('video')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'video'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Videos ({videoCount})
          </button>
          <button
            onClick={() => setFilter('image')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'image'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Images ({imageCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or category..."
            className="pl-9 pr-4 py-2 border rounded-lg text-sm w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Category Filters - only show if categories exist */}
      {categoriesInUse.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500">Filter by category:</span>
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              selectedCategory === null
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {categoriesInUse.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Asset Grid - paginated */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {paginatedAssets.map((asset) => (
          <AssetCard
            key={asset.assetId}
            asset={asset}
            onUpdate={(updates) => onUpdateAsset(asset.assetId, updates)}
            onPreview={() => setSelectedAsset(asset)}
            adInfo={assetAdInfo.get(asset.assetId)}
            userId={userId}
            onThumbnailGenerated={onUpdateThumbnail ? (url) => {
              onUpdateThumbnail(asset.assetId, url);
              onUpdateAsset(asset.assetId, { thumbnailUrl: url });
            } : undefined}
          />
        ))}
      </div>

      {filteredAssets.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No assets found
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-10 h-10 rounded-lg font-medium ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <span className="ml-4 text-sm text-gray-500">
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredAssets.length)} of {filteredAssets.length}
          </span>
        </div>
      )}

      {/* Preview Modal */}
      {selectedAsset && (
        <PreviewModal
          asset={selectedAsset}
          adInfo={assetAdInfo.get(selectedAsset.assetId)}
          onClose={() => setSelectedAsset(null)}
        />
      )}
    </div>
  );
}

interface AdInfo {
  campaigns: Set<string>;
  adGroups: Set<string>;
  ads: Array<{ name: string; sales: number; roas: number; spend: number; impressions: number }>;
  targets: Set<string>;
  adCount: number;
}

interface AssetCardProps {
  asset: BrandAsset;
  onUpdate: (updates: Partial<BrandAsset>) => void;
  onPreview: () => void;
  adInfo?: AdInfo;
  userId?: string;
  onThumbnailGenerated?: (thumbnailUrl: string) => void;
}

function AssetCard({ asset, onUpdate, onPreview, adInfo, userId, onThumbnailGenerated }: AssetCardProps) {
  const [imageError, setImageError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [thumbnailLoading, setThumbnailLoading] = useState(false);
  const [thumbnailAttempted, setThumbnailAttempted] = useState(false);
  const isVideo = asset.assetType === 'Video';
  const isInAds = !!adInfo;

  // Use cached thumbnail from Supabase
  const displayThumbnail = asset.thumbnailUrl;

  // Generate and optionally upload thumbnail for videos without cached thumbnails
  useEffect(() => {
    if (!isVideo || !asset.assetUrl || displayThumbnail || thumbnailAttempted) {
      return;
    }

    setThumbnailAttempted(true);

    // Only try to generate if user is logged in (can save to Supabase)
    // Amazon CDN blocks CORS so client-side generation usually fails
    if (userId && onThumbnailGenerated) {
      setThumbnailLoading(true);

      // Timeout after 5 seconds - Amazon CDN usually blocks CORS
      const timeout = setTimeout(() => {
        setThumbnailLoading(false);
      }, 5000);

      generateAndUploadThumbnail(asset.assetId, asset.assetUrl, userId)
        .then((url) => {
          clearTimeout(timeout);
          if (url) {
            onThumbnailGenerated(url);
          }
        })
        .finally(() => {
          clearTimeout(timeout);
          setThumbnailLoading(false);
        });
    }
    // Skip client-side generation for non-logged in users - CORS will block it
  }, [isVideo, asset.assetUrl, asset.assetId, displayThumbnail, thumbnailAttempted, userId, onThumbnailGenerated]);

  return (
    <div className={`bg-white rounded-xl shadow-sm border overflow-hidden ${isInAds ? 'ring-2 ring-orange-400' : ''}`}>
      {/* Big Preview */}
      <div
        className="relative aspect-video bg-gray-100 cursor-pointer group"
        onClick={onPreview}
      >
        {!imageError && asset.assetUrl ? (
          isVideo ? (
            displayThumbnail ? (
              // Show cached/generated thumbnail
              <div className="relative w-full h-full">
                <img
                  src={displayThumbnail}
                  alt={asset.assetName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 bg-black/50 rounded-full flex items-center justify-center">
                    <Play className="w-8 h-8 text-white ml-1" />
                  </div>
                </div>
                <span className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                  Video
                </span>
              </div>
            ) : thumbnailLoading ? (
              // Loading state
              <div className="relative w-full h-full bg-gray-800 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                  Video
                </span>
              </div>
            ) : (
              // Placeholder when thumbnail unavailable
              <div className="relative w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                <div className="w-14 h-14 bg-black/50 rounded-full flex items-center justify-center">
                  <Play className="w-8 h-8 text-white ml-1" />
                </div>
                <span className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                  Video
                </span>
              </div>
            )
          ) : (
            <img
              src={asset.assetUrl}
              alt={asset.assetName}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          )
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
            {isVideo ? <Video className="w-8 h-8" /> : <Image className="w-8 h-8" />}
            <span className="text-xs mt-1">{isVideo ? 'Video' : 'Image'}</span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <ExternalLink className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Status badges */}
        <div className="absolute top-2 right-2 flex gap-1">
          {isInAds && (
            <span className="px-2 py-1 bg-orange-500 text-white text-xs rounded-full flex items-center gap-1">
              <Zap className="w-3 h-3" /> {adInfo.adCount} ads
            </span>
          )}
          {asset.creativeName && (
            <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">
              Labeled
            </span>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="p-3 space-y-2">
        <input
          type="text"
          value={asset.creativeName || ''}
          onChange={(e) => onUpdate({ creativeName: e.target.value })}
          placeholder="Creative Name"
          className="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />

        <input
          type="text"
          value={asset.category || ''}
          onChange={(e) => onUpdate({ category: e.target.value })}
          placeholder="Category (e.g., Brand, Product)"
          className="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />

        <p className="text-xs text-gray-400 truncate" title={asset.assetName}>
          {asset.assetName || 'Unnamed asset'}
        </p>
      </div>

      {/* Campaign Info - expandable */}
      {isInAds && adInfo && (
        <div className="border-t bg-gray-50">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full px-3 py-2 text-xs text-gray-600 hover:bg-gray-100 flex items-center justify-between"
          >
            <span>
              {adInfo.campaigns.size} campaign{adInfo.campaigns.size !== 1 ? 's' : ''} • {adInfo.ads.length} ad{adInfo.ads.length !== 1 ? 's' : ''}
            </span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {expanded && (
            <div className="px-3 pb-3 space-y-2 text-xs">
              <div>
                <p className="text-gray-500 font-medium mb-1">Ads (sorted by sales):</p>
                <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin pr-1">
                  {adInfo.ads.map((ad, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
                      <span className="text-gray-700 truncate flex-1 mr-2" title={ad.name}>
                        {ad.name}
                      </span>
                      <span className="text-gray-500 whitespace-nowrap text-right min-w-[80px]">
                        ${ad.sales.toFixed(0)} · <span className={ad.roas >= 1 ? 'text-green-600' : 'text-red-500'}>{ad.roas.toFixed(1)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {adInfo.targets.size > 0 && (
                <div>
                  <p className="text-gray-500 font-medium mb-1">Targets:</p>
                  <div className="flex flex-wrap gap-1">
                    {Array.from(adInfo.targets).slice(0, 8).map((target, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                        {target}
                      </span>
                    ))}
                    {adInfo.targets.size > 8 && (
                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                        +{adInfo.targets.size - 8}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface PreviewModalProps {
  asset: BrandAsset;
  adInfo?: AdInfo;
  onClose: () => void;
}

function PreviewModal({ asset, adInfo, onClose }: PreviewModalProps) {
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
        className="relative max-w-4xl w-full bg-white rounded-xl overflow-hidden max-h-[90vh] overflow-y-auto"
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

          {/* Show ad placements in modal - sorted by sales */}
          {adInfo && (
            <div className="mt-4 p-4 bg-orange-50 rounded-lg">
              <p className="text-sm font-medium text-orange-700 mb-3">
                Running in {adInfo.adCount} ad entries across {adInfo.campaigns.size} campaigns
              </p>

              {/* Table Header */}
              <div className="flex items-center justify-between py-2 border-b-2 border-orange-300 text-xs font-semibold text-orange-800">
                <span className="flex-1">Ad Name</span>
                <span className="w-20 text-right">Sales</span>
                <span className="w-20 text-right">ROAS</span>
              </div>

              {/* Table Body */}
              <div className="text-xs max-h-48 overflow-y-auto">
                {adInfo.ads.map((ad, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-orange-200 last:border-0 hover:bg-orange-100/50">
                    <span className="text-orange-700 truncate flex-1 pr-2" title={ad.name}>{ad.name}</span>
                    <span className="w-20 text-right text-orange-600 font-medium">${ad.sales.toFixed(2)}</span>
                    <span className={`w-20 text-right font-medium ${ad.roas >= 1 ? 'text-green-600' : 'text-red-500'}`}>
                      {ad.roas.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400 mt-4 break-all">{asset.assetId}</p>
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
