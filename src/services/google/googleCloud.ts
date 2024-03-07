// src/googleCloud.ts
import { Storage } from '@google-cloud/storage';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const storage = new Storage();
const secretManagerServiceClient = new SecretManagerServiceClient();

export { storage, secretManagerServiceClient };
