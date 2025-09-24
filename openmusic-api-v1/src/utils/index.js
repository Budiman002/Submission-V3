// Helper function untuk mapping hasil database ke objek response
const mapDBToModel = (
  {
    id,
    name,
    year,
    created_at,
    updated_at,
    title,
    genre,
    performer,
    duration,
    album_id,
  },
) => ({
  id,
  name,
  year,
  createdAt: created_at,
  updatedAt: updated_at,
  title,
  genre,
  performer,
  duration,
  albumId: album_id,
});

module.exports = { mapDBToModel };