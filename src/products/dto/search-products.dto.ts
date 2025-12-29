import { IsString, MaxLength, MinLength } from 'class-validator';

export class SearchProductsDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  query: string;
}
