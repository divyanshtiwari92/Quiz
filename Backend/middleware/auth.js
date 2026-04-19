const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "cbt_secret_key_2024";

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized: No token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};

module.exports = { authMiddleware, JWT_SECRET };
