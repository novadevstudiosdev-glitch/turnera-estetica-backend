import { Injectable } from '@nestjs/common';
import { CreateBusinessHourDto } from './dto/create-business-hour.dto';

@Injectable()
export class BusinessHoursService {
  create(createBusinessHourDto: CreateBusinessHourDto) {
    return 'This action adds a new businessHour';
  }

  findAll() {
    return `This action returns all businessHours`;
  }

  findOne(id: number) {
    return `This action returns a #${id} businessHour`;
  }

  remove(id: number) {
    return `This action removes a #${id} businessHour`;
  }
}
