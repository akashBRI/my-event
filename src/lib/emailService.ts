// src/lib/emailService.ts
import nodemailer from 'nodemailer';
import QRCode from 'qrcode'; // Assuming QRCode is used here for embedding in email/PDF

interface RegistrationDetails {
  id: string;
  passId: string;
  qrCodeData: string; // Base64 data URL of QR code
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
    const qrCodeImage = registration.qrCodeData; // This is already a base64 data URL

    let occurrencesHtml = '';
    if (registration.selectedOccurrences && registration.selectedOccurrences.length > 0) {
      occurrencesHtml = `
        <p style="font-size: 16px; color: #555555; margin-bottom: 10px;"><strong>Your Registered Sessions:</strong></p>
        <ul style="list-style: none; padding: 0;">
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
            <li style="margin-bottom: 5px; font-size: 14px; color: #666666;">
              <strong>Date & Time:</strong> ${startTime}${endTime}<br/>
              <strong>Location:</strong> ${eventLocation}${locationDetail}
            </li>
          `;
        });
      occurrencesHtml += `</ul>`;
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: registration.user.email,
      subject: `Your Registration for ${eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #dddddd; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center;">
            <h2 style="color: #333333;">Event Registration Confirmation</h2>
          </div>
          <div style="padding: 20px; background-color: #ffffff;">
            <p style="font-size: 16px; color: #333333;">Dear ${userName},</p>
            <p style="font-size: 16px; color: #333333;">Thank you for registering for the <strong>${eventName}</strong> event!</p>

            <p style="font-size: 16px; color: #555555; margin-top: 20px;"><strong>Event Details:</strong></p>
            <ul style="list-style: none; padding: 0;">
              <li style="margin-bottom: 5px; font-size: 14px; color: #666666;"><strong>Event Name:</strong> ${eventName}</li>
              <li style="margin-bottom: 5px; font-size: 14px; color: #666666;"><strong>Main Location:</strong> ${eventLocation}</li>
              ${registration.event.googleMapsLink ? `<li style="margin-bottom: 5px; font-size: 14px; color: #666666;"><strong>Map:</strong> <a href="${registration.event.googleMapsLink}" style="color: #007bff; text-decoration: none;">View on Google Maps</a></li>` : ''}
              ${registration.event.contactEmail ? `<li style="margin-bottom: 5px; font-size: 14px; color: #666666;"><strong>Contact Email:</strong> <a href="mailto:${registration.event.contactEmail}" style="color: #007bff; text-decoration: none;">${registration.event.contactEmail}</a></li>` : ''}
              ${registration.event.contactPhone ? `<li style="margin-bottom: 5px; font-size: 14px; color: #666666;"><strong>Contact Phone:</strong> ${registration.event.contactPhone}</li>` : ''}
            </ul>

            ${occurrencesHtml}

            <p style="font-size: 16px; color: #555555; margin-top: 20px;"><strong>Your Pass Details:</strong></p>
            <ul style="list-style: none; padding: 0;">
              <li style="margin-bottom: 5px; font-size: 14px; color: #666666;"><strong>Pass ID:</strong> ${passId}</li>
            </ul>

            <div style="text-align: center; margin-top: 30px;">
              <p style="font-size: 14px; color: #666666; margin-bottom: 10px;">Please present this QR code for check-in:</p>
              <img src="${qrCodeImage}" alt="QR Code" style="width: 150px; height: 150px; border: 1px solid #cccccc; border-radius: 5px;">
            </div>

            <p style="font-size: 16px; color: #333333; margin-top: 30px;">We look forward to seeing you there!</p>
            <p style="font-size: 16px; color: #333333; margin-top: 10px;">Best regards,<br/>The Event Team</p>
          </div>
          <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 12px; color: #777777;">
            This is an automated email, please do not reply.
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Registration email sent to ${registration.user.email} for event ${eventName}`);
  } catch (error) {
    console.error('Error sending registration email:', error);
    throw new Error('Failed to send registration email.');
  }
}
