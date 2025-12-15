import logger from '../config/logger.js';

class EmailQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 seconds
  }

  // Add email to queue
  async addEmail(emailData, priority = 'normal') {
    const emailJob = {
      id: Date.now() + Math.random(),
      data: emailData,
      priority,
      attempts: 0,
      maxAttempts: this.maxRetries,
      createdAt: new Date(),
      status: 'pending'
    };

    this.queue.push(emailJob);
    console.log('Email added to queue', {
      emailId: emailJob.id,
      to: emailData.to,
      priority
    });

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }

    return emailJob.id;
  }

  // Process the email queue
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    console.log('Starting email queue processing', {
      queueLength: this.queue.length
    });

    while (this.queue.length > 0) {
      // Sort by priority (high, normal, low)
      this.queue.sort((a, b) => {
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      const job = this.queue.shift();
      await this.processEmailJob(job);
    }

    this.processing = false;
    console.log('Email queue processing completed');
  }

  // Process individual email job
  async processEmailJob(job) {
    try {
      job.status = 'processing';
      job.attempts++;

      console.log('Processing email job', {
        emailId: job.id,
        attempt: job.attempts,
        to: job.data.to
      });

      // Import email service dynamically to avoid circular dependencies
      const { sendEmail } = await import('../config/email.js');
      await sendEmail(job.data);

      job.status = 'completed';
      console.log('Email sent successfully', {
        emailId: job.id,
        to: job.data.to
      });

    } catch (error) {
      job.status = 'failed';
      console.log('Email sending failed', {
        emailId: job.id,
        attempt: job.attempts,
        error: error.message,
        to: job.data.to
      });

      // Retry logic
      if (job.attempts < job.maxAttempts) {
        job.status = 'pending';
        job.retryAt = new Date(Date.now() + this.retryDelay * job.attempts);
        
        // Add back to queue with delay
        setTimeout(() => {
          this.queue.push(job);
          if (!this.processing) {
            this.processQueue();
          }
        }, this.retryDelay * job.attempts);

        console.log('Email job scheduled for retry', {
          emailId: job.id,
          retryAt: job.retryAt,
          nextAttempt: job.attempts + 1
        });
      } else {
        console.log('Email job failed permanently', {
          emailId: job.id,
          totalAttempts: job.attempts,
          to: job.data.to
        });
      }
    }
  }

  // Get queue status
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      pending: this.queue.filter(job => job.status === 'pending').length,
      processing: this.queue.filter(job => job.status === 'processing').length,
      failed: this.queue.filter(job => job.status === 'failed').length
    };
  }

  // Clear completed jobs
  clearCompleted() {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter(job => job.status !== 'completed');
    const removed = initialLength - this.queue.length;
    
    if (removed > 0) {
      console.log('Cleared completed email jobs', { removed });
    }
  }
}

// Create singleton instance
const emailQueue = new EmailQueue();

// Clear completed jobs every hour
setInterval(() => {
  emailQueue.clearCompleted();
}, 60 * 60 * 1000);

export default emailQueue;