// src/lib/emailService.ts
import nodemailer from 'nodemailer';
import QRCode from 'qrcode'; // Assuming QRCode is used here for embedding in email/PDF

interface RegistrationDetails {
  id: string;
  passId: string;
  // qrCodeData: string; // No longer directly used from DB for email embedding, but kept in interface if other parts of app use it
  user: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  event: {
    name: string;
    location: string;
    googleMapsLink: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
  };
  selectedOccurrences: {
    id: string;
    occurrence: {
      id: string;
      startTime: string;
      endTime: string | null;
      location: string | null;
    };
  }[];
}

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true', // Use 'true' for 465, 'false' for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendRegistrationEmail(registration: RegistrationDetails) {
  try {
    const eventName = registration.event.name;
    const userName = `${registration.user.firstName || ''} ${registration.user.lastName || ''}`.trim();
    const eventLocation = registration.event.location;
    const passId = registration.passId;

    // Dynamically generate QR Code data URL for the email
    // This ensures a fresh and valid QR code for every email send/resend.
    const passUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/event-pass-pdf/${passId}`;
    const qrCodeImage = await QRCode.toDataURL(passUrl); // Generates QR code as a base64 data URL

    // Log to debug: Check if QR code data is generated
    console.log('QR Code Data generated for email:', qrCodeImage ? 'present' : 'missing');
    if (qrCodeImage) console.log('QR Code Data Length:', qrCodeImage.length);


    // Construct the subject to be a reminder
    const subject = `Reminder: Your Registration for ${eventName}`;

    let occurrencesHtml = '';
    if (registration.selectedOccurrences && registration.selectedOccurrences.length > 0) {
      occurrencesHtml = `
        <p style="font-size: 16px; color: #333333; margin-bottom: 15px; font-weight: bold;">Your Registered Sessions:</p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
            <tr>
                <td style="padding: 10px; background-color: #f9f9f9; border-radius: 8px;">
                    <ul style="list-style: none; padding: 0; margin: 0;">
      `;
      registration.selectedOccurrences.sort((a, b) => new Date(a.occurrence.startTime).getTime() - new Date(b.occurrence.startTime).getTime())
        .forEach(selectedOcc => {
          const occ = selectedOcc.occurrence;
          const startTime = new Date(occ.startTime).toLocaleString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
          });
          let endTime = '';
          if (occ.endTime) {
            endTime = ` - ${new Date(occ.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
          }
          const locationDetail = occ.location && occ.location !== registration.event.location ? ` (${occ.location})` : '';
          occurrencesHtml += `
            <li style="margin-bottom: 10px; font-size: 14px; color: #555555; line-height: 1.5;">
              <strong style="color: #007bff;">&#9200; Date & Time:</strong> ${startTime}${endTime}<br/>
              <strong style="color: #007bff;">&#128205; Location:</strong> ${eventLocation}${locationDetail}
            </li>
          `;
        });
      occurrencesHtml += `
                    </ul>
                </td>
            </tr>
        </table>
      `;
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: registration.user.email,
      subject: subject, // Using the new reminder subject
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
          
          <div style="background-color: #007bff; padding: 25px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 28px; margin: 0; line-height: 1.2;">Your Event Pass & Reminder</h1>
            <p style="color: #ffffff; font-size: 16px; margin-top: 10px; opacity: 0.9;">Don't miss out on ${eventName}!</p>
          </div>

          <div style="padding: 30px 25px; text-align: left; color: #333333;">
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Dear ${userName},</p>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              This is a friendly reminder about your upcoming registration for the <strong>${eventName}</strong> event.
              We're excited to have you join us!
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 30px;">
                <tr>
                    <td style="padding: 15px; border-left: 5px solid #ffc107; background-color: #fffde7; border-radius: 8px;">
                        <p style="font-size: 18px; font-weight: bold; color: #333333; margin-bottom: 10px;">Event Details:</p>
                        <ul style="list-style: none; padding: 0; margin: 0;">
                            <li style="margin-bottom: 8px; font-size: 15px; color: #555555;">
                                <strong style="color: #007bff;">&#128197; Event Name:</strong> ${eventName}
                            </li>
                            <li style="margin-bottom: 8px; font-size: 15px; color: #555555;">
                                <strong style="color: #007bff;">&#128205; Main Location:</strong> ${eventLocation}
                            </li>
                            ${registration.event.googleMapsLink ? `
                            <li style="margin-bottom: 8px; font-size: 15px; color: #555555;">
                                <strong style="color: #007bff;">&#128279; View on Map:</strong> 
                                <a href="${registration.event.googleMapsLink}" style="color: #007bff; text-decoration: none; word-break: break-all;">
                                    ${registration.event.googleMapsLink}
                                </a>
                            </li>` : ''}
                            ${registration.event.contactEmail ? `
                            <li style="margin-bottom: 8px; font-size: 15px; color: #555555;">
                                <strong style="color: #007bff;">&#9993; Contact Email:</strong> 
                                <a href="mailto:${registration.event.contactEmail}" style="color: #007bff; text-decoration: none;">${registration.event.contactEmail}</a>
                            </li>` : ''}
                            ${registration.event.contactPhone ? `
                            <li style="margin-bottom: 8px; font-size: 15px; color: #555555;">
                                <strong style="color: #007bff;">&#128222; Contact Phone:</strong> ${registration.event.contactPhone}
                            </li>` : ''}
                        </ul>
                    </td>
                </tr>
            </table>

            ${occurrencesHtml}

            <p style="font-size: 16px; color: #333333; margin-top: 25px; margin-bottom: 15px; text-align: center; font-weight: bold;">Your Event Pass:</p>
            <div style="text-align: center; margin-bottom: 30px;">
              <p style="font-size: 15px; color: #555555; margin-bottom: 10px;">Please present this QR code at the entrance for quick check-in:</p>
              <img src="${qrCodeImage}" alt="QR Code for Event Pass" style="width: 180px; height: 180px; border: 4px solid #007bff; border-radius: 10px; display: block; margin: 0 auto;">
              <p style="font-size: 14px; color: #555555; margin-top: 15px;"><strong>Pass ID:</strong> <span style="color: #007bff;">${passId}</span></p>
              <a href="https://bri-event.vercel.app/api/event-pass-pdf/${passId}" style="display: inline-block; background-color: #dc3545; color: #ffffff; padding: 12px 25px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; transition: background-color 0.3s ease;">
                Download PDF Pass
              </a>
            </div>

            <p style="font-size: 16px; line-height: 1.6; margin-top: 30px;">
              We can't wait to see you! If you have any questions, please don't hesitate to reach out.
            </p>
            <p style="font-size: 16px; line-height: 1.6; margin-top: 20px;">Best regards,<br/>The Event Team</p>
          </div>

          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #777777; border-top: 1px solid #e0e0e0;">
            This is an automated email. Please do not reply to this message.
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Reminder email sent to ${registration.user.email} for event ${eventName}`);
  } catch (error) {
    console.error('Error sending registration email:', error);
    throw new Error('Failed to send registration email.');
  }
}
