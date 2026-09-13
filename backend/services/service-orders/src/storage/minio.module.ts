import { MinioStorageModule } from "@pode-deixar/storage";

export const MinioModule = MinioStorageModule.register({
  bucketEnvVar: "MINIO_ORDER_PHOTOS_BUCKET",
  defaultBucket: "order-photos",
});
