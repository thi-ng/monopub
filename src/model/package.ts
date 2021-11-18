export const pkgShortName = (name: string) => name.split("/")[1];

export const pkgPath = (repo: string, root: string, pkg: string) =>
    `${repo}/${root}/${pkg}`;

export const pkgJsonPath = (repo: string, root: string, pkg: string) =>
    `${repo}/${root}/${pkg}/package.json`;
