import type { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type { AuthService } from "./auth.service.js";
import { HTTPSTATUS } from "../../config/http.config.js";
import { registerSchema } from "../../common/validators/auth.validators.js";

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
}
