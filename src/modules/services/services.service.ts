import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from './entities/service.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private servicesRepository: Repository<Service>,
  ) {}

  async create(createServiceDto: CreateServiceDto): Promise<Service> {
    const service = this.servicesRepository.create(createServiceDto);
    return await this.servicesRepository.save(service);
  }

  async findAll(isActive?: boolean): Promise<Service[]> {
    const query = this.servicesRepository.createQueryBuilder('service');

    if (isActive !== undefined) {
      query.where('service.isActive = :isActive', { isActive });
    }

    return await query.orderBy('service.displayOrder', 'ASC').getMany();
  }

  async findOne(id: string): Promise<Service> {
    const service = await this.servicesRepository.findOne({ where: { id } });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    return service;
  }

  async update(
    id: string,
    updateServiceDto: UpdateServiceDto,
  ): Promise<Service> {
    await this.findOne(id); // Validates existence
    await this.servicesRepository.update(id, updateServiceDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const service = await this.findOne(id);
    service.isActive = false;
    await this.servicesRepository.save(service);
  }
}
