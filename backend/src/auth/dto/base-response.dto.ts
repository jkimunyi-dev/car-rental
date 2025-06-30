import { ApiProperty } from '@nestjs/swagger';

export class BaseResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Operation completed successfully' })
  message: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp: string;

  constructor(success: boolean, message: string) {
    this.success = success;
    this.message = message;
    this.timestamp = new Date().toISOString();
  }
}

export class DataResponseDto<T> extends BaseResponseDto {
  @ApiProperty()
  data: T;

  constructor(success: boolean, message: string, data: T) {
    super(success, message);
    this.data = data;
  }
}