import { Router } from "express";
import { authenticateJWT } from "../../common/strategies/jwt.strategy.js";
import { mfaController } from "./mfa.module.js";

const mfaRoutes = Router();

mfaRoutes.get("/setup", authenticateJWT, mfaController.generateMFA);

export default mfaRoutes;
