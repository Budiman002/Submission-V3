const AuthenticationError = require('../exceptions/AuthenticationError');
const AuthorizationError = require('../exceptions/AuthorizationError');

const authMiddleware = (tokenManager) => ({
  authenticate: (request, h) => {
    const { authorization } = request.headers;


    if (!authorization || !authorization.startsWith('Bearer ')) {
      const response = h.response({
        status: 'fail',
        message: 'Missing authentication',
      });
      response.code(401);
      return response.takeover();
    }

    const token = authorization.substring(7);
    
    try {
      const { userId } = tokenManager.verifyAccessToken(token);
      request.auth = { credentials: { userId } };
      return h.continue;
    } catch (error) {
      const response = h.response({
        status: 'fail',
        message: 'Invalid token',
      });
      response.code(401);
      return response.takeover();
    }
  },

  verifyPlaylistOwner: (playlistsService) => async (request, h) => {
    try {
      const { id: playlistId } = request.params;
      const { userId } = request.auth.credentials;

      await playlistsService.verifyPlaylistOwner(playlistId, userId);
      return h.continue;
    } catch (error) {
      if (error.name === 'NotFoundError') {
        const response = h.response({
          status: 'fail',
          message: error.message,
        });
        response.code(404);
        return response.takeover();
      }

      if (error.name === 'AuthorizationError') {
        const response = h.response({
          status: 'fail',
          message: error.message,
        });
        response.code(403);
        return response.takeover();
      }

      const response = h.response({
        status: 'error',
        message: 'Maaf, terjadi kegagalan pada server kami.',
      });
      response.code(500);
      return response.takeover();
    }
  },

  verifyPlaylistAccess: (playlistsService) => async (request, h) => {
    try {
      const { id: playlistId } = request.params;
      const { userId } = request.auth.credentials;

      await playlistsService.verifyPlaylistAccess(playlistId, userId);
      return h.continue;
    } catch (error) {
      if (error.name === 'NotFoundError') {
        const response = h.response({
          status: 'fail',
          message: error.message,
        });
        response.code(404);
        return response.takeover();
      }

      if (error.name === 'AuthorizationError') {
        const response = h.response({
          status: 'fail',
          message: error.message,
        });
        response.code(403);
        return response.takeover();
      }

      const response = h.response({
        status: 'error',
        message: 'Maaf, terjadi kegagalan pada server kami.',
      });
      response.code(500);
      return response.takeover();
    }
  },
});

module.exports = authMiddleware;