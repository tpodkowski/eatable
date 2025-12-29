import { Injectable } from '@nestjs/common';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Recipe } from './entities/recipe.entity';
import { DeepPartial, Repository } from 'typeorm';
import { RecipeProduct } from './entities/recipe-products.entity';
import { Product } from 'src/products/entities/product.entity';

@Injectable()
export class RecipesService {
  constructor(
    @InjectRepository(Recipe)
    private readonly recipesRepo: Repository<Recipe>,
  ) { }

  create(createRecipeDto: CreateRecipeDto) {
    const recipe = this.recipesRepo.create({
      name: createRecipeDto.name,
      description: createRecipeDto.description,
      products: createRecipeDto.products.map(
        (p): DeepPartial<RecipeProduct> => ({
          quantity: p.quantity,
          product: { id: p.productId.toString() },
        }),
      ),
    });

    return this.recipesRepo.save(recipe);
  }

  findAll() {
    return this.recipesRepo.find({
      relations: {
        products: {
          product: true,
        },
      },
    });
  }

  findOne(id: number) {
    return `This action returns a #${id} recipe`;
  }

  update(id: number, updateRecipeDto: UpdateRecipeDto) {
    return `This action updates a #${id} recipe`;
  }

  remove(id: number) {
    // return this.recipesRepo.remove(id);
    return `Remove ${id}`;
  }
}
