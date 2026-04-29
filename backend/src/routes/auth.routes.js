/**
 * Auth Routes
 */

const { Router } = require('express');
const AuthController = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const { signupRules, loginRules } = require('../validators/auth.validator');
const { publicLimiter, strictLimiter } = require('../middleware/rateLimiter');

const router = Router();

router.post('/signup', publicLimiter, validate(signupRules), AuthController.signup);
router.post('/login', strictLimiter, validate(loginRules), AuthController.login);
router.post('/google', strictLimiter, AuthController.googleLogin);
router.post('/admin-login', strictLimiter, validate(loginRules), AuthController.adminLogin);

module.exports = router;
