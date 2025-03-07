import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { InvoiceType } from "@/types";

// Export invoice service
export async function exportInvoiceService(req: NextRequest) {
    try {
        const { data, type }: { data: InvoiceType; type: string } = await req.json();

        // For formats that require PDF generation (like PDF to XLSX conversion)
        if (type === 'pdf' || type === 'pdfXLSX') {
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

                // Process according to the export type
                if (type === 'pdf') {
                    return new NextResponse(pdf, {
                        status: 200,
                        headers: {
                            'Content-Type': 'application/pdf',
                            'Content-Disposition': `attachment; filename=invoice-${data.details.invoiceNumber}.pdf`
                        }
                    });
                } else {
                    // Handle other PDF-based formats like XLSX conversion
                    // This would need additional processing libraries
                    return new NextResponse(JSON.stringify({ error: 'Export format not implemented yet' }), {
                        status: 501,
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                }
            } finally {
                // Ensure browser is closed even if an error occurs
                await browser.close();
            }
        } else {
            // Handle other export formats (JSON, CSV, XML)
            // Export as JSON
            if (type === 'json') {
                return new NextResponse(JSON.stringify(data), {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Disposition': `attachment; filename=invoice-${data.details.invoiceNumber}.json`
                    }
                });
            }
            
            // For other formats like CSV, XML, XLSX without PDF conversion
            return new NextResponse(JSON.stringify({ error: 'Export format not implemented yet' }), {
                status: 501,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }
    } catch (error) {
        console.error('Export Error:', error);
        return new NextResponse(JSON.stringify({ error: 'Failed to export invoice' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}
