/**
 * Re-export barrel for the shared UI kit.
 * Feature modules import from `../shared` — never from individual files.
 */
export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';

export { Card, StatCard } from './Card';
export type { CardProps, StatCardProps, StatTone } from './Card';

export { Modal } from './Modal';
export type { ModalProps } from './Modal';

export { Field, TextInput, NumberInput, Select, TextArea } from './Inputs';
export type { FieldProps } from './Inputs';

export { ErrorBanner } from './ErrorBanner';
export type { ErrorBannerProps } from './ErrorBanner';

export { ToastStack } from './Toast';
export type { ToastItem, ToastKind } from './Toast';
