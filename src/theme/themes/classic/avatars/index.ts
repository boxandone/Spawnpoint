import type { AvatarDef } from '../../../types';
import bear from './bear.svg';
import bunny from './bunny.svg';
import cat from './cat.svg';
import cloud from './cloud.svg';
import fox from './fox.svg';
import frog from './frog.svg';
import mouse from './mouse.svg';
import owl from './owl.svg';
import penguin from './penguin.svg';
import pup from './pup.svg';
import sprout from './sprout.svg';
import whale from './whale.svg';

// Ids are stored on member rows. Add new ones; never rename.
export const avatars: AvatarDef[] = [
  { id: 'classic/sprout', name: 'Sprout', src: sprout },
  { id: 'classic/bear', name: 'Bear', src: bear },
  { id: 'classic/bunny', name: 'Bunny', src: bunny },
  { id: 'classic/cat', name: 'Cat', src: cat },
  { id: 'classic/pup', name: 'Pup', src: pup },
  { id: 'classic/owl', name: 'Owl', src: owl },
  { id: 'classic/frog', name: 'Frog', src: frog },
  { id: 'classic/penguin', name: 'Penguin', src: penguin },
  { id: 'classic/fox', name: 'Fox', src: fox },
  { id: 'classic/mouse', name: 'Mouse', src: mouse },
  { id: 'classic/whale', name: 'Whale', src: whale },
  { id: 'classic/cloud', name: 'Cloud', src: cloud },
];
