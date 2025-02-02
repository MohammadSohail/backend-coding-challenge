import bcrypt from "bcrypt";
import { Request, Response } from "express";
import User from "../models/User";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "../constants/messages";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt";
import jwt from "jsonwebtoken";
import { blacklistToken } from "../services/redisService";

export const signup = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      email,
      password: hashedPassword,
    });

    await user.save();
    res.status(201).json({ message: SUCCESS_MESSAGES.USER_CREATED });
  } catch (err: Error | any) {
    if (err.code === 11000) {
      res.status(400).json({ error: ERROR_MESSAGES.SIGNUP_FAILED });
    } else {
      res.status(500).json({ error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
    }
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ error: ERROR_MESSAGES.INVALID_CREDENTIALS });
      return;
    }

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res
      .status(200)
      .json({ message: SUCCESS_MESSAGES.LOGIN_SUCCESSFUL, accessToken });
  } catch (error) {
    res.status(500).json({ error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: ERROR_MESSAGES.MISSING_TOKEN });
      return;
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      res.status(401).json({ error: ERROR_MESSAGES.INVALID_TOKEN });
      return;
    }

    const decoded: any = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      res.status(400).json({ error: ERROR_MESSAGES.INVALID_TOKEN_PAYLOAD });
      return;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const expSeconds = decoded.exp;
    const ttl = expSeconds - nowSeconds;

    if (ttl <= 0) {
      res.status(400).json({ error: ERROR_MESSAGES.TOKEN_ALREADY_EXPIRED });
      return;
    }

    await blacklistToken(token, ttl);

    res.status(204).json({ message: SUCCESS_MESSAGES.LOGOUT_SUCCESSFUL });
  } catch (error) {
    res.status(500).json({ error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};
