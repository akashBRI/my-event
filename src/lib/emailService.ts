// src/lib/emailService.ts
import nodemailer from 'nodemailer';

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
  const { user, event, passId, qrCodeData, selectedOccurrences } = registration;

  // Construct QR Code Image URL for embedding in email (using a public QR API)
  const qrCodeImageUrl = qrCodeData
    ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrCodeData)}`
    : null;

  // Format selected occurrences for display in email
  const formattedSelectedOccurrences = selectedOccurrences.map((so) => {
    const occ = so.occurrence;
    const startTime = new Date(occ.startTime);
    const endTime = occ.endTime ? new Date(occ.endTime) : null;

    const dateStr = startTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    let timeStr = startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    if (endTime) {
      timeStr += ` - ${endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    }
    const locationStr = occ.location && occ.location !== event.location ? ` (${occ.location})` : '';
    return `${dateStr} ${timeStr}${locationStr}`;
  }).join('<br>');


  const mailOptions = {
    from: process.env.EMAIL_FROM, // Your sender email address
    to: toEmail,
    subject: `Your Event Pass for ${event.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #0056b3;">Hello ${user.firstName || 'Attendee'},</h2>
        <p>Thank you for registering for <strong>${event.name}</strong>!</p>
        <p>Your registration is complete, and here are your event pass details:</p>
        
        <div style="background-color: #f4f4f4; padding: 20px; border-radius: 8px; margin-top: 20px;">
          <h3 style="color: #0056b3;">Event Pass Information:</h3>
          <p><strong>Event Name:</strong> ${event.name}</p>
          <p><strong>Attendee Name:</strong> ${user.firstName} ${user.lastName}</p>
          <p><strong>Event Location:</strong> ${event.location}</p>
          <p><strong>Pass ID:</strong> ${passId}</p>
          
          ${selectedOccurrences.length > 0 ? `
            <p style="margin-top: 15px;"><strong>Your Registered Session(s):</strong></p>
            <p>${formattedSelectedOccurrences}</p>
          ` : ''}

          ${qrCodeImageUrl ? `
            <p style="margin-top: 15px;"><strong>Your QR Code for Check-in:</strong></p>
            <img src="${qrCodeImageUrl}" alt="QR Code" style="display: block; margin: 10px auto; border: 1px solid #ddd; border-radius: 4px;">
          ` : ''}

          <p style="margin-top: 20px;">
            You can view or download your detailed event pass (PDF) here:<br>
            <a href="${pdfLink}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">
              Download Your Pass PDF
            </a>
          </p>
        </div>

        <p style="margin-top: 20px;">We look forward to seeing you there!</p>
        <p>Best regards,<br>The ${event.name} Team</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Event pass email sent to ${toEmail} for pass ${passId}`);
  } catch (error) {
    console.error(`Failed to send email to ${toEmail}:`, error);
    throw new Error('Failed to send event pass email.');
  }
};
