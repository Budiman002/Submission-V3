const Joi = require('joi');

const AlbumPayloadSchema = Joi.object({
  name: Joi.string().required(),
  year: Joi.number().integer().min(1900).max(new Date().getFullYear()).required(),
});

const ImageHeadersSchema = Joi.object({
  'content-type': Joi.string().valid('image/jpeg', 'image/png', 'image/gif', 'image/jpg').required(),
}).unknown();

const AlbumCoverPayloadSchema = Joi.object({
  cover: Joi.object({
    hapi: Joi.object({
      headers: ImageHeadersSchema,
    }).unknown(),
  }).unknown().required(),
}).unknown();

module.exports = { AlbumPayloadSchema, ImageHeadersSchema, AlbumCoverPayloadSchema };