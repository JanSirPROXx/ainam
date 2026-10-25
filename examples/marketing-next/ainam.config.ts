import { defineContentSchema } from '@ainam/core'

/**
 * The AINAM marketing site, as content.
 *
 * This site is our own dogfood: every headline, every feature card, every
 * footer link on ainam.online is a row in an AINAM project, edited in the AINAM
 * dashboard and published without a deploy. If the flow is awkward here, it is
 * awkward for a customer — which is the point of running our own site on it.
 *
 * The defaults are the English copy. The German copy lives in `content/de.json`
 * and is published to the `de` locale with `scripts/publish-locale.mjs`, because
 * a default is one value per key and a push seeds it into every locale.
 *
 * Two defaults are deliberately `false`. `home/logos/visible` and
 * `home/testimonial/visible` gate the two sections that make claims about other
 * people, and we have no customers to name yet. Turn them on from the dashboard
 * once the names in them are real.
 */
export default defineContentSchema({
  // ---------------------------------------------------------------- page
  'meta/title': {
    type: 'text',
    label: 'Page title',
    description: 'The browser tab and the search result headline.',
    required: true,
    multiline: false,
    default: 'AINAM — the AI-native CMS layer for Next.js',
  },
  'meta/description': {
    type: 'text',
    label: 'Page description',
    description: 'The snippet under the headline in search results.',
    required: true,
    multiline: true,
    default:
      'Tell your coding agent to add AINAM. The text, images and sections of your Next.js site become editable in a dashboard, without a redeploy.',
  },

  // ---------------------------------------------------------------- nav
  'nav/links': {
    type: 'list',
    label: 'Header links',
    description: 'Shown between the wordmark and the sign-in link.',
    required: false,
    maxItems: 6,
    fields: {
      label: { type: 'text', label: 'Label', required: true, multiline: false, default: '' },
      href: { type: 'text', label: 'Destination', required: true, multiline: false, default: '#' },
    },
    default: [
      { label: 'Product', href: '#product' },
      { label: 'How it works', href: '#how' },
      { label: 'Publishing', href: '#publish' },
      { label: 'Source', href: 'https://github.com/JanSirPROXx/ainam' },
    ],
  },
  'nav/cta': {
    type: 'text',
    label: 'Header button',
    required: true,
    multiline: false,
    default: 'Get started',
  },

  // ---------------------------------------------------------------- hero
  'home/hero/announcement/visible': {
    type: 'boolean',
    label: 'Show the announcement pill',
    description: 'The badge above the headline. Switch it off between announcements.',
    required: false,
    default: true,
  },
  'home/hero/announcement/tag': {
    type: 'text',
    label: 'Announcement badge',
    required: false,
    multiline: false,
    default: 'new',
  },
  'home/hero/announcement/text': {
    type: 'text',
    label: 'Announcement text',
    required: false,
    multiline: false,
    default: 'Roll back a publish from the dashboard',
  },
  'home/hero/title': {
    type: 'text',
    label: 'Headline',
    description: 'The first line. The second line is a separate key and renders dimmer.',
    required: true,
    multiline: false,
    default: 'The AI-native CMS layer',
  },
  'home/hero/subtitle': {
    type: 'text',
    label: 'Headline, second line',
    required: false,
    multiline: false,
    default: 'for Next.js',
  },
  'home/hero/body': {
    type: 'text',
    label: 'Hero paragraph',
    required: false,
    multiline: true,
    default:
      'Tell your coding agent to add AINAM, or install three small packages yourself. Text, images and whole sections of your Next.js site become editable in a dashboard, with no redeploy.',
  },
  'home/hero/cta/primary': {
    type: 'text',
    label: 'Primary button',
    required: true,
    multiline: false,
    default: 'Get started',
  },
  'home/hero/cta/secondary': {
    type: 'text',
    label: 'Secondary button',
    required: false,
    multiline: false,
    default: 'Read the docs',
  },
  'home/hero/install': {
    type: 'text',
    label: 'Install line',
    description: 'The mono caption under the buttons.',
    required: false,
    multiline: false,
    default: 'npm install @ainam/core @ainam/next',
  },

  // ---------------------------------------------------------------- logo wall
  'home/logos/visible': {
    type: 'boolean',
    label: 'Show the customer logos',
    description: 'Off until the names below are real customers who agreed to be named.',
    required: false,
    default: false,
  },
  'home/logos/label': {
    type: 'text',
    label: 'Logo wall caption',
    required: false,
    multiline: false,
    default: 'Teams shipping content with AINAM',
  },
  'home/logos/names': {
    type: 'list',
    label: 'Customer names',
    description: 'Set in mono, one per entry. Add a name only with their permission.',
    required: false,
    maxItems: 8,
    fields: {
      name: { type: 'text', label: 'Name', required: true, multiline: false, default: '' },
    },
    default: [],
  },

  // ---------------------------------------------------------------- how it works
  'home/how/eyebrow': {
    type: 'text',
    label: 'How it works — eyebrow',
    required: false,
    multiline: false,
    default: 'How it works',
  },
  'home/how/title': {
    type: 'text',
    label: 'How it works — heading',
    required: true,
    multiline: false,
    default: 'One key, one project',
  },
  'home/how/body': {
    type: 'text',
    label: 'How it works — paragraph',
    required: false,
    multiline: true,
    default:
      'AINAM ships as three small npm packages. The key in your environment points the site at a project, and the project holds all of its content.',
  },
  'home/how/steps': {
    type: 'list',
    label: 'Steps',
    description: 'Numbered 01, 02, 03 in order. The code block is optional.',
    required: false,
    maxItems: 4,
    fields: {
      title: { type: 'text', label: 'Title', required: true, multiline: false, default: '' },
      body: { type: 'text', label: 'Body', required: false, multiline: true, default: '' },
      code: { type: 'text', label: 'Code sample', required: false, multiline: true, default: '' },
      filename: { type: 'text', label: 'Code label', required: false, multiline: false, default: '' },
    },
    default: [
      {
        title: 'Install the packages',
        body: 'The client has no dependencies of its own, and the Next.js adapter adds only that.',
        code: '$ npm install @ainam/core @ainam/next\n$ npm install --save-dev @ainam/cli',
        filename: 'terminal',
      },
      {
        title: 'Push your schema',
        body: 'The content schema lives in your codebase. Push it, and pull the types back down.',
        code: '$ npx ainam push\n$ npx ainam pull',
        filename: 'terminal',
      },
      {
        title: 'Edit from the dashboard',
        body: 'Text, images, rich text and whole sections — changed, previewed, published.',
        code: '',
        filename: '',
      },
    ],
  },

  // ---------------------------------------------------------------- features
  'home/features/eyebrow': {
    type: 'text',
    label: 'Features — eyebrow',
    required: false,
    multiline: false,
    default: 'What you get',
  },
  'home/features/title': {
    type: 'text',
    label: 'Features — heading',
    required: true,
    multiline: false,
    default: 'Content that lives beside your components',
  },
  'home/features/body': {
    type: 'text',
    label: 'Features — paragraph',
    required: false,
    multiline: true,
    default:
      'The schema is defined in code and generated back as types, so a wrong content key is a compile error rather than a blank section.',
  },
  'home/features/items': {
    type: 'list',
    label: 'Feature cards',
    description: 'Icon names come from lucide.dev. An unknown name falls back to a plain square.',
    required: false,
    maxItems: 9,
    fields: {
      icon: { type: 'text', label: 'Icon name', required: false, multiline: false, default: 'square' },
      title: { type: 'text', label: 'Title', required: true, multiline: false, default: '' },
      body: { type: 'text', label: 'Body', required: false, multiline: true, default: '' },
    },
    default: [
      {
        icon: 'bot',
        title: 'Set up by your agent',
        body: 'Paste one prompt. Your coding agent installs the packages, creates the account and keys, and uploads the schema.',
      },
      {
        icon: 'file-code',
        title: 'Code-first schema',
        body: 'Define content next to the components that render it. Run ainam pull and the types come back down.',
      },
      {
        icon: 'image',
        title: 'Images and assets',
        body: 'Upload once. Format is read from the file header, never the filename, and the URL is resolved per request.',
      },
      {
        icon: 'history',
        title: 'Version history',
        body: 'Every publish is a version. Roll back a single key or a whole publish.',
      },
      {
        icon: 'eye',
        title: 'Preview before publish',
        body: 'Drafts are readable through their own credential and their own path, never the site key.',
      },
      {
        icon: 'toggle-left',
        title: 'Section toggles',
        body: 'A boolean field switches a whole section off. No deploy, no feature flag service.',
      },
      {
        icon: 'globe',
        title: 'Locales as data',
        body: 'Every entry carries a language and falls back to the default. The dashboard edits the default language today; translations go in through the API.',
      },
    ],
  },

  // ---------------------------------------------------------------- publishing
  'home/publish/eyebrow': {
    type: 'text',
    label: 'Publishing — eyebrow',
    required: false,
    multiline: false,
    default: 'Draft and publish',
  },
  'home/publish/title': {
    type: 'text',
    label: 'Publishing — heading',
    required: true,
    multiline: false,
    default: 'Nothing reaches the site until you say so',
  },
  'home/publish/body': {
    type: 'text',
    label: 'Publishing — paragraph',
    required: false,
    multiline: true,
    default:
      'Every change is a draft. Preview it on the real site, publish when it reads right, and roll the whole set back if it does not.',
  },

  // ---------------------------------------------------------------- testimonial
  'home/testimonial/visible': {
    type: 'boolean',
    label: 'Show the quote',
    description: 'Off until the quote below is one a real customer actually gave us.',
    required: false,
    default: false,
  },
  'home/testimonial/quote': {
    type: 'text',
    label: 'Quote',
    required: false,
    multiline: true,
    default: '',
  },
  'home/testimonial/name': {
    type: 'text',
    label: 'Who said it',
    required: false,
    multiline: false,
    default: '',
  },
  'home/testimonial/role': {
    type: 'text',
    label: 'Their role',
    required: false,
    multiline: false,
    default: '',
  },

  // ---------------------------------------------------------------- closing
  'home/cta/title': {
    type: 'text',
    label: 'Closing heading',
    required: true,
    multiline: false,
    default: 'Content, decoupled.',
  },
  'home/cta/subtitle': {
    type: 'text',
    label: 'Closing heading, second line',
    required: false,
    multiline: false,
    default: 'Self-host it, or try the free preview.',
  },
  'home/cta/primary': {
    type: 'text',
    label: 'Closing primary button',
    required: true,
    multiline: false,
    default: 'Get started',
  },
  'home/cta/secondary': {
    type: 'text',
    label: 'Closing secondary button',
    required: false,
    multiline: false,
    default: 'Read the source',
  },

  // ---------------------------------------------------------------- footer
  'footer/tagline': {
    type: 'text',
    label: 'Footer tagline',
    required: false,
    multiline: true,
    default: 'The AI-native CMS layer for Next.js.',
  },
  'footer/status/visible': {
    type: 'boolean',
    label: 'Show the status badge',
    required: false,
    default: false,
  },
  'footer/status/label': {
    type: 'text',
    label: 'Status label',
    description: 'Only truthful if something actually checks it. Off by default for that reason.',
    required: false,
    multiline: false,
    default: 'all systems normal',
  },
  'footer/links': {
    type: 'list',
    label: 'Footer links',
    description: 'Grouped by the column heading. A new heading creates a new column.',
    required: false,
    maxItems: 24,
    fields: {
      group: { type: 'text', label: 'Column', required: true, multiline: false, default: 'Product' },
      label: { type: 'text', label: 'Label', required: true, multiline: false, default: '' },
      href: { type: 'text', label: 'Destination', required: true, multiline: false, default: '#' },
    },
    default: [
      { group: 'Product', label: 'Overview', href: '#product' },
      { group: 'Product', label: 'How it works', href: '#how' },
      { group: 'Product', label: 'Publishing', href: '#publish' },
      { group: 'Developers', label: 'Source', href: 'https://github.com/JanSirPROXx/ainam' },
      {
        group: 'Developers',
        label: 'Quickstart',
        href: 'https://github.com/JanSirPROXx/ainam#try-it',
      },
      {
        group: 'Developers',
        label: 'Agent guide',
        href: 'https://github.com/JanSirPROXx/ainam/blob/main/docs/agents.md',
      },
      {
        group: 'Developers',
        label: 'Self-hosting',
        href: 'https://github.com/JanSirPROXx/ainam/blob/main/docs/deploy-coolify.md',
      },
      {
        group: 'Legal',
        label: 'Licence',
        href: 'https://github.com/JanSirPROXx/ainam/blob/main/LICENSE',
      },
      {
        group: 'Legal',
        label: 'Security',
        href: 'https://github.com/JanSirPROXx/ainam/blob/main/SECURITY.md',
      },
    ],
  },
})
