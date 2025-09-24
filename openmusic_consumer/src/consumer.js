require('dotenv').config();

const MessageBrokerService = require('./utils/messaging');
const MailService = require('./utils/mail');
const ExportsService = require('./services/ExportsService');

const init = async () => {
  const messageBrokerService = new MessageBrokerService();
  const mailService = new MailService();
  const exportsService = new ExportsService();

  try {
    // Connect to message broker
    await messageBrokerService.connect();

    // Listen for export playlist messages
    await messageBrokerService.consumeMessage('export:playlist', async (message) => {
      try {
        console.log('Processing export playlist message:', message);
        
        const { playlistId, targetEmail } = message;

        // Get playlist data
        const playlistData = await exportsService.exportPlaylist(playlistId);
        
        // Send email with playlist data
        await mailService.sendPlaylistExport(targetEmail, playlistData);
        
        console.log(`Playlist exported and sent to ${targetEmail}`);
      } catch (error) {
        console.error('Error processing export message:', error);
        throw error;
      }
    });

    console.log('Consumer service started successfully');
  } catch (error) {
    console.error('Failed to start consumer service:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down consumer...');
  await messageBrokerService.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down consumer...');
  await messageBrokerService.close();
  process.exit(0);
});

init();