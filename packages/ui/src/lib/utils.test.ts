import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn utility', () => {
  it('merges class names and resolves tailwind collisions', () => {
    const result = cn('px-2 py-1', 'bg-red-500', { 'text-white': true, 'opacity-50': false })
    expect(result).toBe('px-2 py-1 bg-red-500 text-white')

    const merged = cn('p-4', 'p-2')
    expect(merged).toBe('p-2')
  })
})

