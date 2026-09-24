import { readFileSync, readdirSync } from 'fs';
import * as Handlebars from 'handlebars';
import { basename, extname, join } from 'path';

const templatesDir = join(__dirname, '..', 'templates');
const partialsDir = join(templatesDir, 'partials');

let partialsRegistered = false;

Handlebars.registerHelper('year', () => new Date().getFullYear());

function registerPartialsOnce() {
	if (partialsRegistered) return;
	partialsRegistered = true;

	for (const file of readdirSync(partialsDir)) {
		if (extname(file) !== '.hbs') continue;
		Handlebars.registerPartial(
			basename(file, '.hbs'),
			readFileSync(join(partialsDir, file), 'utf8')
		);
	}
}

/**
 * Renders a Handlebars template with provided data.
 * @param templateName - The filename (without extension) of the .hbs template in the templates directory.
 * @param data - The context data to inject into the template.
 * @returns The rendered template string.
 */
export function renderTemplate(templateName: string, data: unknown) {
	registerPartialsOnce();
	const templatePath = join(templatesDir, `${templateName}.hbs`);
	return Handlebars.compile(readFileSync(templatePath, 'utf8'))(data);
}
