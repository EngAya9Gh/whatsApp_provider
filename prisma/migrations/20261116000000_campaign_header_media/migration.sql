-- Meta campaigns of a media-header template: the image / video / PDF sent to every recipient
ALTER TABLE `campaigns` ADD COLUMN `header_media` JSON NULL;
