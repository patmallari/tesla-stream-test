import {
  Map, Clapperboard, CloudSun, Gamepad2, Link2, Tv, Music,
  Video, Newspaper, Radio, Navigation2, Camera, Globe, LayoutGrid,
} from "lucide-react";

export const ICONS = {
  map: Map,
  clapperboard: Clapperboard,
  "cloud-sun": CloudSun,
  "gamepad-2": Gamepad2,
  link: Link2,
  tv: Tv,
  music: Music,
  video: Video,
  news: Newspaper,
  radio: Radio,
  nav: Navigation2,
  camera: Camera,
  globe: Globe,
  grid: LayoutGrid,
};

export function iconFor(name) {
  return ICONS[name] || Link2;
}

export const ICON_NAMES = Object.keys(ICONS);
