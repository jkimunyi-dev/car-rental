import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { EmailJobData } from './email.interface';

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly mailerService: MailerService) {}

  @Process('send-email')
  async handleSendEmail(job: Job<EmailJobData>) {
    const { to, template, context, subject, attachments } = job.data;

    try {
      await this.mailerService.sendMail({
        to,
        subject,
        template: `./${template}`,
        context,
        attachments,
      });

      this.logger.log(
        `Email sent successfully to ${to} with template ${template}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      throw error;
    }
  }
}
