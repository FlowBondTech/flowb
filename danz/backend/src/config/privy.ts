import { PrivyClient } from '@privy-io/server-auth'
import { config } from './env.js'

export const privyClient = new PrivyClient(config.privy.appId, config.privy.appSecret)
