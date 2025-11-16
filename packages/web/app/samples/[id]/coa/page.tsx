'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface COAVersion {
  id: string;
  version: number;
  status: 'DRAFT' | 'FINAL' | 'SUPERSEDED';
  reportDate?: string;
  reporter?: { name?: string; email: string };
  approver?: { name?: string; email: string };
  approvalDate?: string;
  pdfKey?: string;
  notes?: string;
  createdAt: string;
}

/**
 * COA (Certificate of Analysis) Management Page
 * 
 * Features:
 * - List all COA versions for a sample
 * - Preview COA (HTML or PDF)
 * - Export COA as PDF
 * - View version history
 * - Generate new COA versions
 */
export default function COAPage() {
  const params = useParams();
  const router = useRouter();
  const sampleId = params.id as string;
  
  const [versions, setVersions] = useState<COAVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  useEffect(() => {
    fetchVersions();
  }, [sampleId]);

  const fetchVersions = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/coa-reports/sample/${sampleId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch COA versions');
      }

      const data = await response.json();
      setVersions(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/coa-reports/preview/${sampleId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to preview COA');
      }

      const data = await response.json();
      setPreviewHtml(data.htmlSnapshot);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGenerateDraft = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/coa-reports/generate-draft`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ sampleId }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate draft COA');
      }

      await fetchVersions();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleExportPDF = async (reportId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/coa-reports/${reportId}/pdf`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to export PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `COA-${sampleId}-v${versions.find(v => v.id === reportId)?.version || 'latest'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading COA versions...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Certificate of Analysis</h1>
          <p className="text-sm text-gray-500">Sample ID: {sampleId}</p>
        </div>
        <div className="space-x-2">
          <button
            onClick={() => router.push(`/samples/${sampleId}`)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Back to Sample
          </button>
          <button
            onClick={handlePreview}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Preview
          </button>
          <button
            onClick={handleGenerateDraft}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
          >
            Generate Draft
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Preview Panel */}
      {previewHtml && (
        <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Preview</h2>
            <button
              onClick={() => setPreviewHtml(null)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>
          <div className="border border-gray-300 rounded-md overflow-auto max-h-96">
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        </div>
      )}

      {/* Version List */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Version
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reporter
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Report Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Approver
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {versions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  No COA versions found. Click "Generate Draft" to create one.
                </td>
              </tr>
            ) : (
              versions.map((version) => (
                <tr key={version.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    v{version.version}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        version.status === 'FINAL'
                          ? 'bg-green-100 text-green-800'
                          : version.status === 'DRAFT'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {version.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {version.reporter?.name || version.reporter?.email || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {version.reportDate
                      ? new Date(version.reportDate).toLocaleDateString()
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {version.approver?.name || version.approver?.email || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleExportPDF(version.id)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                      disabled={!version.pdfKey}
                    >
                      Export PDF
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
