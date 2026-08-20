export {
  type PutObjectInput,
  type Storage,
  type StorageError,
  type StorageHeadResult,
  type StorageObjectMetadata,
  type StoredObject,
  StorageUnavailableError,
} from "./types";

export { getDefaultStorage } from "./r2";
export { MemoryStorage } from "./memory";