import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { InvoiceType } from "@/types";

// Generate PDF service
export async function generatePdfService(req: NextRequest) {
    try {
        const data: InvoiceType = await req.json();

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
            
            // Set HTML content based on template
            let htmlContent = '';

            // Determine which template to render
            const templateNumber = data.details.pdfTemplate;
            
            // Get the hostname to build the URL for fetching the template
            const host = req.headers.get('host') || 'localhost:3000';
            const protocol = host.includes('localhost') ? 'http' : 'https';
            
            // Get locale from the data or default to 'en'
            const locale = data.locale || 'en';
            
            // Build the URL for the template
            const url = `${protocol}://${host}/${locale}/template/${templateNumber}`;
            
            // Navigate to the template URL with a query string containing the invoice data
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
            const pdf = await page.pdf({
                format: 'a4',
                printBackground: true,
                margin: {
                    top: '20px',
                    right: '20px',
                    bottom: '20px',
                    left: '20px'
                }
            });
            
            // Return the PDF
            return new NextResponse(pdf, {
                status: 200,
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename=invoice-${data.details.invoiceNumber}.pdf`
                }
            });
        } finally {
            // Ensure browser is closed even if an error occurs
            await browser.close();
        }
    } catch (error) {
        console.error('PDF Generation Error:', error);
        return new NextResponse(JSON.stringify({ error: 'Failed to generate PDF' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}
