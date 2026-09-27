import type { ThemePack } from '../../types';
import { avatars } from './avatars';
import { BadgeFrame } from './badge-frame';
import { celebrate } from './celebrate';
import { classicCopy } from './copy';
import { Effort } from './effort';
import { patterns } from './patterns';
import { meta } from './theme';
import './tokens.css';

export const classic: ThemePack = {
  ...meta,
  copy: classicCopy,
  patterns,
  celebrate,
  Effort,
  BadgeFrame,
  avatars,
};
