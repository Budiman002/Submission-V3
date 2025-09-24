const { Pool } = require("pg");
const { nanoid } = require("nanoid");
const InvariantError = require("../../exceptions/InvariantError");
const NotFoundError = require("../../exceptions/NotFoundError");

class UserAlbumLikesService {
  constructor(cacheService) {
    this._pool = new Pool({
      user: process.env.PGUSER,
      host: process.env.PGHOST,
      database: process.env.PGDATABASE,
      port: process.env.PGPORT,
      password: process.env.PGPASSWORD,
    });
    this._cacheService = cacheService;
  }

  async likeAlbum(userId, albumId) {
    if (!userId) {
      throw new InvariantError("User ID is required");
    }
    if (!albumId) {
      throw new InvariantError("Album ID is required");
    }

    // Check if album exists first
    const albumQuery = {
      text: "SELECT id FROM albums WHERE id = $1",
      values: [albumId],
    };
    const albumResult = await this._pool.query(albumQuery);

    if (!albumResult.rowCount) {
      throw new NotFoundError("Album tidak ditemukan");
    }

    // Check if user already liked this album
    const checkQuery = {
      text: "SELECT id FROM user_album_likes WHERE user_id = $1 AND album_id = $2",
      values: [userId, albumId],
    };
    const checkResult = await this._pool.query(checkQuery);

    if (checkResult.rowCount) {
      throw new InvariantError("Album sudah disukai sebelumnya");
    }

    // Add like
    const id = `like-${nanoid(16)}`;
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    const query = {
      text: "INSERT INTO user_album_likes VALUES($1, $2, $3, $4, $5) RETURNING id",
      values: [id, userId, albumId, createdAt, updatedAt],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new InvariantError("Gagal menyukai album");
    }

    // Invalidate cache after like
    await this._invalidateCache(albumId);

    return result.rows[0].id;
  }

  async unlikeAlbum(userId, albumId) {
    // FIX: Add parameter validation
    if (!userId) {
      throw new InvariantError("User ID is required");
    }
    if (!albumId) {
      throw new InvariantError("Album ID is required");
    }

    // Check if album exists first
    const albumQuery = {
      text: "SELECT id FROM albums WHERE id = $1",
      values: [albumId],
    };
    const albumResult = await this._pool.query(albumQuery);

    if (!albumResult.rowCount) {
      throw new NotFoundError("Album tidak ditemukan");
    }

    // Check if user has liked this album
    const checkQuery = {
      text: "SELECT id FROM user_album_likes WHERE user_id = $1 AND album_id = $2",
      values: [userId, albumId],
    };
    const checkResult = await this._pool.query(checkQuery);

    if (!checkResult.rowCount) {
      throw new InvariantError("Album belum disukai sebelumnya");
    }

    // Remove like
    const query = {
      text: "DELETE FROM user_album_likes WHERE user_id = $1 AND album_id = $2 RETURNING id",
      values: [userId, albumId],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new InvariantError("Gagal membatalkan suka album");
    }

    await this._invalidateCache(albumId);
  }

  async getAlbumLikeCount(albumId) {
    // Try to get from cache first
    const cacheKey = `likes:${albumId}`;
    let result = null;
    let isFromCache = false;

    if (this._cacheService) {
      try {
        result = await this._cacheService.get(cacheKey);
        if (result !== null) {
          isFromCache = true;
          return {
            likes: parseInt(result, 10),
            isFromCache,
          };
        }
      } catch (error) {
        console.error("Cache error:", error);
        // Continue to database if cache fails
      }
    }

    // If not in cache, get from database
    const query = {
      text: "SELECT COUNT(*) as likes FROM user_album_likes WHERE album_id = $1",
      values: [albumId],
    };

    const dbResult = await this._pool.query(query);
    result = parseInt(dbResult.rows[0].likes, 10);

    // Store in cache with 30 minutes TTL
    if (this._cacheService) {
      try {
        await this._cacheService.set(cacheKey, result, 1800); // 30 minutes = 1800 seconds
      } catch (error) {
        console.error("Cache set error:", error);
        // Continue even if caching fails
      }
    }

    return {
      likes: result,
      isFromCache: false,
    };
  }

  async isAlbumLikedByUser(userId, albumId) {
    const query = {
      text: "SELECT id FROM user_album_likes WHERE user_id = $1 AND album_id = $2",
      values: [userId, albumId],
    };

    const result = await this._pool.query(query);
    return result.rowCount > 0;
  }

  async _invalidateCache(albumId) {
    if (this._cacheService) {
      try {
        const cacheKey = `likes:${albumId}`;
        await this._cacheService.del(cacheKey);
        console.log(`Cache invalidated for album: ${albumId}`);
      } catch (error) {
        console.error("Cache invalidation error:", error);
      }
    }
  }
}

module.exports = UserAlbumLikesService;
