import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "@shared/index";
import { User, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import AppError from "../utils/appError";
import catchAsync from "../utils/catchAsync";

interface JwtPayload {
  id: string;
  iat: number;
}

const signToken = (id: string): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  return jwt.sign({ id }, process.env.JWT_SECRET);
};

const createSendToken = (
  user: typeof users.$inferSelect,
  statusCode: number,
  res: Response
): void => {
  const token = signToken(user.id.toString());

  const cookieOptions = {
    expires: new Date(
      Date.now() +
        parseInt(process.env.JWT_COOKIE_EXPIRES_IN || "90") *
          24 *
          60 *
          60 *
          1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  res.cookie("jwt", token, cookieOptions);
  const { password: _, ...userWithoutPassword } = user;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user: userWithoutPassword,
    },
  });
};

export const getUserFromRequest = async (req: Request) => {
  const token = req.cookies.jwt;

  if (!token) {
    throw new AppError("Not logged in", 401);
  }

  let decoded: { id: string };
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
  } catch (err) {
    throw new AppError("Invalid or expired token", 401);
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, parseInt(decoded.id)))
    .limit(1);

  if (!user) {
    throw new AppError("User no longer exists", 404);
  }

  const { password: _, ...userWithoutPassword } = user;

  return userWithoutPassword;
};

// Controller methods
export const signup = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { firstName, lastName, email, password, role } = req.body;
    // Check if email exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      return next(new AppError("Email already in use", 400));
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role,
      })
      .returning();

    createSendToken(newUser, 201, res);
  }
);

export const login = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError("Please provide email and password", 400));
    }

    // Get user with password
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return next(new AppError("Incorrect email or password", 401));
    }

    createSendToken(user, 200, res);
  }
);

export const profile = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = (req.user as { id: number }).id;
    const updatedFields = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
    };

    // Check if email is already taken
    if (updatedFields.email) {
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, updatedFields.email))
        .limit(1);

      if (existingUser.length > 0 && existingUser[0].id !== Number(userId)) {
        return next(new AppError("Email already in use", 400));
      }
    }

    // Update user profile in the database
    const updatedUser = await db
      .update(users)
      .set(updatedFields)
      .where(eq(users.id, Number(userId)))
      .returning();

    if (updatedUser.length === 0) {
      next(new AppError("User not found", 404));
    }

    // Exclude password from response
    const { password, ...userWithoutPassword } = updatedUser[0];
    res.json(userWithoutPassword);
  }
);

export const protect = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    let token: string | undefined;

    // 1) Get token from header or cookie
    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return next(
        new AppError("You are not logged in! Please log in to get access.", 401)
      );
    }

    // 2) Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    // 3) Check if user still exists
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(decoded.id)))
      .limit(1);

    if (!currentUser) {
      return next(
        new AppError("The user belonging to this token no longer exists.", 401)
      );
    }

    // 4) Grant access
    if (currentUser.role !== "professor" && currentUser.role !== "student") {
      return next(new AppError("Invalid user role", 401));
    }
    req.user = {
      ...currentUser,
      role: currentUser.role as "professor" | "student",
    };
    next();
  }
);

export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }
    next();
  };
};

export const updatePassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    if (!(await bcrypt.compare(req.body.passwordCurrent, user.password))) {
      return next(new AppError("Your current password is wrong", 401));
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 12);

    const [updatedUser] = await db
      .update(users)
      .set({
        password: hashedPassword,
      })
      .where(eq(users.id, userId))
      .returning();

    createSendToken(updatedUser, 200, res);
  }
);

export const logout = (req: Request, res: Response): void => {
  res.clearCookie("jwt", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // optional: depends on env
    sameSite: "strict", // optional: depends on how your site is structured
  });
  res.status(200).json({ status: "success" });
};
