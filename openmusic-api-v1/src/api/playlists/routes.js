const routes = (handler, authMiddleware, playlistsService) => [
  {
    method: 'POST',
    path: '/playlists',
    handler: (request, h) => handler.postPlaylistHandler(request, h),
    options: {
      pre: [
        {
          method: authMiddleware.authenticate,
        },
      ],
    },
  },
  {
    method: 'GET',
    path: '/playlists',
    handler: (request, h) => handler.getPlaylistsHandler(request, h),
    options: {
      pre: [
        {
          method: authMiddleware.authenticate,
        },
      ],
    },
  },
  {
    method: 'DELETE',
    path: '/playlists/{id}',
    handler: (request, h) => handler.deletePlaylistByIdHandler(request, h),
    options: {
      pre: [
        {
          method: authMiddleware.authenticate,
        },
      ],
    },
  },
  {
    method: 'POST',
    path: '/playlists/{id}/songs',
    handler: (request, h) => handler.postSongToPlaylistHandler(request, h),
    options: {
      pre: [
        {
          method: authMiddleware.authenticate,
        },
      ],
    },
  },
  {
    method: 'GET',
    path: '/playlists/{id}/songs',
    handler: (request, h) => handler.getSongsFromPlaylistHandler(request, h),
    options: {
      pre: [
        {
          method: authMiddleware.authenticate,
        },
      ],
    },
  },
  {
    method: 'DELETE',
    path: '/playlists/{id}/songs',
    handler: (request, h) => handler.deleteSongFromPlaylistHandler(request, h),
    options: {
      pre: [
        {
          method: authMiddleware.authenticate,
        },
      ],
    },
  },
];

module.exports = routes;