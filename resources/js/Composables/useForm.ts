import { ref, reactive, computed } from 'vue'
import type { ValidationRule, FormErrors, FormTouched } from '@/types'

type Schema<T extends Record<string, unknown>> =
  Partial<Record<keyof T, ValidationRule<T[keyof T]>[]>>

/**
 * Framework-agnostic form state manager.
 * Works with any backend: Laravel Inertia, fetch, axios.
 *
 * For Inertia form submissions, pair with useForm from @inertiajs/vue3
 * for progress/flash handling; use this composable for client-side validation.
 */
export function useForm<T extends Record<string, unknown>>(
  initialValues: T,
  schema: Schema<T> = {},
) {
  const values      = reactive<T>({ ...initialValues }) as T
  const errors      = reactive<FormErrors<T>>({})
  const touched     = reactive<FormTouched<T>>({})
  const isSubmitting = ref(false)

  function validateField(key: keyof T): string | null {
    const rules = schema[key] ?? []
    for (const rule of rules) {
      const result = rule(values[key])
      if (result !== true) return result
    }
    return null
  }

  function touch(key: keyof T): void {
    (touched as Record<keyof T, boolean>)[key] = true
    const err = validateField(key)
    ;(errors as Record<keyof T, string | undefined>)[key] = err ?? undefined
  }

  function validateAll(): boolean {
    let valid = true
    for (const key of Object.keys(schema) as (keyof T)[]) {
      const err = validateField(key)
      ;(errors as Record<keyof T, string | undefined>)[key] = err ?? undefined
      if (err) valid = false
    }
    return valid
  }

  function reset(): void {
    Object.assign(values, initialValues)
    Object.keys(errors).forEach(k => delete (errors as Record<string, unknown>)[k])
    Object.keys(touched).forEach(k => delete (touched as Record<string, unknown>)[k])
    isSubmitting.value = false
  }

  async function handleSubmit(fn: (values: T) => Promise<void>): Promise<void> {
    if (!validateAll()) return
    isSubmitting.value = true
    try {
      await fn(values)
    } finally {
      isSubmitting.value = false
    }
  }

  const isDirty = computed(() =>
    Object.keys(initialValues).some(
      k => (values as Record<string, unknown>)[k] !== (initialValues as Record<string, unknown>)[k],
    ),
  )

  const hasErrors = computed(() => Object.values(errors).some(Boolean))

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isDirty,
    hasErrors,
    touch,
    validateAll,
    reset,
    handleSubmit,
  }
}
