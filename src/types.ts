export interface PullRequest {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  draft: boolean;
  user: {
    login: string;
    avatar_url: string;
  };
  assignees: Array<{
    login: string;
    avatar_url: string;
  }>;
  requested_reviewers: Array<{
    login: string;
    avatar_url: string;
  }>;
  created_at: string;
  updated_at: string;
  html_url: string;
  repository: {
    name: string;
    full_name: string;
  };
  review_decision?: "APPROVED" | "CHANGES_REQUESTED" | "REVIEW_REQUIRED";
  head: {
    repo: {
      name: string;
      full_name: string;
      owner: {
        login: string;
      };
    };
  };
}

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
}
