import { HttpStatus } from '@nestjs/common';

export interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
}

export function errorBody(
  status: HttpStatus,
  message: string | string[],
): ErrorBody {
  return { statusCode: status, message, error: reasonPhrase(status) };
}

function reasonPhrase(status: HttpStatus): string {
  return HttpStatus[status]
    .toLowerCase()
    .split('_')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}
