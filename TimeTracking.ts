import { FarmingWorld } from './FarmingWorld';
import { FarmingTracker } from './FarmingTracker';
import { CropState } from './CropState';
import { PatchImplementation } from './PatchImplementation';
import { Tab } from './Tab';
import { RuneliteConfig } from './RuneLiteConfig';

export class TimeTracking {
  private configuration: any;

  // Retrieves the processed tab entries data and loads configuration first
  public async getTabEntries(): Promise<any[]> {
    try {
      this.configuration = await RuneliteConfig.getConfig();
    } catch (error) {
      console.error('Error fetching configuration:', error);
      return [];
    }

    const tabEntries: any[] = [];
    const farmingTracker = new FarmingTracker();
    const farmingWorld = new FarmingWorld();
    const farmingTabs = farmingWorld.getTabs();

    for (const [tabsKey, tabList] of farmingTabs.entries()) {
      const tab = Tab['_$wrappers'][tabsKey];

      const tabEntry = {
        name: tab.getName(),
        icon: tab.getItemID(),
        panels: [] as any[]
      };

      const unixNow = new Date().getTime() / 1000;

      for (let patch of tabList) {
        const panel = this.preparePanel();

        panel.title =
          patch.getRegion().getName() +
          (patch.getName() == null || patch.getName() === ''
            ? ''
            : ' (' + patch.getName() + ')');        

        const prediction = farmingTracker.predictPatch(patch, this.getConfiguration.bind(this));
        if (prediction == null) {
          panel.tooltipText = 'Unknown state';
          panel.estimateText = 'Unknown';
          tabEntry.panels.push(panel);
          continue;
        }

        panel.notify = prediction.getNotify();

        const produce =
          PatchImplementation.Produce['_$wrappers'][prediction.getProduce()];

        if (produce.getItemID() < 0) {
          panel.tooltipText = 'Unknown state';
        } else {
          panel.tooltipText = produce.getName();
        }

        switch (prediction.getCropState()) {
          case CropState.HARVESTABLE:
            panel.estimateText = 'Done';
            break;
          case CropState.GROWING:
            if (prediction.getDoneEstimate() < unixNow) {
              panel.estimateText = 'Done';
            } else {
              panel.estimateText =
                'Done ' +
                this.getFormattedEstimate(prediction.getDoneEstimate() - unixNow);
            }
            break;
          case CropState.DISEASED:
            panel.estimateText = 'Diseased';
            break;
          case CropState.DEAD:
            panel.estimateText = 'Dead';
            break;
          case CropState.EMPTY:
            panel.estimateText = 'Empty';
            break;
          case CropState.FILLING:
            panel.estimateText = 'Filling';
            break;
          default:
            console.warn('Unknown crop state!');
        }

        tabEntry.panels.push(panel);
      }

      // Sort panels by title and subtitle
      tabEntry.panels.sort((a, b) => a.title.localeCompare(b.title));
    //   tabEntry.panels.sort((a, b) => a.subtitle.localeCompare(b.subtitle));
      tabEntries.push(tabEntry);
    }
    return tabEntries;
  }



  // Helper to retrieve configuration values
  private getConfiguration(group: string, key: string): any {
    const TREETRACKER_RUNELITE_ACCOUNT_ID = process.env.TREETRACKER_RUNELITE_ACCOUNT_ID;
    if (!TREETRACKER_RUNELITE_ACCOUNT_ID) {
        throw new Error('TREETRACKER_RUNELITE_ACCOUNT_ID is not defined in the environment variables');
    }
    let value = this.configuration[group + '.rsprofile.'+TREETRACKER_RUNELITE_ACCOUNT_ID+'.' + key];
    if (!value) {
      value = null;
    }
    return value;
  }

  // Creates a new panel object with default values
  private preparePanel() {
    return {
      title: '',
    //   subtitle: '',
      estimateText: '',
      tooltipText: '',
      notify: false
    };
  }

  // Formats the time estimate from seconds remaining to a human-readable string
  private getFormattedEstimate(remainingSeconds: number): string {
    let sb = 'in ';
    const duration = Math.floor((remainingSeconds + 59) / 60);
    const minutes = Math.floor(duration % 60);
    const hours = Math.floor((duration / 60) % 24);
    const days = Math.floor(duration / (60 * 24));
    if (days > 0) {
      sb += days + 'd ';
    }
    if (hours > 0) {
      sb += hours + 'h ';
    }
    if (minutes > 0) {
      sb += minutes + 'm ';
    }
    return sb;
  }
}
