const ClientError = require('../../exceptions/ClientError');

class ExportsHandler {
  constructor(exportsService, playlistsService, messageBrokerService, validator) {
    this._exportsService = exportsService;
    this._playlistsService = playlistsService;
    this._messageBrokerService = messageBrokerService;
    this._validator = validator;
  }

  async postExportPlaylistHandler(request, h) {
    try {
      this._validator.validateExportPlaylistPayload(request.payload);
      
      const { playlistId } = request.params;
      const { targetEmail } = request.payload;
      const { id: userId } = request.auth.credentials;

      // Verify user has access to playlist
      await this._playlistsService.verifyPlaylistAccess(playlistId, userId);

      // Send message to queue for processing
      const message = {
        playlistId,
        targetEmail,
        userId,
      };

      await this._messageBrokerService.sendMessage('export:playlist', message);

      const response = h.response({
        status: 'success',
        message: 'Permintaan Anda sedang kami proses',
      });
      response.code(201);
      return response;
    } catch (error) {
      if (error instanceof ClientError) {
        const response = h.response({
          status: 'fail',
          message: error.message,
        });
        response.code(error.statusCode);
        return response;
      }


      const response = h.response({
        status: 'error',
        message: 'Maaf, terjadi kegagalan pada server kami.',
      });
      response.code(500);
      console.error(error);
      return response;
    }
  }
}

module.exports = ExportsHandler;