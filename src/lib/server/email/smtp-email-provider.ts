import nodemailer from 'nodemailer';
import type { EmailProvider, SendEmailParams } from './types';

/**
 * SMTP email provider using nodemailer.
 * Configured via environment variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */
export class SmtpEmailProvider implements EmailProvider {
	private readonly from: string;
	private readonly transporter: nodemailer.Transporter;

	constructor(params: {
		host: string;
		port: number;
		user: string;
		pass: string;
		from: string;
		secure?: boolean;
	}) {
		this.from = params.from;
		this.transporter = nodemailer.createTransport({
			host: params.host,
			port: params.port,
			secure: params.secure ?? params.port === 465,
			auth: {
				user: params.user,
				pass: params.pass
			}
		});
	}

	async send(params: SendEmailParams): Promise<void> {
		await this.transporter.sendMail({
			from: this.from,
			to: params.to,
			subject: params.subject,
			text: params.text,
			html: params.html
		});
	}
}
