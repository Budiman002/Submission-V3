require("dotenv").config();

console.log("Environment check:");
console.log("PGUSER:", process.env.PGUSER);
console.log("PGHOST:", process.env.PGHOST);
console.log("PGDATABASE:", process.env.PGDATABASE);
console.log("PGPORT:", process.env.PGPORT);

const Hapi = require("@hapi/hapi");
const Jwt = require("@hapi/jwt");
const Inert = require("@hapi/inert");
const ClientError = require("./exceptions/ClientError");

// albums
const albums = require("./api/albums");
const AlbumsService = require("./services/postgres/AlbumService");
const AlbumsValidator = require("./validator/albums");

// songs
const songs = require("./api/songs");
const SongsService = require("./services/postgres/SongsService");
const SongsValidator = require("./validator/songs");

// users
const users = require("./api/users");
const UsersService = require("./services/postgres/UsersService");
const UsersValidator = require("./validator/users");

// authentications
const authentications = require("./api/authentications");
const AuthenticationsService = require("./services/postgres/AuthenticationService");
const TokenManager = require("./tokenize/TokenManager");
const AuthenticationsValidator = require("./validator/authentications");

// playlists
const playlists = require("./api/playlists");
const PlaylistsService = require("./services/postgres/PlaylistsService");
const PlaylistsValidator = require("./validator/playlists");

// auth middleware
const authMiddleware = require("./middleware/auth");

const UserAlbumLikesService = require("./services/postgres/UserAlbumLikeService");

// cache
const CacheService = require("./utils/cache");

// exports
const exportsPlugin = require("./api/exports");
const ExportsService = require("./services/postgres/ExportsService");
const ExportsValidator = require("./validator/exports");

// messaging
const MessageBrokerService = require("./utils/messaging");

const init = async () => {
  const cacheService = new CacheService();
  const albumsService = new AlbumsService();
  const songsService = new SongsService();
  const usersService = new UsersService();
  const authenticationsService = new AuthenticationsService();
  const playlistsService = new PlaylistsService();
  const userAlbumLikesService = new UserAlbumLikesService(cacheService);
  const exportsService = new ExportsService();
  const messageBrokerService = new MessageBrokerService();
  const authMiddlewareInstance = authMiddleware(TokenManager);

  const server = Hapi.server({
    port: process.env.PORT || 5000,
    host: process.env.HOST || "localhost",
    routes: {
      cors: {
        origin: ["*"],
      },
    },
  });

  // Initialize cache connection
  try {
    await cacheService.connect();
  } catch (error) {
    console.warn("Failed to connect to Redis:", error.message);
    console.warn("Continuing without cache...");
  }

  // Initialize message broker connection
  try {
    await messageBrokerService.connect();
  } catch (error) {
    console.warn("Failed to connect to RabbitMQ:", error.message);
    console.warn("Continuing without message broker...");
  }

  // Register plugins
  await server.register([
    {
      plugin: Jwt,
    },
    {
      plugin: Inert,
    },
  ]);

  // Setup JWT strategy
  server.auth.strategy("openmusic_jwt", "jwt", {
    keys: process.env.ACCESS_TOKEN_KEY,
    verify: {
      aud: false,
      iss: false,
      sub: false,
      maxAgeSec: process.env.ACCESS_TOKEN_AGE,
    },
    validate: (artifacts) => {
      const userId =
        artifacts.decoded?.payload?.userId || artifacts.decoded?.payload?.id;

      if (!userId) {
        return { isValid: false };
      }

      return {
        isValid: true,
        credentials: {
          id: userId,
        },
      };
    },
  });

  // server.auth.strategy("openmusic_jwt", "jwt", {
  //   keys: process.env.ACCESS_TOKEN_KEY,
  //   verify: {
  //     aud: false,
  //     iss: false,
  //     sub: false,
  //     maxAgeSec: process.env.ACCESS_TOKEN_AGE,
  //   },
  //   validate: (artifacts) => {
  //     // DEBUG: Log JWT payload
  //     console.log("JWT artifacts:", artifacts);
  //     console.log("JWT decoded payload:", artifacts.decoded.payload);

  //     // ENSURE: Return user ID from correct location
  //     const userId = artifacts.decoded.payload.id;
  //     console.log("Extracted user ID:", userId);

  //     if (!userId) {
  //       console.error("User ID not found in JWT payload");
  //       return { isValid: false };
  //     }

  //     return {
  //       isValid: true,
  //       credentials: {
  //         id: userId,
  //       },
  //     };
  //   },
  // });

  // Static file serving untuk uploaded images
  server.route({
    method: "GET",
    path: "/upload/{param*}",
    handler: {
      directory: {
        path: "uploads",
      },
    },
  });

  // Register all plugins
  await server.register([
    {
      plugin: albums,
      options: {
        service: albumsService,
        validator: AlbumsValidator,
        likesService: userAlbumLikesService,
      },
    },
    {
      plugin: songs,
      options: {
        service: songsService,
        validator: SongsValidator,
      },
    },
    {
      plugin: users,
      options: {
        service: usersService,
        validator: UsersValidator,
      },
    },
    {
      plugin: authentications,
      options: {
        authenticationsService,
        usersService,
        tokenManager: TokenManager,
        validator: AuthenticationsValidator,
      },
    },
    {
      plugin: playlists,
      options: {
        service: playlistsService,
        songsService,
        validator: PlaylistsValidator,
        authMiddleware: authMiddlewareInstance,
      },
    },
    {
      plugin: exportsPlugin,
      options: {
        exportsService,
        playlistsService,
        messageBrokerService,
        validator: ExportsValidator,
      },
    },
  ]);

  server.ext("onPreResponse", (request, h) => {
    const { response } = request;

    if (response instanceof Error) {
      if (response instanceof ClientError) {
        const newResponse = h.response({
          status: "fail",
          message: response.message,
        });
        newResponse.code(response.statusCode);
        return newResponse;
      }

      if (!response.isServer) {
        return h.continue;
      }

      const newResponse = h.response({
        status: "error",
        message: "Maaf, terjadi kegagalan pada server kami.",
      });
      newResponse.code(500);
      console.error(response);
      return newResponse;
    }

    return h.continue;
  });

  await server.start();
  console.log(`Server berjalan pada ${server.info.uri}`);

  // Graceful shutdown
  const gracefulShutdown = async () => {
    console.log("Stopping server...");
    await server.stop();
    try {
      await cacheService.disconnect();
      console.log("Cache disconnected");
    } catch (error) {
      console.error("Error disconnecting cache:", error);
    }
    try {
      await messageBrokerService.close();
      console.log("Message broker disconnected");
    } catch (error) {
      console.error("Error disconnecting message broker:", error);
    }
    process.exit(0);
  };

  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);
};

process.on("unhandledRejection", (err) => {
  console.log(err);
  process.exit(1);
});

init();
