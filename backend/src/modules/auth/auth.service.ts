import type { RefreshTPayload } from "../../common/utils/jwt.js";
import jwt from "jsonwebtoken";
import { ErrorCode } from "../../common/enums/error-code.enum.js";
import { VerificationEnum } from "../../common/enums/verification-code.enum.js";
import type {
  loginDto,
  RegisterDto,
} from "../../common/interface/auth.interface.js";
import {
  BadRequestException,
  UnauthorizedException,
} from "../../common/utils/catch-error.js";
import {
  calculateExpirationDate,
  fortyFiveMinutesFromNow,
  ONE_DAY_IN_MS,
} from "../../common/utils/date-time.js";
import SessionModel from "../../database/models/session.model.js";
import UserModel from "../../database/models/user.model.js";
import VerificationCodeModel from "../../database/models/verification.model.js";
import { config } from "../../config/app.config.js";
import {
  refreshTokenSignOptions,
  signJwtToken,
  verifyJwtToken,
} from "../../common/utils/jwt.js";

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
    const accessToken = signJwtToken({
      userId: user._id,
      sessionId: session._id,
    });

    const refreshToken = signJwtToken({
      sessionId: session._id,
    });

    return {
      user,
      accessToken,
      refreshToken,
      mfaRequired: false,
    };
  }

  // Refresh
  public async refreshToken(refreshToken: string) {
    const { payload } = verifyJwtToken<RefreshTPayload>(refreshToken, {
      secret: refreshTokenSignOptions.secret,
    });
    if (!payload) {
      throw new UnauthorizedException("Invalid refresh token");
    }
    const session = await SessionModel.findById(payload.sessionId);
    const now = Date.now();
    if (session?.expiredAt.getTime() <= now) {
      throw new UnauthorizedException("Session expired");
    }
    const sessionRefresh = session?.expiredAt.getTime() - now <= ONE_DAY_IN_MS;

    if (sessionRefresh) {
      session.expiredAt = calculateExpirationDate(
        config.JWT.REFRESH_EXPIRES_IN,
      );
    }
    await session.save();

    const newRefreshToken = sessionRefresh
      ? signJwtToken(
          {
            sessionId: session._id,
          },
          refreshTokenSignOptions,
        )
      : undefined;
    const accessToken = signJwtToken(
      {
        sessionId: session?._id,
      },
      refreshTokenSignOptions,
    );
    return {
      accessToken,
      newRefreshToken,
    };
  }

  //
  public async verifyEmail(code: string) {
    const validCode = await VerificationCodeModel.findOne({
      code: code,
      type: VerificationEnum.EMAIL_VERIFICATION,
      expiresAt: { $gt: new Date() },
    });

    if (!validCode) {
      throw new BadRequestException("Invalid or expired verification code");
    }
    const updateUser = await UserModel.findByIdAndUpdate(
      validCode.userId,
      { isEmailVerified: true },
      { new: true },
    );
    if (!updateUser) {
      throw new BadRequestException(
        "Unable to verify email address",
        ErrorCode.VALIDATION_ERROR,
      );
    }

    await validCode.deleteOne();
    return {
      user: updateUser,
    };
  }
}
