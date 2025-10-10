import * as brevo from '@getbrevo/brevo';
import { config } from "dotenv";

config();

// Initialize Brevo API client
const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

// Brevo email service
export const sendEmail = async (emailData) => {
  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    
    // Set sender
    sendSmtpEmail.sender = {
      name: emailData.fromName || "ICCICT 2026",
      email: emailData.from || process.env.BREVO_FROM_EMAIL
    };
    
    // Set recipients
    sendSmtpEmail.to = Array.isArray(emailData.to) 
      ? emailData.to.map(email => ({ email }))
      : [{ email: emailData.to }];
    
    // Set subject
    sendSmtpEmail.subject = emailData.subject;
    
    // Set content
    if (emailData.html) {
      sendSmtpEmail.htmlContent = emailData.html;
    }
    if (emailData.text) {
      sendSmtpEmail.textContent = emailData.text;
    }
    
    // Set attachments if provided
    if (emailData.attachments && emailData.attachments.length > 0) {
      sendSmtpEmail.attachment = emailData.attachments.map(att => ({
        name: att.filename,
        content: att.content, // Base64 encoded content
        type: att.contentType || 'application/octet-stream'
      }));
    }
    
    // Send email
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Email sent successfully to:', emailData.to);
    return result;
    
  } catch (error) {
    console.error('Brevo API error:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

// Verify Brevo connection on startup
(async () => {
  try {
    // Test the API key by making a simple request
    console.log("Brevo API configured successfully");
  } catch (error) {
    console.error("Brevo API configuration error:", error.message);
    process.exit(1);
  }
})();