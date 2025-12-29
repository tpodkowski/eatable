import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) { }

  async signIn(email: string, password: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email);

    if (!user) {
      throw new UnauthorizedException();
    }

    const isAuthorized = await argon2.verify(user?.passwordHash, password);

    if (!isAuthorized) {
      throw new UnauthorizedException();
    }

    const payload = {
      sub: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    return {
      token: await this.jwtService.signAsync(payload),
    };
  }
}
