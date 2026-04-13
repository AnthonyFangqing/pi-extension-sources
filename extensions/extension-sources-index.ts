import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
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

	const findExtensions = (dir: string): Array<{ name: string; path: string }> => {
		if (!existsSync(dir)) return [];
		const results: Array<{ name: string; path: string }> = [];

		for (const entry of readdirSync(dir)) {
			const fullPath = join(dir, entry);
			const st = statSync(fullPath);

			if (st.isDirectory()) {
				// Check for index.ts in subdirectory
				const indexPath = join(fullPath, "index.ts");
				if (existsSync(indexPath)) {
					results.push({ name: entry, path: shortenPath(indexPath) });
				}
			} else if (st.isFile() && entry.endsWith(".ts") && entry !== "index.ts") {
				// Top-level .ts files
				const name = entry.replace(/\.ts$/, "");
				results.push({ name, path: shortenPath(fullPath) });
			}
		}

		return results.sort((a, b) => a.name.localeCompare(b.name));
	};

	const buildPromptLines = (cwd: string): string => {
		const settings = SettingsManager.create(cwd, agentDir);
		const pm = new DefaultPackageManager({ cwd, agentDir, settingsManager: settings });
		const pkgs = pm.listConfiguredPackages();

		const globalAuto = join(agentDir, "extensions");
		const projectAuto = join(cwd, ".pi", "extensions");

		const sections: string[] = [];

		// Project extensions
		const projectExts = findExtensions(projectAuto);
		if (projectExts.length > 0) {
			sections.push(`**Project extensions** (from ${shortenPath(projectAuto)}):`);
			for (const ext of projectExts) {
				sections.push(`  - ${ext.name}: ${ext.path}`);
			}
		}

		// Global extensions
		const globalExts = findExtensions(globalAuto);
		if (globalExts.length > 0) {
			sections.push(`**Global extensions** (from ${shortenPath(globalAuto)}):`);
			for (const ext of globalExts) {
				sections.push(`  - ${ext.name}: ${ext.path}`);
			}
		}

		// Package extensions
		for (const pkg of pkgs) {
			if (!pkg.installedPath) continue;
			const pkgExtDir = join(pkg.installedPath, "extensions");
			const pkgExts = findExtensions(pkgExtDir);
			if (pkgExts.length > 0) {
				const label = pkg.scope === "project" ? "Project package" : "Global package";
				sections.push(`**${label}** (${pkg.source}):`);
				for (const ext of pkgExts) {
					sections.push(`  - ${ext.name}: ${ext.path}`);
				}
			}
		}

		if (sections.length === 0) return "";
		return `Here are the loaded extensions for the pi coding agent harness:\n${sections.join("\n")}`;
	};

	pi.on("before_agent_start", async (event, ctx) => {
		const lines = buildPromptLines(ctx.cwd);
		if (!lines) return;
		return { systemPrompt: `${event.systemPrompt}\n\n${lines}` };
	});
}
