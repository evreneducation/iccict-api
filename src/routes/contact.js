import express from 'express';
import { transporter } from '../config/email.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;

        // Validate required fields
        if (!name || !email || !phone || !subject || !message) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Save contact submission to database
        await prisma.contact.create({
            data: {
                name,
                email,
                phone,
                subject,
                message,
                status: 'PENDING'
            }
        });

        // Send email to admin
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.ADMIN_EMAIL,
            subject: `New Contact Form Submission: ${subject}`,
            html: `
                <h2>New Contact Form Submission</h2>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Phone:</strong> ${phone}</p>
                <p><strong>Subject:</strong> ${subject}</p>
                <p><strong>Message:</strong></p>
                <p>${message}</p>
            `
        });

        // Send confirmation email to user
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Thank you for contacting us - ICMMCS 2025',
            html: `
                <h2>Thank you for contacting ICMMCS 2025</h2>
                <p>Dear ${name},</p>
                <p>We have received your message and will get back to you as soon as possible.</p>
                <p>Here's a copy of your message:</p>
                <p><strong>Subject:</strong> ${subject}</p>
                <p><strong>Message:</strong></p>
                <p>${message}</p>
                <br>
                <p>Best regards,</p>
                <p>ICMMCS 2025 Team</p>
            `
        });

        res.status(200).json({ message: 'Message sent successfully' });
    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Add route to get all contacts
// router.get('/', async (req, res) => {
//     try {
//         const contacts = await prisma.contact.findMany({
//             orderBy: {
//                 createdAt: 'desc'
//             }
//         });
//         res.json(contacts);
//     } catch (error) {
//         console.error('Error fetching contacts:', error);
//         res.status(500).json({ error: 'Failed to fetch contacts' });
//     }
// });




router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status: newStatus } = req.body;

    const contact = await prisma.contact.findUnique({ where: { id } });
    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    const cur = contact.status;

    if (cur === 'CLOSED') {
      return res.status(400).json({ error: 'Closed queries cannot be changed.' });
    }

    // Force flow: PENDING → IN_PROGRESS → (RESOLVED_* | CLOSED)
    const isResolution = ['RESOLVED_EMAIL', 'RESOLVED_PHONE', 'CLOSED'].includes(newStatus);

    if (cur === 'PENDING' && isResolution) {
      return res.status(400).json({ error: 'Move to In-Progress before resolving or closing.' });
    }

    // 24h lock after going IN_PROGRESS
    if (cur === 'IN_PROGRESS' && isResolution) {
      const started = contact.inProgressAt ? new Date(contact.inProgressAt).getTime() : 0;
      const diffMs = Date.now() - started;
      const hours = diffMs / (1000 * 60 * 60);
      if (!contact.inProgressAt || hours < 24) {
        const remaining = Math.max(0, 24 - hours).toFixed(1);
        return res.status(400).json({ error: `Resolution locked for ${remaining} more hour(s).` });
      }
    }

    const data = { status: newStatus };
    if (newStatus === 'IN_PROGRESS' && cur === 'PENDING' && !contact.inProgressAt) {
      data.inProgressAt = new Date();
    }

    const updated = await prisma.contact.update({ where: { id }, data });
    return res.json(updated);
  } catch (error) {
    console.error('Error updating contact status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});



// PATCH /api/contact/:id/notes  body: { resolutionNotes: string }
router.patch('/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionNotes } = req.body;
    const updated = await prisma.contact.update({
      where: { id },
      data: { resolutionNotes: resolutionNotes ?? null }
    });
    res.json(updated);
  } catch (error) {
    console.error('Error saving notes:', error);
    res.status(500).json({ error: 'Failed to save notes' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { status } = req.query;

    const where = (() => {
      if (!status || status === 'ALL') return {};
      if (status === 'RESOLVED') return { status: { in: ['RESOLVED_EMAIL', 'RESOLVED_PHONE'] } };
      return { status };
    })();

    const contacts = await prisma.contact.findMany({ where });

    const priority = { PENDING: 0, IN_PROGRESS: 1, RESOLVED_EMAIL: 2, RESOLVED_PHONE: 3, CLOSED: 4 };
    contacts.sort((a, b) => {
      const pa = priority[a.status] ?? 99;
      const pb = priority[b.status] ?? 99;
      if (pa !== pb) return pa - pb;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// Add route to delete a contact
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const contact = await prisma.contact.findUnique({
            where: { id }
        });
        
        if (!contact) {
            return res.status(404).json({ error: 'Contact not found' });
        }
        
        await prisma.contact.delete({
            where: { id }
        });
        
        res.json({ message: 'Contact deleted successfully' });
    } catch (error) {
        console.error('Error deleting contact:', error);
        res.status(500).json({ error: 'Failed to delete contact' });
    }
});

export default router;
