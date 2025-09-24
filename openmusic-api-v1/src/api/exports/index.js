const ExportsHandler = require('./handler');
const routes = require('./routes');

module.exports = {
  name: 'exports',
  version: '1.0.0',
  register: async (server, { exportsService, playlistsService, messageBrokerService, validator }) => {
    const exportsHandler = new ExportsHandler(
      exportsService, 
      playlistsService, 
      messageBrokerService, 
      validator
    );
    server.route(routes(exportsHandler));
  },
};