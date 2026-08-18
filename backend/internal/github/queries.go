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
        repositoryTopics(first: 10) { nodes { topic { name } } }
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
        repositoryTopics(first: 10) { nodes { topic { name } } }
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

// RepoTopicsQuery fetches up to 10 repository topics for a specific repository.
const RepoTopicsQuery = `
query RepoTopics($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    repositoryTopics(first: 10) {
      nodes {
        topic {
          name
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

// RepoPRsQuery fetches closed/merged PRs with first-comment info, total comment counts, and reviewer info.
const RepoPRsQuery = `
query RepoPRs($owner: String!, $name: String!, $cursor: String) {
  repository(owner: $owner, name: $name) {
    stargazerCount
    description
    primaryLanguage { name }
    isArchived
    hasIssuesEnabled
    issueTemplates { name }
    pullRequestTemplates { filename }
    repositoryTopics(first: 10) { nodes { topic { name } } }
    contributing: object(expression: "HEAD:CONTRIBUTING.md") { id }
    contributingLower: object(expression: "HEAD:contributing.md") { id }
    contributingGithub: object(expression: "HEAD:.github/CONTRIBUTING.md") { id }
    contributingDocs: object(expression: "HEAD:docs/CONTRIBUTING.md") { id }
    codeOfConduct: object(expression: "HEAD:CODE_OF_CONDUCT.md") { id }
    codeOfConductLower: object(expression: "HEAD:code_of_conduct.md") { id }
    codeOfConductGithub: object(expression: "HEAD:.github/CODE_OF_CONDUCT.md") { id }
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

// RepoGfiListQuery returns up to $first open issues matching beginner friendly search query,
// including issue bodyText (0 extra rate-limit cost since it's in the same single GraphQL node request).
const RepoGfiListQuery = `
query RepoGfiList($query: String!, $first: Int!) {
  search(query: $query, type: ISSUE, first: $first) {
    issueCount
    nodes {
      ... on Issue {
        number
        title
        bodyText
        url
        createdAt
        authorAssociation
        comments(first: 3) {
          totalCount
          nodes {
            createdAt
            authorAssociation
          }
        }
        labels(first: 5) {
          nodes {
            name
            color
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
