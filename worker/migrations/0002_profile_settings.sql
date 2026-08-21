-- Apply this only to an existing v2 D1 database.
ALTER TABLE users ADD COLUMN bio TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN discoverable INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN show_location_age INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN allow_friend_add INTEGER NOT NULL DEFAULT 1;
