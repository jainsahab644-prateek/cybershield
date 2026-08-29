'use strict';

const authService = require('../services/auth.service');
const { SESSION_COOKIE_NAME } = require('../config/session');
const { sendSuccess } = require('../utils/apiResponse');
const { env } = require('../config/env');

function requestOtp(request, response, next) {
  try {
    const result = authService.requestOtp(request.validatedAuth);
    return sendSuccess(response, {
      message: 'If the information is valid, a verification code is now available.',
      data: result
    });
  } catch (error) {
    return next(error);
  }
}

function verifyOtp(request, response, next) {
  try {
    const authenticated = authService.verifyOtp(request.validatedAuth);
    return request.session.regenerate((regenerateError) => {
      if (regenerateError) return next(regenerateError);
      request.session.userId = authenticated.internalId;
      return request.session.save((saveError) => {
        if (saveError) return next(saveError);
        return sendSuccess(response, {
          message: 'Signed in successfully.',
          data: { user: authenticated.user }
        });
      });
    });
  } catch (error) {
    return next(error);
  }
}

function getMe(request, response) {
  return sendSuccess(response, { data: { user: request.authUser.user } });
}

function getDevelopmentConfig(request, response) {
  return sendSuccess(response, {
    data: {
      developmentMode: env.NODE_ENV === 'development' || env.DEMO_MODE,
      demoMode: env.DEMO_MODE,
      demoOtp: env.DEMO_MODE && !env.DISABLE_AUTHENTICATION ? env.DEV_OTP : undefined,
      demoAdminEmail: env.DEMO_MODE && !env.DISABLE_AUTHENTICATION ? env.DEMO_ADMIN_EMAIL : undefined
    }
  });
}

function logout(request, response, next) {
  request.session.destroy((error) => {
    if (error) return next(error);
    response.clearCookie(SESSION_COOKIE_NAME, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production'
    });
    return sendSuccess(response, { message: 'Signed out successfully.' });
  });
}

module.exports = { getDevelopmentConfig, getMe, logout, requestOtp, verifyOtp };
