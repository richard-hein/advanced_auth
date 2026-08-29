import type { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type { AuthService } from "./auth.service.js";
import { HTTPSTATUS } from "../../config/http.config.js";
import {
  loginSchema,
  registerSchema,
} from "../../common/validators/auth.validators.js";
import {
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  setAuthenticationCookies,
} from "../../common/utils/cookie.js";
import { UnauthorizedException } from "../../common/utils/catch-error.js";

export class AuthController {
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  public register = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const body = registerSchema.parse({ ...req.body });
      const { user } = await this.authService.register(body);
      return res.status(HTTPSTATUS.CREATED).json({
        message: "User registered successfully.",
        data: user,
      });
    },
  );

  public login = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const userAgent = req.headers["user-agent"];
      const body = loginSchema.parse({
        ...req.body,
        userAgent,
      });
      const { user, accessToken, refreshToken, mfaRequired } =
        await this.authService.login(body);
      return setAuthenticationCookies({
        res,
        accessToken,
        refreshToken,
      })
        .status(HTTPSTATUS.OK)
        .json({
          message: "User logged in successfully",
          user,
        });
    },
  );

  public refreshToken = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const refreshToken = req.cookies.refreshToken as string | undefined;
      if (!refreshToken) {
        throw new UnauthorizedException("User not authorized");
      }
      const { accessToken, newRefreshToken } =
        await this.authService.refreshToken(refreshToken);
      if (newRefreshToken) {
        res.cookie(
          "refreshToken",
          newRefreshToken,
          getRefreshTokenCookieOptions(),
        );
      }
      return res
        .status(HTTPSTATUS.OK)
        .cookie("accessToken", accessToken, getAccessTokenCookieOptions())
        .json({
          message: "Refresh access token successfully",
        });
    },
  );
}
