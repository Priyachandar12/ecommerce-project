
import { describe, it, expect } from 'vitest'

function calculateTotal(price, quantity) {
  return price * quantity
}

describe('calculateTotal', () => {
  it('calculates the total price for multiple items', () => {
    expect(calculateTotal(100, 3)).toBe(300)
  })

  it('returns zero when quantity is zero', () => {
    expect(calculateTotal(100, 0)).toBe(0)
  })

  it('returns zero when price is zero', () => {
    expect(calculateTotal(0, 5)).toBe(0)
  })
})
