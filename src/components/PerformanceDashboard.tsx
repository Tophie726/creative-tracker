import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, MousePointer, Eye, ShoppingCart, ChevronDown, ChevronRight } from 'lucide-react';
import type { BrandAsset, CampaignData } from '../types';

interface PerformanceDashboardProps {
  assets: BrandAsset[];
  campaignData: CampaignData[];
}

interface AdDetail {
  adName: string;
  campaignName: string;
  adGroupName: string;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  ctr: number;
  conversionRate: number;
  roas: number;
}

interface AggregatedRow {
  name: string;
  category: string;
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
  ads: AdDetail[];
}

type GroupBy = 'creative' | 'category';
type SortField = 'impressions' | 'clicks' | 'spend' | 'sales' | 'orders' | 'roas' | 'ctr' | 'conversionRate';

export function PerformanceDashboard({ assets, campaignData }: PerformanceDashboardProps) {
  const [groupBy, setGroupBy] = useState<GroupBy>('creative');
  const [sortField, setSortField] = useState<SortField>('spend');
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Create a map of asset IDs to their labels
  const assetMap = useMemo(() => {
    const map = new Map<string, BrandAsset>();
    assets.forEach((asset) => {
      map.set(asset.assetId, asset);
    });
    return map;
  }, [assets]);

  // Aggregate performance data
  const aggregatedData = useMemo(() => {
    const aggregations = new Map<string, AggregatedRow>();

    campaignData.forEach((campaign) => {
      const asset = assetMap.get(campaign.videoAssetIds);
      const creativeName = asset?.creativeName || 'Unlabeled';
      const category = asset?.category || 'Uncategorized';

      const key = groupBy === 'creative' ? creativeName : category;

      const existing = aggregations.get(key) || {
        name: key,
        category,
        impressions: 0,
        clicks: 0,
        spend: 0,
        sales: 0,
        orders: 0,
        units: 0,
        ctr: 0,
        conversionRate: 0,
        cpc: 0,
        roas: 0,
        adCount: 0,
        ads: [],
      };

      existing.impressions += campaign.impressions;
      existing.clicks += campaign.clicks;
      existing.spend += campaign.spend;
      existing.sales += campaign.sales;
      existing.orders += campaign.orders;
      existing.units += campaign.units;
      existing.adCount += 1;

      // Track individual ad stats - use a unique key combining ad name + campaign + ad group
      if (campaign.adName) {
        const adKey = `${campaign.adName}|${campaign.campaignName}|${campaign.adGroupName}`;
        const existingAd = existing.ads.find(a =>
          a.adName === campaign.adName &&
          a.campaignName === campaign.campaignName &&
          a.adGroupName === campaign.adGroupName
        );
        if (existingAd) {
          // Aggregate stats for same ad in same campaign/ad group
          existingAd.impressions += campaign.impressions;
          existingAd.clicks += campaign.clicks;
          existingAd.spend += campaign.spend;
          existingAd.sales += campaign.sales;
          existingAd.orders += campaign.orders;
        } else {
          // New ad entry
          existing.ads.push({
            adName: campaign.adName,
            campaignName: campaign.campaignName,
            adGroupName: campaign.adGroupName,
            impressions: campaign.impressions,
            clicks: campaign.clicks,
            spend: campaign.spend,
            sales: campaign.sales,
            orders: campaign.orders,
            ctr: 0,
            conversionRate: 0,
            roas: 0,
          });
        }
      }

      aggregations.set(key, existing);
    });

    // Calculate derived metrics
    aggregations.forEach((agg) => {
      agg.ctr = agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0;
      agg.conversionRate = agg.clicks > 0 ? (agg.orders / agg.clicks) * 100 : 0;
      agg.cpc = agg.clicks > 0 ? agg.spend / agg.clicks : 0;
      agg.roas = agg.spend > 0 ? agg.sales / agg.spend : 0;

      // Calculate derived metrics for each ad
      agg.ads.forEach((ad) => {
        ad.ctr = ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0;
        ad.conversionRate = ad.clicks > 0 ? (ad.orders / ad.clicks) * 100 : 0;
        ad.roas = ad.spend > 0 ? ad.sales / ad.spend : 0;
      });

      // Sort ads by spend descending
      agg.ads.sort((a, b) => b.spend - a.spend);
    });

    return Array.from(aggregations.values());
  }, [campaignData, assetMap, groupBy]);

  // Sort data
  const sortedData = useMemo(() => {
    return [...aggregatedData].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      return sortAsc ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });
  }, [aggregatedData, sortField, sortAsc]);

  // Overall totals
  const totals = useMemo(() => {
    return aggregatedData.reduce(
      (acc, item) => ({
        impressions: acc.impressions + item.impressions,
        clicks: acc.clicks + item.clicks,
        spend: acc.spend + item.spend,
        sales: acc.sales + item.sales,
        orders: acc.orders + item.orders,
        units: acc.units + item.units,
      }),
      { impressions: 0, clicks: 0, spend: 0, sales: 0, orders: 0, units: 0 }
    );
  }, [aggregatedData]);

  const totalRoas = totals.spend > 0 ? totals.sales / totals.spend : 0;

  const toggleRow = (name: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(name)) {
      newExpanded.delete(name);
    } else {
      newExpanded.add(name);
    }
    setExpandedRows(newExpanded);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <SummaryCard
          label="Impressions"
          value={totals.impressions.toLocaleString()}
          icon={<Eye className="w-5 h-5" />}
          color="blue"
        />
        <SummaryCard
          label="Clicks"
          value={totals.clicks.toLocaleString()}
          icon={<MousePointer className="w-5 h-5" />}
          color="purple"
        />
        <SummaryCard
          label="Spend"
          value={`$${totals.spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<DollarSign className="w-5 h-5" />}
          color="red"
        />
        <SummaryCard
          label="Sales"
          value={`$${totals.sales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
        />
        <SummaryCard
          label="Orders"
          value={totals.orders.toLocaleString()}
          icon={<ShoppingCart className="w-5 h-5" />}
          color="orange"
        />
        <SummaryCard
          label="ROAS"
          value={totalRoas.toFixed(2)}
          icon={totalRoas >= 1 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          color={totalRoas >= 1 ? 'green' : 'red'}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">Group by:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setGroupBy('creative')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                groupBy === 'creative'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Creative Name
            </button>
            <button
              onClick={() => setGroupBy('category')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                groupBy === 'category'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Category
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-500">
          {sortedData.length} {groupBy === 'creative' ? 'creatives' : 'categories'}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  {groupBy === 'creative' ? 'Creative' : 'Category'}
                </th>
                <SortableHeader field="impressions" label="Impressions" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                <SortableHeader field="clicks" label="Clicks" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                <SortableHeader field="ctr" label="CTR" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                <SortableHeader field="spend" label="Spend" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                <SortableHeader field="sales" label="Sales" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                <SortableHeader field="orders" label="Orders" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                <SortableHeader field="conversionRate" label="Conv. Rate" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                <SortableHeader field="roas" label="ROAS" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {sortedData.map((item) => (
                <DataRowWithExpand
                  key={item.name}
                  item={item}
                  isExpanded={expandedRows.has(item.name)}
                  onToggle={() => toggleRow(item.name)}
                />
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t font-medium">
              <tr>
                <td className="px-4 py-3">Grand Total</td>
                <td className="px-4 py-3 text-right">{totals.impressions.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{totals.clicks.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  {totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : '0.00'}%
                </td>
                <td className="px-4 py-3 text-right">${totals.spend.toFixed(2)}</td>
                <td className="px-4 py-3 text-right">${totals.sales.toFixed(2)}</td>
                <td className="px-4 py-3 text-right">{totals.orders.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  {totals.clicks > 0 ? ((totals.orders / totals.clicks) * 100).toFixed(2) : '0.00'}%
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={totalRoas >= 1 ? 'text-green-600' : 'text-red-600'}>
                    {totalRoas.toFixed(2)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'purple' | 'green' | 'red' | 'orange';
}

function SummaryCard({ label, value, icon, color }: SummaryCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
        <div className={`p-1.5 rounded-lg ${colorClasses[color]}`}>{icon}</div>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

interface SortableHeaderProps {
  field: SortField;
  label: string;
  sortField: SortField;
  sortAsc: boolean;
  onSort: (field: SortField) => void;
}

function SortableHeader({ field, label, sortField, sortAsc, onSort }: SortableHeaderProps) {
  const isActive = sortField === field;

  return (
    <th
      className="text-right px-4 py-3 font-medium text-gray-600 cursor-pointer hover:bg-gray-100 select-none"
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive && (
          <span className="text-blue-600">{sortAsc ? '↑' : '↓'}</span>
        )}
      </span>
    </th>
  );
}

interface DataRowWithExpandProps {
  item: AggregatedRow;
  isExpanded: boolean;
  onToggle: () => void;
}

function DataRowWithExpand({ item, isExpanded, onToggle }: DataRowWithExpandProps) {
  return (
    <>
      <tr className="border-t hover:bg-gray-50 cursor-pointer" onClick={onToggle}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {item.ads.length > 0 ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )
            ) : (
              <span className="w-4" />
            )}
            <span className="font-medium">{item.name}</span>
            <span className="text-xs text-gray-400">({item.ads.length} ads)</span>
          </div>
        </td>
        <td className="px-4 py-3 text-right">{item.impressions.toLocaleString()}</td>
        <td className="px-4 py-3 text-right">{item.clicks.toLocaleString()}</td>
        <td className="px-4 py-3 text-right">{item.ctr.toFixed(2)}%</td>
        <td className="px-4 py-3 text-right">${item.spend.toFixed(2)}</td>
        <td className="px-4 py-3 text-right">${item.sales.toFixed(2)}</td>
        <td className="px-4 py-3 text-right">{item.orders.toLocaleString()}</td>
        <td className="px-4 py-3 text-right">{item.conversionRate.toFixed(2)}%</td>
        <td className="px-4 py-3 text-right">
          <span className={item.roas >= 1 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
            {item.roas.toFixed(2)}
          </span>
        </td>
      </tr>

      {/* Expanded rows showing individual ad stats - one per row like pivot table */}
      {isExpanded && item.ads.length > 0 && (
        <>
          {item.ads.map((ad, i) => (
            <tr key={i} className="bg-gray-50 hover:bg-gray-100 border-t border-gray-100">
              <td className="px-4 py-2 pl-10">
                <div className="space-y-0.5">
                  <span className="text-xs text-gray-700 truncate block max-w-xs font-medium" title={ad.adName}>
                    {ad.adName}
                  </span>
                  <span className="text-xs text-gray-400 truncate block max-w-xs" title={`${ad.campaignName} › ${ad.adGroupName}`}>
                    {ad.campaignName} › {ad.adGroupName}
                  </span>
                </div>
              </td>
              <td className="px-4 py-2 text-right text-xs text-gray-600">{ad.impressions.toLocaleString()}</td>
              <td className="px-4 py-2 text-right text-xs text-gray-600">{ad.clicks.toLocaleString()}</td>
              <td className="px-4 py-2 text-right text-xs text-gray-600">{ad.ctr.toFixed(2)}%</td>
              <td className="px-4 py-2 text-right text-xs text-gray-600">${ad.spend.toFixed(2)}</td>
              <td className="px-4 py-2 text-right text-xs text-gray-600">${ad.sales.toFixed(2)}</td>
              <td className="px-4 py-2 text-right text-xs text-gray-600">{ad.orders}</td>
              <td className="px-4 py-2 text-right text-xs text-gray-600">{ad.conversionRate.toFixed(2)}%</td>
              <td className="px-4 py-2 text-right text-xs">
                <span className={ad.roas >= 1 ? 'text-green-600' : 'text-red-600'}>
                  {ad.roas.toFixed(2)}
                </span>
              </td>
            </tr>
          ))}
        </>
      )}
    </>
  );
}
