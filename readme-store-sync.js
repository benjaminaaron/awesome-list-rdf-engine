import {storeFromTurtles, sparqlInsertDelete, storeToTurtle, sparqlSelect} from "@foerderfunke/sem-ops-utils"
import { fileURLToPath } from "url"
import path from "path"
import fs from "fs"

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const README = path.join(THIS_DIR, "README.md")
const STORE_TTL = path.join(THIS_DIR, "src", "assets", "store.ttl")

const readmeLines = fs.readFileSync(README, "utf8").split("\n")
const store = storeFromTurtles([fs.readFileSync(STORE_TTL, "utf8")])
export const prefixes = {
    dev: "https://benjaminaaron.github.io/awesome-list-rdf-engine/",
    schema: "http://schema.org/"
}

const readmeHeaderLines = []

async function scanReadmeForNewItems() {
    let inCollectMode = false
    for (let line of readmeLines) {
        line = line.trim()
        if (!inCollectMode) readmeHeaderLines.push(line)
        if (line === "# Awesome list of Fachanwendungen") inCollectMode = true
        if (!inCollectMode || !line) continue
        const regex = /-\s*\[(?<name>[^\]]+)\]\((?<url>[^)]+)\)\s*-\s*(?<description>.+)/
        const m = line.match(regex)
        if (!m) continue
        const {name, url, description} = m.groups
        if (!url) continue
        let query = `
            PREFIX dev: <https://benjaminaaron.github.io/awesome-list-rdf-engine/>
            PREFIX schema: <http://schema.org/>
            INSERT {
                dev:${name.toLowerCase().replace(/\s+/g, "")} a dev:Fachanwendung ;
                schema:name "${name}" ;
                schema:description "${description}" ;
                schema:url <${url}> .        
            } WHERE {
                FILTER NOT EXISTS {
                    ?app a dev:Fachanwendung ;
                        schema:url <${url}> .
                }
            }`
        await sparqlInsertDelete(query, store)
        const turtle = await storeToTurtle(store, prefixes)
        fs.writeFileSync(STORE_TTL, turtle)
    }
}

async function rewriteReadmeFromStore() {
    let query = `
        PREFIX dev: <https://benjaminaaron.github.io/awesome-list-rdf-engine/>
        PREFIX schema: <http://schema.org/>
        SELECT * WHERE {
            ?id a dev:Fachanwendung ;
            schema:name ?name ;
            schema:description ?description ;
            schema:url ?url .
        }`
    let rows = await sparqlSelect(query, [store])
    let newReadmeLines = [...readmeHeaderLines, ""]
    for (let row of rows) {
        newReadmeLines.push(`- [${row.name}](${row.url}) - ${row.description}`)
    }
    const newReadme = newReadmeLines.join("\n") + "\n"
    fs.writeFileSync(README, newReadme, "utf8")
}

await scanReadmeForNewItems()
await rewriteReadmeFromStore()
