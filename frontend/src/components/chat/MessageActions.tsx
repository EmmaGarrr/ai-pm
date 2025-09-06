import React from 'react';
import { cn } from '@/lib/utils';
import { Copy, Edit, Trash2, Download, MoreHorizontal, Check, X } from 'lucide-react';
import { useState } from 'react';

interface MessageActionsProps {
  messageId: string;
  content: string;
  onEdit: (messageId: string, newContent: string) => void;
  onDelete: (messageId: string) => void;
  onCopy: (content: string) => void;
  onExport: (messageId: string) => void;
  className?: string;
  showActions?: boolean;
}

const MessageActions: React.FC<MessageActionsProps> = ({
  messageId,
  content,
  onEdit,
  onDelete,
  onCopy,
  onExport,
  className,
  showActions = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopy(content);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const handleEdit = () => {
    if (isEditing) {
      onEdit(messageId, editedContent);
      setIsEditing(false);
    } else {
      setIsEditing(true);
      setEditedContent(content);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent(content);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this message?')) {
      onDelete(messageId);
    }
  };

  const handleExport = () => {
    onExport(messageId);
    setShowDropdown(false);
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        <textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          autoFocus
        />
        <div className="flex justify-end space-x-2">
          <button
            onClick={handleCancelEdit}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 flex items-center space-x-1"
          >
            <X className="h-4 w-4" />
            <span>Cancel</span>
          </button>
          <button
            onClick={handleEdit}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center space-x-1"
          >
            <Check className="h-4 w-4" />
            <span>Save</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <div className={cn(
        'flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity',
        showActions && 'opacity-100'
      )}>
        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title={copied ? 'Copied!' : 'Copy message'}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4 text-gray-600" />
          )}
        </button>

        {/* Edit button */}
        <button
          onClick={handleEdit}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title="Edit message"
        >
          <Edit className="h-4 w-4 text-gray-600" />
        </button>

        {/* Export button */}
        <button
          onClick={handleExport}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title="Export message"
        >
          <Download className="h-4 w-4 text-gray-600" />
        </button>

        {/* More actions dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="More actions"
          >
            <MoreHorizontal className="h-4 w-4 text-gray-600" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
              <div className="py-1">
                <button
                  onClick={handleEdit}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={handleCopy}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                >
                  <Copy className="h-4 w-4" />
                  <span>Copy</span>
                </button>
                <button
                  onClick={handleExport}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                </button>
                <div className="border-t border-gray-200 my-1" />
                <button
                  onClick={handleDelete}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Delete button */}
        <button
          onClick={handleDelete}
          className="p-1 hover:bg-red-50 rounded transition-colors"
          title="Delete message"
        >
          <Trash2 className="h-4 w-4 text-red-600" />
        </button>
      </div>

      {/* Close dropdown when clicking outside */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default MessageActions;