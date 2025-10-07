import { PullRequest } from "../types";

export class GitHubService {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async fetchAllPullRequestsViaGraphQL(org: string): Promise<PullRequest[]> {
    const allPRs: PullRequest[] = [];
    let hasNextPage = true;
    let endCursor: string | null = null;
    const perPage = 100;

    console.log(`🔍 Fetching all PRs via GraphQL for organization: ${org}`);

    while (hasNextPage) {
      // Build the search query string (can't use variables in GraphQL search strings)
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

      const variables: { perPage: number; cursor: string | null } = {
        perPage,
        cursor: endCursor,
      };

      const response: Response = await fetch("https://api.github.com/graphql", {
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

      const searchResults: any = data.data.search;
      const nodes = searchResults.nodes || [];

      console.log(
        `Fetched ${nodes.length} PRs (cursor: ${endCursor || "start"})`
      );

      // Debug: Log sample PR data from GraphQL
      if (nodes.length > 0) {
        console.log("🔍 GraphQL PR sample:", {
          title: nodes[0].title,
          isDraft: nodes[0].isDraft,
          reviewDecision: nodes[0].reviewDecision,
          state: nodes[0].state,
        });
      }

      // Transform GraphQL response to match our PullRequest type
      const transformedPRs = nodes.map((pr: any) => ({
        id: pr.number, // Use number as id for consistency
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
      }));

      allPRs.push(...transformedPRs);

      hasNextPage = searchResults.pageInfo.hasNextPage;
      endCursor = searchResults.pageInfo.endCursor;

      if (!hasNextPage) {
        break;
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(`✅ Total PRs fetched via GraphQL: ${allPRs.length}`);

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
    );

    return allPRs;
  }

  async fetchAllPullRequests(org: string): Promise<PullRequest[]> {
    return await this.fetchAllPullRequestsViaGraphQL(org);
  }
}
