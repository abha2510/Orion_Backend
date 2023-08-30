const jwt = require("jsonwebtoken");
require("dotenv").config();
const UserModel = require("../models/User.Model");

const JWT_SECRET = process.env.JWT_SECRET;
async function auth(req, res, next) {
  const authHeader = req.headers["Authorization"] || req.headers["authorization"];

  // Check if authHeader is defined
  if (!authHeader) {
      return res.status(401).send({ msg: "Authorization header is missing" });
  }
  
  // Now that we know authHeader is defined, we can safely use .replace
  const token = authHeader.replace("Bearer", "").trim();
  

  if (!token) {
    return res.status(401).send({ msg: "Please Login" });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(401).send({ msg: "Please Login" });
    }
    if (decoded && decoded.userId) {
      const user = await UserModel.findById(decoded.userId);
      if (!user) {
        return res.status(401).send({ msg: "User not found. Please Login" });
      }
      req.userId = decoded.userId;
      req.role = decoded.role;
      next();
    } else {
      res.status(401).send({ msg: "Please Login" });
    }
  });
}

function isAdmin(req, res, next) {
  if (req.role !== "admin") {
    return res.status(403).send({ msg: "Access denied. Admins only." });
  }
  next();
}

module.exports = { auth, isAdmin };
