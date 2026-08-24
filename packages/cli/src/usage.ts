export const USAGE = `ainam — content schema tooling for AINAM projects

Usage
  ainam init            Create ainam.config.ts and add the required env keys
  ainam push            Upload the schema in ainam.config.ts to the CMS

Push options
  --locales <list>          Comma-separated locales, default "en"
  --default-locale <code>   Falls back to the first locale

Environment (read from .env or the shell)
  AINAM_API_KEY         A key with the schema:write scope
  AINAM_PROJECT_ID      The project to push to
  AINAM_URL             CMS server origin, defaults to AINAM Cloud

Options
  -h, --help            Show this message
  -v, --version         Show the installed version
`
