ALTER TABLE notifications
ADD CONSTRAINT uq_notifications_user_media_rating
UNIQUE (user_id, media_item_id, rating);