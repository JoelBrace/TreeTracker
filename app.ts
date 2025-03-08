import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import express, { Request, Response } from 'express';
import { TimeTracking } from './TimeTracking';

const TREETRACKER_CHANNEL_ID = process.env.TREETRACKER_CHANNEL_ID;
const TREETRACKER_BOT_TOKEN = process.env.TREETRACKER_BOT_TOKEN;

// Global variable to store the latest panelEntries
let latestPanelEntries: any[] = [];

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

// A Map to track if a panel has already triggered a notification.
// Here we use the panel's title as a key; use a more unique identifier if available.
const notifiedPanels = new Map<string, boolean>();

// Polling function that checks panel entries and aggregates notifications if needed.
const pollPanels = async () => {
  try {
    const timeTracking = new TimeTracking();
    const tabEntries = await timeTracking.getTabEntries();

    // Get all panels that have notify set to "true"
    const panelEntries = tabEntries.flatMap(tabEntry =>
      tabEntry.panels.filter((panel: any) => panel.notify === "true")
    );

    // Update global variable so the GET endpoint can return it.
    latestPanelEntries = panelEntries;

    if (!TREETRACKER_CHANNEL_ID) {
      throw new Error('TREETRACKER_CHANNEL_ID is not defined in the environment variables');
    }
    // Fetch the Discord channel for notifications.
    const channel = (await client.channels.fetch(TREETRACKER_CHANNEL_ID)) as TextChannel;
    if (!channel) {
      console.error('Channel not found!');
      return;
    }

    // Array to collect messages for panels that have changed to "Done".
    const notifications: string[] = [];

    panelEntries.forEach(panel => {
      // When estimateText is exactly "Done"
      if (panel.estimateText === 'Done') {
        // If we haven't notified for this panel yet, add its notification.
        if (!notifiedPanels.get(panel.title)) {
          notifications.push(`**${panel.tooltipText}** at **${panel.title}** is ready to harvest.`);
          notifiedPanels.set(panel.title, true);
        }
      } else {
        // Reset the notification flag if the status isn't "Done"
        notifiedPanels.set(panel.title, false);
      }
    });

    // If there are notifications, send them as one aggregated message.
    if (notifications.length > 0) {
      const message = notifications.join('\n');
      channel.send(message);
    }

    // Clean up: remove panels from the map that are no longer present.
    const currentPanelTitles = new Set(panelEntries.map(panel => panel.title));
    notifiedPanels.forEach((_value, key) => {
      if (!currentPanelTitles.has(key)) {
        notifiedPanels.delete(key);
      }
    });
  } catch (error) {
    console.error('Error polling panels: ', error);
  }
};

client.once('ready', () => {
  console.log(`Logged in as ${client.user?.tag}`);

  // Poll every 5 minutes (300000 ms)
  setInterval(pollPanels, 300000);
  // Optionally, run the poll immediately on startup.
  pollPanels();
});

if (!TREETRACKER_BOT_TOKEN) {
  throw new Error('TREETRACKER_BOT_TOKEN is not defined in the environment variables');
}
client.login(TREETRACKER_BOT_TOKEN);

// --- Express HTTP Server ---
const app = express();
const PORT = process.env.PORT || 3000;

// Added explicit type annotations for req and res
app.get('/timetracking', (req: Request, res: Response) => {
  res.json(latestPanelEntries);
});

app.listen(PORT, () => {
  console.log(`HTTP server running on port ${PORT}`);
});
