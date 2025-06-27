import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class BulkImportDto {
  @IsOptional()
  @IsBoolean()
  overwriteExisting?: boolean = false;

  @IsOptional()
  @IsString()
  defaultLocation?: string;
}
