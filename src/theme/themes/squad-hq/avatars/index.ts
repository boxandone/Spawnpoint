import type { AvatarDef } from '../../../types';
import antennaBunny from './antenna-bunny.svg';
import armorBear from './armor-bear.svg';
import gearHamster from './gear-hamster.svg';
import goggleFox from './goggle-fox.svg';
import headsetOwl from './headset-owl.svg';
import hoverDrone from './hover-drone.svg';
import jellySpark from './jelly-spark.svg';
import jetCat from './jet-cat.svg';
import pocketMech from './pocket-mech.svg';
import scoutPenguin from './scout-penguin.svg';
import shellTank from './shell-tank.svg';
import visorBot from './visor-bot.svg';

// Ids are stored on member rows. Add new ones; never rename.
export const avatars: AvatarDef[] = [
  { id: 'squad-hq/visor-bot', name: 'Visor bot', src: visorBot },
  { id: 'squad-hq/goggle-fox', name: 'Goggle fox', src: goggleFox },
  { id: 'squad-hq/hover-drone', name: 'Hover drone', src: hoverDrone },
  { id: 'squad-hq/shell-tank', name: 'Shell tank', src: shellTank },
  { id: 'squad-hq/jet-cat', name: 'Jet cat', src: jetCat },
  { id: 'squad-hq/headset-owl', name: 'Headset owl', src: headsetOwl },
  { id: 'squad-hq/antenna-bunny', name: 'Antenna bunny', src: antennaBunny },
  { id: 'squad-hq/armor-bear', name: 'Armor bear', src: armorBear },
  { id: 'squad-hq/scout-penguin', name: 'Scout penguin', src: scoutPenguin },
  { id: 'squad-hq/pocket-mech', name: 'Pocket mech', src: pocketMech },
  { id: 'squad-hq/jelly-spark', name: 'Jelly spark', src: jellySpark },
  { id: 'squad-hq/gear-hamster', name: 'Gear hamster', src: gearHamster },
];
