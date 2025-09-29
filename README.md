# OpenMusic API v3

OpenMusic API adalah RESTful API untuk manajemen musik, playlist, dan kolaborasi antar pengguna. Project ini merupakan submission akhir untuk kelas Backend Developer Expert di Dicoding Indonesia.

## Features

### Core Features (v1 & v2)
- **Album Management**: CRUD operations untuk album dan songs
- **User Management**: Registrasi dan autentikasi pengguna
- **Playlist Management**: Membuat, mengelola, dan berbagi playlist
- **Authentication & Authorization**: JWT-based authentication
- **Collaboration**: Kolaborasi playlist antar pengguna

### New Features (v3)
- **Album Cover Upload**: Upload gambar cover untuk album
- **Album Likes**: Like/unlike album dengan caching
- **Server-Side Caching**: Redis cache untuk album likes (TTL 30 menit)
- **Playlist Export**: Export playlist ke email menggunakan message queue
- **Email Notification**: Pengiriman email dengan attachment JSON

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Hapi.js
- **Database**: PostgreSQL
- **Cache**: Redis
- **Message Broker**: RabbitMQ
- **Authentication**: JWT (JSON Web Token)
- **Email**: Nodemailer
- **Validation**: Joi
- **Migration**: node-pg-migrate

## Prerequisites

Pastikan sistem Anda sudah terinstall:

- Node.js (v14 atau lebih tinggi)
- PostgreSQL (v12 atau lebih tinggi)
- Redis Server
- RabbitMQ Server
- npm atau yarn

## Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd openmusic-api-v3
```

### 2. Install Dependencies

```bash
# Install dependencies untuk API server
cd openmusic-api-v1
npm install

# Install dependencies untuk Consumer service
cd ../openmusic_consumer
npm install
```

### 3. Database Setup

```bash
# Buat database PostgreSQL
createdb openmusic

# Jalankan migrations
cd openmusic-api-v1
npm run migrate up
```

### 4. Environment Configuration

Buat file `.env` di root folder `openmusic-api-v1`:

```env
# Server Configuration
HOST=localhost
PORT=5000

# Database Configuration
PGUSER=your_postgres_username
PGHOST=localhost
PGDATABASE=openmusic
PGPORT=5432
PGPASSWORD=your_postgres_password

# JWT Configuration
ACCESS_TOKEN_KEY=your-secret-access-token-key
REFRESH_TOKEN_KEY=your-secret-refresh-token-key
ACCESS_TOKEN_AGE=1800

# Redis Configuration
REDIS_SERVER=localhost

# RabbitMQ Configuration
RABBITMQ_SERVER=amqp://localhost

# SMTP Configuration (untuk email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

Buat file `.env` di root folder `openmusic_consumer`:

```env
# RabbitMQ Configuration
RABBITMQ_SERVER=amqp://localhost

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

## Running the Application

### Start Services

**Terminal 1 - Start Redis:**
```bash
redis-server
```

**Terminal 2 - Start RabbitMQ:**
```bash
rabbitmq-server
```

**Terminal 3 - Start API Server:**
```bash
cd openmusic-api-v1
npm start
```

**Terminal 4 - Start Consumer Service:**
```bash
cd openmusic_consumer
npm start
```

API akan berjalan di `http://localhost:5000`

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/users` | Register user baru | No |
| POST | `/authentications` | Login user | No |
| PUT | `/authentications` | Refresh access token | No |
| DELETE | `/authentications` | Logout user | No |

### Albums

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/albums` | Tambah album baru | No |
| GET | `/albums/{id}` | Get detail album | No |
| PUT | `/albums/{id}` | Update album | No |
| DELETE | `/albums/{id}` | Hapus album | No |
| POST | `/albums/{id}/covers` | Upload cover album | Yes |
| POST | `/albums/{id}/likes` | Like album | Yes |
| DELETE | `/albums/{id}/likes` | Unlike album | Yes |
| GET | `/albums/{id}/likes` | Get like count | No |

### Songs

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/songs` | Tambah song baru | No |
| GET | `/songs` | Get all songs | No |
| GET | `/songs/{id}` | Get detail song | No |
| PUT | `/songs/{id}` | Update song | No |
| DELETE | `/songs/{id}` | Hapus song | No |

### Playlists

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/playlists` | Buat playlist baru | Yes |
| GET | `/playlists` | Get user playlists | Yes |
| DELETE | `/playlists/{id}` | Hapus playlist | Yes |
| POST | `/playlists/{id}/songs` | Tambah song ke playlist | Yes |
| GET | `/playlists/{id}/songs` | Get songs dalam playlist | Yes |
| DELETE | `/playlists/{id}/songs` | Hapus song dari playlist | Yes |

### Exports

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/export/playlists/{id}` | Export playlist ke email | Yes |

## Project Structure

```
openmusic-api-v3/
├── openmusic-api-v1/           # Main API Server
│   ├── migrations/              # Database migrations
│   ├── src/
│   │   ├── api/                 # API endpoints
│   │   │   ├── albums/
│   │   │   ├── songs/
│   │   │   ├── users/
│   │   │   ├── authentications/
│   │   │   ├── playlists/
│   │   │   └── exports/
│   │   ├── services/            # Business logic
│   │   │   └── postgres/
│   │   ├── validator/           # Input validation
│   │   ├── utils/               # Utilities (cache, messaging)
│   │   ├── exceptions/          # Custom errors
│   │   ├── tokenize/            # JWT token manager
│   │   └── server.js            # Main server
│   ├── uploads/                 # Uploaded files
│   ├── .env                     # Environment config
│   └── package.json
│
└── openmusic_consumer/          # Consumer Service
    ├── src/
    │   ├── consumer.js          # RabbitMQ consumer
    │   ├── MailSender.js        # Email service
    │   └── PlaylistsService.js  # Playlist data service
    ├── .env
    └── package.json
```

## File Upload Specifications

- **Allowed formats**: JPEG, PNG, GIF
- **Maximum size**: 512 KB
- **Storage**: Local file system (`uploads/images/`)
- **URL format**: `http://localhost:5000/upload/images/{filename}`

## Cache Specifications

- **Type**: Redis cache
- **Purpose**: Album likes count
- **TTL**: 30 minutes (1800 seconds)
- **Cache key format**: `likes:{albumId}`
- **Invalidation**: Automatic on like/unlike actions
- **Header**: `X-Data-Source: cache` when data from cache

## Message Queue Flow

1. User request export playlist via API
2. API validates dan sends message to RabbitMQ queue
3. Consumer service receives message from queue
4. Consumer fetches playlist data dari database
5. Consumer generates JSON file
6. Consumer sends email dengan attachment
7. User receives email dengan playlist data

## Testing

Gunakan Postman collection yang disediakan untuk testing:

1. Import collection `OpenMusic API V3 Test`
2. Update environment variables (base_url, tokens)
3. Run collection

### Manual Testing

```bash
# Test album creation
curl -X POST http://localhost:5000/albums \
  -H "Content-Type: application/json" \
  -d '{"name":"Album Test","year":2024}'

# Test authentication
curl -X POST http://localhost:5000/authentications \
  -H "Content-Type: application/json" \
  -d '{"username":"john","password":"secret"}'
```

## Troubleshooting

### Database Issues

**Problem**: Migration failed
```bash
# Solution: Reset migrations
npm run migrate down
npm run migrate up
```

**Problem**: Connection refused
```bash
# Check PostgreSQL status
sudo service postgresql status
sudo service postgresql start
```

### Redis Issues

**Problem**: Redis connection failed
```bash
# Check Redis status
redis-cli ping
# Should return PONG

# Start Redis
redis-server
```

### RabbitMQ Issues

**Problem**: Message queue not working
```bash
# Check RabbitMQ status
sudo rabbitmqctl status

# Start RabbitMQ
sudo rabbitmq-server
```

### File Upload Issues

**Problem**: Upload failed
```bash
# Check uploads directory permissions
chmod 755 uploads/
chmod 755 uploads/images/
```

## Development Scripts

```bash
# Run development server with auto-reload
npm run start-dev

# Run migrations
npm run migrate up
npm run migrate down

# Run specific migration
npm run migrate up 1234567890123_migration_name.js
```

## Security Notes

- Never commit `.env` file ke repository
- Gunakan strong secret keys untuk JWT
- Pastikan SMTP credentials aman
- Validate semua user inputs
- Sanitize file uploads
- Implement rate limiting untuk production

## License

This project is created for educational purposes as part of Dicoding Indonesia Backend Developer Expert class.

## Author

Created by Budiman002 - 

## Acknowledgments
- Dicoding Indonesia untuk course materials
- Hapi.js framework documentation
- PostgreSQL documentation
- Redis documentation
- RabbitMQ documentation
