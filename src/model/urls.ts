import type { Fn } from "@thi.ng/api";
import type { RepoType, RepoURLProvider } from "./api";

export const URL_PROVIDERS: Record<
	RepoType,
	Fn<Record<"branch" | "root" | "scope" | "url", string>, RepoURLProvider>
> = {
	github: (opts) => ({
		package: (pkg: string) =>
			`${opts.url}/tree/${opts.branch}/${opts.root}/${pkg}`,

		taggedPackage: (pkg: string, version: string) =>
			`${opts.url}/tree/${
				opts.scope ? opts.scope + "/" : ""
			}${pkg}@${version}/${opts.root}/${pkg}`,

		commit: (sha: string) => `${opts.url}/commit/${sha}`,

		issue: (id: string) => `${opts.url}/issues/${id}`,
	}),

	forgejo: (opts) => ({
		package: (pkg: string) =>
			`${opts.url}/src/branch/${opts.branch}/${opts.root}/${pkg}`,

		taggedPackage: (pkg: string, version: string) =>
			`${opts.url}/src/tag/${
				opts.scope ? opts.scope + "/" : ""
			}${pkg}@${version}/${opts.root}/${pkg}`,

		commit: (sha: string) => `${opts.url}/commit/${sha}`,

		issue: (id: string) => `${opts.url}/issues/${id}`,
	}),
};
