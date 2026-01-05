import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"

const POKEAPI_BASE = "https://pokeapi.co/api/v2"

// Optional: If you have user-level config, define it here
export const configSchema = z.object({
	debug: z.boolean().default(false).describe("Enable debug logging"),
})

async function fetchPokeAPI(endpoint: string): Promise<any> {
	const response = await fetch(`${POKEAPI_BASE}${endpoint}`)
	if (!response.ok) {
		throw new Error(`PokéAPI error: ${response.status} ${response.statusText}`)
	}
	return response.json()
}

export default function createServer({
	config,
}: {
	config: z.infer<typeof configSchema>
}) {
	const server = new McpServer({
		name: "PokéAPI MCP Server",
		version: "1.0.0",
	})

	// Get Pokemon by name or ID
	server.registerTool(
		"get-pokemon",
		{
			title: "Get Pokemon",
			description: "Get detailed information about a Pokemon by name or ID",
			inputSchema: {
				pokemon: z.string().describe("Pokemon name (e.g., 'pikachu') or ID (e.g., '25')"),
			},
		},
		async ({ pokemon }) => {
			try {
				const data = await fetchPokeAPI(`/pokemon/${pokemon.toLowerCase()}`)

				const result = {
					id: data.id,
					name: data.name,
					height: data.height / 10, // Convert to meters
					weight: data.weight / 10, // Convert to kg
					types: data.types.map((t: any) => t.type.name),
					abilities: data.abilities.map((a: any) => ({
						name: a.ability.name,
						isHidden: a.is_hidden,
					})),
					stats: data.stats.map((s: any) => ({
						name: s.stat.name,
						baseStat: s.base_stat,
					})),
					sprites: {
						front: data.sprites.front_default,
						back: data.sprites.back_default,
						shiny: data.sprites.front_shiny,
					},
				}

				return {
					content: [
						{
							type: "text",
							text: config.debug
								? `DEBUG: ${JSON.stringify(result, null, 2)}`
								: JSON.stringify(result, null, 2),
						},
					],
				}
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: `Error: ${error instanceof Error ? error.message : "Failed to fetch Pokemon"}`,
						},
					],
				}
			}
		},
	)

	// Get Pokemon species info (evolution, flavor text, etc.)
	server.registerTool(
		"get-pokemon-species",
		{
			title: "Get Pokemon Species",
			description: "Get species information including evolution chain, habitat, and flavor text",
			inputSchema: {
				pokemon: z.string().describe("Pokemon name or ID"),
			},
		},
		async ({ pokemon }) => {
			try {
				const data = await fetchPokeAPI(`/pokemon-species/${pokemon.toLowerCase()}`)

				// Get English flavor text
				const flavorText = data.flavor_text_entries.find(
					(e: any) => e.language.name === "en"
				)?.flavor_text?.replace(/\f/g, " ")

				// Get English genus
				const genus = data.genera.find(
					(g: any) => g.language.name === "en"
				)?.genus

				const result = {
					id: data.id,
					name: data.name,
					genus: genus,
					generation: data.generation.name,
					habitat: data.habitat?.name || "unknown",
					isLegendary: data.is_legendary,
					isMythical: data.is_mythical,
					isBaby: data.is_baby,
					captureRate: data.capture_rate,
					baseHappiness: data.base_happiness,
					growthRate: data.growth_rate.name,
					flavorText: flavorText,
					evolutionChainUrl: data.evolution_chain.url,
				}

				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				}
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: `Error: ${error instanceof Error ? error.message : "Failed to fetch species"}`,
						},
					],
				}
			}
		},
	)

	// Get Pokemon type info
	server.registerTool(
		"get-pokemon-type",
		{
			title: "Get Pokemon Type",
			description: "Get type information including damage relations (strengths/weaknesses)",
			inputSchema: {
				type: z.string().describe("Type name (e.g., 'fire', 'water', 'electric')"),
			},
		},
		async ({ type }) => {
			try {
				const data = await fetchPokeAPI(`/type/${type.toLowerCase()}`)

				const result = {
					id: data.id,
					name: data.name,
					damageRelations: {
						doubleDamageTo: data.damage_relations.double_damage_to.map((t: any) => t.name),
						doubleDamageFrom: data.damage_relations.double_damage_from.map((t: any) => t.name),
						halfDamageTo: data.damage_relations.half_damage_to.map((t: any) => t.name),
						halfDamageFrom: data.damage_relations.half_damage_from.map((t: any) => t.name),
						noDamageTo: data.damage_relations.no_damage_to.map((t: any) => t.name),
						noDamageFrom: data.damage_relations.no_damage_from.map((t: any) => t.name),
					},
					pokemonCount: data.pokemon.length,
				}

				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				}
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: `Error: ${error instanceof Error ? error.message : "Failed to fetch type"}`,
						},
					],
				}
			}
		},
	)

	// Get Pokemon ability
	server.registerTool(
		"get-pokemon-ability",
		{
			title: "Get Pokemon Ability",
			description: "Get detailed information about a Pokemon ability",
			inputSchema: {
				ability: z.string().describe("Ability name (e.g., 'overgrow', 'blaze', 'static')"),
			},
		},
		async ({ ability }) => {
			try {
				const data = await fetchPokeAPI(`/ability/${ability.toLowerCase().replace(/ /g, "-")}`)

				// Get English effect
				const effect = data.effect_entries.find(
					(e: any) => e.language.name === "en"
				)

				const result = {
					id: data.id,
					name: data.name,
					effect: effect?.effect,
					shortEffect: effect?.short_effect,
					generation: data.generation.name,
					pokemonWithAbility: data.pokemon.slice(0, 10).map((p: any) => ({
						name: p.pokemon.name,
						isHidden: p.is_hidden,
					})),
				}

				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				}
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: `Error: ${error instanceof Error ? error.message : "Failed to fetch ability"}`,
						},
					],
				}
			}
		},
	)

	// Get Pokemon move
	server.registerTool(
		"get-pokemon-move",
		{
			title: "Get Pokemon Move",
			description: "Get detailed information about a Pokemon move",
			inputSchema: {
				move: z.string().describe("Move name (e.g., 'thunderbolt', 'flamethrower', 'surf')"),
			},
		},
		async ({ move }) => {
			try {
				const data = await fetchPokeAPI(`/move/${move.toLowerCase().replace(/ /g, "-")}`)

				// Get English effect
				const effect = data.effect_entries.find(
					(e: any) => e.language.name === "en"
				)

				const result = {
					id: data.id,
					name: data.name,
					type: data.type.name,
					damageClass: data.damage_class.name,
					power: data.power,
					accuracy: data.accuracy,
					pp: data.pp,
					priority: data.priority,
					effect: effect?.short_effect?.replace("$effect_chance%", `${data.effect_chance}%`),
					generation: data.generation.name,
					target: data.target.name,
				}

				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				}
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: `Error: ${error instanceof Error ? error.message : "Failed to fetch move"}`,
						},
					],
				}
			}
		},
	)

	// List Pokemon with pagination
	server.registerTool(
		"list-pokemon",
		{
			title: "List Pokemon",
			description: "List Pokemon with pagination. Returns names and IDs.",
			inputSchema: {
				limit: z.number().min(1).max(100).default(20).describe("Number of Pokemon to return (max 100)"),
				offset: z.number().min(0).default(0).describe("Offset for pagination"),
			},
		},
		async ({ limit, offset }) => {
			try {
				const data = await fetchPokeAPI(`/pokemon?limit=${limit}&offset=${offset}`)

				const result = {
					count: data.count,
					pokemon: data.results.map((p: any, index: number) => ({
						id: offset + index + 1,
						name: p.name,
					})),
					hasMore: data.next !== null,
				}

				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				}
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: `Error: ${error instanceof Error ? error.message : "Failed to list Pokemon"}`,
						},
					],
				}
			}
		},
	)

	// Get evolution chain
	server.registerTool(
		"get-evolution-chain",
		{
			title: "Get Evolution Chain",
			description: "Get the evolution chain for a Pokemon species",
			inputSchema: {
				pokemon: z.string().describe("Pokemon name to find evolution chain for"),
			},
		},
		async ({ pokemon }) => {
			try {
				// First get species to find evolution chain URL
				const speciesData = await fetchPokeAPI(`/pokemon-species/${pokemon.toLowerCase()}`)
				const chainId = speciesData.evolution_chain.url.split("/").filter(Boolean).pop()
				const chainData = await fetchPokeAPI(`/evolution-chain/${chainId}`)

				// Parse evolution chain
				function parseChain(chain: any): any {
					const evolutions = chain.evolves_to.map((e: any) => parseChain(e))
					return {
						species: chain.species.name,
						evolvesTo: evolutions.length > 0 ? evolutions : undefined,
						evolutionDetails: chain.evolution_details.length > 0
							? chain.evolution_details.map((d: any) => ({
									trigger: d.trigger.name,
									minLevel: d.min_level,
									item: d.item?.name,
									heldItem: d.held_item?.name,
									timeOfDay: d.time_of_day || undefined,
									minHappiness: d.min_happiness,
									minAffection: d.min_affection,
							  }))
							: undefined,
					}
				}

				const result = {
					chainId: chainData.id,
					chain: parseChain(chainData.chain),
				}

				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				}
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: `Error: ${error instanceof Error ? error.message : "Failed to fetch evolution chain"}`,
						},
					],
				}
			}
		},
	)

	// Get Pokemon by generation
	server.registerTool(
		"get-generation",
		{
			title: "Get Generation",
			description: "Get information about a Pokemon generation including all Pokemon from that generation",
			inputSchema: {
				generation: z.union([
					z.string(),
					z.number()
				]).describe("Generation number (1-9) or name (e.g., 'generation-i')"),
			},
		},
		async ({ generation }) => {
			try {
				const genId = typeof generation === "number"
					? generation
					: generation.toLowerCase().replace("generation-", "").replace("gen", "")

				const data = await fetchPokeAPI(`/generation/${genId}`)

				const result = {
					id: data.id,
					name: data.name,
					region: data.main_region.name,
					pokemonCount: data.pokemon_species.length,
					pokemon: data.pokemon_species.map((p: any) => p.name).sort(),
					newTypes: data.types.map((t: any) => t.name),
					newMoves: data.moves.length,
				}

				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				}
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: `Error: ${error instanceof Error ? error.message : "Failed to fetch generation"}`,
						},
					],
				}
			}
		},
	)

	// Add a resource for Pokemon types reference
	server.registerResource(
		"pokemon-types",
		"pokeapi://types",
		{
			title: "Pokemon Types Reference",
			description: "List of all Pokemon types",
		},
		async (uri) => ({
			contents: [
				{
					uri: uri.href,
					text: JSON.stringify({
						types: [
							"normal", "fire", "water", "electric", "grass", "ice",
							"fighting", "poison", "ground", "flying", "psychic", "bug",
							"rock", "ghost", "dragon", "dark", "steel", "fairy"
						],
						note: "Use get-pokemon-type tool for detailed type information",
					}, null, 2),
					mimeType: "application/json",
				},
			],
		}),
	)

	// Add a prompt for Pokemon analysis
	server.registerPrompt(
		"analyze-pokemon",
		{
			title: "Analyze Pokemon",
			description: "Analyze a Pokemon's strengths, weaknesses, and competitive viability",
			argsSchema: {
				pokemon: z.string().describe("Name of the Pokemon to analyze"),
			},
		},
		async ({ pokemon }) => {
			return {
				messages: [
					{
						role: "user",
						content: {
							type: "text",
							text: `Please analyze ${pokemon} comprehensively. Use the available tools to:
1. Get the Pokemon's basic info (stats, types, abilities)
2. Get type matchup information for its types
3. Get its evolution chain
4. Get details on its abilities

Then provide an analysis covering:
- Base stat distribution and role
- Type advantages and disadvantages
- Useful abilities and their effects
- Evolution path
- Overall competitive viability`,
						},
					},
				],
			}
		},
	)

	return server.server
}
