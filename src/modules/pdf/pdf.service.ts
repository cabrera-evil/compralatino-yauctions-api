import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer-core';

@Injectable()
export class PdfService {
	constructor() {}

	async htmlToPdf(htmlContents: string[], options?: puppeteer.PDFOptions) {
		const browser = await puppeteer.launch({
			executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
			headless: true,
			args: ['--no-sandbox', '--disable-setuid-sandbox'],
		});

		const pdfBuffers = await Promise.all(
			htmlContents.map(async (htmlContent) => {
				const page = await browser.newPage();
				await page.setContent(htmlContent, { waitUntil: 'load' });
				const pdfBuffer = await page.pdf({
					...options,
					printBackground: true,
				});
				await page.close();
				return pdfBuffer;
			})
		);

		await browser.close();
		return pdfBuffers;
	}
}
