import {
  Eye,
  FileCode,
  Globe,
  History,
  Image,
  Key,
  Layers,
  Rocket,
  Server,
  Shield,
  Square,
  ToggleLeft,
  Undo2,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * The icons a feature card may use, by their lucide.dev name.
 *
 * A fixed map rather than lucide's `DynamicIcon`: that one resolves the icon in
 * the browser, so every card would paint empty and fill in after hydration —
 * on the one screen where first paint is the product. Adding a name here is a
 * one-line change; the field description in `ainam.config.ts` points at it.
 */
const ICONS: Record<string, LucideIcon> = {
  eye: Eye,
  'file-code': FileCode,
  globe: Globe,
  history: History,
  image: Image,
  key: Key,
  layers: Layers,
  rocket: Rocket,
  server: Server,
  shield: Shield,
  'toggle-left': ToggleLeft,
  'undo-2': Undo2,
  users: Users,
}

export interface FeatureIconProps {
  name: string
}

/** 16px, 1.5 stroke, currentColor — icons never carry a status hue. */
export function FeatureIcon({ name }: FeatureIconProps) {
  const Glyph = ICONS[name] ?? Square
  return <Glyph size={16} strokeWidth={1.5} aria-hidden="true" />
}
