CREATE TABLE IF NOT EXISTS repo_issue_comments (
	id INTEGER PRIMARY KEY AUTO_INCREMENT,
	repository_id VARCHAR(255) NOT NULL,
	comment_text TEXT NOT NULL,
	created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	UNIQUE(repository_id, comment_text(255))
);
