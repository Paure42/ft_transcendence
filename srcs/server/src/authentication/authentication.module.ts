import { Module, HttpModule} from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { UsersModule } from '../users/users.module';
import { AuthenticationController } from './authentication.controller';
import { SessionSerializer } from './serializer';
import { PassportModule } from '@nestjs/passport';
import { Api42Strategy } from './api42.strategy';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { MatchModule } from 'src/match/match.module';
import { OtpController } from './otp/otp.controller';
import { otpService } from './otp/otp.service';
import { OtpStrategy } from './authentication.service';

@Module({
    imports: [
        UsersModule,
        MatchModule,
        PassportModule,
        ConfigModule,
        HttpModule,

        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get('JWT_SECRET'),
                signOptions: {
                    expiresIn:
                    `${configService.get('JWT_EXPIRATION_TIME')}s`,
                },
            }),
        }),
    ],
    providers: [AuthenticationService, JwtStrategy, Api42Strategy, SessionSerializer, otpService, OtpStrategy],
    controllers: [AuthenticationController, OtpController],
    exports: [AuthenticationService]
})
export class AuthenticationModule {}
