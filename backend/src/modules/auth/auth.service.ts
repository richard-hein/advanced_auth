import jwt from "jsonwebtoken";
import { ErrorCode } from "../../common/enums/error-code.enum.js";
import { VerificationEnum } from "../../common/enums/verification-code.enum.js";
import type {
  loginDto,
  RegisterDto,
} from "../../common/interface/auth.interface.js";
import { BadRequestException } from "../../common/utils/catch-error.js";
import { fortyFiveMinutesFromNow } from "../../common/utils/date-time.js";
import SessionModel from "../../database/models/session.model.js";
import UserModel from "../../database/models/user.model.js";
import VerificationCodeModel from "../../database/models/verification.model.js";
import { config } from "../../config/app.config.js";

export class AuthService {
  // Register
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

  // Login
  public async login(loginData: loginDto) {
    const { email, password, userAgent } = loginData;
    const user = await UserModel.findOne({
      email,
    });
    if (!user) {
      throw new BadRequestException(
        "Invalid email or password provided",
        ErrorCode.AUTH_USER_NOT_FOUND,
      );
    }
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new BadRequestException(
        "Invalid email or password provide",
        ErrorCode.AUTH_USER_NOT_FOUND,
      );
    }
    // Check if the user enable 2fa return user =null
    const session = await SessionModel.create({
      userId: user._id,
      userAgent,
    });
    const accessToken = jwt.sign(
      { userId: user._id, sessionId: session._id },
      config.JWT.SECRET,
      {
        audience: ["user"],
        expiresIn: config.JWT.EXPIRES_IN,
      },
    );
    const refreshToken = jwt.sign(
      { sessionId: session._id },
      config.JWT.SECRET,
      {
        audience: ["user"],
        expiresIn: config.JWT.REFRESH_EXPIRES_IN,
      },
    );

    return {
      user,
      accessToken,
      refreshToken,
      mfaRequired: false,
    };
  }
}
