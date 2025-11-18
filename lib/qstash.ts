import { Client } from "@upstash/qstash"

const token = process.env.QSTASH_TOKEN

if (!token) {
  throw new Error("Missing QSTASH_TOKEN environment variable")
}

export const qstash = new Client({
  token,
})
