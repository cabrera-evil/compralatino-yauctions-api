import { renderTemplate } from './templates';

describe('renderTemplate', () => {
	it.each([
		[
			'contact-confirmation',
			{
				name: 'Ada',
				email: 'ada@example.test',
				subject: 'Question',
				message: 'Hello',
			},
			'Message Received!',
		],
		[
			'new-login',
			{
				name: 'Ada',
				loginTime: '2026-08-06',
				ipAddress: '127.0.0.1',
				location: 'Local',
				device: 'Desktop',
				browser: 'Browser',
				operatingSystem: 'OS',
				userAgent: 'Test Agent',
				secureAccountLink: 'https://example.test/secure',
				changePasswordLink: 'https://example.test/password',
				manageSessionsLink: 'https://example.test/sessions',
			},
			'New Login Detected',
		],
		[
			'reset-password',
			{ name: 'Ada', resetLink: 'https://example.test/reset' },
			'Password Reset',
		],
	])('renders %s with generic branding', (templateName, data, title) => {
		const html = renderTemplate(templateName, data);

		expect(html).toContain(title);
		expect(html).toContain('Application');
	});
});
