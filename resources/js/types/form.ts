export type ValidationRule<V = unknown> = (value: V) => string | true

export type FormErrors<T extends Record<string, unknown>> =
  Partial<Record<keyof T, string>>

export type FormTouched<T extends Record<string, unknown>> =
  Partial<Record<keyof T, boolean>>
