// src/lib/emailService.ts
import nodemailer from 'nodemailer';
import QRCode from 'qrcode';

// Define the occurrence type for email service
interface EventOccurrenceForEmail {
  id: string;
  startTime: Date; // Assuming it comes as Date object from Prisma
  endTime: Date | null;
  location: string | null;
  eventId: string; // Added eventId as per Prisma's EventOccurrence
}

// Define a type for the registration object passed to the email service
interface EventRegistrationForEmail {
  id: string;
  passId: string;
  qrCodeData: string | null;
  status: string;
  registrationDate: Date; // Assuming Prisma returns Date objects
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  event: {
    name: string;
    description: string | null;
    location: string;
    googleMapsLink: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    maxCapacity: number | null;
    occurrences: EventOccurrenceForEmail[]; // Correctly include occurrences
  };
  selectedOccurrences: {
    id: string; // This is the ID of the EventOccurrenceRegistration join table entry
    registrationId: string; // Added property from Prisma include
    occurrenceId: string; // Added property from Prisma include
    registeredAt: Date; // Added property from Prisma include
    occurrence: EventOccurrenceForEmail; // The actual occurrence details
  }[];
}

// Configure your nodemailer transporter
// You should store these credentials securely, e.g., in environment variables.
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'), // Default to 587 if not set
  secure: process.env.EMAIL_SECURE === 'true', // Use 'true' for 465, 'false' for 587 or 25
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendEventPassEmail = async (
  toEmail: string,
  eventName: string, // Kept for simplicity, though derivable from registration.event.name
  registration: EventRegistrationForEmail,
  pdfLink: string // Direct link to the generated PDF pass
) => {
  const { user, event, passId } = registration; // Removed qrCodeData from destructuring as it's generated here

  // Dynamically generate QR Code data URL for the email
  const passUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/event-pass-pdf/${passId}`;
  const qrCodeImage = await QRCode.toDataURL(passUrl);
  

  console.log('QR Code Data generated for email:', qrCodeImage ? 'present' : 'missing');
  if (qrCodeImage) console.log('QR Code Data Length:', qrCodeImage.length);

  const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  const eventLocation = event.location;

  let occurrencesHtml = '';
  if (registration.selectedOccurrences && registration.selectedOccurrences.length > 0) {
    occurrencesHtml = `
      <p style="font-size: 16px; color: #333333; margin-bottom: 15px; font-weight: bold;">Your Registered Sessions:</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
          <tr>
              <td style="padding: 10px; background-color: #f9f9f9; border-radius: 8px;">
                  <ul style="list-style: none; padding: 0; margin: 0;">
    `;
    registration.selectedOccurrences.sort((a, b) => a.occurrence.startTime.getTime() - b.occurrence.startTime.getTime())
      .forEach(selectedOcc => {
        const occ = selectedOcc.occurrence;
        const startTime = occ.startTime.toLocaleString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          hour: '2-digit', minute: '2-digit', hour12: true
        });
        let endTime = '';
        if (occ.endTime) {
          endTime = ` - ${occ.endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
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
    from: process.env.EMAIL_FROM, // Your sender email address
    to: toEmail,
    subject: `Reminder: Your Registration for ${eventName}`,
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
              <a href="${pdfLink}" style="display: inline-block; background-color: #dc3545; color: #ffffff; padding: 12px 25px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; transition: background-color 0.3s ease;">
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

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Reminder email sent to ${toEmail} for event ${eventName}`);
  } catch (error) {
    console.error(`Failed to send email to ${toEmail}:`, error);
    throw new Error('Failed to send event pass email.');
  }
};
