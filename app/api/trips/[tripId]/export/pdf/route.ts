import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { normalizeItineraryToEvents } from '@/lib/export-normalizer';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Helper function to sanitize text for PDF rendering (WinAnsi encoding)
function sanitizeTextForPdf(text: string): string {
  return text
    .replace(/→/g, '->')  // Arrow character to ASCII
    .replace(/←/g, '<-')
    .replace(/–/g, '-')   // En dash to hyphen
    .replace(/—/g, '--')  // Em dash to double hyphen
    .replace(/"/g, '"')   // Smart quotes to regular quotes
    .replace(/"/g, '"')
    .replace(/'/g, "'")   // Smart apostrophes to regular
    .replace(/'/g, "'")
    .replace(/…/g, '...') // Ellipsis to three dots
    .replace(/[^\x00-\x7F]/g, '?'); // Replace any remaining non-ASCII with ?
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    const supabase = await getServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch trip with ownership check
    const { data: trip, error } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .eq('user_id', user.id)
      .single();

    if (error || !trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    if (!trip.itinerary_data) {
      return NextResponse.json(
        { error: 'No itinerary data available for export' },
        { status: 400 }
      );
    }

    // Normalize itinerary to events
    const normalized = normalizeItineraryToEvents(trip.itinerary_data);

    // Generate PDF
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage([612, 792]); // US Letter size
    let yPosition = 750;
    const margin = 50;
    const lineHeight = 20;

    // Helper to add new page if needed
    const checkPageSpace = (neededLines: number = 1) => {
      if (yPosition - (neededLines * lineHeight) < margin) {
        page = pdfDoc.addPage([612, 792]);
        yPosition = 750;
      }
    };

    // Title
    page.drawText(sanitizeTextForPdf('Trip Itinerary'), {
      x: margin,
      y: yPosition,
      size: 24,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 40;

    // Trip metadata
    if (normalized.meta.destination) {
      page.drawText(sanitizeTextForPdf(`Destination: ${normalized.meta.destination}`), {
        x: margin,
        y: yPosition,
        size: 14,
        font: boldFont,
      });
      yPosition -= lineHeight;
    }

    if (normalized.meta.dateRangeText) {
      page.drawText(sanitizeTextForPdf(`Dates: ${normalized.meta.dateRangeText}`), {
        x: margin,
        y: yPosition,
        size: 12,
        font,
      });
      yPosition -= lineHeight;
    }

    if (normalized.meta.travelerName) {
      page.drawText(sanitizeTextForPdf(`Traveler: ${normalized.meta.travelerName}`), {
        x: margin,
        y: yPosition,
        size: 12,
        font,
      });
      yPosition -= lineHeight;
    }

    yPosition -= 20; // Extra space

    // Events by category
    const categories = ['flight', 'accommodation', 'activity'] as const;

    for (const category of categories) {
      const categoryEvents = normalized.events.filter(e => e.category === category);
      if (categoryEvents.length === 0) continue;

      checkPageSpace(2);

      // Category header
      const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1) + 's';
      page.drawText(sanitizeTextForPdf(categoryTitle), {
        x: margin,
        y: yPosition,
        size: 16,
        font: boldFont,
        color: rgb(0.2, 0.2, 0.8),
      });
      yPosition -= 30;

      for (const event of categoryEvents) {
        checkPageSpace(3);

        // Event title
        page.drawText(sanitizeTextForPdf(event.title), {
          x: margin + 10,
          y: yPosition,
          size: 12,
          font: boldFont,
        });
        yPosition -= lineHeight;

        // Event date/time
        const dateStr = event.allDay
          ? event.start.toLocaleDateString()
          : `${event.start.toLocaleDateString()} ${event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

        page.drawText(sanitizeTextForPdf(`Date: ${dateStr}`), {
          x: margin + 20,
          y: yPosition,
          size: 10,
          font,
          color: rgb(0.4, 0.4, 0.4),
        });
        yPosition -= lineHeight;

        // Location if available
        if (event.location) {
          page.drawText(sanitizeTextForPdf(`Location: ${event.location}`), {
            x: margin + 20,
            y: yPosition,
            size: 10,
            font,
            color: rgb(0.4, 0.4, 0.4),
          });
          yPosition -= lineHeight;
        }

        // Notes if available
        if (event.notes) {
          page.drawText(sanitizeTextForPdf(`Notes: ${event.notes}`), {
            x: margin + 20,
            y: yPosition,
            size: 10,
            font,
            color: rgb(0.4, 0.4, 0.4),
          });
          yPosition -= lineHeight;
        }

        yPosition -= 10; // Space between events
      }

      yPosition -= 20; // Space between categories
    }

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    // Return PDF as download
    const filename = `${normalized.meta.destination?.replace(/[^a-zA-Z0-9]/g, '_') || 'trip'}_itinerary.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBytes.length.toString(),
      },
    });

  } catch (error) {
    console.error('PDF export error:', error);
    console.error('PDF export error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
