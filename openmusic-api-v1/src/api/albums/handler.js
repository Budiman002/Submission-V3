const fs = require("fs");
const path = require("path");
const ClientError = require("../../exceptions/ClientError");

class AlbumsHandler {
  constructor(service, validator, likesService) {
    this._service = service;
    this._validator = validator;
    this._likesService = likesService;
  }

  async postAlbumHandler(request, h) {
    try {
      this._validator.validateAlbumPayload(request.payload);

      const { name, year } = request.payload;
      const albumId = await this._service.addAlbum({ name, year });

      const response = h.response({
        status: "success",
        message: "Album berhasil ditambahkan",
        data: {
          albumId,
        },
      });
      response.code(201);
      return response;
    } catch (error) {
      console.error("Error in postAlbumHandler:", error);
      throw error;
    }
  }

  async getAlbumByIdHandler(request, h) {
    const { id } = request.params;
    const album = await this._service.getAlbumById(id);

    return {
      status: "success",
      data: {
        album,
      },
    };
  }

  async putAlbumByIdHandler(request, h) {
    this._validator.validateAlbumPayload(request.payload);

    const { id } = request.params;
    await this._service.editAlbumById(id, request.payload);

    return {
      status: "success",
      message: "Album berhasil diperbarui",
    };
  }

  async deleteAlbumByIdHandler(request, h) {
    const { id } = request.params;
    await this._service.deleteAlbumById(id);

    return {
      status: "success",
      message: "Album berhasil dihapus",
    };
  }

  async postAlbumCoverHandler(request, h) {
    const { id } = request.params;

    this._validator.validateAlbumCoverPayload(request.payload);

    const { cover } = request.payload;

    await this._service.getAlbumById(id);

    const timestamp = Date.now();
    const originalName = cover.hapi.filename || "cover";
    const filename = `${timestamp}-${originalName.replace(/\s+/g, "-")}`;
    const filepath = path.join("uploads/images", filename);

    if (!fs.existsSync("uploads/images")) {
      fs.mkdirSync("uploads/images", { recursive: true });
    }

    fs.writeFileSync(filepath, cover._data);

    const coverUrl = `http://${process.env.HOST}:${process.env.PORT}/upload/images/${filename}`;

    await this._service.updateAlbumCover(id, coverUrl);

    const response = h.response({
      status: "success",
      message: "Sampul berhasil diunggah",
    });
    response.code(201);
    return response;
  }

  //debug mode
  async postLikeAlbumHandler(request, h) {
    try {
      const { id: albumId } = request.params;

      if (
        !request.auth ||
        !request.auth.credentials ||
        !request.auth.credentials.id
      ) {
        throw new ClientError("Authentication required", 401);
      }

      const { id: userId } = request.auth.credentials;

      await this._likesService.likeAlbum(userId, albumId);

      const response = h.response({
        status: "success",
        message: "Album berhasil disukai",
      });
      response.code(201);
      return response;
    } catch (error) {
      if (error instanceof ClientError) {
        const response = h.response({
          status: "fail",
          message: error.message,
        });
        response.code(error.statusCode);
        return response;
      }

      const response = h.response({
        status: "error",
        message: "Maaf, terjadi kegagalan pada server kami.",
      });
      response.code(500);
      console.error(error);
      return response;
    }
  }

  // async postLikeAlbumHandler(request, h) {
  //   try {
  //     const { id: albumId } = request.params;

  //     // DEBUG: Log authentication data
  //     console.log("Auth credentials:", request.auth.credentials);
  //     console.log("User ID from auth:", request.auth.credentials?.id);

  //     // VALIDATION: Check if userId exists
  //     if (!request.auth.credentials || !request.auth.credentials.id) {
  //       throw new ClientError(
  //         "Authentication required - User ID not found",
  //         401
  //       );
  //     }

  //     const { id: userId } = request.auth.credentials;

  //     // ADDITIONAL DEBUG: Log the values being passed
  //     console.log("Album ID:", albumId);
  //     console.log("User ID:", userId);

  //     await this._likesService.likeAlbum(userId, albumId);

  //     const response = h.response({
  //       status: "success",
  //       message: "Album berhasil disukai",
  //     });
  //     response.code(201);
  //     return response;
  //   } catch (error) {
  //     console.error("Error in postLikeAlbumHandler:", error);

  //     if (error instanceof ClientError) {
  //       const response = h.response({
  //         status: "fail",
  //         message: error.message,
  //       });
  //       response.code(error.statusCode);
  //       return response;
  //     }

  //     const response = h.response({
  //       status: "error",
  //       message: "Maaf, terjadi kegagalan pada server kami.",
  //     });
  //     response.code(500);
  //     return response;
  //   }
  // }

  async deleteLikeAlbumHandler(request, h) {
    try {
      const { id: albumId } = request.params;

      // VALIDATION: Check if userId exists
      if (!request.auth.credentials || !request.auth.credentials.id) {
        throw new ClientError(
          "Authentication required - User ID not found",
          401
        );
      }

      const { id: userId } = request.auth.credentials;

      await this._likesService.unlikeAlbum(userId, albumId);

      const response = h.response({
        status: "success",
        message: "Batal menyukai album",
      });
      response.code(200);
      return response;
    } catch (error) {
      console.error("Error in deleteLikeAlbumHandler:", error);

      if (error instanceof ClientError) {
        const response = h.response({
          status: "fail",
          message: error.message,
        });
        response.code(error.statusCode);
        return response;
      }

      const response = h.response({
        status: "error",
        message: "Maaf, terjadi kegagalan pada server kami.",
      });
      response.code(500);
      return response;
    }
  }

  async getAlbumLikesHandler(request, h) {
    try {
      const { id: albumId } = request.params;

      const result = await this._likesService.getAlbumLikeCount(albumId);

      const response = h.response({
        status: "success",
        data: {
          likes: result.likes,
        },
      });

      // Add custom header based on data source
      if (result.isFromCache) {
        response.header("X-Data-Source", "cache");
      }

      return response;
    } catch (error) {
      if (error instanceof ClientError) {
        const response = h.response({
          status: "fail",
          message: error.message,
        });
        response.code(error.statusCode);
        return response;
      }

      const response = h.response({
        status: "error",
        message: "Maaf, terjadi kegagalan pada server kami.",
      });
      response.code(500);
      console.error(error);
      return response;
    }
  }
}

module.exports = AlbumsHandler;
