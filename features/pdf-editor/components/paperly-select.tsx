'use client';

export function PaperlySelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
  className = '',
  onOpen,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  onOpen?: () => void;
}) {
  const selectedOption = options.find((option) => option.value === value) || options[0];
  return (
    <details
      className={`field-type-menu paperly-select ${className}`}
      data-disabled={disabled || undefined}
      onToggle={(event) => {
        if (event.currentTarget.open) onOpen?.();
      }}
    >
      <summary
        aria-label={label}
        aria-disabled={disabled}
        title={selectedOption?.label}
        onClick={(event) => {
          if (disabled) event.preventDefault();
        }}
      >
        <span>{selectedOption?.label}</span>
        <b className="field-type-chevron" aria-hidden="true" />
      </summary>
      <div className="field-type-options" role="menu" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="menuitemradio"
            aria-checked={option.value === value}
            className={option.value === value ? 'active' : ''}
            onClick={(event) => {
              onChange(option.value);
              event.currentTarget.closest('details')?.removeAttribute('open');
            }}
          >
            <span>{option.label}</span>
            {option.value === value && <b aria-hidden="true">✓</b>}
          </button>
        ))}
      </div>
    </details>
  );
}
