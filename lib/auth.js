import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';

export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.isApiError = true;
  }
}

// Generate JWT token
export function generateToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'defaultsecret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// Authentication middleware equivalent for Next.js route handlers.
// Extracts the token from the Authorization header or the `token` cookie,
// verifies it and returns the authenticated user, or throws an ApiError.
export async function requireAuth(request) {
  let token;

  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer')) {
    token = authHeader.split(' ')[1];
  } else if (request.cookies.get('token')) {
    token = request.cookies.get('token').value;
  }

  if (!token) {
    throw new ApiError(401, 'No token provided, authorization denied');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'defaultsecret');

    await connectDB();
    const user = await User.findById(decoded.id);

    if (!user) {
      throw new ApiError(401, 'Token is valid but user no longer exists');
    }

    return user;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.name === 'JsonWebTokenError') {
      throw new ApiError(401, 'Invalid token');
    }
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Token expired');
    }
    throw new ApiError(500, 'Server error during authentication');
  }
}

// Central error -> JSON response mapping matching the Express global error handler.
export function handleApiError(error, fallbackMessage = 'Internal Server Error') {
  // Cache Components prerender interruption — let Next.js handle it.
  if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') {
    throw error;
  }

  if (error instanceof ApiError) {
    return Response.json({ message: error.message }, { status: error.statusCode });
  }

  console.error(error);
  return Response.json({ message: fallbackMessage }, { status: 500 });
}
