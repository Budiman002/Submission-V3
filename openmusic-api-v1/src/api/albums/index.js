const AlbumsHandler = require('./handler');
const routes = require('./routes');

module.exports = {
  name: 'albums',
  version: '1.0.0',
  register: async (server, { service, validator, likesService }) => {
    const albumsHandler = new AlbumsHandler(service, validator, likesService);
    server.route(routes(albumsHandler));
  },
};