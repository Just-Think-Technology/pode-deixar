import { describe, it, expect } from 'vitest'

// Test functions that exist in the lib/utils or lib/auth
import { cn } from '@/lib/utils'

describe('Format Utils', () => {
  describe('cn Utility', () => {
    it('should merge class names', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2')
    })

    it('should handle undefined and null', () => {
      expect(cn('class1', undefined, null, 'class2')).toBe('class1 class2')
    })

    it('should handle empty strings', () => {
      expect(cn('class1', '', 'class2')).toBe('class1 class2')
    })

    it('should merge with conditional classes', () => {
      const className = 'custom'
      expect(cn('base', { [className]: true })).toBe('base custom')
    })

    it('should merge with conditional classes false', () => {
      expect(cn('base', { [ 'custom']: false })).toBe('base')
    })

    it('should pass through original classes', () => {
      expect(cn('existing')).toBe('existing')
    })

    it('should work with Tailwind classes', () => {
      expect(cn('px-2 py-1', 'hover:bg-blue-500')).toBe('px-2 py-1 hover:bg-blue-500')
    })
  })
})