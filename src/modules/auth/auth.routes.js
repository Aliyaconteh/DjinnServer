const express = require("express");
const router = express.Router();
const AuthController = require("./auth.controller");

router.post("/signup", (req, res) => AuthController.signup(req, res));
router.post("/login", (req, res) => AuthController.login(req, res));

module.exports = router;