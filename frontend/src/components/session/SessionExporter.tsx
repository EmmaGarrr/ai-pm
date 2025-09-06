import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Download, FileText, Database, FileJson, CheckCircle, AlertCircle } from 'lucide-react';

interface SessionExportOptions {
  format: 'json' | 'csv' | 'pdf' | 'markdown';
  includeMetadata: boolean;
  includeAttachments: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  messageFilter?: {
    types?: string[];
    users?: string[];
  };
}

interface SessionExporterProps {
  sessions: Array<{
    id: string;
    title: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
    messageCount: number;
  }>;
  onExport: (sessions: string[], options: SessionExportOptions) => Promise<void>;
  className?: string;
}

const SessionExporter: React.FC<SessionExporterProps> = ({
  sessions,
  onExport,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [exportOptions, setExportOptions] = useState<SessionExportOptions>({
    format: 'json',
    includeMetadata: true,
    includeAttachments: false,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const handleSessionToggle = (sessionId: string) => {
    setSelectedSessions(prev =>
      prev.includes(sessionId)
        ? prev.filter(id => id !== sessionId)
        : [...prev, sessionId]
    );
  };

  const handleSelectAll = () => {
    if (selectedSessions.length === sessions.length) {
      setSelectedSessions([]);
    } else {
      setSelectedSessions(sessions.map(s => s.id));
    }
  };

  const handleExport = async () => {
    if (selectedSessions.length === 0) {
      alert('Please select at least one session to export');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      await onExport(selectedSessions, exportOptions);
      
      clearInterval(progressInterval);
      setExportProgress(100);
      
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
        setIsOpen(false);
        setSelectedSessions([]);
      }, 1000);
    } catch (error) {
      console.error('Export failed:', error);
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'json':
        return <FileJson className="w-5 h-5" />;
      case 'csv':
        return <Database className="w-5 h-5" />;
      case 'pdf':
        return <FileText className="w-5 h-5" />;
      case 'markdown':
        return <FileText className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getFormatDescription = (format: string) => {
    switch (format) {
      case 'json':
        return 'Structured data format, ideal for importing into other systems';
      case 'csv':
        return 'Spreadsheet-compatible format for analysis in Excel or Google Sheets';
      case 'pdf':
        return 'Portable document format, perfect for sharing and printing';
      case 'markdown':
        return 'Human-readable format with formatting, great for documentation';
      default:
        return '';
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors',
          className
        )}
      >
        <Download className="w-4 h-4" />
        <span>Export Sessions</span>
      </button>
    );
  }

  return (
    <div className={cn('fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50', className)}>
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Export Sessions</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Session Selection */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Select Sessions</h3>
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {selectedSessions.length === sessions.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          
          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
            {sessions.map(session => (
              <div
                key={session.id}
                className="flex items-center space-x-3 p-3 hover:bg-gray-50 border-b border-gray-200 last:border-b-0"
              >
                <input
                  type="checkbox"
                  checked={selectedSessions.includes(session.id)}
                  onChange={() => handleSessionToggle(session.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{session.title}</h4>
                  <p className="text-sm text-gray-600">
                    {session.messageCount} messages • {new Date(session.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          <p className="text-sm text-gray-600 mt-2">
            {selectedSessions.length} of {sessions.length} sessions selected
          </p>
        </div>

        {/* Export Options */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Export Options</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {(['json', 'csv', 'pdf', 'markdown'] as const).map(format => (
              <div
                key={format}
                onClick={() => setExportOptions(prev => ({ ...prev, format }))}
                className={cn(
                  'p-4 border rounded-lg cursor-pointer transition-colors',
                  exportOptions.format === format
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    'p-2 rounded-lg',
                    exportOptions.format === format ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                  )}>
                    {getFormatIcon(format)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 uppercase">{format}</h4>
                    <p className="text-xs text-gray-600 mt-1">{getFormatDescription(format)}</p>
                  </div>
                  {exportOptions.format === format && (
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={exportOptions.includeMetadata}
                onChange={(e) => setExportOptions(prev => ({ ...prev, includeMetadata: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Include metadata (timestamps, user info, etc.)</span>
            </label>
            
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={exportOptions.includeAttachments}
                onChange={(e) => setExportOptions(prev => ({ ...prev, includeAttachments: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Include attachments and files</span>
            </label>
          </div>
        </div>

        {/* Progress */}
        {isExporting && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Exporting...</span>
              <span className="text-sm text-gray-600">{exportProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || selectedSessions.length === 0}
            className={cn(
              'px-4 py-2 text-white rounded-lg transition-colors flex items-center space-x-2',
              selectedSessions.length === 0 || isExporting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            )}
          >
            <Download className="w-4 h-4" />
            <span>
              {isExporting ? 'Exporting...' : `Export ${selectedSessions.length} Session${selectedSessions.length !== 1 ? 's' : ''}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionExporter;