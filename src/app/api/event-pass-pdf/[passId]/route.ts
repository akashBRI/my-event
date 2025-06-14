// src/app/api/event-pass-pdf/[passId]/route.ts

// ✅ These two lines are critical for preventing static analysis during build
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts, PageSizes, degrees } from 'pdf-lib';
import QRCode from 'qrcode';
import prisma from '@/lib/prisma';
import bwipjs from 'bwip-js';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import fs from 'fs/promises';
import path from 'path';

interface Params {
  params: { passId: string };
}

export async function GET(req: Request, { params }: Params) {
  const { passId } = params;

  if (!passId) {
    return NextResponse.json({ error: 'Pass ID is required.' }, { status: 400 });
  }

  try {
    const registration = await prisma.eventRegistration.findUnique({
      where: { passId },
      include: {
        user: true,
        event: true,
        selectedOccurrences: {
          include: { occurrence: true },
          orderBy: { occurrence: { startTime: 'asc' } },
        },
      },
    });

    if (!registration) {
      return NextResponse.json({ error: 'Pass not found or invalid.' }, { status: 404 });
    }

    const qrCodeImageBuffer = await QRCode.toBuffer(registration.passId, {
      errorCorrectionLevel: 'H',
      type: 'png',
      scale: 8,
    });

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
      barcodeImageBuffer = await bwipjs.toBuffer({
        bcid: 'code128',
        text: 'ERROR',
        scaleX: 1,
        scaleY: 1,
        height: 5,
        includetext: false
      });
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage(PageSizes.A4);
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const qrImage = await pdfDoc.embedPng(Uint8Array.from(qrCodeImageBuffer));
    const barcodeImage = await pdfDoc.embedPng(Uint8Array.from(barcodeImageBuffer));

    let headerImage: any = null;
    const publicImagePath = path.join(process.cwd(), 'public', 'pdf.png');
    try {
      await fs.access(publicImagePath, fs.constants.F_OK);
      const headerImageBytes = await fs.readFile(publicImagePath);
      headerImage = await pdfDoc.embedPng(Uint8Array.from(headerImageBytes));
    } catch (e: any) {
      console.warn(`Header image not found or unreadable: ${e.message}`);
    }

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

      const headerImageHeightDesired = 70;
      if (headerImg) {
        targetPage.drawImage(headerImg, {
          x: offsetX + internalPadding,
          y: (offsetY + badgeQuadHeight) - internalPadding - headerImageHeightDesired,
          width: badgeQuadWidth - (2 * internalPadding),
          height: headerImageHeightDesired,
        });
      }

      let currentY = (offsetY + badgeQuadHeight) - internalPadding - headerImageHeightDesired - 50;

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

      const qrCodeSize = 100;
      const barcodeWidthDesired = 100;
      const barcodeHeightDesired = 20;
      const combinedWidth = qrCodeSize + barcodeWidthDesired + 20;
      const startXCombined = offsetX + (badgeQuadWidth / 2) - (combinedWidth / 2);

      targetPage.drawImage(qrImg, {
        x: startXCombined + barcodeWidthDesired + 20,
        y: currentY - qrCodeSize,
        width: qrCodeSize,
        height: qrCodeSize,
      });

      const barcodeX = startXCombined;
      const barcodeY = currentY - barcodeHeightDesired - 35;
      targetPage.drawImage(barcodeImg, {
        x: barcodeX,
        y: barcodeY,
        width: barcodeWidthDesired,
        height: barcodeHeightDesired,
      });

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

    const quarterWidth = width / 2;
    const quarterHeight = height / 2;

    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(1, 1, 1),
    });

    drawBadge(page, 0, height - quarterHeight, quarterWidth, quarterHeight, registration, headerImage, qrImage, barcodeImage, font, boldFont);
    drawBadge(page, quarterWidth, height - quarterHeight, quarterWidth, quarterHeight, registration, headerImage, qrImage, barcodeImage, font, boldFont);

    const cutLineColor = rgb(0.7, 0.7, 0.7);
    page.drawLine({
      start: { x: 0, y: height / 2 },
      end: { x: width, y: height / 2 },
      color: cutLineColor,
      thickness: 1,
      dashArray: [5, 5],
      opacity: 0.7,
    });
    page.drawLine({
      start: { x: width / 2, y: 0 },
      end: { x: width / 2, y: height },
      color: cutLineColor,
      thickness: 1,
      dashArray: [5, 5],
      opacity: 0.7,
    });

    const pdfBytes = await pdfDoc.save();

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
      return NextResponse.json({ error: `Unexpected error: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
