class PlaylistsHandler {
  constructor(service, songsService, validator) {
    this._service = service;
    this._songsService = songsService;
    this._validator = validator;

    this.postPlaylistHandler = this.postPlaylistHandler.bind(this);
    this.getPlaylistsHandler = this.getPlaylistsHandler.bind(this);
    this.deletePlaylistByIdHandler = this.deletePlaylistByIdHandler.bind(this);
    this.postSongToPlaylistHandler = this.postSongToPlaylistHandler.bind(this);
    this.getSongsFromPlaylistHandler =
      this.getSongsFromPlaylistHandler.bind(this);
    this.deleteSongFromPlaylistHandler =
      this.deleteSongFromPlaylistHandler.bind(this);
  }

  async postPlaylistHandler(request, h) {
    this._validator.validatePostPlaylistPayload(request.payload);
    const { name } = request.payload;
    const { userId } = request.auth.credentials;

    const playlistId = await this._service.addPlaylist({
      name,
      owner: userId,
    });

    const response = h.response({
      status: "success",
      message: "Playlist berhasil ditambahkan",
      data: {
        playlistId,
      },
    });
    response.code(201);
    return response;
  }

  async getPlaylistsHandler(request, h) {
    const { userId } = request.auth.credentials;
    const playlists = await this._service.getPlaylists(userId);

    return {
      status: "success",
      data: {
        playlists,
      },
    };
  }

  async deletePlaylistByIdHandler(request, h) {
    const { id } = request.params;
    const { userId } = request.auth.credentials;

    // Verify playlist ownership before deletion
    await this._service.verifyPlaylistOwner(id, userId);
    await this._service.deletePlaylistById(id);

    return {
      status: "success",
      message: "Playlist berhasil dihapus",
    };
  }

  async postSongToPlaylistHandler(request, h) {
    this._validator.validatePostPlaylistSongPayload(request.payload);
    const { songId } = request.payload;
    const { id: playlistId } = request.params;
    const { userId } = request.auth.credentials;

    // Verify song exists
    await this._songsService.getSongById(songId);

    // Verify playlist access (owner or collaborator)
    await this._service.verifyPlaylistAccess(playlistId, userId);

    // Add song to playlist
    await this._service.addSongToPlaylist(playlistId, songId);

    const response = h.response({
      status: "success",
      message: "Lagu berhasil ditambahkan ke playlist",
    });
    response.code(201);
    return response;
  }

  async getSongsFromPlaylistHandler(request, h) {
    const { id: playlistId } = request.params;
    const { userId } = request.auth.credentials;

    // Verify playlist access (owner or collaborator)
    await this._service.verifyPlaylistAccess(playlistId, userId);

    // Get playlist with songs
    const playlist = await this._service.getPlaylistById(playlistId);

    return {
      status: "success",
      data: {
        playlist,
      },
    };
  }

  async deleteSongFromPlaylistHandler(request, h) {
    this._validator.validateDeletePlaylistSongPayload(request.payload);
    const { songId } = request.payload;
    const { id: playlistId } = request.params;
    const { userId } = request.auth.credentials;

    // Verify playlist access (owner or collaborator)
    await this._service.verifyPlaylistAccess(playlistId, userId);

    // Delete song from playlist
    await this._service.deleteSongFromPlaylist(playlistId, songId);

    return {
      status: "success",
      message: "Lagu berhasil dihapus dari playlist",
    };
  }
}

module.exports = PlaylistsHandler;
