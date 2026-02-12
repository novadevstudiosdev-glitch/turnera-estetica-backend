import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ServicesModule } from './modules/services/services.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [ServicesModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
