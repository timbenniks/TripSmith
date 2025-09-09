export interface PDFExportOptions {
  content: string;
  filename?: string;
  tripDestination?: string;
}

/**
 * Load image and convert to base64 data URL
 */
async function loadImageAsBase64(imagePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = img.width;
      canvas.height = img.height;

      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      } else {
        reject(new Error('Could not get canvas context'));
      }
    };

    img.onerror = () => {
      reject(new Error(`Failed to load image: ${imagePath}`));
    };

    img.src = imagePath;
  });
}

/**
 * Test function to verify PDF libraries are working
 */
export async function testPDFLibraries(): Promise<boolean> {
  try {
    console.log("Testing PDF libraries...");
    const jsPDF = (await import("jspdf")).default;
    const html2canvas = (await import("html2canvas")).default;

    console.log("jsPDF loaded:", typeof jsPDF);
    console.log("html2canvas loaded:", typeof html2canvas);

    // Create a simple test PDF
    const pdf = new jsPDF();
    pdf.text("Test PDF", 10, 10);

    console.log("PDF libraries test successful");
    return true;
  } catch (error) {
    console.error("PDF libraries test failed:", error);
    return false;
  }
}

/**
 * Convert markdown content to styled HTML for better PDF rendering
 */
function markdownToHTML(content: string): string {
  return content
    // Remove markdown code blocks and language indicators
    .replace(/```[a-zA-Z]*\n?/g, '')
    .replace(/```/g, '')
    // Remove horizontal rules
    .replace(/^---+$/gm, '')
    .replace(/^\*\*\*+$/gm, '')
    .replace(/^___+$/gm, '')
    // Headers
    .replace(/^### (.*$)/gim, '<h3 style="color: #333333; font-size: 16px; font-weight: bold; margin: 20px 0 10px 0; border-bottom: 1px solid #6366f1; padding-bottom: 5px;">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 style="color: #333333; font-size: 18px; font-weight: bold; margin: 25px 0 15px 0; border-bottom: 2px solid #6366f1; padding-bottom: 8px;">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 style="color: #333333; font-size: 20px; font-weight: bold; margin: 30px 0 20px 0; border-bottom: 3px solid #6366f1; padding-bottom: 10px;">$1</h1>')
    // Bold text
    .replace(/\*\*(.*?)\*\*/gim, '<strong style="color: #333333; font-weight: bold;">$1</strong>')
    // Italic text
    .replace(/\*(.*?)\*/gim, '<em style="color: #555555; font-style: italic;">$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" style="color: #6366f1; text-decoration: underline;">$1</a>')
    // Tables - basic table conversion
    .replace(/\|(.+)\|\n\|([:\-\s\|]+)\|\n((?:\|.+\|\n?)*)/g, (match, headerRow, separatorRow, bodyRows) => {
      const headers = headerRow.split('|').map((h: string) => h.trim()).filter((h: string) => h);
      const rows = bodyRows.trim().split('\n').map((row: string) =>
        row.split('|').map((cell: string) => cell.trim()).filter((cell: string) => cell)
      );

      let tableHtml = '<table style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #d1d5db;">';

      // Header
      tableHtml += '<thead style="background-color: #f3f4f6;"><tr>';
      headers.forEach((header: string) => {
        tableHtml += `<th style="padding: 12px; text-align: left; color: #333333; border: 1px solid #d1d5db; font-weight: bold;">${header}</th>`;
      });
      tableHtml += '</tr></thead>';

      // Body
      tableHtml += '<tbody>';
      rows.forEach((row: string[], index: number) => {
        if (row.length > 0) {
          const bgColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';
          tableHtml += `<tr style="background-color: ${bgColor};">`;
          row.forEach((cell: string) => {
            tableHtml += `<td style="padding: 10px; color: #555555; border: 1px solid #d1d5db; font-size: 13px;">${cell}</td>`;
          });
          tableHtml += '</tr>';
        }
      });
      tableHtml += '</tbody></table>';

      return tableHtml;
    })
    // Lists - handle both * and - bullets
    .replace(/^[\*\-] (.*$)/gim, '<li style="color: #555555; margin: 5px 0; padding-left: 10px;">$1</li>')
    // Remove extra whitespace and clean up
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Multiple line breaks to double
    // Line breaks and paragraphs
    .replace(/\n\n/g, '</p><p style="margin: 15px 0; color: #555555; line-height: 1.6;">')
    .replace(/\n/g, '<br/>');
}

/**
 * Export itinerary content as a styled PDF using a CSS-isolated approach
 */
export async function exportToPDF({ content, filename, tripDestination }: PDFExportOptions): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("PDF export is only available in browser environment");
  }

  try {
    console.log("Starting PDF export...");

    // Import libraries dynamically to avoid SSR issues
    const jsPDF = (await import("jspdf")).default;
    const html2canvas = (await import("html2canvas")).default;

    console.log("PDF libraries loaded successfully");

    // Load the TripSmith logo
    let logoDataUrl = '';
    try {
      logoDataUrl = await loadImageAsBase64('/images/tripsmith-logo.png');
      console.log("Logo loaded successfully");
    } catch (error) {
      console.log("Failed to load logo, using fallback:", error);
      // Fallback: create a simple gradient circle with airplane emoji
      logoDataUrl = 'data:image/svg+xml;base64,' + btoa(`
        <svg width="60" height="60" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#a855f7;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#6366f1;stop-opacity:1" />
            </linearGradient>
          </defs>
          <circle cx="30" cy="30" r="30" fill="url(#grad)" />
          <text x="30" y="40" font-family="Arial" font-size="24" fill="white" text-anchor="middle">✈</text>
        </svg>
      `);
    }

    // Create an iframe to completely isolate the content from the main page CSS
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-10000px';
    iframe.style.top = '0';
    iframe.style.width = '800px';
    iframe.style.height = '600px';
    iframe.style.border = 'none';
    iframe.style.zIndex = '-1000';

    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error("Could not access iframe document");
    }

    // Convert markdown to HTML using the existing function
    const htmlContent = markdownToHTML(content);

    // Write complete HTML with inline styles to the iframe
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            width: 800px;
            padding: 40px;
            background-color: #ffffff;
            color: #333333;
            font-family: Arial, sans-serif;
            font-size: 14px;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #6366f1;
            padding-bottom: 20px;
          }
          .logo {
            width: 60px;
            height: 60px;
            margin: 0 auto 15px auto;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .logo img {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            object-fit: cover;
          }
          .header h1 {
            color: #6366f1;
            font-size: 28px;
            margin: 0 0 10px 0;
            font-weight: bold;
          }
          .header h2 {
            color: #333333;
            font-size: 20px;
            margin: 0 0 15px 0;
            font-weight: normal;
          }
          .header p {
            color: #666666;
            margin: 0;
            font-size: 14px;
          }
          .content {
            color: #555555;
          }
          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #6366f1;
            text-align: center;
          }
          .footer p {
            color: #6366f1;
            font-size: 12px;
            margin: 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            border: 1px solid #d1d5db;
          }
          th {
            padding: 12px;
            text-align: left;
            color: #333333;
            border: 1px solid #d1d5db;
            font-weight: bold;
            background-color: #f3f4f6;
          }
          td {
            padding: 10px;
            color: #555555;
            border: 1px solid #d1d5db;
            font-size: 13px;
          }
          tr:nth-child(even) {
            background-color: #f9fafb;
          }
          tr:nth-child(odd) {
            background-color: #ffffff;
          }
          h1, h2, h3 {
            color: #333333;
            margin: 20px 0 10px 0;
          }
          strong {
            color: #333333;
            font-weight: bold;
          }
          em {
            color: #555555;
            font-style: italic;
          }
          a {
            color: #6366f1;
            text-decoration: underline;
          }
          li {
            color: #555555;
            margin: 5px 0;
            padding-left: 10px;
          }
          ul, ol {
            margin: 10px 0;
            padding-left: 20px;
          }
          p {
            margin: 10px 0;
            color: #555555;
            line-height: 1.6;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">
            <img src="${logoDataUrl}" alt="TripSmith Logo" />
          </div>
          <h1>TripSmith Itinerary</h1>
          ${tripDestination ? `<h2>${tripDestination}</h2>` : ''}
          <p>Generated on ${new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}</p>
        </div>
        <div class="content">
          <p style="margin: 15px 0; color: #555555; line-height: 1.6;">${htmlContent}</p>
        </div>
        <div class="footer">
          <p>Created with TripSmith AI Travel Planner</p>
        </div>
      </body>
      </html>
    `);
    iframeDoc.close();

    console.log("Iframe content created");

    // Wait for the iframe to load
    await new Promise(resolve => setTimeout(resolve, 300));

    // Create canvas from the iframe body
    const canvas = await html2canvas(iframeDoc.body, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      width: 800,
      height: iframeDoc.body.scrollHeight,
    });

    console.log("Canvas created successfully, size:", canvas.width, "x", canvas.height);

    // Remove iframe
    document.body.removeChild(iframe);

    // Convert canvas to image data
    const imgData = canvas.toDataURL("image/png");
    console.log("Image data created, length:", imgData.length);

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    console.log("PDF document initialized");

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const canvasAspectRatio = canvas.height / canvas.width;
    const imgWidth = pdfWidth - 20; // 10mm margin on each side
    const imgHeight = imgWidth * canvasAspectRatio;

    let yPosition = 10; // Start 10mm from top
    const maxPageHeight = pdfHeight - 20; // 10mm margin on bottom

    // If image fits on one page
    if (imgHeight <= maxPageHeight) {
      pdf.addImage(imgData, "PNG", 10, yPosition, imgWidth, imgHeight);
    } else {
      // Split across multiple pages
      const pageCount = Math.ceil(imgHeight / maxPageHeight);

      for (let i = 0; i < pageCount; i++) {
        if (i > 0) {
          pdf.addPage();
        }

        const sourceY = (i * maxPageHeight) / imgHeight * canvas.height;
        const sourceHeight = Math.min(maxPageHeight / imgHeight * canvas.height, canvas.height - sourceY);

        // Create a temporary canvas for this page slice
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceHeight;
        const pageCtx = pageCanvas.getContext('2d');

        if (pageCtx) {
          pageCtx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
          const pageImgData = pageCanvas.toDataURL("PNG");
          const pageImgHeight = (sourceHeight / canvas.height) * imgHeight;
          pdf.addImage(pageImgData, "PNG", 10, 10, imgWidth, pageImgHeight);
        }
      }
    }

    // Generate filename
    const defaultFilename = tripDestination ?
      `${tripDestination.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_itinerary.pdf` :
      'tripsmith_itinerary.pdf';

    console.log("Saving PDF with filename:", filename || defaultFilename);

    // Save the PDF
    pdf.save(filename || defaultFilename);

    console.log("PDF export completed successfully");

  } catch (error) {
    console.error("Detailed error in PDF generation:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}