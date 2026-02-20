import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  Appointment,
  AppointmentStatus,
  PaymentStatus,
} from './entities/appointment.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import {
  UpdateAppointmentDto,
  AdminCreateAppointmentDto,
} from './dto/update-appointment.dto';
import { ServicesService } from '../services/services.service';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    @InjectRepository(Appointment)
    private appointmentsRepository: Repository<Appointment>,
    private servicesService: ServicesService,
  ) {}

  /**
   * Crear un turno (público - con validación de disponibilidad)
   */
  async create(
    createAppointmentDto: CreateAppointmentDto,
    userId?: string,
  ): Promise<Appointment> {
    // Verificar que el servicio existe
    const service = await this.servicesService.findOne(
      createAppointmentDto.serviceId,
    );

    if (!service.isActive) {
      throw new BadRequestException(
        'El servicio seleccionado no está disponible',
      );
    }

    // Verificar que el slot esté disponible
    await this.validateSlotAvailability(
      createAppointmentDto.appointmentDate,
      createAppointmentDto.appointmentTime,
    );

    // TODO: Validar horarios de negocio (Fase 2)
    // TODO: Validar blocked_slots (Fase 2)

    // Crear turno
    const appointment = this.appointmentsRepository.create({
      ...createAppointmentDto,
      userId,
      status: AppointmentStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      createdByAdmin: false,
    });

    const saved = await this.appointmentsRepository.save(appointment);

    this.logger.log(
      `Turno creado: ${saved.patientName} - ${saved.appointmentDate} ${saved.appointmentTime}`,
    );

    // TODO: Enviar email de confirmación (Fase 3)

    return saved;
  }

  /**
   * Crear turno como admin (sin validaciones estrictas)
   */
  async createAsAdmin(
    adminCreateDto: AdminCreateAppointmentDto,
    adminId: string,
  ): Promise<Appointment> {
    // Verificar que el servicio existe
    await this.servicesService.findOne(adminCreateDto.serviceId);

    // Verificar disponibilidad básica
    await this.validateSlotAvailability(
      adminCreateDto.appointmentDate,
      adminCreateDto.appointmentTime,
    );

    const appointment = this.appointmentsRepository.create({
      ...adminCreateDto,
      status: AppointmentStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PENDING,
      createdByAdmin: true,
    });

    const saved = await this.appointmentsRepository.save(appointment);

    this.logger.log(
      `Turno creado por admin: ${saved.patientName} - ${saved.appointmentDate}`,
    );

    return saved;
  }

  /**
   * Listar turnos con filtros
   */
  async findAll(
    userId?: string,
    status?: AppointmentStatus,
    startDate?: string,
    endDate?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: Appointment[];
    total: number;
    page: number;
    lastPage: number;
  }> {
    const query = this.appointmentsRepository
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.service', 'service')
      .leftJoinAndSelect('appointment.user', 'user');

    // Filtrar por usuario si se especifica
    if (userId) {
      query.andWhere('appointment.userId = :userId', { userId });
    }

    // Filtrar por estado
    if (status) {
      query.andWhere('appointment.status = :status', { status });
    }

    // Filtrar por rango de fechas
    if (startDate && endDate) {
      query.andWhere(
        'appointment.appointmentDate BETWEEN :startDate AND :endDate',
        {
          startDate,
          endDate,
        },
      );
    }

    // Ordenar por fecha y hora
    query.orderBy('appointment.appointmentDate', 'ASC');
    query.addOrderBy('appointment.appointmentTime', 'ASC');

    // Paginación
    const total = await query.getCount();
    const data = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  /**
   * Obtener un turno por ID
   */
  async findOne(id: string): Promise<Appointment> {
    const appointment = await this.appointmentsRepository.findOne({
      where: { id },
      relations: ['service', 'user'],
    });

    if (!appointment) {
      throw new NotFoundException(`Turno con ID ${id} no encontrado`);
    }

    return appointment;
  }

  /**
   * Actualizar turno (solo admin)
   */
  async update(
    id: string,
    updateAppointmentDto: UpdateAppointmentDto,
  ): Promise<Appointment> {
    const appointment = await this.findOne(id);

    // Si cambia fecha/hora, validar disponibilidad
    if (
      updateAppointmentDto.appointmentDate ||
      updateAppointmentDto.appointmentTime
    ) {
      const newDate =
        updateAppointmentDto.appointmentDate || appointment.appointmentDate;
      const newTime =
        updateAppointmentDto.appointmentTime || appointment.appointmentTime;

      await this.validateSlotAvailability(newDate.toString(), newTime, id);
    }

    Object.assign(appointment, updateAppointmentDto);
    const updated = await this.appointmentsRepository.save(appointment);

    this.logger.log(`Turno actualizado: ${updated.id}`);
    return updated;
  }

  /**
   * Cancelar turno
   */
  async cancel(
    id: string,
    cancellationReason?: string,
    cancelledBy: 'admin' | 'patient' = 'patient',
  ): Promise<Appointment> {
    const appointment = await this.findOne(id);

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('El turno ya está cancelado');
    }

    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException('No se puede cancelar un turno completado');
    }

    appointment.status = AppointmentStatus.CANCELLED;
    appointment.cancellationReason = cancellationReason;
    appointment.cancelledBy = cancelledBy;
    appointment.cancelledAt = new Date();

    const cancelled = await this.appointmentsRepository.save(appointment);

    this.logger.log(`Turno cancelado por ${cancelledBy}: ${cancelled.id}`);

    // TODO: Enviar email de cancelación (Fase 3)
    // TODO: Procesar reembolso si aplica (Fase 3)

    return cancelled;
  }

  /**
   * Obtener turnos del día
   */
  async getTodayAppointments(): Promise<Appointment[]> {
    const today = new Date().toISOString().split('T')[0];

    return await this.appointmentsRepository.find({
      where: {
        appointmentDate: new Date(today) as any,
        status: AppointmentStatus.CONFIRMED,
      },
      relations: ['service', 'user'],
      order: {
        appointmentTime: 'ASC',
      },
    });
  }

  /**
   * Obtener estadísticas
   */
  async getStats(
    startDate?: string,
    endDate?: string,
  ): Promise<{
    total: number;
    pending: number;
    confirmed: number;
    cancelled: number;
    completed: number;
    noShow: number;
  }> {
    const query = this.appointmentsRepository.createQueryBuilder('appointment');

    if (startDate && endDate) {
      query.where(
        'appointment.appointmentDate BETWEEN :startDate AND :endDate',
        {
          startDate,
          endDate,
        },
      );
    }

    const total = await query.getCount();
    const pending = await query
      .clone()
      .andWhere('appointment.status = :status', {
        status: AppointmentStatus.PENDING,
      })
      .getCount();
    const confirmed = await query
      .clone()
      .andWhere('appointment.status = :status', {
        status: AppointmentStatus.CONFIRMED,
      })
      .getCount();
    const cancelled = await query
      .clone()
      .andWhere('appointment.status = :status', {
        status: AppointmentStatus.CANCELLED,
      })
      .getCount();
    const completed = await query
      .clone()
      .andWhere('appointment.status = :status', {
        status: AppointmentStatus.COMPLETED,
      })
      .getCount();
    const noShow = await query
      .clone()
      .andWhere('appointment.status = :status', {
        status: AppointmentStatus.NO_SHOW,
      })
      .getCount();

    return {
      total,
      pending,
      confirmed,
      cancelled,
      completed,
      noShow,
    };
  }

  /**
   * Validar disponibilidad de slot
   */
  private async validateSlotAvailability(
    date: string,
    time: string,
    excludeId?: string,
  ): Promise<void> {
    const query = this.appointmentsRepository
      .createQueryBuilder('appointment')
      .where('appointment.appointmentDate = :date', { date })
      .andWhere('appointment.appointmentTime = :time', { time })
      .andWhere('appointment.status != :cancelledStatus', {
        cancelledStatus: AppointmentStatus.CANCELLED,
      });

    if (excludeId) {
      query.andWhere('appointment.id != :excludeId', { excludeId });
    }

    const existingAppointment = await query.getOne();

    if (existingAppointment) {
      throw new ConflictException(
        'El horario seleccionado ya está ocupado. Por favor, elija otro horario.',
      );
    }
  }
}
