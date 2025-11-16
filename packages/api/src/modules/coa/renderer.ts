/**
 * COA HTML Template Renderer
 * Server-side HTML template builder taking dataSnapshot + template config
 */

export interface COATemplateSettings {
  visibleFields?: string[];
  labelOverrides?: Record<string, string>;
  columnOrder?: string[];
}

export interface COADataSnapshot {
  sample: {
    jobNumber: string;
    dateReceived: Date;
    dateDue?: Date;
    releaseDate?: Date;
    client: {
      name: string;
      contactName?: string;
      email?: string;
      phone?: string;
      address?: string;
    };
    sampleCode: string;
    rmSupplier?: string;
    sampleDescription?: string;
    uinCode?: string;
    sampleBatch?: string;
    temperatureOnReceiptC?: number;
    storageConditions?: string;
    comments?: string;
    needByDate?: Date;
    mcdDate?: Date;
    statusFlags: {
      expiredRawMaterial: boolean;
      postIrradiatedRawMaterial: boolean;
      stabilityStudy: boolean;
      urgent: boolean;
      allMicroTestsAssigned: boolean;
      allChemistryTestsAssigned: boolean;
      released: boolean;
      retest: boolean;
    };
  };
  tests: Array<{
    section: { name: string };
    method: { code: string; name: string; unit?: string };
    specification?: {
      code: string;
      name: string;
      target?: string;
      min?: number;
      max?: number;
      unit?: string;
    };
    testName: string;
    dueDate?: Date;
    analyst?: { name?: string; email: string };
    status: string;
    testDate?: Date;
    result?: string;
    resultUnit?: string;
    checker?: { name?: string; email: string };
    chkDate?: Date;
    oos: boolean;
    comments?: string;
    invoiceNote?: string;
    precision?: string;
    linearity?: string;
  }>;
  reportMetadata: {
    version: number;
    generatedAt: Date;
    generatedBy: string;
    labName?: string;
    labLogoUrl?: string;
    disclaimerText?: string;
    templateSettings?: COATemplateSettings;
  };
}

/**
 * Renders a COA data snapshot into an HTML string
 * @param dataSnapshot - The COA data to render
 * @returns HTML string ready for PDF conversion
 */
export function renderCOATemplate(dataSnapshot: COADataSnapshot): string {
  const { sample, tests, reportMetadata } = dataSnapshot;

  // Helper function to get label with override support
  const getLabel = (field: string, defaultLabel: string): string => {
    return (
      reportMetadata.templateSettings?.labelOverrides?.[field] || defaultLabel
    );
  };

  // Helper function to check if field should be visible
  const isVisible = (field: string): boolean => {
    const visibleFields = reportMetadata.templateSettings?.visibleFields;
    // If no visibleFields specified, all fields are visible by default
    if (!visibleFields || visibleFields.length === 0) return true;
    return visibleFields.includes(field);
  };

  // Helper function to get column order
  const getColumnOrder = (): string[] => {
    return (
      reportMetadata.templateSettings?.columnOrder || [
        'section',
        'test',
        'method',
        'specification',
        'result',
        'unit',
        'testDate',
        'analyst',
        'checkedBy',
        'checkedDate',
        'oos',
        'comments',
      ]
    );
  };

  // Build client info
  const clientInfo = `
      <div class="info-label">Client:</div>
      <div>
        <strong>${sample.client.name}</strong><br/>
        ${sample.client.address ? `${sample.client.address}<br/>` : ''}
        ${sample.client.contactName ? `Contact: ${sample.client.contactName}<br/>` : ''}
        ${sample.client.email ? `Email: ${sample.client.email}<br/>` : ''}
        ${sample.client.phone ? `Phone: ${sample.client.phone}` : ''}
      </div>
    `;

  // Build status flags
  const statusFlags: string[] = [];
  if (sample.statusFlags.urgent) statusFlags.push('URGENT');
  if (sample.statusFlags.expiredRawMaterial)
    statusFlags.push('Expired Raw Material');
  if (sample.statusFlags.postIrradiatedRawMaterial)
    statusFlags.push('Post-Irradiated');
  if (sample.statusFlags.stabilityStudy) statusFlags.push('Stability Study');
  if (sample.statusFlags.retest) statusFlags.push('Re-Test');

  const statusFlagsHTML =
    statusFlags.length > 0
      ? `
        <div class="status-flags">
          ${statusFlags.map((flag) => `<span class="chip ${flag === 'URGENT' ? 'urgent' : ''}">${flag}</span>`).join('')}
        </div>
      `
      : '';

  // Define column definitions for test results table
  const columnDefinitions: Record<
    string,
    { header: string; getValue: (test: any) => string }
  > = {
    section: {
      header: getLabel('section', 'Section'),
      getValue: (test) => test.section.name,
    },
    test: {
      header: getLabel('test', 'Test'),
      getValue: (test) => test.testName,
    },
    method: {
      header: getLabel('method', 'Method'),
      getValue: (test) =>
        `<div>${test.method.code}</div><div class="method-name">${test.method.name}</div>`,
    },
    specification: {
      header: getLabel('specification', 'Specification'),
      getValue: (test) => {
        if (!test.specification) return 'N/A';
        let spec = `<div>${test.specification.code}</div>`;
        const hasTarget = test.specification.target;
        const hasMin =
          test.specification.min !== null &&
          test.specification.min !== undefined;
        const hasMax =
          test.specification.max !== null &&
          test.specification.max !== undefined;

        if (hasTarget) {
          spec += `<div class="spec-range">Target: ${test.specification.target}</div>`;
        } else if (hasMin && hasMax) {
          spec += `<div class="spec-range">${test.specification.min} - ${test.specification.max}${test.specification.unit ? ' ' + test.specification.unit : ''}</div>`;
        } else if (hasMin) {
          spec += `<div class="spec-range">&ge; ${test.specification.min}${test.specification.unit ? ' ' + test.specification.unit : ''}</div>`;
        } else if (hasMax) {
          spec += `<div class="spec-range">&le; ${test.specification.max}${test.specification.unit ? ' ' + test.specification.unit : ''}</div>`;
        }
        return spec;
      },
    },
    result: {
      header: getLabel('result', 'Result'),
      getValue: (test) => test.result || 'N/A',
    },
    unit: {
      header: getLabel('unit', 'Unit'),
      getValue: (test) => test.resultUnit || test.method.unit || 'N/A',
    },
    testDate: {
      header: getLabel('testDate', 'Test Date'),
      getValue: (test) =>
        test.testDate ? new Date(test.testDate).toLocaleDateString() : 'N/A',
    },
    analyst: {
      header: getLabel('analyst', 'Analyst'),
      getValue: (test) => test.analyst?.name || test.analyst?.email || 'N/A',
    },
    checkedBy: {
      header: getLabel('checkedBy', 'Checked By'),
      getValue: (test) => test.checker?.name || test.checker?.email || 'N/A',
    },
    checkedDate: {
      header: getLabel('checkedDate', 'Checked Date'),
      getValue: (test) =>
        test.chkDate ? new Date(test.chkDate).toLocaleDateString() : 'N/A',
    },
    oos: {
      header: getLabel('oos', 'OOS'),
      getValue: (test) => (test.oos ? '<span class="oos-yes">YES</span>' : 'NO'),
    },
    comments: {
      header: getLabel('comments', 'Comments'),
      getValue: (test) => test.comments || '',
    },
  };

  const columnOrder = getColumnOrder();

  // Generate table headers based on column order
  const tableHeaders = columnOrder
    .filter((col) => isVisible(col) && columnDefinitions[col])
    .map((col) => `<th>${columnDefinitions[col].header}</th>`)
    .join('');

  // Generate table rows based on column order
  const testsTableRows = tests
    .map((test) => {
      const cells = columnOrder
        .filter((col) => isVisible(col) && columnDefinitions[col])
        .map((col) => {
          const cellClass = col === 'comments' ? ' class="comments-cell"' : '';
          return `<td${cellClass}>${columnDefinitions[col].getValue(test)}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Certificate of Analysis - ${sample.sampleCode} - Version ${reportMetadata.version}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
      @bottom-center {
        content: "Page " counter(page) " of " counter(pages);
      }
    }
    
    body { 
      font-family: Arial, sans-serif; 
      font-size: 10pt;
      margin: 0;
      padding: 0;
      line-height: 1.4;
    }
    
    .header { 
      text-align: center; 
      margin-bottom: 20px; 
      position: relative;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 15px;
    }
    
    .logo-container {
      text-align: center;
      margin-bottom: 10px;
    }
    
    .logo {
      max-width: 200px;
      max-height: 60px;
    }
    
    .header h1 { 
      margin: 5px 0; 
      font-size: 1.5em;
      color: #1e40af;
    }
    
    .header h2 { 
      margin: 10px 0 5px 0; 
      font-size: 1.3em;
      color: #1e40af;
    }
    
    .version-badge { 
      position: absolute; 
      top: 0; 
      right: 0; 
      background: #2563eb; 
      color: white; 
      padding: 6px 12px; 
      border-radius: 4px; 
      font-size: 0.95em; 
      font-weight: bold;
    }
    
    .header .meta { 
      font-size: 0.85em; 
      color: #666; 
      margin-top: 5px; 
    }
    
    .section { 
      margin-bottom: 15px;
      page-break-inside: avoid;
    }
    
    .section h2 { 
      font-size: 1.1em; 
      border-bottom: 1px solid #999; 
      padding-bottom: 3px;
      margin-bottom: 10px;
      color: #1e40af;
    }
    
    .info-grid { 
      display: grid; 
      grid-template-columns: 160px 1fr; 
      gap: 6px 10px;
      font-size: 0.9em;
    }
    
    .info-label { 
      font-weight: bold;
      color: #333;
    }
    
    .status-flags { 
      margin: 10px 0;
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }
    
    .chip { 
      display: inline-block; 
      padding: 4px 10px; 
      background: #e5e7eb; 
      border-radius: 12px; 
      font-size: 0.85em;
      font-weight: 500;
      color: #374151;
    }
    
    .chip.urgent {
      background: #fee2e2;
      color: #991b1b;
      font-weight: bold;
    }
    
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-top: 10px;
      font-size: 0.85em;
    }
    
    th, td { 
      border: 1px solid #d1d5db; 
      padding: 6px 4px; 
      text-align: left;
      vertical-align: top;
      word-wrap: break-word;
    }
    
    th { 
      background-color: #f3f4f6; 
      font-weight: bold;
      color: #1f2937;
      font-size: 0.9em;
    }
    
    .method-name, .spec-range {
      font-size: 0.85em;
      color: #6b7280;
    }
    
    .oos-yes {
      background-color: #fef2f2;
      color: #991b1b;
      font-weight: bold;
    }
    
    .comments-cell {
      max-width: 120px;
      word-wrap: break-word;
      overflow-wrap: break-word;
      hyphens: auto;
    }
    
    .footer { 
      margin-top: 30px;
      font-size: 0.85em;
      border-top: 1px solid #d1d5db;
      padding-top: 15px;
    }
    
    .signatures { 
      display: flex; 
      justify-content: space-between; 
      margin: 30px 0 20px 0;
    }
    
    .signature { 
      width: 45%;
      text-align: center;
    }
    
    .signature-line { 
      border-top: 1px solid #000; 
      margin-top: 40px; 
      padding-top: 5px;
      font-weight: bold;
    }
    
    .disclaimer {
      font-size: 0.8em;
      color: #6b7280;
      font-style: italic;
      margin-top: 20px;
      padding: 10px;
      background-color: #f9fafb;
      border-left: 3px solid #9ca3af;
    }
    
    .page-number {
      text-align: center;
      margin-top: 20px;
      font-size: 0.85em;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="version-badge">Version ${reportMetadata.version}</div>
    ${reportMetadata.labLogoUrl ? `<div class="logo-container"><img src="${reportMetadata.labLogoUrl}" alt="Lab Logo" class="logo" /></div>` : ''}
    <h1>${reportMetadata.labName || 'Laboratory LIMS Pro'}</h1>
    <h2>Certificate of Analysis</h2>
    <div class="meta">Report Date: ${new Date(reportMetadata.generatedAt).toLocaleDateString()}</div>
  </div>

  <div class="section">
    <h2>Client Information</h2>
    <div class="info-grid">
      ${clientInfo}
    </div>
  </div>

  <div class="section">
    <h2>${getLabel('sampleInformation', 'Sample Information')}</h2>
    <div class="info-grid">
      ${isVisible('jobNumber') ? `<div class="info-label">${getLabel('jobNumber', 'Job Number')}:</div><div>${sample.jobNumber}</div>` : ''}
      ${isVisible('sampleCode') ? `<div class="info-label">${getLabel('sampleCode', 'Sample Code')}:</div><div>${sample.sampleCode}</div>` : ''}
      ${isVisible('sampleDescription') ? `<div class="info-label">${getLabel('sampleDescription', 'Description')}:</div><div>${sample.sampleDescription || 'N/A'}</div>` : ''}
      ${isVisible('uinCode') ? `<div class="info-label">${getLabel('uinCode', 'UIN Code')}:</div><div>${sample.uinCode || 'N/A'}</div>` : ''}
      ${isVisible('sampleBatch') ? `<div class="info-label">${getLabel('sampleBatch', 'Batch')}:</div><div>${sample.sampleBatch || 'N/A'}</div>` : ''}
      ${isVisible('dateReceived') ? `<div class="info-label">${getLabel('dateReceived', 'Date Received')}:</div><div>${new Date(sample.dateReceived).toLocaleDateString()}</div>` : ''}
      ${isVisible('dateDue') ? `<div class="info-label">${getLabel('dateDue', 'Date Due')}:</div><div>${sample.dateDue ? new Date(sample.dateDue).toLocaleDateString() : 'N/A'}</div>` : ''}
      ${isVisible('needByDate') ? `<div class="info-label">${getLabel('needByDate', 'Need By Date')}:</div><div>${sample.needByDate ? new Date(sample.needByDate).toLocaleDateString() : 'N/A'}</div>` : ''}
      ${isVisible('mcdDate') ? `<div class="info-label">${getLabel('mcdDate', 'MCD Date')}:</div><div>${sample.mcdDate ? new Date(sample.mcdDate).toLocaleDateString() : 'N/A'}</div>` : ''}
      ${isVisible('releaseDate') ? `<div class="info-label">${getLabel('releaseDate', 'Release Date')}:</div><div>${sample.releaseDate ? new Date(sample.releaseDate).toLocaleDateString() : 'N/A'}</div>` : ''}
      ${isVisible('rmSupplier') ? `<div class="info-label">${getLabel('rmSupplier', 'RM Supplier')}:</div><div>${sample.rmSupplier || 'N/A'}</div>` : ''}
      ${isVisible('temperatureOnReceiptC') ? `<div class="info-label">${getLabel('temperatureOnReceiptC', 'Temperature on Receipt')}:</div><div>${sample.temperatureOnReceiptC ? sample.temperatureOnReceiptC + '°C' : 'N/A'}</div>` : ''}
      ${isVisible('storageConditions') ? `<div class="info-label">${getLabel('storageConditions', 'Storage Conditions')}:</div><div>${sample.storageConditions || 'N/A'}</div>` : ''}
      ${isVisible('comments') && sample.comments ? `<div class="info-label">${getLabel('comments', 'Comments')}:</div><div>${sample.comments}</div>` : ''}
    </div>
    ${statusFlagsHTML}
  </div>

  <div class="section">
    <h2>${getLabel('testResults', 'Test Results')}</h2>
    <table>
      <thead>
        <tr>
          ${tableHeaders}
        </tr>
      </thead>
      <tbody>
        ${testsTableRows}
      </tbody>
    </table>
  </div>

  <div class="signatures">
    <div class="signature">
      <div class="signature-line">Prepared By</div>
      <div>${reportMetadata.generatedBy}</div>
      <div>${new Date(reportMetadata.generatedAt).toLocaleDateString()}</div>
    </div>
    <div class="signature">
      <div class="signature-line">Reviewed By</div>
      <div>&nbsp;</div>
      <div>Date: _______________</div>
    </div>
  </div>

  <div class="footer">
    <div class="disclaimer">
      ${reportMetadata.disclaimerText}
    </div>
    <div class="page-number">Page 1 of 1</div>
  </div>
</body>
</html>
    `.trim();
}
