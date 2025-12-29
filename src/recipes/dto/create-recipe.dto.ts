import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

class RecipeProductDto {
  @IsInt()
  productId: number;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateRecipeDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecipeProductDto)
  products: RecipeProductDto[];
}
