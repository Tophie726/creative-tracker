import { useState, useCallback, useEffect } from 'react';
import { Upload, Library, BarChart3, FlaskConical, AlertTriangle, Save, User, LogOut, Cloud, CloudOff } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PasswordGate } from './components/PasswordGate';
import { AuthModal } from './components/AuthModal';
import { FileUpload } from './components/FileUpload';
import { MediaLibrary } from './components/MediaLibrary';
import { PerformanceDashboard } from './components/PerformanceDashboard';
import { ABTestView } from './components/ABTestView';
import { parseExcelFile } from './utils/parseExcel';
import { useDataPersistence } from './hooks/useDataPersistence';
import type { BrandAsset, CampaignData } from './types';
import './index.css';

type Tab = 'upload' | 'library' | 'performance' | 'abtest';

function AppContent() {
  const { isPasswordVerified, isAuthenticated, user, signOut } = useAuth();
  const { saveData, loadData, updateAssetLabels, isSaving, isLoading: isLoadingData, lastSaved } = useDataPersistence();

  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [campaignData, setCampaignData] = useState<CampaignData[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Show password gate if not verified
  if (!isPasswordVerified) {
    return <PasswordGate />;
  }

  // Load saved data when user logs in
  useEffect(() => {
    if (isAuthenticated && assets.length === 0) {
      loadData().then(({ assets: savedAssets, campaignData: savedCampaigns }) => {
        if (savedAssets.length > 0 || savedCampaigns.length > 0) {
          setAssets(savedAssets);
          setCampaignData(savedCampaigns);
          if (savedAssets.length > 0) {
            setActiveTab('library');
          }
        }
      });
    }
  }, [isAuthenticated]);

  const handleFileUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setWarnings([]);

    try {
      const data = await parseExcelFile(file);

      // Check if we got any usable data
      if (!data.parseInfo.hasBrandAssets && !data.parseInfo.hasCampaignData) {
        setError('This file doesn\'t appear to be an Amazon Bulk Report. Please download from Campaign Manager → Bulk operations.');
        setIsLoading(false);
        return;
      }

      // Set warnings from parsing
      if (data.parseInfo.warnings.length > 0) {
        setWarnings(data.parseInfo.warnings);
      }

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
      setSaveStatus('idle');

      // Auto-save if logged in
      if (isAuthenticated && (assetsWithLabels.length > 0 || data.campaignData.length > 0)) {
        saveData(assetsWithLabels, data.campaignData);
      }

      // Auto-switch to library tab after upload (if we have assets)
      if (assetsWithLabels.length > 0) {
        setActiveTab('library');
      }
    } catch (err) {
      console.error('Error parsing file:', err);
      setError('Failed to parse the Excel file. Please make sure it\'s a valid Amazon Bulk Report from Campaign Manager → Bulk operations.');
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
    setSaveStatus('idle');

    // Auto-save label updates if authenticated
    if (isAuthenticated) {
      updateAssetLabels(assetId, {
        creativeName: updates.creativeName,
        category: updates.category,
      });
    }
  }, [isAuthenticated, updateAssetLabels]);

  const handleAddCategory = useCallback((category: string) => {
    setCategories((prev) => [...prev, category]);
  }, []);

  const handleSave = useCallback(async () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    setSaveStatus('saving');
    const result = await saveData(assets, campaignData);
    setSaveStatus(result.success ? 'saved' : 'error');

    if (result.success) {
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [isAuthenticated, saveData, assets, campaignData]);

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

            <div className="flex items-center gap-3">
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

              {/* Save/Auth Button */}
              {hasData && (
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isAuthenticated
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : saveStatus === 'saved' ? (
                    <>
                      <Cloud className="w-4 h-4" />
                      Saved!
                    </>
                  ) : isAuthenticated ? (
                    <>
                      <Save className="w-4 h-4" />
                      Save
                    </>
                  ) : (
                    <>
                      <CloudOff className="w-4 h-4" />
                      Login to Save
                    </>
                  )}
                </button>
              )}

              {/* User Menu */}
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{user?.email}</span>
                  <button
                    onClick={signOut}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                    title="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg text-sm"
                >
                  <User className="w-4 h-4" />
                  Sign In
                </button>
              )}
            </div>
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

        {warnings.length > 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Some data may be missing</p>
                <ul className="mt-1 text-sm text-amber-700 list-disc list-inside">
                  {warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Loading saved data indicator */}
        {isLoadingData && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Loading your saved data...
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
          {lastSaved && (
            <span className="ml-2 text-green-600">
              · Last saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          // After login, save current data
          if (assets.length > 0 || campaignData.length > 0) {
            saveData(assets, campaignData);
          }
        }}
      />
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

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
