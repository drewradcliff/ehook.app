import { Client } from "@upstash/qstash"

const token = process.env.UPSTASH_QSTASH_TOKEN

if (!token) {
  throw new Error("Missing UPSTASH_QSTASH_TOKEN environment variable")
}

export const qstash = new Client({
  token,
})
