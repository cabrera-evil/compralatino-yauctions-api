import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { Module } from '@nestjs/common';
import * as path from 'path';

@Module({
	imports: [
		MailerModule.forRootAsync({
			useFactory: () => ({
				transport: {
					host: process.env.SMTP_HOST,
					port: Number(process.env.SMTP_PORT),
					ignoreTLS: process.env.SMTP_IGNORE_TLS === 'true',
					secure: process.env.SMTP_SECURE === 'true',
					auth: {
						user: process.env.SMTP_USERNAME,
						pass: process.env.SMTP_PASSWORD,
					},
				},
				defaults: {
					from: `No Reply <${process.env.SMTP_DEFAULT_FROM}>`,
					replyTo: process.env.SMTP_DEFAULT_REPLY_TO,
				},
				preview: process.env.NODE_ENV === 'development',
				template: {
					dir: path.resolve(__dirname, `../templates`),
					adapter: new HandlebarsAdapter({
						year: () => new Date().getFullYear(),
					}),
					options: {
						strict: true,
					},
				},
				options: {
					partials: {
						dir: path.resolve(__dirname, `../templates/partials`),
					},
				},
			}),
		}),
	],
})
export class MailConfig {}
