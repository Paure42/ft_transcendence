import { PassportStrategy } from '@nestjs/passport';
import { HttpService, Injectable} from '@nestjs/common';
import { Strategy } from 'passport-42';
import { AuthenticationService } from './authentication.service';
const clientID = ""
const clientSecret = "";
const callbackURL = 'http://'+process.env.HOST+':'+process.env.PORT+'/authentication/redirect';

@Injectable()
export class Api42Strategy extends PassportStrategy(Strategy) {
    constructor(
        private authService: AuthenticationService,
        private http: HttpService,
    ) {
        super({
            clientID,
            clientSecret,
            callbackURL,
            scope : 'public',
            state: true,
        });
    }


    async validate(
        accessToken: string,
    ): Promise<any> {
        const { data } = await this.http.get('https://api.intra.42.fr/v2/me', {
            headers: { Authorization: `Bearer ${ accessToken }` },
        })
        .toPromise();
        return this.authService.findUserFromApi42Id(data);
    }
}
