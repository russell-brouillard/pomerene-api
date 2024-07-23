import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

export const secretManagerServiceClient = new SecretManagerServiceClient();

export async function loadSecret(name: string): Promise<string> {
  const [version] = await secretManagerServiceClient.accessSecretVersion({
    name,
  });

  return version.payload?.data?.toString() || "";
}