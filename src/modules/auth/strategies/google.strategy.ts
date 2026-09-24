import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy) {
	constructor() {
		super({
			clientID: process.env.GOOGLE_CLIENT_ID,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET,
			callbackURL: `${process.env.FRONTEND_URL}${process.env.GOOGLE_CALLBACK_PATH}`,
			scope: ['email', 'profile'],
		});
	}

	async validate(
		accessToken: string,
		refreshToken: string,
		profile: Profile,
		done: VerifyCallback
	) {
		const { name, emails, photos, provider } = profile;
		const user = {
			email: emails[0].value,
			firstName: name?.givenName,
			lastName: name?.familyName,
			picture: photos?.[0]?.value,
			provider,
			accessToken,
		};
		done(null, user);
	}
}
