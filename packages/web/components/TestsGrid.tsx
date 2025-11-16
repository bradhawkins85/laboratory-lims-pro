'use client';

import { useState, useEffect } from 'react';

// Import OOS computation from shared utilities
// Note: In a monorepo setup, you might need to configure path aliases or use relative paths
function computeOOS(
  result: string,
  specification?: {
    min?: number;
    max?: number;
    target?: string;
    oosRule?: string;
  } | null,
): boolean {
  if (!specification) return false;

  const numericResult = parseFloat(result);
  if (isNaN(numericResult)) {
    if (specification.target) {
      return (
        result.trim().toLowerCase() !==
        specification.target.trim().toLowerCase()
      );
    }
    return false;
  }

  if (specification.min !== null && specification.min !== undefined) {
    if (numericResult < specification.min) return true;
  }

  if (specification.max !== null && specification.max !== undefined) {
    if (numericResult > specification.max) return true;
  }

  if (specification.oosRule) {
    const rule = specification.oosRule.toLowerCase();
    if (rule.includes('>=')) {
      const threshold = parseFloat(rule.split('>=')[1]);
      return numericResult < threshold;
    }
    if (rule.includes('<=')) {
      const threshold = parseFloat(rule.split('<=')[1]);
      return numericResult > threshold;
    }
    if (rule.includes('=') || rule.includes('equals')) {
      const target = parseFloat(rule.match(/[\d.]+/)?.[0] || '0');
      return numericResult !== target;
    }
  }

  return false;
}

interface Test {
  id: string;
  testName: string;
  section: { name: string };
  method: { code: string; name: string; unit?: string };
  specification?: {
    code: string;
    min?: number;
    max?: number;
    target?: string;
    unit?: string;
  };
  result?: string;
  resultUnit?: string;
  status: string;
  oos: boolean;
  analyst?: { name?: string };
  testDate?: string;
  comments?: string;
}

interface TestsGridProps {
  sampleId: string;
  tests: Test[];
  onUpdate?: (testId: string, updates: Partial<Test>) => void;
  readOnly?: boolean;
}

/**
 * TestsGrid Component
 * 
 * Editable grid for test assignments with:
 * - Validation of result values
 * - Auto-calculation of OOS (Out of Specification) flags
 * - Inline editing capabilities
 * - Visual indicators for OOS results
 */
export default function TestsGrid({ sampleId, tests, onUpdate, readOnly = false }: TestsGridProps) {
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Test>>({});

  const handleEdit = (test: Test) => {
    setEditingTestId(test.id);
    setEditValues({
      result: test.result,
      resultUnit: test.resultUnit,
      comments: test.comments,
    });
  };

  const handleSave = async (testId: string) => {
    if (!onUpdate) return;

    // Auto-calculate OOS based on result and specification
    const test = tests.find(t => t.id === testId);
    if (test && editValues.result) {
      const isOOS = computeOOS(editValues.result, test.specification || null);
      editValues.oos = isOOS;
    }

    await onUpdate(testId, editValues);
    setEditingTestId(null);
    setEditValues({});
  };

  const handleCancel = () => {
    setEditingTestId(null);
    setEditValues({});
  };

  const handleResultChange = (value: string, test: Test) => {
    setEditValues(prev => ({ ...prev, result: value }));

    // Auto-calculate OOS on change
    if (test.specification) {
      const isOOS = computeOOS(value, test.specification);
      setEditValues(prev => ({ ...prev, oos: isOOS }));
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Section
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Test
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Method
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Specification
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Result
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Unit
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              OOS
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Analyst
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Comments
            </th>
            {!readOnly && (
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {tests.map((test) => {
            const isEditing = editingTestId === test.id;
            const displayOOS = isEditing ? (editValues.oos ?? test.oos) : test.oos;

            return (
              <tr key={test.id} className={displayOOS ? 'bg-red-50' : ''}>
                <td className="px-4 py-3 text-sm text-gray-900">{test.section.name}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{test.testName}</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  <div>{test.method.code}</div>
                  <div className="text-xs text-gray-400">{test.method.name}</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {test.specification ? (
                    <div>
                      <div>{test.specification.code}</div>
                      {test.specification.min !== undefined && test.specification.max !== undefined && (
                        <div className="text-xs text-gray-400">
                          {test.specification.min} - {test.specification.max}
                          {test.specification.unit && ` ${test.specification.unit}`}
                        </div>
                      )}
                      {test.specification.target && (
                        <div className="text-xs text-gray-400">
                          Target: {test.specification.target}
                        </div>
                      )}
                    </div>
                  ) : (
                    'N/A'
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editValues.result || ''}
                      onChange={(e) => handleResultChange(e.target.value, test)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Enter result"
                    />
                  ) : (
                    <span className={displayOOS ? 'font-semibold text-red-700' : ''}>
                      {test.result || 'N/A'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editValues.resultUnit || ''}
                      onChange={(e) => setEditValues(prev => ({ ...prev, resultUnit: e.target.value }))}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  ) : (
                    test.resultUnit || test.method.unit || 'N/A'
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      displayOOS
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {displayOOS ? 'YES' : 'NO'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {test.analyst?.name || 'Unassigned'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {test.testDate ? new Date(test.testDate).toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-4 py-3 text-sm">
                  {isEditing ? (
                    <textarea
                      value={editValues.comments || ''}
                      onChange={(e) => setEditValues(prev => ({ ...prev, comments: e.target.value }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      rows={2}
                    />
                  ) : (
                    test.comments || ''
                  )}
                </td>
                {!readOnly && (
                  <td className="px-4 py-3 text-sm">
                    {isEditing ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleSave(test.id)}
                          className="text-green-600 hover:text-green-900 text-xs font-medium"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancel}
                          className="text-gray-600 hover:text-gray-900 text-xs font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEdit(test)}
                        className="text-blue-600 hover:text-blue-900 text-xs font-medium"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
