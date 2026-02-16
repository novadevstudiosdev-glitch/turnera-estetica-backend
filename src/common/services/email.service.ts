import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private configService: ConfigService) {
    this.createTransporter();
  }

  private createTransporter() {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('EMAIL_HOST'),
      port: this.configService.get<number>('EMAIL_PORT'),
      secure: this.configService.get<boolean>('EMAIL_SECURE') === true,
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASSWORD'),
      },
    });

    // Verificar configuración
    this.transporter.verify((error) => {
      if (error) {
        this.logger.error('Error en configuración de email:', error);
      } else {
        this.logger.log('✅ Email transporter configurado correctamente');
      }
    });
  }

  /**
   * Envía un email de verificación de cuenta
   */
  async sendVerificationEmail(
    email: string,
    fullName: string,
    token: string,
  ): Promise<void> {
    const verificationUrl = `${this.configService.get('FRONTEND_URL')}/verify-email?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #F5E6D3 0%, #F8C4D8 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
          .button { display: inline-block; padding: 12px 30px; background: #F8C4D8; color: #333; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .footer { background: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="color: #333; margin: 0;">¡Bienvenido/a! 🎉</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${fullName}</strong>,</p>
            <p>Gracias por registrarte en nuestro sistema de turnos. Para completar tu registro, por favor verifica tu dirección de email haciendo click en el siguiente botón:</p>
            
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verificar mi email</a>
            </div>

            <p>O copia y pega este enlace en tu navegador:</p>
            <p style="word-break: break-all; color: #666; font-size: 14px;">${verificationUrl}</p>

            <p><strong>Este enlace expira en 24 horas.</strong></p>

            <p>Si no creaste esta cuenta, puedes ignorar este email.</p>

            <p style="margin-top: 30px;">Saludos cordiales,<br>
            <strong>${this.configService.get('BUSINESS_NAME')}</strong></p>
          </div>
          <div class="footer">
            <p>${this.configService.get('BUSINESS_PHONE')} | ${this.configService.get('BUSINESS_EMAIL')}</p>
            <p>${this.configService.get('BUSINESS_ADDRESS')}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(email, 'Verifica tu cuenta - Turnera Médica', html);
  }

  /**
   * Envía un email para resetear contraseña
   */
  async sendPasswordResetEmail(
    email: string,
    fullName: string,
    token: string,
  ): Promise<void> {
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #F5E6D3 0%, #F8C4D8 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
          .button { display: inline-block; padding: 12px 30px; background: #F8C4D8; color: #333; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .footer { background: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; color: #666; }
          .warning { background: #FFF9E6; padding: 15px; border-left: 4px solid #FFB800; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="color: #333; margin: 0;">🔐 Recuperación de Contraseña</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${fullName}</strong>,</p>
            <p>Recibimos una solicitud para restablecer tu contraseña. Haz click en el siguiente botón para crear una nueva contraseña:</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Restablecer mi contraseña</a>
            </div>

            <p>O copia y pega este enlace en tu navegador:</p>
            <p style="word-break: break-all; color: #666; font-size: 14px;">${resetUrl}</p>

            <div class="warning">
              <p style="margin: 0;"><strong>⚠️ Importante:</strong></p>
              <ul style="margin: 10px 0 0 0;">
                <li>Este enlace expira en 1 hora</li>
                <li>Solo puedes usar este enlace una vez</li>
              </ul>
            </div>

            <p><strong>Si no solicitaste este cambio, ignora este email.</strong> Tu contraseña actual permanecerá sin cambios.</p>

            <p style="margin-top: 30px;">Saludos cordiales,<br>
            <strong>${this.configService.get('BUSINESS_NAME')}</strong></p>
          </div>
          <div class="footer">
            <p>${this.configService.get('BUSINESS_PHONE')} | ${this.configService.get('BUSINESS_EMAIL')}</p>
            <p>${this.configService.get('BUSINESS_ADDRESS')}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(
      email,
      'Recuperación de contraseña - Turnera Médica',
      html,
    );
  }

  /**
   * Método genérico para enviar emails
   */
  private async sendEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: {
          name: this.configService.get<string>('EMAIL_FROM_NAME'),
          address: this.configService.get<string>('EMAIL_FROM_ADDRESS'),
        },
        to,
        subject,
        html,
      });

      this.logger.log(`Email enviado exitosamente a ${to}`);
    } catch (error) {
      this.logger.error(`Error enviando email a ${to}:`, error);
      throw error;
    }
  }
}
