import { Product } from 'src/products/entities/product.entity';
import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Recipe } from './recipe.entity';

@Entity()
@Unique(['recipe', 'product'])
export class RecipeProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Recipe, (recipe) => recipe.products, {
    onDelete: 'CASCADE',
  })
  recipe: Recipe;

  @ManyToOne(() => Product, (product) => product.recipeProducts)
  product: Product;

  @Column('int')
  quantity: number;
}
