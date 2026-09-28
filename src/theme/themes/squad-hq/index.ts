import type { ThemePack } from '../../types';
import { avatars } from './avatars';
import { BadgeFrame } from './badge-frame';
import { celebrate } from './celebrate';
import { copy } from './copy';
import { Effort } from './effort';
import { Hero } from './hero';
import { patterns } from './patterns';
import { meta } from './theme';
import './tokens.css';

export const squadHq: ThemePack = {
  ...meta,
  copy,
  patterns,
  celebrate,
  Effort,
  BadgeFrame,
  Hero,
  avatars,
};
