import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Unauthorized - No token provided" });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.id).select('-password -__v');
    
    if (!user) {
      return res.status(401).json({ error: "Unauthorized - User not found" });
    }

    // Set user info to request
    req.user = user; 
    req.userId = user._id; 

    next();
  } catch (err) {
    console.error('Authentication error:', err.message);

    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: "Unauthorized - Invalid token" });
    }

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: "Unauthorized - Token expired" });
    }

    res.status(500).json({ error: "Authentication failed" });
  }
};

export const checkAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: "Forbidden - Admin access required",
        message: "User not authorized to access this resource"
      });
    }

    next();
  } catch (err) {
    console.error('Admin check error:', err.message);
    res.status(500).json({ error: "Authorization check failed" });
  }
};

