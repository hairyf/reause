import type { BatteryManager, UseBatteryReturn } from '../packages/core/useBattery'

// Compile-time only: tsc checks these assignments without mutating live observations.
export function assertReadonlyBatteryFields(manager: BatteryManager, result: UseBatteryReturn) {
  // @ts-expect-error battery charging is readonly
  manager.charging = true
  // @ts-expect-error battery chargingTime is readonly
  manager.chargingTime = 0
  // @ts-expect-error battery dischargingTime is readonly
  manager.dischargingTime = 0
  // @ts-expect-error battery level is readonly
  manager.level = 1

  // @ts-expect-error result charging is readonly
  result.charging = true
  // @ts-expect-error result chargingTime is readonly
  result.chargingTime = 0
  // @ts-expect-error result dischargingTime is readonly
  result.dischargingTime = 0
  // @ts-expect-error result level is readonly
  result.level = 1

  result.isSupported = true
}
