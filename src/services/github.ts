import { PullRequest } from "../types";

export class GitHubService {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private transformPRNode(pr: any): PullRequest {
    return {
      id: pr.number,
      number: pr.number,
      title: pr.title,
      state: pr.state.toLowerCase(),
      draft: pr.isDraft,
      user: pr.author
        ? {
            login: pr.author.login,
            avatar_url: pr.author.avatarUrl,
          }
        : null,
      assignees: pr.assignees.nodes.map((a: any) => ({
        login: a.login,
        avatar_url: a.avatarUrl,
      })),
      requested_reviewers: pr.reviewRequests.nodes
        .map((r: any) => r.requestedReviewer)
        .filter((r: any) => r !== null)
        .map((r: any) => ({
          login: r.login,
          avatar_url: r.avatarUrl,
        })),
      created_at: pr.createdAt,
      updated_at: pr.updatedAt,
      html_url: pr.url,
      repository: {
        name: pr.repository.name,
        full_name: pr.repository.nameWithOwner,
      },
      review_decision: pr.reviewDecision,
      head: pr.headRef?.repository
        ? {
            repo: {
              name: pr.headRef.repository.name,
              full_name: pr.headRef.repository.nameWithOwner,
              owner: {
                login: pr.headRef.repository.owner.login,
              },
            },
          }
        : null,
    };
  }

  private async fetchPRPage(
    org: string,
    cursor: string | null,
    perPage: number
  ): Promise<{
    prs: PullRequest[];
    hasNextPage: boolean;
    endCursor: string | null;
  }> {
    const searchQuery = `is:pr user:${org} archived:false`;

    const query = `
      query($perPage: Int!, $cursor: String) {
        search(
          query: "${searchQuery}"
          type: ISSUE
          first: $perPage
          after: $cursor
        ) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            ... on PullRequest {
              id
              number
              title
              state
              isDraft
              createdAt
              updatedAt
              url
              author {
                login
                avatarUrl
              }
              assignees(first: 10) {
                nodes {
                  login
                  avatarUrl
                }
              }
              reviewRequests(first: 10) {
                nodes {
                  requestedReviewer {
                    ... on User {
                      login
                      avatarUrl
                    }
                  }
                }
              }
              reviewDecision
              repository {
                name
                nameWithOwner
              }
              headRef {
                repository {
                  name
                  nameWithOwner
                  owner {
                    login
                  }
                }
              }
            }
          }
        }
      }
    `;

    const variables = {
      perPage,
      cursor,
    };

    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.statusText}`);
    }

    const data: any = await response.json();

    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    const searchResults = data.data.search;
    const nodes = searchResults.nodes || [];
    const transformedPRs = nodes.map((pr: any) => this.transformPRNode(pr));

    return {
      prs: transformedPRs,
      hasNextPage: searchResults.pageInfo.hasNextPage,
      endCursor: searchResults.pageInfo.endCursor,
    };
  }

  async fetchAllPullRequestsViaGraphQL(org: string): Promise<PullRequest[]> {
    const perPage = 100;
    const startTime = Date.now();

    console.log(
      `🚀 Fetching all PRs via GraphQL for organization: ${org} (parallel mode)`
    );

    // Fetch first page to discover all cursors
    const firstPage = await this.fetchPRPage(org, null, perPage);
    console.log(`📄 First page: ${firstPage.prs.length} PRs`);

    if (!firstPage.hasNextPage) {
      console.log(
        `✅ Total PRs fetched: ${firstPage.prs.length} (single page)`
      );
      return firstPage.prs;
    }

    // Step 2: Fetch remaining pages in parallel batches
    // We'll fetch in waves, discovering cursors as we go
    const PARALLEL_LIMIT = 10;
    const allPRs: PullRequest[] = [...firstPage.prs];
    let pendingCursors: string[] = [firstPage.endCursor!];
    let batchNumber = 1;

    while (pendingCursors.length > 0) {
      // Take up to PARALLEL_LIMIT cursors
      const batchCursors = pendingCursors.splice(0, PARALLEL_LIMIT);

      if (batchCursors.length === 0) break;

      // Fetch all pages in this batch in parallel
      const batchPromises = batchCursors.map((cursor) =>
        this.fetchPRPage(org, cursor, perPage)
      );
      const results = await Promise.all(batchPromises);

      // Collect PRs and discover new cursors
      const newPRsCount = results.reduce((sum, r) => sum + r.prs.length, 0);
      results.forEach((result) => {
        allPRs.push(...result.prs);
        if (result.hasNextPage && result.endCursor) {
          pendingCursors.push(result.endCursor);
        }
      });

      console.log(
        `📦 Batch ${batchNumber++}: ${newPRsCount} PRs fetched | Total: ${
          allPRs.length
        } PRs | ${pendingCursors.length} pages remaining`
      );
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Total PRs fetched: ${allPRs.length} in ${duration}s`);

    // Log PR distribution by repository
    const prCountByRepo = allPRs.reduce((acc, pr) => {
      const repoName = pr.repository?.name || "unknown";
      acc[repoName] = (acc[repoName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(
      "PRs by repository:",
      Object.entries(prCountByRepo)
        .map(([repo, count]) => ({ repo, prCount: count }))
        .sort((a, b) => b.prCount - a.prCount)
        .slice(0, 10)
    );

    return allPRs;
  }

  async fetchAllPullRequests(org: string): Promise<PullRequest[]> {
    return await this.fetchAllPullRequestsViaGraphQL(org);
  }
}
