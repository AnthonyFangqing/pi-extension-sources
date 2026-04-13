import { basename } from "node:path";
import { homedir } from "node:os";
import {
	type ExtensionAPI,
	DefaultPackageManager,
	getAgentDir,
	SettingsManager,
} from "@mariozechner/pi-coding-agent";

export default function extensionSourcesPrompt(pi: ExtensionAPI) {
	const agentDir = getAgentDir();
	const home = homedir();

	const shortenPath = (p: string): string => p.replace(home, "~");
	const extName = (p: string): string => basename(p).replace(/\.(ts|js)$/, "");

	pi.on("before_agent_start", async (event, ctx) => {
		const settings = SettingsManager.create(ctx.cwd, agentDir);
		const pm = new DefaultPackageManager({ cwd: ctx.cwd, agentDir, settingsManager: settings });

		// Get all resolved extensions (from packages and auto-discovery)
		const { extensions } = await pm.resolve(async () => "skip");
		const enabled = extensions.filter((e) => e.enabled);
		if (enabled.length === 0) return;

		// Group by source
		const groups = new Map<string, string[]>();

		for (const ext of enabled) {
			const { metadata } = ext;
			let key: string;

			if (metadata.origin === "package") {
				const type = metadata.source.startsWith("npm:") ? "npm" :
					metadata.source.startsWith("git:") ? "git" : "local";
				const source = metadata.source.replace(/^(npm:|git:)/, "");
				const scope = metadata.scope === "project" ? "Project" : "Global";
				key = `${scope} package (${type}:${source})`;
			} else {
				const location = metadata.scope === "project" ? ".pi/extensions/" : "~/.pi/agent/extensions/";
				key = `${metadata.scope === "project" ? "Project" : "Global"} extensions (${location})`;
			}

			const line = `  - ${extName(ext.path)}: ${shortenPath(ext.path)}`;
			groups.set(key, [...(groups.get(key) ?? []), line]);
		}

		const lines = [`Here are the loaded extensions for the pi coding agent harness:`];
		for (const [key, items] of groups) {
			lines.push(`**${key}**:`);
			lines.push(...items);
		}

		return { systemPrompt: `${event.systemPrompt}\n\n${lines.join("\n")}` };
	});
}
