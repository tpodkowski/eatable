import * as argon2 from 'argon2';
import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) { }

  async create(createUserDto: CreateUserDto) {
    const passwordHash = await argon2.hash(createUserDto.password);

    const user = this.usersRepo.create({
      ...createUserDto,
      passwordHash,
    });

    const savedUser = await this.usersRepo.save(user);

    return this.usersRepo.findOne({
      where: { id: savedUser.id },
    });
  }

  findAll() {
    return this.usersRepo.find();
  }

  findOneById(id: number) {
    return this.usersRepo.findOneBy({ id });
  }

  findOneByEmail(email: string) {
    // return this.usersRepo.findOneBy({ email });
    return this.usersRepo.findOne({
      where: { email },
      select: ['id', 'email', 'firstName', 'lastName', 'passwordHash'],
    });
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return this.usersRepo.softDelete({ id });
  }
}
