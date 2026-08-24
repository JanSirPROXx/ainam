// Every interactive component here uses hooks or event handlers, and the
// dashboard is a Next.js App Router app. Marking the entry point rather than
// each file keeps the contract simple: @ainam/ui is a client-side component
// library. Without this, importing any of it from a Server Component throws.
'use client'

// ---------------------------------------------------------------- actions
export { Button } from './components/Button'
export type { ButtonProps, ButtonSize, ButtonVariant } from './components/Button'
export { IconButton } from './components/IconButton'
export type { IconButtonProps, IconButtonSize, IconButtonVariant } from './components/IconButton'

// ---------------------------------------------------------------- forms
export { Field } from './components/Field'
export type { FieldProps } from './components/Field'
export { Input } from './components/Input'
export type { InputProps, InputSize } from './components/Input'
export { Textarea } from './components/Textarea'
export type { TextareaProps } from './components/Textarea'
export { Select } from './components/Select'
export type { SelectOption, SelectProps, SelectSize } from './components/Select'
export { Checkbox } from './components/Checkbox'
export type { CheckboxProps } from './components/Checkbox'
export { Radio } from './components/Radio'
export type { RadioProps } from './components/Radio'
export { Switch } from './components/Switch'
export type { SwitchProps, SwitchSize } from './components/Switch'

// ---------------------------------------------------------------- surfaces
export { Card } from './components/Card'
export type { CardPadding, CardProps } from './components/Card'
export { Dialog } from './components/Dialog'
export type { DialogProps } from './components/Dialog'

// ---------------------------------------------------------------- data
export { Badge } from './components/Badge'
export type { BadgeProps, BadgeTone } from './components/Badge'
export { CodeBlock } from './components/CodeBlock'
export type { CodeBlockProps } from './components/CodeBlock'
export { Metric } from './components/Metric'
export type { MetricDeltaTone, MetricProps } from './components/Metric'
export { Table } from './components/Table'
export type { TableColumn, TableProps, TableRow } from './components/Table'
export { Tag } from './components/Tag'
export type { TagProps } from './components/Tag'

// ---------------------------------------------------------------- navigation
export { Tabs } from './components/Tabs'
export type { TabItem, TabsProps, TabsVariant } from './components/Tabs'
export { SidebarNav } from './components/SidebarNav'
export type { NavItemDef, NavSection, SidebarNavProps } from './components/SidebarNav'
export { Breadcrumb } from './components/Breadcrumb'
export type { BreadcrumbItem, BreadcrumbProps } from './components/Breadcrumb'

// ---------------------------------------------------------------- feedback
export { Toast } from './components/Toast'
export type { ToastProps, ToastTone } from './components/Toast'
export { Tooltip } from './components/Tooltip'
export type { TooltipProps, TooltipSide } from './components/Tooltip'
export { EmptyState } from './components/EmptyState'
export type { EmptyStateProps } from './components/EmptyState'

// ---------------------------------------------------------------- brand
export { Eyebrow } from './components/Eyebrow'
export type { EyebrowProps } from './components/Eyebrow'
export { GridBackdrop } from './components/GridBackdrop'
export type { GridBackdropProps } from './components/GridBackdrop'
export { Wordmark } from './components/Wordmark'
export type { WordmarkProps } from './components/Wordmark'
