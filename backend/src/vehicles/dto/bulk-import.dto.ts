import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class BulkImportDto {
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  overwriteExisting?: boolean = false;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultLocation?: string;
}
