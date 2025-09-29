const { Pool } = require('pg');
const NotFoundError = require('../../exceptions/NotFoundError');

class ExportsService {
  constructor() {
    this._pool = new Pool({
      user: process.env.PGUSER,
      host: process.env.PGHOST,
      database: process.env.PGDATABASE,
      port: process.env.PGPORT,
    });
  }

  async exportPlaylist(playlistId) {
    // Get playlist info
    const playlistQuery = {
      text: `SELECT p.id, p.name, u.username 
             FROM playlists p 
             LEFT JOIN users u ON u.id = p.owner 
             WHERE p.id = $1`,
      values: [playlistId],
    };

    const playlistResult = await this._pool.query(playlistQuery);

    if (!playlistResult.rowCount) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }

    const playlist = playlistResult.rows[0];

    // Get songs in playlist
    const songsQuery = {
      text: `SELECT s.id, s.title, s.performer 
             FROM playlist_songs ps 
             LEFT JOIN songs s ON s.id = ps.song_id 
             WHERE ps.playlist_id = $1`,
      values: [playlistId],
    };

    const songsResult = await this._pool.query(songsQuery);

    // Format export data
    const exportData = {
      playlist: {
        id: playlist.id,
        name: playlist.name,
        songs: songsResult.rows,
      },
    };

    return exportData;
  }
}

module.exports = ExportsService;