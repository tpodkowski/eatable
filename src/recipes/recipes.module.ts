import { Module } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { RecipesController } from './recipes.controller';
import { Recipe } from './entities/recipe.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from 'src/products/entities/product.entity';
import { RecipeProduct } from './entities/recipe-products.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Recipe, RecipeProduct, Product])],
  controllers: [RecipesController],
  providers: [RecipesService],
})
export class RecipesModule { }
