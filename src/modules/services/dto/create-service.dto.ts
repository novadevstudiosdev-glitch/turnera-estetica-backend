import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateServiceDto {
  @ApiProperty({ example: 'Ecografía Cutánea' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Análisis detallado de la piel' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 60 })
  @IsNumber()
  @Min(15)
  durationMinutes: number;

  @ApiProperty({ example: 15000 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 3000 })
  @IsNumber()
  @Min(0)
  depositAmount: number;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  displayOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
