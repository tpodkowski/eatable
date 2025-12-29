import { Injectable, Query } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { SearchProductsDto } from './dto/search-products.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
  ) {}

  create(createProductDto: CreateProductDto) {
    const product = this.productsRepo.create(createProductDto);

    return this.productsRepo.save(product);
  }

  findAll() {
    return this.productsRepo.find();
  }

  findOne(id: string) {
    return this.productsRepo.findOneBy({ id });
  }

  search(@Query() query: SearchProductsDto) {
    return this.productsRepo
      .createQueryBuilder('product')
      .where('product.name ILIKE :term', { term: `%${query.query}%` })
      .getMany();
  }

  update(id: string, updateProductDto: UpdateProductDto) {
    // const product = this.productsRepo.update({ id }, updateProductDto);

    return this.productsRepo.update({ id }, updateProductDto);
  }

  remove(id: string) {
    return this.productsRepo.delete({ id });
  }
}
