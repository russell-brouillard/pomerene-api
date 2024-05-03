// src/googleCloud.ts
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

const secretManagerServiceClient = new SecretManagerServiceClient();

export { secretManagerServiceClient };
