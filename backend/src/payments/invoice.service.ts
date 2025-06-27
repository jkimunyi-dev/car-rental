import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as puppeteer from 'puppeteer';
import { PrismaService } from '../prisma/prisma.service';
import { IInvoiceService } from './payment.interface';

@Injectable()
export class InvoiceService implements IInvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
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
      throw new Error('Payment not found');
    }

    const html = this.generateInvoiceHTML(payment);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html);

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  private generateInvoiceHTML(payment: any): string {
    const { booking } = payment;
    const { user, vehicle } = booking;

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice - ${payment.id}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .company-info h1 {
            color: #333;
            margin: 0;
            font-size: 2em;
          }
          .invoice-info {
            text-align: right;
          }
          .invoice-info h2 {
            color: #666;
            margin: 0;
          }
          .details-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
          }
          .billing-info, .payment-info {
            width: 48%;
          }
          .billing-info h3, .payment-info h3 {
            color: #333;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
          }
          .item-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .item-table th, .item-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #eee;
          }
          .item-table th {
            background-color: #f8f9fa;
            font-weight: bold;
          }
          .total-section {
            text-align: right;
            margin-top: 20px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
          }
          .total-final {
            border-top: 2px solid #333;
            font-weight: bold;
            font-size: 1.2em;
            padding-top: 10px;
            margin-top: 10px;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <div class="company-info">
              <h1>Car Rental Service</h1>
              <p>Professional Car Rental Solutions</p>
            </div>
            <div class="invoice-info">
              <h2>INVOICE</h2>
              <p><strong>Invoice #:</strong> ${payment.id.substring(0, 8).toUpperCase()}</p>
              <p><strong>Payment ID:</strong> ${payment.id}</p>
              <p><strong>Date:</strong> ${new Date(payment.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          <div class="details-section">
            <div class="billing-info">
              <h3>Bill To:</h3>
              <p><strong>${user.firstName} ${user.lastName}</strong></p>
              <p>${user.email}</p>
              <p>${user.phone || 'N/A'}</p>
              ${user.address ? `<p>${user.address}</p>` : ''}
              ${user.city ? `<p>${user.city}, ${user.country || ''}</p>` : ''}
            </div>
            <div class="payment-info">
              <h3>Payment Details:</h3>
              <p><strong>Payment Method:</strong> ${payment.paymentMethod}</p>
              <p><strong>Transaction ID:</strong> ${payment.transactionId || 'N/A'}</p>
              <p><strong>Status:</strong> ${payment.status}</p>
              <p><strong>Paid Date:</strong> ${payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>

          <table class="item-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Period</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Vehicle Rental</strong><br>
                  ${vehicle.make} ${vehicle.model} (${vehicle.year})<br>
                  License: ${vehicle.licensePlate}
                </td>
                <td>
                  ${new Date(booking.startDate).toLocaleDateString()} - ${new Date(booking.endDate).toLocaleDateString()}<br>
                  ${booking.totalDays} day(s)
                  ${booking.totalHours ? `, ${booking.totalHours} hour(s)` : ''}
                </td>
                <td>
                  $${booking.pricePerDay}/day
                  ${booking.pricePerHour ? `<br>$${booking.pricePerHour}/hour` : ''}
                </td>
                <td>$${booking.subtotal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>$${booking.subtotal.toFixed(2)}</span>
            </div>
            ${
              booking.taxes > 0
                ? `
            <div class="total-row">
              <span>Taxes:</span>
              <span>$${booking.taxes.toFixed(2)}</span>
            </div>
            `
                : ''
            }
            ${
              booking.fees > 0
                ? `
            <div class="total-row">
              <span>Fees:</span>
              <span>$${booking.fees.toFixed(2)}</span>
            </div>
            `
                : ''
            }
            ${
              booking.discount > 0
                ? `
            <div class="total-row">
              <span>Discount:</span>
              <span>-$${booking.discount.toFixed(2)}</span>
            </div>
            `
                : ''
            }
            <div class="total-row total-final">
              <span>Total Amount:</span>
              <span>$${payment.amount.toFixed(2)}</span>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for choosing our car rental service!</p>
            <p>For any inquiries, please contact us at support@carrental.com</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
