import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsNumber()
  @Min(0)
  calories: number;

  @IsNumber()
  @Min(0)
  protein: number;

  @IsNumber()
  @Min(0)
  fat: number;

  @IsNumber()
  @Min(0)
  carbohydrates: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fiber?: number;
}
