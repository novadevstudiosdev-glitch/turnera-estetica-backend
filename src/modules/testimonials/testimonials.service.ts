import { Injectable } from '@nestjs/common';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';

@Injectable()
export class TestimonialsService {
  create(createTestimonialDto: CreateTestimonialDto) {
    return 'This action adds a new testimonial';
  }

  findAll() {
    return `This action returns all testimonials`;
  }

  findOne(id: number) {
    return `This action returns a #${id} testimonial`;
  }

  remove(id: number) {
    return `This action removes a #${id} testimonial`;
  }
}
