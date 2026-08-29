'use strict';

function cachePolicy(request, response, next) {
  const publicContent = request.method === 'GET' && (
    request.path.startsWith('/api/v1/learning/') || request.path === '/api/v1/announcements'
  );
  if (request.path.startsWith('/api/v1/admin/') || request.path.startsWith('/api/v1/users/') || request.path.includes('/evidence')) {
    response.set('Cache-Control', 'private, no-store');
  } else if (publicContent) {
    response.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
  } else if (request.path.startsWith('/api/')) {
    response.set('Cache-Control', 'no-store');
  }
  next();
}

module.exports = cachePolicy;
