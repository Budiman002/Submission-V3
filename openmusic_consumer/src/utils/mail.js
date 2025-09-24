const nodemailer = require('nodemailer');

class MailService {
  constructor() {
    this._transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async sendEmail(targetEmail, subject, body, attachments = []) {
    const message = {
      from: process.env.SMTP_USER,
      to: targetEmail,
      subject: subject,
      text: body,
      attachments: attachments,
    };

    return this._transporter.sendMail(message);
  }

  async sendPlaylistExport(targetEmail, playlistData) {
    const subject = 'Export Playlist OpenMusic';
    const body = `Halo,

Berikut adalah data playlist yang Anda export dari OpenMusic.

Playlist: ${playlistData.playlist.name}
Total Lagu: ${playlistData.playlist.songs.length} lagu

Terima kasih telah menggunakan OpenMusic!

Salam,
Tim OpenMusic`;

    const attachment = {
      filename: `playlist-${playlistData.playlist.name.replace(/\s+/g, '-')}.json`,
      content: JSON.stringify(playlistData, null, 2),
      contentType: 'application/json',
    };

    return this.sendEmail(targetEmail, subject, body, [attachment]);
  }
}

module.exports = MailService;