// Fetches unique items and gems from poe.ninja and saves them to src/data/items.json
// Requires Node.js 18+ (built-in fetch). Run with: node scripts/fetchItems.mjs
// Set LEAGUE env var to use a specific league id; defaults to the current challenge league.

import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_PATH = join(__dirname, '../src/data/items.json')

const HEADERS = { 'User-Agent': 'poe-wishlist/1.0 (github.com; contact via repo)' }

// New poe.ninja API base (as of 2025+)
const BASE = 'https://poe.ninja/poe1/api/economy/stash/current/item/overview'

const UNIQUE_TYPES = ['UniqueWeapon', 'UniqueArmour', 'UniqueAccessory', 'UniqueFlask', 'UniqueJewel']
const GEM_TYPES = ['SkillGem']

async function getLeague() {
  if (process.env.LEAGUE) return process.env.LEAGUE
  console.log('  Fetching current league from poe.ninja...')
  const res = await fetch('https://poe.ninja/poe1/api/economy/leagues', { headers: HEADERS })
  if (!res.ok) throw new Error(`Could not fetch leagues: HTTP ${res.status}`)
  const leagues = await res.json()
  // First entry is current challenge league; fallback to Standard
  const league = leagues[0]?.id || 'standard'
  console.log(`  Using league: ${league}`)
  return league
}

async function fetchType(league, type) {
  const url = `${BASE}?league=${encodeURIComponent(league)}&type=${type}`
  console.log(`  Fetching ${type}...`)
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${type}`)
  const json = await res.json()
  return json.lines || []
}

async function main() {
  console.log('Fetching PoE item data from poe.ninja...')
  mkdirSync(dirname(OUT_PATH), { recursive: true })

  try {
    const league = await getLeague()

    const uniquesSeen = new Set()
    const uniques = []

    for (const type of UNIQUE_TYPES) {
      const lines = await fetchType(league, type)
      for (const item of lines) {
        if (item.name && !uniquesSeen.has(item.name)) {
          uniquesSeen.add(item.name)
          uniques.push({
            name: item.name,
            icon: item.icon || null,
            baseType: item.baseType || null,
          })
        }
      }
    }

    const gemsSeen = new Set()
    const gems = []

    for (const type of GEM_TYPES) {
      const lines = await fetchType(league, type)
      for (const item of lines) {
        if (item.name && !gemsSeen.has(item.name)) {
          gemsSeen.add(item.name)
          gems.push({
            name: item.name,
            icon: item.icon || null,
          })
        }
      }
    }

    uniques.sort((a, b) => a.name.localeCompare(b.name))
    gems.sort((a, b) => a.name.localeCompare(b.name))

    writeFileSync(OUT_PATH, JSON.stringify({ uniques, gems }, null, 2))
    console.log(`✓ Saved ${uniques.length} uniques and ${gems.length} gems to src/data/items.json`)
  } catch (err) {
    console.error(`✗ Failed to fetch items: ${err.message}`)
    if (!existsSync(OUT_PATH)) {
      writeFileSync(OUT_PATH, JSON.stringify({ uniques: [], gems: [] }))
      console.log('  Created empty fallback — search will fall back to manual text input.')
    }
    process.exit(0) // don't fail the build
  }
}

main()
