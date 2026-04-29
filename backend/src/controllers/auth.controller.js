/**
 * Auth Controller — Thin handler layer for authentication routes.
 */

const AuthService = require('../services/auth.service');
const { sendSuccess } = require('../utils/response');

const AuthController = {
  async signup(req, res, next) {
    try {
      const result = await AuthService.signup(req.body);
      return sendSuccess(res, result, 'Account created successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      return sendSuccess(res, result, 'Login successful');
    } catch (err) {
      next(err);
    }
  },

  async googleLogin(req, res, next) {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ status: 'error', message: 'Token is required' });
      }
      const result = await AuthService.googleLogin(token);
      return sendSuccess(res, result, 'Google login successful');
    } catch (err) {
      next(err);
    }
  },

  async adminLogin(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.adminLogin(email, password);
      return sendSuccess(res, result, 'Admin login successful');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = AuthController;
