import { Temporal } from "temporal-polyfill"
import { UTC } from "@/constants"

export type ZonedDateTime = Temporal.ZonedDateTime
export type PlainDate = Temporal.PlainDate
export type PlainTime = Temporal.PlainTime

export const compareDuration = (
  duration1: Temporal.Duration,
  duration2: Temporal.Duration
): number => {
  const nanoseconds1 = duration1.total("nanoseconds")
  const nanoseconds2 = duration2.total("nanoseconds")
  return nanoseconds1 === nanoseconds2 ? 0 : nanoseconds1 < nanoseconds2 ? -1 : 1
}

export const durationEquals = (
  duration1: Temporal.Duration,
  duration2: Temporal.Duration
): boolean => compareDuration(duration1, duration2) === 0

export const zdtKey = (date: Temporal.ZonedDateTime): bigint =>
  date.epochNanoseconds

export const zdtEquals = (
  date1: Temporal.ZonedDateTime,
  date2: Temporal.ZonedDateTime
): boolean => Temporal.ZonedDateTime.compare(date1, date2) === 0

export class ZdtSet implements Iterable<Temporal.ZonedDateTime> {
  private readonly items: Map<bigint, Temporal.ZonedDateTime>

  constructor(values?: Iterable<Temporal.ZonedDateTime>) {
    this.items = new Map()
    if (values) {
      for (const value of values) {
        this.add(value)
      }
    }
  }

  get size(): number {
    return this.items.size
  }

  add(date: Temporal.ZonedDateTime): this {
    this.items.set(zdtKey(date), date)
    return this
  }

  has(date: Temporal.ZonedDateTime): boolean {
    return this.items.has(zdtKey(date))
  }

  delete(date: Temporal.ZonedDateTime): boolean {
    return this.items.delete(zdtKey(date))
  }

  clear(): void {
    this.items.clear()
  }

  values(): MapIterator<Temporal.ZonedDateTime> {
    return this.items.values()
  }

  keys(): MapIterator<Temporal.ZonedDateTime> {
    return this.values()
  }

  *entries(): IterableIterator<
    [Temporal.ZonedDateTime, Temporal.ZonedDateTime]
  > {
    for (const value of this.items.values()) {
      yield [value, value]
    }
  }

  forEach(
    callback: (
      value: Temporal.ZonedDateTime,
      key: Temporal.ZonedDateTime,
      set: ZdtSet
    ) => void,
    thisArg?: unknown
  ): void {
    for (const value of this.items.values()) {
      callback.call(thisArg, value, value, this)
    }
  }

  [Symbol.iterator](): IterableIterator<Temporal.ZonedDateTime> {
    return this.values()
  }
}

export class ZdtMap<T> implements Iterable<[Temporal.ZonedDateTime, T]> {
  private readonly items: Map<bigint, { date: Temporal.ZonedDateTime; value: T }>

  constructor(values?: Iterable<[Temporal.ZonedDateTime, T]>) {
    this.items = new Map()
    if (values) {
      for (const [date, value] of values) {
        this.set(date, value)
      }
    }
  }

  get size(): number {
    return this.items.size
  }

  has(date: Temporal.ZonedDateTime): boolean {
    return this.items.has(zdtKey(date))
  }

  get(date: Temporal.ZonedDateTime): T | undefined {
    return this.items.get(zdtKey(date))?.value
  }

  set(date: Temporal.ZonedDateTime, value: T): this {
    this.items.set(zdtKey(date), { date, value })
    return this
  }

  delete(date: Temporal.ZonedDateTime): boolean {
    return this.items.delete(zdtKey(date))
  }

  clear(): void {
    this.items.clear()
  }

  *entries(): IterableIterator<[Temporal.ZonedDateTime, T]> {
    for (const { date, value } of this.items.values()) {
      yield [date, value]
    }
  }

  *keys(): IterableIterator<Temporal.ZonedDateTime> {
    for (const { date } of this.items.values()) {
      yield date
    }
  }

  *values(): IterableIterator<T> {
    for (const { value } of this.items.values()) {
      yield value
    }
  }

  forEach(
    callback: (
      value: T,
      key: Temporal.ZonedDateTime,
      map: ZdtMap<T>
    ) => void,
    thisArg?: unknown
  ): void {
    for (const { date, value } of this.items.values()) {
      callback.call(thisArg, value, date, this)
    }
  }

  [Symbol.iterator](): IterableIterator<[Temporal.ZonedDateTime, T]> {
    return this.entries()
  }
}

export const zdtSetHas = (
  set: ZdtSet,
  date: Temporal.ZonedDateTime
): boolean => set.has(date)

export const zdtSetDelete = (
  set: ZdtSet,
  date: Temporal.ZonedDateTime
): boolean => set.delete(date)

export const zdtMapHas = <T>(
  map: ZdtMap<T>,
  date: Temporal.ZonedDateTime
): boolean => map.has(date)

export const zdtMapGet = <T>(
  map: ZdtMap<T>,
  date: Temporal.ZonedDateTime
): T | undefined => map.get(date)

export const zdtMapGetOrInsert = <T>(
  map: ZdtMap<T>,
  date: Temporal.ZonedDateTime,
  createValue: () => T
): T => {
  if (map.has(date)) return map.get(date) as T
  const value = createValue()
  map.set(date, value)
  return value
}

const fromEpochMilliseconds = (ms: number): Temporal.ZonedDateTime =>
  Temporal.Instant.fromEpochMilliseconds(ms).toZonedDateTimeISO(UTC)

const parseEpochKey = (value: string): Temporal.ZonedDateTime => {
  if (/^-?\d+$/.test(value)) {
    return fromEpochMilliseconds(Number(value))
  }
  return Temporal.Instant.from(value).toZonedDateTimeISO(UTC)
}

export const fromEpochMillisecondsToZDT = fromEpochMilliseconds
export const parseTemporalEpochKey = parseEpochKey
