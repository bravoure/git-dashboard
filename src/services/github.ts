import { PullRequest, Repository } from "../types";

export class GitHubService {
  private token: string;
  private baseUrl = "https://api.github.com";

  constructor(token: string) {
    this.token = token;
  }

  async fetchOrganizationRepos(org: string): Promise<Repository[]> {
    const allRepos: Repository[] = [];
    let page = 1;
    const perPage = 100; // Maximum allowed by GitHub API

    while (true) {
      const url = `${this.baseUrl}/orgs/${org}/repos?per_page=${perPage}&page=${page}&sort=updated&type=all&visibility=all`;
      console.log(`Fetching: ${url}`);
      console.log(`Token length: ${this.token.length}`);

      const response = await fetch(url, {
        headers: {
          Authorization: `token ${this.token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(
            `Access denied: ${response.statusText}. Please check your GitHub token permissions.`
          );
        }
        throw new Error(`Failed to fetch repos: ${response.statusText}`);
      }

      const repos = await response.json();
      console.log(`Page ${page}: fetched ${repos.length} repositories`);

      // Log repository details for debugging
      if (page === 1) {
        console.log(
          "First page repositories:",
          repos.map((r: any) => ({
            name: r.name,
            private: r.private,
            open_issues_count: r.open_issues_count,
          }))
        );
      }

      // If no more repos, break the loop
      if (repos.length === 0) {
        console.log(
          `No more repositories on page ${page}, stopping pagination`
        );
        break;
      }

      allRepos.push(...repos);

      // If we got fewer repos than requested, we've reached the end
      if (repos.length < perPage) {
        console.log(
          `Got ${repos.length} repos (less than ${perPage}), reached end of pagination`
        );
        break;
      }

      page++;
    }

    console.log(`Fetched ${allRepos.length} repositories for ${org}`);
    console.log(
      "Repository names:",
      allRepos.map((r) => r.name)
    );
    return allRepos;
  }

  async fetchUserRepos(): Promise<Repository[]> {
    const allRepos: Repository[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const url = `${this.baseUrl}/user/repos?per_page=${perPage}&page=${page}&sort=updated&type=all&visibility=all`;
      console.log(`Fetching user repos: ${url}`);

      const response = await fetch(url, {
        headers: {
          Authorization: `token ${this.token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user repos: ${response.statusText}`);
      }

      const repos = await response.json();
      console.log(`Page ${page}: fetched ${repos.length} user repositories`);

      if (repos.length === 0) {
        break;
      }

      allRepos.push(...repos);

      if (repos.length < perPage) {
        break;
      }

      page++;
    }

    console.log(`Fetched ${allRepos.length} user repositories`);
    return allRepos;
  }

  async fetchPullRequests(owner: string, repo: string): Promise<PullRequest[]> {
    const allPRs: PullRequest[] = [];
    let page = 1;
    const perPage = 100; // Maximum allowed by GitHub API

    while (true) {
      const response = await fetch(
        `${this.baseUrl}/repos/${owner}/${repo}/pulls?state=all&per_page=${perPage}&page=${page}`,
        {
          headers: {
            Authorization: `token ${this.token}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch PRs for ${repo}: ${response.statusText}`
        );
      }

      const prs = await response.json();

      // If no more PRs, break the loop
      if (prs.length === 0) {
        break;
      }

      allPRs.push(...prs);

      // If we got fewer PRs than requested, we've reached the end
      if (prs.length < perPage) {
        break;
      }

      page++;
    }

    return allPRs;
  }

  async fetchPullRequestReviewStatus(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<string | undefined> {
    try {
      const response = await fetch(
        `${this.baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}`,
        {
          headers: {
            Authorization: `token ${this.token}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      if (!response.ok) {
        console.warn(
          `Failed to fetch review status for ${owner}/${repo}#${prNumber}: ${response.statusText}`
        );
        return undefined;
      }

      const pr = await response.json();
      return pr.review_decision;
    } catch (error) {
      console.warn(
        `Error fetching review status for ${owner}/${repo}#${prNumber}:`,
        error
      );
      return undefined;
    }
  }

  async fetchAllPullRequests(org: string): Promise<PullRequest[]> {
    let repos: Repository[];

    try {
      repos = await this.fetchOrganizationRepos(org);
      console.log(
        `Fetched ${repos.length} repositories from organization ${org}`
      );
    } catch (error) {
      console.warn(
        `Failed to fetch organization repos for ${org}, trying user repos:`,
        error
      );
      // Fallback: try to fetch user's repositories
      repos = await this.fetchUserRepos();
      console.log(`Fetched ${repos.length} repositories from user account`);
    }

    console.log(`Fetching PRs from ${repos.length} repositories...`);

    // Fetch all pull requests in parallel
    const prPromises = repos.map(async (repo, index) => {
      try {
        // Use the actual owner from the repo object, fallback to org
        const owner = (repo as any).owner?.login || org;
        const prs = await this.fetchPullRequests(owner, repo.name);
        console.log(
          `[${index + 1}/${repos.length}] ${owner}/${repo.name}: ${
            prs.length
          } PRs`
        );

        // Special debugging for amsterdam-museum repository
        if (repo.name === "amsterdam-museum") {
          console.log(
            "🔍 Amsterdam Museum PRs:",
            prs.map((pr) => ({
              number: pr.number,
              title: pr.title,
              state: pr.state,
              review_decision: pr.review_decision,
              html_url: pr.html_url,
            }))
          );
        }

        return prs;
      } catch (error) {
        console.warn(`Failed to fetch PRs for ${repo.name}:`, error);
        return []; // Return empty array on error
      }
    });

    // Wait for all requests to complete
    const prResults = await Promise.all(prPromises);

    // Flatten the results into a single array
    const allPRs = prResults.flat();
    console.log(`Total PRs fetched: ${allPRs.length}`);

    // Log PR distribution by repository
    const prCountByRepo = prResults
      .map((prs, index) => ({
        repo: repos[index]?.name || "unknown",
        prCount: prs.length,
      }))
      .filter((r) => r.prCount > 0);

    console.log("PRs by repository:", prCountByRepo);

    // Now fetch review status for each PR and attach repository information
    console.log("Fetching review status for each PR...");
    const prsWithReviewStatus = await Promise.all(
      allPRs.map(async (pr) => {
        const reviewDecision = await this.fetchPullRequestReviewStatus(
          pr.head.repo.owner.login,
          pr.head.repo.name,
          pr.number
        );
        return {
          ...pr,
          review_decision: reviewDecision as
            | "APPROVED"
            | "CHANGES_REQUESTED"
            | "REVIEW_REQUIRED"
            | undefined,
          repository: {
            name: pr.head.repo.name,
            full_name: pr.head.repo.full_name,
          },
        };
      })
    );

    console.log("Review status fetching completed");
    return prsWithReviewStatus;
  }
}
