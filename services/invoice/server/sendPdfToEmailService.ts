import { NextRequest } from "next/server";
import puppeteer from "puppeteer";
import { renderAsync } from "@react-email/components";
import { SendPdfEmail } from "@/app/components/templates/email/SendPdfEmail";
import { InvoiceType } from "@/types";

// Send PDF to email service
export async function sendPdfToEmailService(req: NextRequest) {
    try {
        const { data, email }: { data: InvoiceType; email: string } = await req.json();

        // Generate the PDF
        // Launch puppeteer with explicit configuration
        const browser = await puppeteer.launch({
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium-browser",
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu',
                '--disable-features=site-per-process',
                '--user-data-dir=/tmp/chromium-data-dir'
            ],
            ignoreHTTPSErrors: true
        });

        try {
            // Create a new page
            const page = await browser.newPage();
            
            // Get the hostname to build the URL for fetching the template
            const host = req.headers.get('host') || 'localhost:3000';
            const protocol = host.includes('localhost') ? 'http' : 'https';
            
            // Get locale from the data or default to 'en'
            const locale = data.locale || 'en';
            
            // Determine which template to render
            const templateNumber = data.details.pdfTemplate;
            
            // Build the URL for the template
            const url = `${protocol}://${host}/${locale}/template/${templateNumber}`;
            
            // Navigate to the template URL
            await page.goto(url, { waitUntil: 'networkidle0' });
            
            // Execute script to hydrate the page with invoice data
            await page.evaluate((invoiceData) => {
                // This assumes there's a global function or event listener in your template page
                // that can receive and process this data
                window.postMessage({ type: 'INVOICE_DATA', data: invoiceData }, '*');
            }, data);
            
            // Wait for any post-processing
            await page.waitForTimeout(1000);
            
            // Generate PDF
            const pdfBuffer = await page.pdf({
                format: 'a4',
                printBackground: true,
                margin: {
                    top: '20px',
                    right: '20px',
                    bottom: '20px',
                    left: '20px'
                }
            });

            // Convert PDF to base64 for email attachment
            const pdfBase64 = pdfBuffer.toString('base64');

            // Render email template
            const emailHtml = await renderAsync(
                SendPdfEmail({ invoiceNumber: data.details.invoiceNumber })
            );

            // In a real-world scenario, you would use an email service like SendGrid, Mailgun, etc.
            // Here's a placeholder for that logic
            
            // Example with a hypothetical email sending function:
            // await sendEmail({
            //   to: email,
            //   subject: `Invoice #${data.details.invoiceNumber} from ${data.sender.name}`,
            //   html: emailHtml,
            //   attachments: [
            //     {
            //       content: pdfBase64,
            //       filename: `invoice-${data.details.invoiceNumber}.pdf`,
            //       type: 'application/pdf',
            //       disposition: 'attachment'
            //     }
            //   ]
            // });
            
            // For now, we'll simulate a successful email sending
            console.log(`Email would be sent to ${email} with invoice #${data.details.invoiceNumber}`);
            
            return true;
        } finally {
            // Ensure browser is closed even if an error occurs
            await browser.close();
        }
    } catch (error) {
        console.error('Send Email Error:', error);
        throw error;
    }
}
