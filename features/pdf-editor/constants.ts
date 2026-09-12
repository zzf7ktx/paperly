import { type XfaFieldKind } from '../../lib/xfa-template';
import type { FormBlock, TextAlignment } from './types';

export const fontOptions = [
  'Helvetica',
  'Arial',
  'Calibri',
  'Verdana',
  'Trebuchet MS',
  'Tahoma',
  'Times Roman',
  'Cambria',
  'Georgia',
  'Garamond',
  'Palatino',
  'Courier',
  'Consolas',
];

export const alignmentOptions: Array<{ value: TextAlignment; label: string }> = [
  { value: 'left', label: 'Align left' },
  { value: 'center', label: 'Align center' },
  { value: 'right', label: 'Align right' },
  { value: 'justify', label: 'Justify' },
];

export const xfaFieldKindOptions: Array<{ value: XfaFieldKind; label: string }> = [
  { value: 'text', label: 'Text field' },
  { value: 'multiline', label: 'Multiline' },
  { value: 'numeric', label: 'Numeric' },
  { value: 'decimal', label: 'Decimal' },
  { value: 'date', label: 'Date / time' },
  { value: 'choice', label: 'Choice list' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Radio group' },
  { value: 'button', label: 'Button' },
  { value: 'password', label: 'Password' },
  { value: 'signature', label: 'Signature' },
  { value: 'barcode', label: 'Barcode' },
  { value: 'image', label: 'Image field' },
];

export const normalFieldKindOptions: Array<{ value: FormBlock['kind']; label: string }> = [
  { value: 'text', label: 'Text field' },
  { value: 'choice', label: 'Choice list' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Radio option' },
];

export const FORM_APPEARANCE_PADDING = 3;
