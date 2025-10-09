export const welcomeTemplate = (userData) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #019087, #40c4ba); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .highlight { background: #e8f5f3; padding: 15px; border-left: 4px solid #019087; margin: 20px 0; }
    .button { display: inline-block; background: #019087; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
    .info-section { margin: 20px 0; }
    .info-section h3 { color: #019087; margin-bottom: 10px; }
    ul { padding-left: 20px; }
    .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; } 
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Registration Confirmed!</h1>
      <p>ICCICT 2026 - International Conference on AI, ML, IoT & Computer Science</p>
    </div>
    
    <div class="content">
      <h2>Dear ${userData.name},</h2>
      
      <p>Welcome to ICCICT 2026!</p>
      </br>
      <p>We're thrilled to have you join our international conference.</p>
      
      <div class="highlight">
        <h3>📋 Your Registration Details</h3>
        <p><strong>Name:</strong> ${userData.name}</p>
        <p><strong>Email:</strong> ${userData.email}</p>
        <p><strong>Phone:</strong> ${userData.phone}</p>
        <p><strong>Registration Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Paper ID:</strong> ${userData.paperId || 'N/A'}</p>
        <p><strong>Transaction ID:</strong> ${userData.transactionId || 'N/A'}</p>
        ${
          userData.uploadPaymentReceipt
            ? `<p><strong>Payment Receipt:</strong> <a href="${userData.uploadPaymentReceipt}" target="_blank">📎 View Receipt</a></p>`
            : ''
        }
      </div>
      
      <div class="info-section">
        <h3>📅 Conference Details</h3>
        <ul>
          <li><strong>Date:</strong> November 10, 2025</li>
          <li><strong>Venue:</strong> India International Centre, Lodhi Estate, New Delhi, India</li>
          <li><strong>Website:</strong> <a href="https://www.iccict.org">www.iccict.org</a></li>
        </ul>
      </div>
      
      <div class="info-section">
        <h3>🔍 What's Next?</h3>
        <ul>
          <li>You will receive a payment confirmation email shortly</li>
          <li>Conference agenda and program details will be shared after payment confirmation</li>
          <li>For accommodation and travel visit our <a href="https://www.iccict.org">website</a></li>
          <li>Keep checking our website for updates</li>
        </ul>
      </div>
      
      <div class="info-section">
        <h3>📧 Stay Connected</h3>
        <p>For any questions or assistance, please contact us at:</p>
        <ul>
          <li>Email: info@iccict.org</li>
          <li>Phone: +91-9540111207 / +91-9540111307</li>
        </ul>
      </div>
      
      <p>We look forward to your participation in advancing the fields of AI, ML, IoT, and computer science!</p>
      
      <p>Best regards,<br>
      <strong>Organizing Committee</strong><br>
      <strong>ICCICT 2026</strong><br>

      <div class="footer">
        <p>This is an automated confirmation email. Please do not reply to this email.</p>
        <p>&copy; 2025 ICCICT. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;


export const paymentReceivedTemplate = (user) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Payment Received - ICCICT 2026</title>
  <style>
    body { font-family: Arial, sans-serif; color: #333; line-height: 1.5; margin: 0; padding: 0; }
    .container { max-width: 680px; margin: 0 auto; padding: 24px; }
    .header { background: linear-gradient(135deg,#019087,#40c4ba); color: #fff; padding: 24px; border-radius: 8px 8px 0 0; text-align:center; }
    .content { background: #fff; padding: 24px; border: 1px solid #eee; border-top: none; }
    .info { background: #f7fdfb; padding: 16px; border-left: 4px solid #019087; margin: 16px 0; }
    .field { margin-bottom: 8px; }
    .label { font-weight: 700; color: #019087; }
    .footer { color: #777; font-size: 13px; text-align:center; margin-top: 20px; }
    a.button { display:inline-block; background:#019087; color:#fff; padding:10px 16px; text-decoration:none; border-radius:6px; margin-top:12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Payment Received — ICCICT 2026</h1>
      <p>Thank you for your payment</p>
    </div>

    <div class="content">
      <p>Hi <strong>${user.name}</strong>,</p>

      <p>We have successfully received your payment for the ICCICT 2026 registration. Below are your details:</p>

      <div class="info">
        <div class="field"><span class="label">Name:</span> ${user.name}</div>
        <div class="field"><span class="label">Email:</span> ${user.email}</div>
        <div class="field"><span class="label">Phone:</span> ${user.phone || 'N/A'}</div>
        <div class="field"><span class="label">Paper ID:</span> ${user.paperId || 'N/A'}</div>
        <div class="field"><span class="label">Transaction ID:</span> ${user.transactionId || 'N/A'}</div>
        <div class="field"><span class="label">Registration Type:</span> ${user.registrationType || 'N/A'}</div>
        <div class="field"><span class="label">Institution:</span> ${user.institutionName || 'N/A'}</div>
        ${user.uploadPaymentReceipt ? `<div class="field"><span class="label">Receipt:</span> <a href="${user.uploadPaymentReceipt}" target="_blank">View Receipt</a></div>` : ''}
      </div>

      <p>If you have any questions, please contact <a href="mailto:info@iccict.org">info@iccict.org</a></p>

      <p>Best regards,<br/><strong>ICCICT 2026 Organizing Committee</strong></p>

      <div class="footer">
        <p>This is an automated message. Please do not reply to this email.</p>
        <p>&copy; 2025 ICCICT. All Rights Reserved</p>
      </div>
    </div>
  </div>
</body>
</html>
`;



export const adminNotificationTemplate = (userData) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 700px; margin: 0 auto; padding: 20px; }
    .header { background: #019087; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .section { background: white; margin: 15px 0; padding: 20px; border-radius: 8px; border-left: 4px solid #019087; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .label { font-weight: bold; color: #019087; }
    .value { margin-bottom: 10px; }
    .status { background: #fff3cd; color: #856404; padding: 8px 16px; border-radius: 20px; display: inline-block; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📝 New Conference Registration</h1>
      <p>ICCICT 2026 Conference</p>
    </div>
    
    <div class="content">
      <div class="section">
        <h2>Attendee Details</h2>
        <span class="status">✅ NEW REGISTRATION</span>
        
        <div style="margin-top: 20px;">
          <div class="label">Full Name:</div>
          <div class="value">${userData.name}</div>
          
          <div class="label">Email Address:</div>
          <div class="value">${userData.email}</div>
          
          <div class="label">Phone Number:</div>
          <div class="value">${userData.phone}</div>
          
          <div class="label">Registration Date:</div>
          <div class="value">${new Date().toLocaleString()}</div>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 30px; padding: 20px; background: white; border-radius: 8px;">
        <p><strong>⚡ Action Required:</strong> Please add this attendee to the conference database and send confirmation materials.</p>
        <p style="color: #666; font-size: 14px;">Conference: ICCICT 2026</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

export const speakerConfirmationTemplate = (speakerData) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #019087, #40c4ba); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .highlight { background: #e8f5f3; padding: 15px; border-left: 4px solid #019087; margin: 20px 0; }
    .info-section { margin: 20px 0; }
    .info-section h3 { color: #019087; margin-bottom: 10px; }
    ul { padding-left: 20px; }
    .abstract { background: #e8f5f3; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📄 Paper Submission Confirmed!</h1>
      <p>ICCICT 2026 - International Conference on AI, ML, IoT & Computer Science</p>
    </div>
    
    <div class="content">
      <h2>Dear ${speakerData.name},</h2>
      
      <p>Thank you for submitting your research paper to ICCICT 2026! We're excited to review your contribution to our prestigious conference.</p>
      
      <div class="highlight">
        <h3>📋 Your Submission Details</h3>
        <p><strong>Paper ID:</strong> ${speakerData.paperId}</p>
        <p><strong>Paper Title:</strong> ${speakerData.paperTitle}</p>
        <p><strong>Institution:</strong> ${speakerData.institutionName}</p>
        <p><strong>Conference Track:</strong> ${speakerData.conferenceTitle}</p>
        <p><strong>Attendee Type:</strong> ${speakerData.attendeeType}</p>
        <p><strong>Country:</strong> ${speakerData.country}</p>
        ${speakerData.fileUrl ? `<p><strong>Paper File:</strong> <a href="${speakerData.fileUrl}">📎 View Uploaded Document</a></p>` : ''}
      </div>
      
      <div class="info-section">
        <h3>📅 Important Dates</h3>
        <ul>
          <li><strong>Conference Dates:</strong> November 10-11, 2025</li>
          <li><strong>Paper Review Deadline:</strong> Within 10 business days after submission</li>
          <li><strong>Final Paper Submission:</strong> October 30, 2025</li>
          <li><strong>Registration Deadline:</strong> November 1, 2025</li>
        </ul>
      </div>
      
      <div class="info-section">
        <h3>🔍 Review Process</h3>
        <ul>
          <li>Your paper will undergo a peer-review process</li>
          <li>Reviews will be conducted by experts in your field</li>
          <li>You will receive feedback and decision notification</li>
          <li>If accepted, you'll receive presentation guidelines</li>
        </ul>
      </div>
      
      <div class="info-section">
        <h3>📧 Contact Information</h3>
        <p>For any questions about your submission, please contact us at:</p>
        <ul>
          <li>Email: info@iccict.org</li>
          <li>Phone: +968 93391308 / +91-9540111207</li>
        </ul>
      </div>
      
      <div class="info-section">
        <h3>📍 Conference Venue</h3>
        <p><strong>Location:</strong> ${speakerData.placeDate || 'India International Centre, Lodhi Estate, New Delhi, India'}</p>
        <p><strong>Website:</strong> <a href="https://www.iccict.org">www.iccict.org</a></p>
      </div>
      
      <p>We appreciate your contribution to the advancement of AI, ML, IoT, and computer science research!</p>
      
      <p>Best regards,<br>
      <strong>ICCICT 2026 Review Committee</strong><br>
      International Conference on AI, ML, IoT & Computer Science</p>
      
      <div class="footer">
        <p>This is an automated confirmation email. Please do not reply to this email.</p>
        <p>&copy; 2025 ICCICT. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

export const speakerAdminNotificationTemplate = (speakerData) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 700px; margin: 0 auto; padding: 20px; }
    .header { background: #019087; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .section { background: white; margin: 15px 0; padding: 20px; border-radius: 8px; border-left: 4px solid #019087; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .label { font-weight: bold; color: #019087; }
    .value { margin-bottom: 10px; }
    .status { background: #fff3cd; color: #856404; padding: 8px 16px; border-radius: 20px; display: inline-block; font-size: 14px; }
    .abstract { background: #e8f5f3; padding: 15px; border-radius: 8px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📄 New Presenter Registration</h1>
      <p>ICCICT 2026 Conference</p>
    </div>
    
    <div class="content">
      <div class="section">
        <h2>Presenter Details</h2>
        <span class="status">⏳ PENDING REVIEW</span>
        
        <div class="grid" style="margin-top: 20px;">
          <div>
            <div class="label">Full Name:</div>
            <div class="value">${speakerData.name}</div>
          </div>
          <div>
            <div class="label">Email:</div>
            <div class="value">${speakerData.email}</div>
          </div>
          <div>
            <div class="label">Phone:</div>
            <div class="value">${speakerData.phone}</div>
          </div>
          <div>
            <div class="label">Country:</div>
            <div class="value">${speakerData.country}</div>
          </div>
        </div>
      </div>
      
      <div class="section">
        <h3>🏛️ Institution Information</h3>
        <div class="label">Institution Name:</div>
        <div class="value">${speakerData.institutionName}</div>
        
        <div class="label">Attendee Type:</div>
        <div class="value">${speakerData.attendeeType}</div>
      </div>
      
      <div class="section">
        <h3>📊 Paper Information</h3>
        <div class="label">Paper Title:</div>
        <div class="value" style="font-size: 18px; font-weight: bold; color: #019087;">${speakerData.paperTitle}</div>
        
        <div class="label">Conference Track:</div>
        <div class="value">${speakerData.conferenceTitle}</div>
        
        <div class="label">Conference Details:</div>
        <div class="value">${speakerData.placeDate || 'November 10-11, 2025 - India International Centre, Lodhi Estate, New Delhi, India'}</div>
        
        <div class="label">Submission File:</div>
        <div class="value">
          ${speakerData.fileUrl ? `<a href="${speakerData.fileUrl}" target="_blank">📎 View Uploaded Document</a>` : '❌ No file uploaded'}
        </div>
      </div>
      
      ${speakerData.message ? `
        <div class="section">
          <h3>💬 Author's Message</h3>
          <div class="abstract">
            <div style="line-height: 1.8;">${speakerData.message}</div>
          </div>
        </div>
      ` : ''}
      
      <div class="section">
        <h3>📊 Submission Summary</h3>
        <div class="value">
          <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Status:</strong> Pending Review</p>
          <p><strong>File Status:</strong> ${speakerData.fileUrl ? 'Uploaded' : 'Not uploaded'}</p>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 30px; padding: 20px; background: white; border-radius: 8px;">
        <p><strong>⚡ Action Required:</strong> Please assign this paper to a reviewer and begin the evaluation process.</p>
        <p style="color: #666; font-size: 14px;">Conference: ICCICT 2026</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

export const sponsorConfirmationTemplate = (sponsorData) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #019087, #40c4ba); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .highlight { background: #e8f5f3; padding: 15px; border-left: 4px solid #019087; margin: 20px 0; }
    .info-section { margin: 20px 0; }
    .info-section h3 { color: #019087; margin-bottom: 10px; }
    ul { padding-left: 20px; }
    .sponsor-level { background: #019087; color: white; padding: 10px 20px; border-radius: 25px; display: inline-block; font-weight: bold; text-transform: uppercase; }
    .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🤝 Sponsorship Registration Confirmed!</h1>
      <p>ICCICT 2026 - International Conference on AI, ML, IoT & Computer Science</p>
    </div>
    
    <div class="content">
      <h2>Dear ${sponsorData.name},</h2>
      
      <p>Thank you for registering as a sponsor for ICCICT 2026! We're thrilled to partner with you in making this conference a tremendous success.</p>
      
      <div class="highlight">
        <h3>🏆 Your Sponsorship Details</h3>
        <p><strong>Organization:</strong> ${sponsorData.name}</p>
        <p><strong>Sponsorship Level:</strong> <span class="sponsor-level">${sponsorData.level}</span></p>
        <p><strong>Investment Amount:</strong> ${sponsorData.amount}</p>
        <p><strong>Registration Date:</strong> ${new Date().toLocaleDateString()}</p>
      </div>
      
      <div class="info-section">
        <h3>🎯 Your Sponsorship Benefits</h3>
        <ul>
          <li>Premium brand visibility throughout the conference</li>
          <li>Logo placement on all conference materials and website</li>
          <li>Complimentary conference passes for your team</li>
          <li>Dedicated exhibition space (based on sponsorship level)</li>
          <li>Speaking opportunities and networking sessions</li>
          <li>Access to conference proceedings and participant database</li>
          <li>Social media promotion and press coverage</li>
        </ul>
      </div>
      
      <div class="info-section">
        <h3>📋 Next Steps</h3>
        <ul>
          <li>Our partnerships team will contact you within 24 hours</li>
          <li>You'll receive detailed payment instructions and invoice</li>
          <li>Upon payment confirmation, we'll activate your sponsorship package</li>
          <li>We'll collaborate on marketing materials and brand placement</li>
          <li>Exhibition setup details will be shared closer to the event</li>
        </ul>
      </div>
      
      <div class="info-section">
        <h3>📅 Conference Information</h3>
        <ul>
          <li><strong>Date:</strong> November 10-11, 2025</li>
          <li><strong>Venue:</strong> India International Centre, Lodhi Estate, New Delhi, India</li>
          <li><strong>Expected Attendees:</strong> 500+ academics and industry professionals</li>
          <li><strong>Website:</strong> <a href="https://www.iccict.org">www.iccict.org</a></li>
        </ul>
      </div>
      
      <div class="info-section">
        <h3>📧 Partnership Contact</h3>
        <p>For sponsorship-related queries and coordination:</p>
        <ul>
          <li>Email: partnerships@iccict.org</li>
          <li>General: info@iccict.org</li>
          <li>Phone: +968 93391308 / +91-9540111207</li>
        </ul>
      </div>
      
      <p>We're excited about this partnership and look forward to showcasing your organization to our global community of researchers and professionals!</p>
      
      <p>Best regards,<br>
      <strong>ICCICT 2026 Partnerships Team</strong><br>
      International Conference on AI, ML, IoT & Computer Science</p>
      
      <div class="footer">
        <p>This is an automated confirmation email. Please do not reply to this email.</p>
        <p>&copy; 2025 ICCICT. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

export const sponsorAdminNotificationTemplate = (sponsorData) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 700px; margin: 0 auto; padding: 20px; }
    .header { background: #019087; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .section { background: white; margin: 15px 0; padding: 20px; border-radius: 8px; border-left: 4px solid #019087; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .label { font-weight: bold; color: #019087; }
    .value { margin-bottom: 10px; }
    .status { background: #fff3cd; color: #856404; padding: 8px 16px; border-radius: 20px; display: inline-block; font-size: 14px; }
    .sponsor-level { background: #019087; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; text-transform: uppercase; }
    .amount { font-size: 24px; font-weight: bold; color: #019087; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💰 New Sponsor Registration</h1>
      <p>ICCICT 2026 Conference Partnership</p>
    </div>
    
    <div class="content">
      <div class="section">
        <h2>Sponsor Details</h2>
        <span class="status">💼 NEW PARTNERSHIP</span>
        
        <div style="margin-top: 20px;">
          <div class="label">Organization Name:</div>
          <div class="value" style="font-size: 20px; font-weight: bold;">${sponsorData.name}</div>
          
          <div class="label">Contact Email:</div>
          <div class="value">${sponsorData.email}</div>
          
          <div class="label">Registration Date:</div>
          <div class="value">${new Date().toLocaleString()}</div>
        </div>
      </div>
      
      <div class="section">
        <h3>🏆 Sponsorship Information</h3>
        <div class="grid">
          <div>
            <div class="label">Sponsorship Level:</div>
            <div class="value"><span class="sponsor-level">${sponsorData.level}</span></div>
          </div>
          <div>
            <div class="label">Investment Amount:</div>
            <div class="value"><span class="amount">${sponsorData.amount}</span></div>
          </div>
        </div>
      </div>
      
      <div class="section">
        <h3>📋 Action Items</h3>
        <div class="value">
          <ul style="margin: 0; padding-left: 20px;">
            <li><strong>Send Payment Instructions:</strong> Provide invoice and payment details</li>
            <li><strong>Prepare Sponsorship Package:</strong> Logo requirements, exhibition details</li>
            <li><strong>Schedule Partnership Meeting:</strong> Discuss marketing collaboration</li>
            <li><strong>Update Sponsor Database:</strong> Add to conference systems</li>
            <li><strong>Confirm Exhibition Space:</strong> Reserve area based on sponsorship level</li>
          </ul>
        </div>
      </div>
      
      <div class="section">
        <h3>📊 Sponsorship Summary</h3>
        <div class="value">
          <p><strong>Conference:</strong> ICCICT 2026</p>
          <p><strong>Date:</strong> November 10-11, 2025</p>
          <p><strong>Venue:</strong> India International Centre, Lodhi Estate, New Delhi, India</p>
          <p><strong>Status:</strong> Payment Pending</p>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 30px; padding: 20px; background: white; border-radius: 8px;">
        <p><strong>⚡ Immediate Action Required:</strong> Please contact the sponsor within 24 hours to begin partnership process.</p>
        <p style="color: #666; font-size: 14px;">Priority: High - New Partnership Opportunity</p>
      </div>
    </div>
  </div>
</body>
</html>
`;
