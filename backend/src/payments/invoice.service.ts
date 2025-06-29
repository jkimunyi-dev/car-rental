import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { IInvoiceService } from './payment.interface';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class InvoiceService implements IInvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async generateInvoice(paymentId: string): Promise<Buffer> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          include: {
            user: true,
            vehicle: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const html = this.generateInvoiceHTML(payment);

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
      });

      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error('Failed to generate PDF invoice', error);
      throw new Error('Failed to generate invoice PDF');
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  // NEW METHOD: Generate and save PDF, then send via email
  async generateAndSendInvoice(paymentId: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          include: {
            user: true,
            vehicle: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    try {
      // Generate PDF buffer
      const pdfBuffer = await this.generateInvoice(paymentId);
      
      // Create invoices directory if it doesn't exist
      const invoicesDir = path.join(process.cwd(), 'storage', 'invoices');
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      // Save PDF to file system
      const fileName = `invoice-${payment.id.substring(0, 8)}-${Date.now()}.pdf`;
      const filePath = path.join(invoicesDir, fileName);
      
      fs.writeFileSync(filePath, pdfBuffer);
      this.logger.log(`Invoice saved to: ${filePath}`);

      // Send email with PDF attachment
      await this.emailService.addEmailToQueue({
        to: payment.booking.user.email,
        template: 'payment-receipt' as any,
        subject: `Invoice for Payment #${payment.id.substring(0, 8).toUpperCase()}`,
        context: {
          user: payment.booking.user,
          payment,
          booking: payment.booking,
          receiptUrl: null, // We're attaching the PDF instead
        },
        attachments: [
          {
            filename: `invoice-${payment.id.substring(0, 8).toUpperCase()}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });

      // Update payment record with receipt file path (optional)
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          receiptUrl: filePath, // Store local file path
        },
      });

      this.logger.log(`Invoice sent successfully to ${payment.booking.user.email}`);
    } catch (error) {
      this.logger.error('Failed to generate and send invoice', error);
      throw new Error('Failed to process invoice');
    }
  }

  // Keep the original method for backward compatibility
  async sendInvoiceByEmail(paymentId: string): Promise<void> {
    await this.generateAndSendInvoice(paymentId);
  }

  private generateInvoiceHTML(payment: any): string {
    const { booking } = payment;
    const { user, vehicle } = booking;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Invoice #${payment.id.substring(0, 8).toUpperCase()}</title>
        <style>
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                margin: 0; 
                padding: 20px; 
                color: #333;
                line-height: 1.4;
            }
            .header { 
                text-align: center; 
                margin-bottom: 40px; 
                border-bottom: 3px solid #3b82f6;
                padding-bottom: 20px;
            }
            .company-name { 
                font-size: 32px; 
                font-weight: bold; 
                color: #1e293b; 
                margin-bottom: 5px;
            }
            .invoice-title { 
                font-size: 20px; 
                color: #3b82f6; 
                margin-top: 10px;
                font-weight: 600;
            }
            .invoice-details { 
                display: flex; 
                justify-content: space-between; 
                margin-bottom: 40px; 
            }
            .customer-info, .invoice-info { 
                width: 45%; 
                background: #f8fafc;
                padding: 20px;
                border-radius: 8px;
                border: 1px solid #e2e8f0;
            }
            .section-title { 
                font-weight: bold; 
                color: #1e293b; 
                margin-bottom: 15px; 
                font-size: 16px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .booking-details { 
                margin-bottom: 40px; 
            }
            .table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-bottom: 20px; 
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .table th, .table td { 
                border: 1px solid #e2e8f0; 
                padding: 15px; 
                text-align: left; 
            }
            .table th { 
                background-color: #3b82f6; 
                color: white;
                font-weight: 600;
                text-transform: uppercase;
                font-size: 14px;
            }
            .table tr:nth-child(even) {
                background-color: #f8fafc;
            }
            .total-section { 
                text-align: right; 
                margin-top: 30px; 
                background: #f8fafc;
                padding: 20px;
                border-radius: 8px;
                border: 2px solid #3b82f6;
            }
            .total-row { 
                display: flex; 
                justify-content: space-between; 
                margin: 8px 0; 
                font-size: 16px;
            }
            .total-amount { 
                font-size: 20px; 
                font-weight: bold; 
                color: #1e293b; 
                border-top: 2px solid #3b82f6;
                padding-top: 10px;
                margin-top: 10px;
            }
            .footer { 
                margin-top: 50px; 
                text-align: center; 
                color: #64748b; 
                font-size: 12px;
                border-top: 1px solid #e2e8f0;
                padding-top: 20px;
            }
            .status-badge {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                background: #d1fae5;
                color: #065f46;
            }
            .company-info {
                margin-bottom: 10px;
                font-size: 14px;
                color: #64748b;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="company-name">🚗 Car Rental Service</div>
            <div class="company-info">Your Trusted Travel Partner</div>
            <div class="invoice-title">PAYMENT RECEIPT</div>
        </div>

        <div class="invoice-details">
            <div class="customer-info">
                <div class="section-title">Bill To</div>
                <p><strong>${user.firstName} ${user.lastName}</strong></p>
                <p>📧 ${user.email}</p>
                ${user.phone ? `<p>📱 ${user.phone}</p>` : ''}
                ${user.address ? `<p>📍 ${user.address}</p>` : ''}
                ${user.city && user.country ? `<p>${user.city}, ${user.country}</p>` : ''}
            </div>
            <div class="invoice-info">
                <div class="section-title">Receipt Details</div>
                <p><strong>Receipt #:</strong> ${payment.id.substring(0, 8).toUpperCase()}</p>
                <p><strong>Payment Date:</strong> ${new Date(payment.paidAt || payment.createdAt).toLocaleDateString()}</p>
                <p><strong>Payment Method:</strong> ${payment.paymentMethod.toUpperCase()}</p>
                <p><strong>Transaction ID:</strong> ${payment.transactionId || 'N/A'}</p>
                <p><strong>Status:</strong> <span class="status-badge">${payment.status}</span></p>
            </div>
        </div>

        <div class="booking-details">
            <div class="section-title">🚗 Rental Details</div>
            <table class="table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Vehicle</strong></td>
                        <td>${vehicle.make} ${vehicle.model} (${vehicle.year})</td>
                    </tr>
                    <tr>
                        <td><strong>License Plate</strong></td>
                        <td>${vehicle.licensePlate}</td>
                    </tr>
                    <tr>
                        <td><strong>Rental Period</strong></td>
                        <td>${new Date(booking.startDate).toLocaleDateString()} - ${new Date(booking.endDate).toLocaleDateString()}</td>
                    </tr>
                    <tr>
                        <td><strong>Duration</strong></td>
                        <td>${booking.totalDays} days</td>
                    </tr>
                    <tr>
                        <td><strong>Pickup Location</strong></td>
                        <td>${booking.pickupLocation}</td>
                    </tr>
                    ${booking.dropoffLocation ? `
                    <tr>
                        <td><strong>Drop-off Location</strong></td>
                        <td>${booking.dropoffLocation}</td>
                    </tr>
                    ` : ''}
                </tbody>
            </table>
        </div>

        <div class="total-section">
            <div class="total-row">
                <span>Subtotal:</span>
                <span>${payment.currency} ${booking.subtotal.toFixed(2)}</span>
            </div>
            ${booking.taxes > 0 ? `
            <div class="total-row">
                <span>Taxes:</span>
                <span>${payment.currency} ${booking.taxes.toFixed(2)}</span>
            </div>
            ` : ''}
            ${booking.fees > 0 ? `
            <div class="total-row">
                <span>Service Fees:</span>
                <span>${payment.currency} ${booking.fees.toFixed(2)}</span>
            </div>
            ` : ''}
            ${booking.discount > 0 ? `
            <div class="total-row" style="color: #059669;">
                <span>Discount:</span>
                <span>-${payment.currency} ${booking.discount.toFixed(2)}</span>
            </div>
            ` : ''}
            <div class="total-row total-amount">
                <span>Total Paid:</span>
                <span>${payment.currency} ${payment.amount.toFixed(2)}</span>
            </div>
        </div>

        <div class="footer">
            <p><strong>Thank you for choosing Car Rental Service!</strong></p>
            <p>For questions about this receipt, please contact our support team</p>
            <p>📧 ${this.configService.get('SUPPORT_EMAIL') || 'support@carental.com'} | 📱 +254 700 000 000</p>
            <p style="margin-top: 15px; font-size: 10px;">Generated on ${new Date().toLocaleString()}</p>
            <p style="margin-top: 5px; font-size: 10px;">This is a computer-generated receipt and does not require a signature.</p>
        </div>
    </body>
    </html>
    `;
  }
}
