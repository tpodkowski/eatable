import { RecipeProduct } from 'src/recipes/entities/recipe-products.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity()
export class Product {
  @PrimaryGeneratedColumn()
  id: string;

  @Index({ unique: true })
  @Column({ length: 120 })
  name: string;

  @Column('decimal', { precision: 6, scale: 2 })
  calories: number;

  @Column('decimal', { precision: 6, scale: 2 })
  protein: number;

  @Column('decimal', { precision: 6, scale: 2 })
  fat: number;

  @Column('decimal', { precision: 6, scale: 2 })
  carbohydrates: number;

  @Column('decimal', { precision: 6, scale: 2, default: 0 })
  fiber: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => RecipeProduct, (rp) => rp.product)
  recipeProducts: RecipeProduct[];
}
