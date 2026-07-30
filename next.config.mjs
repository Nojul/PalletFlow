const isGithubActions = process.env.GITHUB_ACTIONS === "true";
const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
const basePath = isGithubActions && repoName ? `/${repoName}` : "";

const nextConfig = {
    reactStrictMode: true,
    output: "export",
    trailingSlash: true,
    images: {
        unoptimized: true,
    },
    basePath,
    assetPrefix: basePath ? `${basePath}/` : undefined,
};

export default nextConfig;
