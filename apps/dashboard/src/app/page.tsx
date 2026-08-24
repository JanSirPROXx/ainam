import { Badge, Button, Card, Eyebrow, Wordmark } from '@ainam/ui'

export default function DashboardPage() {
  return (
    <main
      style={{
        maxWidth: 'var(--container-md)',
        margin: '0 auto',
        padding: 'var(--space-13) var(--gutter-page)',
        display: 'grid',
        gap: 'var(--space-8)',
      }}
    >
      <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <Wordmark />
        <Eyebrow>Workspace</Eyebrow>
        <h1 style={{ font: 'var(--type-display)', letterSpacing: 'var(--ls-display)' }}>
          Content, decoupled.
        </h1>
      </div>

      <Card
        title="Design system"
        description="Tokens, components and the reset are vendored and enforced by the build."
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <Badge tone="success" dot>
              25 components
            </Badge>
            <Button variant="secondary" size="sm">
              View tokens
            </Button>
          </div>
        }
      >
        <p style={{ color: 'var(--text-muted)' }}>
          Editor surfaces land next. This page exists to prove the package renders.
        </p>
      </Card>
    </main>
  )
}
