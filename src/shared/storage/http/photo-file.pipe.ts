import {
  FileTypeValidator,
  HttpStatus,
  MaxFileSizeValidator,
  ParseFilePipe,
} from '@nestjs/common';
import { PHOTO_CONTENT_TYPES, PHOTO_MAX_BYTES } from '../domain/photo.js';

const allowedTypes = new RegExp(
  `^(${Object.keys(PHOTO_CONTENT_TYPES)
    .map((type) => type.replace('/', '\\/'))
    .join('|')})$`,
);

export const photoFilePipe = new ParseFilePipe({
  errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  validators: [
    new MaxFileSizeValidator({
      maxSize: PHOTO_MAX_BYTES,
      message: `file must be at most ${PHOTO_MAX_BYTES / 1024 / 1024} MB`,
    }),
    new FileTypeValidator({ fileType: allowedTypes }),
  ],
});
