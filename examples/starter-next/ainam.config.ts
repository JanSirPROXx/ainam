import { defineContentSchema } from '@ainam/core'

/**
 * Every piece of content this site hands to its owner.
 *
 * Each key declares a default, which `ainam push` seeds — so the site renders
 * this copy from its first deploy, and the owner edits from there rather than
 * starting at a blank page.
 */
export default defineContentSchema({
  'home/hero/eyebrow': {
    type: 'text',
    label: 'Hero eyebrow',
    required: false,
    multiline: false,
    default: 'AI-native CMS',
  },
  'home/hero/title': {
    type: 'text',
    label: 'Hero title',
    required: true,
    multiline: false,
    default: 'Content, decoupled.',
  },
  'home/hero/subtitle': {
    type: 'text',
    label: 'Hero subtitle',
    description: 'The second line. Keep it to one sentence.',
    required: false,
    multiline: true,
    default: 'Ship the site. Hand the copy to whoever owns it.',
  },
  'home/hero/cta': {
    type: 'text',
    label: 'Primary button',
    required: true,
    multiline: false,
    default: 'Get started',
  },
  'home/pricing/visible': {
    type: 'boolean',
    label: 'Show the pricing section',
    description: 'Turn a whole section off without a deploy.',
    required: false,
    default: true,
  },
  'home/pricing/seats': {
    type: 'number',
    label: 'Included seats',
    required: false,
    default: 3,
  },
})
