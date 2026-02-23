import pinoBrowser from 'pino/browser'

type PinoFn = (...args: unknown[]) => unknown

const pinoImpl = (pinoBrowser as unknown as { default?: PinoFn })?.default
  ? (pinoBrowser as unknown as { default: PinoFn }).default
  : (pinoBrowser as unknown as PinoFn)

export const pino = pinoImpl
export default pinoImpl
