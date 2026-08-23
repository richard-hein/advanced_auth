import { ErrorCode } from "../../common/enums/error-code.enum.js";
import { VerificationEnum } from "../../common/enums/verification-code.enum.js";
import type { RegisterDto } from "../../common/interface/auth.interface.js";
import { BadRequestException } from "../../common/utils/catch-error.js";
import { fortyFiveMinutesFromNow } from "../../common/utils/date-time.js";
import UserModel from "../../database/models/user.model.js";
import VerificationCodeModel from "../../database/models/verification.model.js";

export class AuthService {
  public async register(registerData: RegisterDto) {
    const { name, email, password } = registerData;
    const existingUser = await UserModel.exists({ email });

    if (existingUser) {
      throw new BadRequestException(
        "User already exists with this email",
        ErrorCode.AUTH_EMAIL_ALREADY_EXISTS,
      );
    }
    const newUser = await UserModel.create({
      name,
      email,
      password,
    });

    const userId = newUser._id;
    const verificationCode = await VerificationCodeModel.create({
      userId,
      type: VerificationEnum.EMAIL_VERIFICATION,
      expiresAt: fortyFiveMinutesFromNow(),
    });

    return {
      user: newUser,
    };
  }
}
