CREATE TABLE IF NOT EXISTS repo_pr_comments (
	id INTEGER PRIMARY KEY AUTO_INCREMENT,
	repository_id VARCHAR(255) NOT NULL,
	pr_number INTEGER NOT NULL,
	source_type VARCHAR(50) NOT NULL,
	author_login VARCHAR(255) NOT NULL,
	author_association VARCHAR(50) NOT NULL,
	comment_text TEXT NOT NULL,
	created_at DATETIME NOT NULL,
	UNIQUE(repository_id, pr_number, source_type, author_login, created_at)
);
