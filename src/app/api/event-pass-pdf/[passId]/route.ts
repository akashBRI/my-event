// src/app/api/event-pass-pdf/[passId]/route.ts
import { NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts, PageSizes, degrees } from 'pdf-lib';
import QRCode from 'qrcode';
import prisma from '@/lib/prisma';
import bwipjs from 'bwip-js';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import fs from 'fs/promises'; // Import Node.js file system promises
import path from 'path'; // Import Node.js path module

// Force this route to be dynamic to prevent static generation issues
export const dynamic = 'force-dynamic';

interface Params {
  params: { passId: string };
}

export async function GET(req: Request, { params }: Params) {
  const { passId } = params;

  if (!passId) {
    return NextResponse.json({ error: 'Pass ID is required.' }, { status: 400 });
  }

  try {
    // 1. Fetch registration details from the database
    const registration = await prisma.eventRegistration.findUnique({
      where: { passId },
      include: {
        user: true, // Include user details
        event: true, // Include event details
        selectedOccurrences: { // Include the specific occurrences selected by the user
          include: {
            occurrence: true,
          },
          orderBy: {
            occurrence: {
              startTime: 'asc'
            }
          }
        }
      },
    });

    if (!registration) {
      return NextResponse.json({ error: 'Pass not found or invalid.' }, { status: 404 });
    }

    // 2. Generate QR Code as a PNG image buffer, encoding the passId
    const qrCodeImageBuffer = await QRCode.toBuffer(registration.passId, {
      errorCorrectionLevel: 'H',
      type: 'png',
      scale: 8,
    });

    // 3. Generate Barcode as a PNG image buffer using bwip-js
    let barcodeImageBuffer: Buffer;
    try {
      barcodeImageBuffer = await bwipjs.toBuffer({
        bcid: 'code128',
        text: registration.passId,
        scaleX: 2,
        scaleY: 2,
        height: 10,
        includetext: false,
        textxalign: 'center',
      });
    } catch (e) {
      console.error("Error generating barcode:", e);
      barcodeImageBuffer = await bwipjs.toBuffer({ bcid: 'code128', text: 'ERROR', scaleX: 1, scaleY: 1, height: 5, includetext: false });
    }

    // 4. Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage(PageSizes.A4);
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    // Convert Node.js Buffer to Uint8Array for pdf-lib compatibility
    const qrImage = await pdfDoc.embedPng(Uint8Array.from(qrCodeImageBuffer));
    const barcodeImage = await pdfDoc.embedPng(Uint8Array.from(barcodeImageBuffer));

    let headerImage: any = null;
    const publicImagePath = path.join(process.cwd(), 'public', 'pdf.png');
    try {
        // Check if the file exists before attempting to read it
        await fs.access(publicImagePath, fs.constants.F_OK);
        const headerImageBytes = await fs.readFile(publicImagePath);
        // Corrected: Convert headerImageBytes Buffer to Uint8Array
        headerImage = await pdfDoc.embedPng(Uint8Array.from(headerImageBytes));
    } catch (e: any) {
        console.warn(`Failed to load header image 'public/pdf.png'. Path: ${publicImagePath}. Error Type: ${e.code || 'Unknown'}. Message: ${e.message}`);
        // Fallback behavior if image fails to load (a simple blue rectangle with text as a placeholder)
    }


    // Function to draw a single badge within a given bounding box (relative coordinates)
    const drawBadge = (
      targetPage: any,
      offsetX: number,
      offsetY: number,
      badgeQuadWidth: number,
      badgeQuadHeight: number,
      reg: typeof registration,
      headerImg: any,
      qrImg: any,
      barcodeImg: any,
      regFont: any,
      regBoldFont: any
    ) => {
      const internalPadding = 10;

      // Draw header image (scaled to fit badgeQuadWidth)
      const headerImageHeightDesired = 70;
      if (headerImg) {
        targetPage.drawImage(headerImg, {
          x: offsetX + internalPadding,
          y: (offsetY + badgeQuadHeight) - internalPadding - headerImageHeightDesired,
          width: badgeQuadWidth - (2 * internalPadding),
          height: headerImageHeightDesired,
        });
      } else {
        // Fallback for header image - draw blue rect and text
        targetPage.drawRectangle({
            x: offsetX + internalPadding,
            y: (offsetY + badgeQuadHeight) - internalPadding - headerImageHeightDesired,
            width: badgeQuadWidth - (2 * internalPadding),
            height: headerImageHeightDesired,
            color: rgb(0.1, 0.1, 0.4),
        });
        targetPage.drawText('YOU ARE INVITED TO AV INTEGRATION DISCOVERY DAY', {
            x: offsetX + badgeQuadWidth / 2,
            y: (offsetY + badgeQuadHeight) - internalPadding - headerImageHeightDesired / 2 + 10,
            font: regBoldFont,
            size: 8,
            color: rgb(1, 1, 1),
            lineHeight: 10,
            textAlign: 'center',
        });
        targetPage.drawText('BLUE RHINE INDUSTRIES\nCustomer Day and Networking\nJune 19th and 20th 2025', {
            x: offsetX + badgeQuadWidth - internalPadding - 5,
            y: (offsetY + badgeQuadHeight) - internalPadding - headerImageHeightDesired / 2 + 5,
            font: regFont,
            size: 6,
            color: rgb(1, 1, 1),
            lineHeight: 8,
            textAlign: 'right',
        });
      }
      
      let currentY = (offsetY + badgeQuadHeight) - internalPadding - headerImageHeightDesired - 50;

      // Attendee Name (Uppercase, Centered manually)
      const attendeeName = `${reg.user.firstName || ''} ${reg.user.lastName || ''}`.trim().toUpperCase();
      const attendeeNameWidth = regBoldFont.widthOfTextAtSize(attendeeName, 18);
      targetPage.drawText(attendeeName, {
        x: offsetX + (badgeQuadWidth / 2) - (attendeeNameWidth / 2),
        y: currentY,
        font: regBoldFont,
        size: 18,
        color: rgb(0, 0, 0),
      });
      currentY -= 25;

      // Company (Uppercase, Centered manually)
      const companyName = (reg.user.company || '').toUpperCase();
      const companyNameWidth = regFont.widthOfTextAtSize(companyName, 14);
      targetPage.drawText(companyName, {
        x: offsetX + (badgeQuadWidth / 2) - (companyNameWidth / 2),
        y: currentY,
        font: regFont,
        size: 14,
        color: rgb(0.2, 0.2, 0.2),
      });
      currentY -= 40;

      // QR Code and Barcode positioning
      const qrCodeSize = 100;
      const barcodeWidthDesired = 100;
      const barcodeHeightDesired = 20;

      const combinedWidth = qrCodeSize + barcodeWidthDesired + 20;
      const startXCombined = offsetX + (badgeQuadWidth / 2) - (combinedWidth / 2);

      // QR Code (Right of center block)
      targetPage.drawImage(qrImg, {
        x: startXCombined + barcodeWidthDesired + 20,
        y: currentY - qrCodeSize,
        width: qrCodeSize,
        height: qrCodeSize,
      });

      // Barcode Image (Left of center block)
      const barcodeX = startXCombined;
      const barcodeY = currentY - barcodeHeightDesired - 35;
      targetPage.drawImage(barcodeImg, {
        x: barcodeX,
        y: barcodeY,
        width: barcodeWidthDesired,
        height: barcodeHeightDesired,
      });
      
      // Pass ID text below barcode (Centered manually under barcode)
      const passIdText = reg.passId;
      const passIdTextWidth = regFont.widthOfTextAtSize(passIdText, 10);
      targetPage.drawText(passIdText, {
        x: barcodeX + (barcodeWidthDesired / 2) - (passIdTextWidth / 2),
        y: barcodeY - 15,
        font: regFont,
        size: 10,
        color: rgb(0, 0, 0),
      });

      currentY -= (qrCodeSize + 35);

      // VISITOR text (at the bottom center of the badge quadrant, centered manually)
      const visitorText = 'VISITOR';
      const visitorTextWidth = regBoldFont.widthOfTextAtSize(visitorText, 28);
      targetPage.drawText(visitorText, {
        x: offsetX + (badgeQuadWidth / 2) - (visitorTextWidth / 2),
        y: offsetY + internalPadding + 30,
        font: regBoldFont,
        size: 28,
        color: rgb(0.1, 0.1, 0.4),
      });
    };

    // Calculate dimensions for each quarter
    const quarterWidth = width / 2;
    const quarterHeight = height / 2;

    // Draw the main background white rectangle for the entire page
    page.drawRectangle({
      x: 0,
      y: 0,
      width: width,
      height: height,
      color: rgb(1, 1, 1),
      borderWidth: 0,
    });

    // --- Draw the two passes in the top half ---
    // Pass 1 (Top-Left Quarter)
    drawBadge(page, 0, height - quarterHeight, quarterWidth, quarterHeight, registration, headerImage, qrImage, barcodeImage, font, boldFont);

    // Pass 2 (Top-Right Quarter)
    drawBadge(page, quarterWidth, height - quarterHeight, quarterWidth, quarterHeight, registration, headerImage, qrImage, barcodeImage, font, boldFont);


    // --- Draw the cut lines (dashed) ---
    const cutLineColor = rgb(0.7, 0.7, 0.7);
    const cutLineThickness = 1;
    const cutLineDashArray = [5, 5];
    const cutLineOpacity = 0.7;

    // Horizontal dashed line in the middle
    page.drawLine({
      start: { x: 0, y: height / 2 },
      end: { x: width, y: height / 2 },
      color: cutLineColor,
      thickness: cutLineThickness,
      dashArray: cutLineDashArray,
      opacity: cutLineOpacity,
    });

    // Vertical dashed line in the middle
    page.drawLine({
      start: { x: width / 2, y: 0 },
      end: { x: width / 2, y: height },
      color: cutLineColor,
      thickness: cutLineThickness,
      dashArray: cutLineDashArray,
      opacity: cutLineOpacity,
    });

    // --- Add "FRONT", "BACK", "FOLD" text and arrow ---
    const indicatorFontSize = 8;
    const indicatorColor = rgb(0.5, 0.5, 0.5); // Gray color
    const textGap = 5; // Gap between text and line

    // "FRONT" text (top-left of the cross area)
    page.drawText('FRONT', {
      x: width / 2 - 55, // Adjust X to position it on the left of vertical line
      y: height / 2 + textGap, // Adjust Y to position it above horizontal line
      font: boldFont,
      size: indicatorFontSize,
      color: indicatorColor
    });

    // "BACK" text (bottom-left of the cross area, rotated 180 degrees)
    const backText = 'BACK';
    const backTextWidth = boldFont.widthOfTextAtSize(backText, indicatorFontSize );
    const backTextHeight = boldFont.heightAtSize(indicatorFontSize);
    
    page.drawText(backText, {
        x: (width / 2 - 7) - backTextWidth,
        y: (height / 2 - 5),
        font: boldFont,
        size: indicatorFontSize,
        color: indicatorColor,
        rotate: degrees(180)
    });


    // "FOLD" text (top-right of the cross area, rotated 90 degrees)
    const foldText = 'FOLD';
    const foldTextWidth = boldFont.widthOfTextAtSize(foldText, indicatorFontSize);
    const foldTextHeight = boldFont.heightAtSize(indicatorFontSize);

    page.drawText(foldText, {
        x: width / 2 + textGap + foldTextHeight - 10,
        y: height / 2 + (foldTextWidth / 2) - foldTextWidth + 15,
        font: boldFont,
        size: indicatorFontSize,
        color: indicatorColor,
        rotate: degrees(90)
    });


    // Arrow pointing to the right (near FOLD text)
    const arrowStartX = width / 2 + 10;
    const arrowStartY = height / 2 + 15;
    const arrowSize = 5;
    page.drawLine({
        start: { x: arrowStartX, y: arrowStartY },
        end: { x: arrowStartX + 15, y: arrowStartY },
        color: indicatorColor,
        thickness: 1,
    });
    // Arrowhead (right-pointing)
    page.drawLine({
        start: { x: arrowStartX + 15, y: arrowStartY },
        end: { x: arrowStartX + 10, y: arrowStartY + arrowSize },
        color: indicatorColor,
        thickness: 1,
    });
    page.drawLine({
        start: { x: arrowStartX + 15, y: arrowStartY },
        end: { x: arrowStartX + 10, y: arrowStartY - arrowSize },
        color: indicatorColor,
        thickness: 1,
    });


    // 5. Serialize the PDF to bytes
    const pdfBytes = await pdfDoc.save();

    // 6. Create a NextResponse with the PDF bytes
    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="event-pass-${passId}.pdf"`,
      },
    });

  } catch (error: unknown) {
    console.error(`Error generating PDF for pass ID ${passId}:`, error);
    if (error instanceof PrismaClientKnownRequestError) {
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: `An unexpected error occurred: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
