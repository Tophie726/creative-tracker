import { useState, useCallback } from 'react';
import { Upload, Library, BarChart3, FlaskConical } from 'lucide-react';
import { FileUpload } from './components/FileUpload';
import { MediaLibrary } from './components/MediaLibrary';
import { PerformanceDashboard } from './components/PerformanceDashboard';
import { ABTestView } from './components/ABTestView';
import { parseExcelFile } from './utils/parseExcel';
import type { BrandAsset, CampaignData } from './types';
import './index.css';

type Tab = 'upload' | 'library' | 'performance' | 'abtest';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [campaignData, setCampaignData] = useState<CampaignData[]>([]);
  const [categories, setCategories] = useState<string[]>(['Brand', 'Product', 'Lifestyle', 'Testimonial', 'Demo']);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await parseExcelFile(file);

      // Preserve existing labels if re-uploading
      const existingLabels = new Map<string, { creativeName?: string; category?: string }>();
      assets.forEach((asset) => {
        if (asset.creativeName || asset.category) {
          existingLabels.set(asset.assetId, {
            creativeName: asset.creativeName,
            category: asset.category,
          });
        }
      });

      // Apply existing labels to new data
      const assetsWithLabels = data.brandAssets.map((asset) => {
        const existing = existingLabels.get(asset.assetId);
        if (existing) {
          return { ...asset, ...existing };
        }
        return asset;
      });

      setAssets(assetsWithLabels);
      setCampaignData(data.campaignData);

      // Auto-switch to library tab after upload
      if (assetsWithLabels.length > 0) {
        setActiveTab('library');
      }
    } catch (err) {
      console.error('Error parsing file:', err);
      setError('Failed to parse the Excel file. Please make sure it\'s a valid Amazon Bulk Report.');
    } finally {
      setIsLoading(false);
    }
  }, [assets]);

  const handleUpdateAsset = useCallback((assetId: string, updates: Partial<BrandAsset>) => {
    setAssets((prev) =>
      prev.map((asset) =>
        asset.assetId === assetId ? { ...asset, ...updates } : asset
      )
    );
  }, []);

  const handleAddCategory = useCallback((category: string) => {
    setCategories((prev) => [...prev, category]);
  }, []);

  const hasData = assets.length > 0 || campaignData.length > 0;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Creative Performance Tracker</h1>
              <p className="text-sm text-gray-500">Analyze your Amazon Ads creative performance</p>
            </div>

            {hasData && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                  {assets.length} assets
                </span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                  {campaignData.length} ad entries
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            <TabButton
              active={activeTab === 'upload'}
              onClick={() => setActiveTab('upload')}
              icon={<Upload className="w-4 h-4" />}
              label="Upload"
            />
            <TabButton
              active={activeTab === 'library'}
              onClick={() => setActiveTab('library')}
              icon={<Library className="w-4 h-4" />}
              label="Media Library"
              disabled={!hasData}
              badge={assets.filter(a => a.creativeName).length > 0 ? `${assets.filter(a => a.creativeName).length} labeled` : undefined}
            />
            <TabButton
              active={activeTab === 'performance'}
              onClick={() => setActiveTab('performance')}
              icon={<BarChart3 className="w-4 h-4" />}
              label="Performance"
              disabled={!hasData}
            />
            <TabButton
              active={activeTab === 'abtest'}
              onClick={() => setActiveTab('abtest')}
              icon={<FlaskConical className="w-4 h-4" />}
              label="A/B Tests"
              disabled={!hasData}
            />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Bulk Report</h2>
              <p className="text-gray-500">
                Download your bulk report from Amazon Advertising with Brand Assets and SB Multi Ad Group data
              </p>
            </div>
            <FileUpload onFileUpload={handleFileUpload} isLoading={isLoading} />
          </div>
        )}

        {activeTab === 'library' && (
          <MediaLibrary
            assets={assets}
            campaignData={campaignData}
            onUpdateAsset={handleUpdateAsset}
            categories={categories}
            onAddCategory={handleAddCategory}
          />
        )}

        {activeTab === 'performance' && (
          <PerformanceDashboard
            assets={assets}
            campaignData={campaignData}
          />
        )}

        {activeTab === 'abtest' && (
          <ABTestView
            assets={assets}
            campaignData={campaignData}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          Built for Sophie Hub Partners
        </div>
      </footer>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  badge?: string;
}

function TabButton({ active, onClick, icon, label, disabled, badge }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors
        ${active
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {icon}
      {label}
      {badge && (
        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
          {badge}
        </span>
      )}
    </button>
  );
}

export default App;
