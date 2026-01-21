import { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle } from 'lucide-react';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  isLoading: boolean;
}

export function FileUpload({ onFileUpload, isLoading }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          setFileName(file.name);
          onFileUpload(file);
        }
      }
    },
    [onFileUpload]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setFileName(file.name);
        onFileUpload(file);
      }
    },
    [onFileUpload]
  );

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-12
          transition-all duration-200 ease-in-out
          ${dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 bg-white'
          }
          ${isLoading ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isLoading}
        />

        <div className="flex flex-col items-center text-center">
          {isLoading ? (
            <>
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-lg font-medium text-gray-700">Processing file...</p>
            </>
          ) : fileName ? (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
              <p className="text-lg font-medium text-gray-700">{fileName}</p>
              <p className="text-sm text-gray-500 mt-2">File uploaded successfully! Drop another file to replace.</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-lg font-medium text-gray-700 mb-2">
                Drop your Amazon Bulk Report here
              </p>
              <p className="text-sm text-gray-500">
                or click to browse
              </p>
              <div className="flex items-center gap-2 mt-4 text-xs text-gray-400">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Supports .xlsx files</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
        <h3 className="font-semibold text-gray-900 mb-4 text-lg">How to download your Bulk Report</h3>

        <div className="space-y-4 text-sm">
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
            <div>
              <p className="font-medium text-gray-800">Go to Amazon Advertising Campaign Manager</p>
              <p className="text-gray-600">Navigate to <span className="font-mono bg-white px-1.5 py-0.5 rounded text-xs">Bulk operations</span> in the left sidebar</p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
            <div>
              <p className="font-medium text-gray-800">Set Date Range</p>
              <p className="text-gray-600">Select at least <span className="font-semibold text-blue-700">30 days</span> (more data = better insights)</p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
            <div>
              <p className="font-medium text-gray-800">Check every box under "Include"</p>
              <p className="text-gray-600 mt-1">Select <span className="font-semibold text-blue-700">all checkboxes</span> for the most complete data</p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
            <div>
              <p className="font-medium text-gray-800">Click "Create spreadsheet for download"</p>
              <p className="text-gray-600">Wait for the file to generate, then download the .xlsx file</p>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800">
            <span className="font-semibold">Tip:</span> Make sure "Brand assets data" and "Sponsored Brands data" are checked - these are required for video creative tracking!
          </p>
        </div>
      </div>
    </div>
  );
}
