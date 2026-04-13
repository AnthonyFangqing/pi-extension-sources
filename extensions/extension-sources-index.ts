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

		// Collect unique package locations
		const packages = new Map<string, string>();

		for (const ext of enabled) {
			const { metadata } = ext;
			const baseDir = metadata.baseDir ?? ext.path;

			let key: string;
			let location: string;

			if (metadata.origin === "package") {
				const type = metadata.source.startsWith("npm:") ? "npm" :
					metadata.source.startsWith("git:") ? "git" : "local";
				const source = metadata.source.replace(/^(npm:|git:)/, "");
				const scope = metadata.scope === "project" ? "Project" : "Global";
				key = `${scope} package (${type}:${source})`;
				location = shortenPath(baseDir);
			} else {
				const scope = metadata.scope === "project" ? "Project" : "Global";
				const locationDir = metadata.scope === "project" ? ".pi/extensions/" : "~/.pi/agent/extensions/";
				key = `${scope} extensions (${locationDir})`;
				location = shortenPath(baseDir);
			}

			packages.set(key, location);
		}

		const lines = [`Here are the loaded extensions for the pi coding agent harness:`];
		for (const [key, location] of packages) {
			lines.push(`**${key}**: ${location}`);
		}

		return { systemPrompt: `${event.systemPrompt}\n\n${lines.join("\n")}` };
	});
}
