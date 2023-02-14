import { Injectable } from '@nestjs/common';
import { Unauthorized } from 'src/shared/exception/auth.exception';
import { AuthInterface } from 'src/module/core/auth/interfaces/auth.interface';
import { AuthService } from 'src/module/core/auth/auth.service';
import {
  Payload,
  ResponseAuthManager,
} from 'src/module/core/auth/model/auth.model';
import { ManagersService } from 'src/module/core/managers/managers.service';
import { RegisterManagerDto } from '../../core/auth/dto/auth.dto';

@Injectable()
export class OpeAuthService implements AuthInterface {
  constructor(
    private readonly managerService: ManagersService,
    private readonly authService: AuthService,
  ) {}

  async validateBasic(
    phone: string,
    password: string,
  ): Promise<ResponseAuthManager> {
    const manager = await this.managerService.findOne({ phone: phone });
    if (!manager)
      throw Unauthorized(`Can't find phone number`, 'PHONE_NUMBER_NOT_EXIST');

    const passwordInvalid = await this.authService.checkPassword(
      password,
      manager.password,
    );
    if (!passwordInvalid)
      throw Unauthorized(
        'The password does not match the password on the system',
        'PASSWORD_FAILED',
      );

    const payload: Payload = {
      id: manager.id,
      sub: manager.id,
    };
    const accessToken = await this.authService.generateJwtToken(payload);
    const result: ResponseAuthManager = { ...manager, accessToken };

    return result;
  }

  async register(body: RegisterManagerDto) {
    const checkEmail = await this.managerService.findOne([
      { email: body.email },
      { phone: body.phone },
    ]);
    if (checkEmail)
      throw Unauthorized(
        'Email or Phone already exists in the system',
        'USERNAME_ALREADY_EXIST',
      );

    const newPass = await this.authService.hashPassword(body.password);
    body.password = newPass;

    const manager = await this.managerService.create(body);
    const payload: Payload = {
      id: manager.id,
      sub: manager.id,
    };
    const accessToken = await this.authService.generateJwtToken(payload);
    const result: ResponseAuthManager = { ...manager, accessToken };

    return result;
  }

  async validateByToken(id: string) {
    const user = await this.managerService.findOne({ id: id });
    if (!user) {
      throw Unauthorized('Token failed', 'TOKEN_FAILED');
    }
    return user;
  }
}
