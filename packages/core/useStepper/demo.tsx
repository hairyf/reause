import { useStepper } from '@reause/core'
import { useState } from 'react'

const STEPS = ['user-information', 'billing-address', 'terms', 'payment']

const TITLES: Record<string, string> = {
  'user-information': 'User information',
  'billing-address': 'Billing address',
  'terms': 'Terms',
  'payment': 'Payment',
}

interface DemoForm {
  firstName: string
  lastName: string
  billingAddress: string
  contractAccepted: boolean
  carbonOffsetting: boolean
  payment: 'paypal' | 'credit-card'
}

export default function UseStepperDemo() {
  const [form, setForm] = useState<DemoForm>({
    firstName: 'Jon',
    lastName: '',
    billingAddress: '',
    contractAccepted: false,
    carbonOffsetting: false,
    payment: 'credit-card',
  })

  const { index, steps, current, isFirst, isLast, goTo, goToNext, isBefore, isCurrent } = useStepper(STEPS)

  function isStepValid(step: string): boolean {
    switch (step) {
      case 'user-information':
        return Boolean(form.firstName && form.lastName)
      case 'billing-address':
        return form.billingAddress.trim() !== ''
      case 'terms':
        return form.contractAccepted === true
      case 'payment':
        return form.payment === 'credit-card' || form.payment === 'paypal'
      default:
        return false
    }
  }

  // upstream: every step before the target must be valid to jump ahead
  function allStepsBeforeAreValid(i: number): boolean {
    return steps.slice(0, i).every(step => isStepValid(step))
  }

  function submit() {
    if (isStepValid(current))
      goToNext()
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
        {steps.map((step, i) => (
          <button
            key={step}
            disabled={!allStepsBeforeAreValid(i) && isBefore(step)}
            onClick={() => goTo(step)}
          >
            {i === index ? `[${TITLES[step]}]` : TITLES[step]}
          </button>
        ))}
      </div>

      <form
        style={{ marginTop: '16px' }}
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <p style={{ fontWeight: 'bold' }}>{TITLES[current]}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            {isCurrent('user-information') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label>
                  {'First name: '}
                  <input type="text" value={form.firstName} onChange={event => setForm({ ...form, firstName: event.target.value })} />
                </label>
                <label>
                  {'Last name: '}
                  <input type="text" value={form.lastName} onChange={event => setForm({ ...form, lastName: event.target.value })} />
                </label>
              </div>
            )}

            {isCurrent('billing-address') && (
              <input
                type="text"
                placeholder="Billing address"
                value={form.billingAddress}
                onChange={event => setForm({ ...form, billingAddress: event.target.value })}
              />
            )}

            {isCurrent('terms') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label>
                  <input
                    type="checkbox"
                    checked={form.carbonOffsetting}
                    onChange={event => setForm({ ...form, carbonOffsetting: event.target.checked })}
                  />
                  {' I accept to deposit a carbon offsetting fee'}
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={form.contractAccepted}
                    onChange={event => setForm({ ...form, contractAccepted: event.target.checked })}
                  />
                  {' I accept the terms of the contract'}
                </label>
              </div>
            )}

            {isCurrent('payment') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label>
                  <input
                    type="radio"
                    name="payment"
                    checked={form.payment === 'credit-card'}
                    onChange={() => setForm({ ...form, payment: 'credit-card' })}
                  />
                  {' Credit card'}
                </label>
                <label>
                  <input
                    type="radio"
                    name="payment"
                    checked={form.payment === 'paypal'}
                    onChange={() => setForm({ ...form, payment: 'paypal' })}
                  />
                  {' PayPal'}
                </label>
              </div>
            )}
          </div>

          <div>
            {!isLast && <button type="submit" disabled={!isStepValid(current)}>Next</button>}
            {isLast && <button type="submit" disabled={!isStepValid(current)}>Submit</button>}
          </div>
        </div>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
        <div style={{ border: '1px solid #8884', borderRadius: '4px', padding: '8px' }}>
          <strong>Form</strong>
          <pre style={{ margin: '4px 0 0' }}>{JSON.stringify(form, null, 2)}</pre>
        </div>

        <div style={{ border: '1px solid #8884', borderRadius: '4px', padding: '8px' }}>
          <strong>Wizard</strong>
          <pre style={{ margin: '4px 0 0' }}>{JSON.stringify({ steps, index, current, isFirst, isLast }, null, 2)}</pre>
        </div>
      </div>
    </div>
  )
}
