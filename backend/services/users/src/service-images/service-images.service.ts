import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { ServiceImagesRepository } from "./service-images.repository";
import { MinioService } from "@pode-deixar/storage";
import { UsersLoggerService } from "../shared/users-logger.service";
import { randomUUID } from "crypto";
import { extname } from "path";
import { validateImageFile } from "@pode-deixar/validation";

@Injectable()
export class ServiceImagesService {
  constructor(
    private repository: ServiceImagesRepository,
    private minio: MinioService,
    private usersLogger: UsersLoggerService,
  ) {}

  private async getProviderProfileByUserId(userId: string) {
    const profile = await this.repository.findProviderProfileByUserId(userId);

    if (!profile) {
      throw new NotFoundException("Perfil de prestador não encontrado");
    }

    return profile;
  }

  private async getProviderService(
    providerProfileId: string,
    serviceId: string,
  ) {
    const service = await this.repository.findProviderServiceById(serviceId);

    if (!service) {
      throw new NotFoundException("Serviço não encontrado");
    }

    if (service.providerProfileId !== providerProfileId) {
      throw new ForbiddenException("Serviço não pertence a este prestador");
    }

    return service;
  }

  async uploadByUserId(
    userId: string,
    serviceId: string,
    file: Express.Multer.File,
    ip?: string,
  ) {
    const profile = await this.getProviderProfileByUserId(userId);
    return this.upload(profile.id, serviceId, file, ip);
  }

  async listByUserId(userId: string, serviceId: string) {
    const profile = await this.getProviderProfileByUserId(userId);
    return this.list(profile.id, serviceId);
  }

  async deleteByUserId(
    userId: string,
    serviceId: string,
    imageId: string,
    ip?: string,
  ) {
    const profile = await this.getProviderProfileByUserId(userId);
    return this.delete(profile.id, serviceId, imageId, ip);
  }

  async upload(
    providerProfileId: string,
    serviceId: string,
    file: Express.Multer.File,
    ip?: string,
  ) {
    await this.getProviderService(providerProfileId, serviceId);

    validateImageFile(file.originalname, file.buffer);
    const ext = extname(file.originalname).toLowerCase();
    const fileName = `${providerProfileId}/${serviceId}/${randomUUID()}${ext}`;

    const url = await this.minio.uploadFile(
      fileName,
      file.buffer,
      file.mimetype,
    );

    const image = await this.repository.createServiceImage(serviceId, url);

    this.usersLogger.logServiceImageUploaded(
      providerProfileId,
      serviceId,
      image.id,
      ip,
    );

    return this.formatImage(image);
  }

  async list(providerProfileId: string, serviceId: string) {
    await this.getProviderService(providerProfileId, serviceId);

    const images =
      await this.repository.findServiceImagesByServiceId(serviceId);

    return images.map((img) => this.formatImage(img));
  }

  async delete(
    providerProfileId: string,
    serviceId: string,
    imageId: string,
    ip?: string,
  ) {
    await this.getProviderService(providerProfileId, serviceId);

    const image = await this.repository.findServiceImageById(imageId);

    if (!image) {
      throw new NotFoundException("Imagem não encontrada");
    }

    if (image.providerServiceId !== serviceId) {
      throw new BadRequestException("Imagem não pertence a este serviço");
    }

    const fileName = this.minio.extractFileName(image.url);
    await this.minio.deleteFile(fileName);

    await this.repository.deleteServiceImage(imageId);

    this.usersLogger.logServiceImageDeleted(
      providerProfileId,
      serviceId,
      imageId,
      ip,
    );

    return { message: "Imagem removida com sucesso" };
  }

  private formatImage(image: { id: string; url: string; createdAt: Date }) {
    return {
      id: image.id,
      url: image.url,
      created_at: image.createdAt,
    };
  }
}
