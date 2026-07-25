package github

// SearchReposQuery finds top repositories for a given language.
const SearchReposQuery = `
query SearchRepos($query: String!, $cursor: String) {
  search(query: $query, type: REPOSITORY, first: 100, after: $cursor) {
    pageInfo {
      hasNextPage
      endCursor
    }
    nodes {
      ... on Repository {
        id
        nameWithOwner
        owner { login }
        name
        primaryLanguage { name }
        stargazerCount
        description
        url
      }
    }
  }
  rateLimit {
    remaining
    resetAt
    cost
  }
}
`

// RepoPRsQuery fetches closed/merged PRs with first-comment info, paginated.
const RepoPRsQuery = `
query RepoPRs($owner: String!, $name: String!, $cursor: String) {
  repository(owner: $owner, name: $name) {
    pullRequests(
      first: 100
      after: $cursor
      states: [CLOSED, MERGED]
      orderBy: { field: UPDATED_AT, direction: DESC }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        state
        createdAt
        mergedAt
        closedAt
        authorAssociation
        author { login }
        comments(first: 1, orderBy: { field: UPDATED_AT, direction: ASC }) {
          nodes {
            createdAt
            authorAssociation
          }
        }
      }
    }
    rateLimit {
      remaining
      resetAt
      cost
    }
  }
}
`

// RepoIssuesQuery fetches issues with first-comment timestamps, paginated.
const RepoIssuesQuery = `
query RepoIssues($owner: String!, $name: String!, $cursor: String) {
  repository(owner: $owner, name: $name) {
    issues(
      first: 100
      after: $cursor
      states: [OPEN, CLOSED]
      orderBy: { field: CREATED_AT, direction: DESC }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        createdAt
        comments(first: 1, orderBy: { field: UPDATED_AT, direction: ASC }) {
          nodes {
            createdAt
          }
        }
      }
    }
    rateLimit {
      remaining
      resetAt
      cost
    }
  }
}
`

// RepoStalenessQuery checks if any external PR was merged in the last 6 months.
const RepoStalenessQuery = `
query RepoStaleness($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    pullRequests(
      last: 10
      states: [MERGED]
    ) {
      nodes {
        mergedAt
        authorAssociation
      }
    }
    rateLimit {
      remaining
      resetAt
      cost
    }
  }
}
`
