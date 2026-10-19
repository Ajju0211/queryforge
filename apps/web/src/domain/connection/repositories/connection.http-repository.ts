/**
 * Re-export HttpConnectionRepository from infrastructure layer for backward compatibility.
 * In DDD, the concrete implementation belongs to the infrastructure layer.
 */

export {
  HttpConnectionRepository,
  defaultConnectionRepository,
} from "@/infrastructure/repositories/connection.http-repository";
