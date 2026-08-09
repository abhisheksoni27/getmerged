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

// SearchReposPageQuery is like SearchReposQuery but with an explicit page size.
const SearchReposPageQuery = `
query SearchReposPage($query: String!, $first: Int!, $cursor: String) {
  search(query: $query, type: REPOSITORY, first: $first, after: $cursor) {
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

// RepoPRsQuery fetches closed/merged PRs with first-comment info, total comment counts, and reviewer info.
const RepoPRsQuery = `
query RepoPRs($owner: String!, $name: String!, $cursor: String) {
  repository(owner: $owner, name: $name) {
    stargazerCount
    description
    primaryLanguage { name }
    pullRequests(
      first: 5
      after: $cursor
      states: [CLOSED, MERGED]
      orderBy: { field: UPDATED_AT, direction: DESC }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        number
        state
        createdAt
        mergedAt
        closedAt
        authorAssociation
        author { login }
        comments(first: 5) {
          totalCount
          nodes {
            createdAt
            authorAssociation
            author { login }
            body
          }
        }
        reviews(first: 5) {
          nodes {
            createdAt
            state
            authorAssociation
            author { login }
            body
            comments(first: 5) {
              nodes {
                createdAt
                authorAssociation
                author { login }
                body
              }
            }
          }
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
  }
  rateLimit {
    remaining
    resetAt
    cost
  }
}
`
// RepoGfiCountQuery returns the count of open issues labeled 'good first issue' or 'good-first-issue'.
// Cost is ~2 points: 1 for the query plus 1 returned node (first: 1).
const RepoGfiCountQuery = `
query RepoGfiCount($query: String!) {
  search(query: $query, type: ISSUE, first: 1) {
    issueCount
  }
  rateLimit {
    remaining
    resetAt
    cost
  }
}
`
