import "dotenv/config";
import cors from "cors";
import express, { type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import { config } from "./config/app.config.js";
import connectDb from "./database/database.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { HTTPSTATUS } from "./config/http.config.js";

const app = express();
const BASE_PATH = config.BASE_PATH;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({ origin: config.APP_ORIGIN, credentials: true }));
app.use(cookieParser());

app.get("/", (req: Request, res: Response) => {
  res.status(HTTPSTATUS.OK).json({
    message: "Hello Subscribers!!!",
  });
});

app.use(errorHandler);
app.listen(config.PORT, async () => {
  console.log(`Server listening on port ${config.PORT} in ${config.NODE_ENV}`);
  await connectDb();
});
