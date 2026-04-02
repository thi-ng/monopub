import type { Fn } from "@thi.ng/api";
import type { RepoType, RepoURLProvider } from "./api";

export const URL_PROVIDERS: Record<
	RepoType,
	Fn<Record<"branch" | "root" | "scope" | "url", string>, RepoURLProvider>
> = {
	github: ({ branch, root, scope, url }) => ({
		package: (pkg: string) => `${url}/tree/${branch}/${root}/${pkg}`,

		taggedPackage: (pkg: string, version: string) =>
			`${url}/tree/${
				scope ? scope + "/" : ""
			}${pkg}@${version}/${root}/${pkg}`,

		commit: (sha: string) => `${url}/commit/${sha}`,

		issue: (id: string) => `${url}/issues/${id}`,
	}),

	forgejo: ({ branch, root, scope, url }) => ({
		package: (pkg: string) => `${url}/src/branch/${branch}/${root}/${pkg}`,

		taggedPackage: (pkg: string, version: string) =>
			`${url}/src/tag/${
				scope ? scope + "/" : ""
			}${pkg}@${version}/${root}/${pkg}`,

		commit: (sha: string) => `${url}/commit/${sha}`,

		issue: (id: string) => `${url}/issues/${id}`,
	}),
};
