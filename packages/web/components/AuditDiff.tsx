'use client';

interface AuditChange {
  field: string;
  oldValue: any;
  newValue: any;
}

interface AuditDiffProps {
  changes: AuditChange[];
  tableName?: string;
  action?: 'CREATE' | 'UPDATE' | 'DELETE';
}

/**
 * AuditDiff Component
 * 
 * Renders audit log changes in a clean, readable format
 * Shows {old, new} value pairs with visual indicators
 */
export default function AuditDiff({ changes, tableName, action }: AuditDiffProps) {
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    if (value instanceof Date) {
      return value.toLocaleString();
    }
    return String(value);
  };

  const getActionColor = () => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DELETE':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getChangeIndicator = (change: AuditChange) => {
    if (change.oldValue === null || change.oldValue === undefined) {
      return <span className="text-green-600 font-semibold">+</span>;
    }
    if (change.newValue === null || change.newValue === undefined) {
      return <span className="text-red-600 font-semibold">-</span>;
    }
    return <span className="text-blue-600 font-semibold">~</span>;
  };

  if (!changes || changes.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        No changes recorded
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tableName && action && (
        <div className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium border ${getActionColor()}`}>
          {action} on {tableName}
        </div>
      )}

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-8">
                
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Field
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Old Value
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                New Value
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {changes.map((change, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-center">
                  {getChangeIndicator(change)}
                </td>
                <td className="px-4 py-2 text-sm font-medium text-gray-900">
                  {change.field}
                </td>
                <td className="px-4 py-2 text-sm text-gray-500">
                  <div className={`${
                    change.oldValue === null || change.oldValue === undefined
                      ? 'text-gray-400 italic'
                      : change.oldValue !== change.newValue
                        ? 'bg-red-50 px-2 py-1 rounded'
                        : ''
                  }`}>
                    {formatValue(change.oldValue)}
                  </div>
                </td>
                <td className="px-4 py-2 text-sm text-gray-900">
                  <div className={`${
                    change.newValue === null || change.newValue === undefined
                      ? 'text-gray-400 italic'
                      : change.oldValue !== change.newValue
                        ? 'bg-green-50 px-2 py-1 rounded font-medium'
                        : ''
                  }`}>
                    {formatValue(change.newValue)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-500 mt-2 space-y-1">
        <div className="flex items-center space-x-4">
          <span className="flex items-center">
            <span className="text-green-600 font-semibold mr-1">+</span>
            <span>Added</span>
          </span>
          <span className="flex items-center">
            <span className="text-blue-600 font-semibold mr-1">~</span>
            <span>Modified</span>
          </span>
          <span className="flex items-center">
            <span className="text-red-600 font-semibold mr-1">-</span>
            <span>Removed</span>
          </span>
        </div>
      </div>
    </div>
  );
}
