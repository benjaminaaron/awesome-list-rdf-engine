import { QueryEngine } from "@comunica/query-sparql"

const REMOTE_TTL_FILE = "https://raw.githubusercontent.com/benjaminaaron/awesome-list-rdf-engine/refs/heads/main/src/assets/store.ttl"
const engine = new QueryEngine()

const query = `
    PREFIX dev: <https://benjaminaaron.github.io/awesome-list-rdf-engine/>
    SELECT * WHERE {
        ?id a dev:Fachanwendung ;
            ?p ?o .
    }`
let bindingsStream = await engine.queryBindings(query, { sources: [REMOTE_TTL_FILE] })
let rows = await bindingsStream.toArray()
for (const row of rows) {
    for (const key of row.keys()) {
        const term = row.get(key)
        console.log(`${key.value}: ${term.value}`)
    }
    console.log("--------------------")
}
