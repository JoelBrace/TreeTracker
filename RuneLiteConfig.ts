// RuneliteConfig.ts

export class RuneliteConfig {
  /**
   * Retrieves the Runelite configuration.
   *
   * This method first fetches the bootstrap JSON from
   * 'https://static.runelite.net/bootstrap.json' to extract the "version"
   * value. It then calls the config endpoint with the retrieved version,
   * including the required header, and returns the JSON as an object.
   *
   * @returns {Promise<any>} A promise that resolves to the configuration object.
   */
  public static async getConfig(): Promise<any> {
    const TREETRACKER_RUNELITE_AUTH = process.env.TREETRACKER_RUNELITE_AUTH;

    // Step 1: Get the version from the bootstrap endpoint.
    const bootstrapUrl = 'https://static.runelite.net/bootstrap.json';
    const bootstrapResponse = await fetch(bootstrapUrl);
    if (!bootstrapResponse.ok) {
      throw new Error(`Failed to fetch bootstrap JSON: ${bootstrapResponse.statusText}`);
    }
    const bootstrapData = await bootstrapResponse.json();
    const version: string = bootstrapData.version;
    if (!version) {
      throw new Error("Version key not found in bootstrap JSON.");
    }

    // Step 2: Construct the config URL with the retrieved version.
    const configUrl = `https://api.runelite.net/runelite-${version}/config/v2`;

    
    if (!TREETRACKER_RUNELITE_AUTH) {
      throw new Error('TREETRACKER_RUNELITE_AUTH is not defined in the environment variables');
    }
    // Step 3: Fetch the configuration data with the required header.
    const configResponse = await fetch(configUrl, {
      headers: {
        'RUNELITE-AUTH': TREETRACKER_RUNELITE_AUTH
      }
    });
    if (!configResponse.ok) {
      throw new Error(`Failed to fetch config JSON: ${configResponse.statusText}`);
    }
    const configData = await configResponse.json();

    // Return the configuration as a JSON object.
    return configData;
  }
}
